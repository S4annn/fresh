"""
F.R.E.S.H AI Assistant powered by Gemini API.
Secondary feature - does NOT replace AI Food Scanner or Risk Prediction.
Uses direct HTTP REST API (no google-generativeai library needed).
"""
import os
import json
import logging
import requests

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

ALLOWED_KEYWORDS = [
    "fresh", "food", "makanan", "waste", "limbah", "bahan", "inventory", "inventaris",
    "stok", "stock", "expiry", "expired", "kedaluwarsa", "kadaluarsa", "simpan",
    "penyimpanan", "storage", "resep", "recipe", "masak", "cook", "scanner", "scan",
    "risk", "risiko", "warning", "marketplace", "jual", "sell", "surplus", "donation",
    "donasi", "donate", "dashboard", "analytics", "analitik", "laporan", "report",
    "sustainability", "keberlanjutan", "business", "bisnis", "branch", "cabang",
    "order", "pesanan", "subscription", "langganan", "pricing", "harga", "plan",
    "paket", "fitur", "feature", "telur", "sayur", "buah", "daging", "ayam", "roti",
    "susu", "keju", "nasi", "tomat", "pisang", "apel", "tahu", "tempe", "bakery",
    "restoran", "cafe", "hotel", "grocery", "katering",
]

FALLBACK_NO_API_KEY = {
    "reply": "AI Assistant belum dikonfigurasi. Admin perlu menambahkan GEMINI_API_KEY di environment variable backend.",
    "source": "fallback_no_api_key",
    "topic_allowed": True,
}

FALLBACK_OFF_TOPIC = {
    "reply": "Maaf, saya hanya bisa membantu pertanyaan seputar F.R.E.S.H, food waste, inventory makanan, resep, penyimpanan, marketplace, donation, analytics, dan fitur aplikasi ini.",
    "source": "topic_filter",
    "topic_allowed": False,
}

FALLBACK_ERROR = {
    "reply": "Maaf, AI Assistant sedang tidak tersedia. Coba lagi nanti atau gunakan fitur utama F.R.E.S.H seperti Inventory, Scanner, dan Recommendations.",
    "source": "gemini_error",
    "topic_allowed": True,
}

FRESH_PAGES = {
    "dashboard", "inventory", "scanner", "predict", "recommendations",
    "marketplace", "donation", "analytics", "settings", "pricing",
    "business_dashboard", "business_inventory", "business_orders",
    "business_branches", "business_analytics",
}


def is_topic_allowed(message: str, page_context: str | None = None) -> bool:
    """Check if message is related to F.R.E.S.H topics."""
    if not message:
        return False
    if page_context and page_context.lower() in FRESH_PAGES:
        return True
    msg_lower = message.lower()
    return any(keyword in msg_lower for keyword in ALLOWED_KEYWORDS)


def build_system_prompt() -> str:
    return """Kamu adalah F.R.E.S.H Assistant, AI assistant untuk aplikasi F.R.E.S.H (Food Resource Efficiency & Smart Handling). Tugasmu membantu user memahami dan menggunakan fitur aplikasi, mengurangi food waste, mengelola inventory makanan, memberi saran penyimpanan, rekomendasi resep sederhana dari inventory, marketplace surplus food, donation, analytics, business dashboard, dan sustainability report.

Kamu hanya boleh menjawab topik yang berkaitan dengan F.R.E.S.H dan food waste. Jika user bertanya di luar topik (politik, coding umum, game, dll), tolak dengan sopan dan arahkan kembali ke topik F.R.E.S.H.

Jangan mengklaim bisa melakukan klasifikasi gambar secara langsung. Jika user ingin scan makanan, arahkan ke fitur AI Food Scanner. Jangan menggantikan hasil AI Food Scanner atau Risk Prediction. Kamu hanya boleh menjelaskan, memberi saran, dan membantu user memahami hasil yang sudah ada.

Gunakan bahasa Indonesia yang jelas, ramah, singkat, dan mudah dipahami. Jawaban maksimal 3-4 paragraf pendek. Jika user business, berikan saran relevan untuk restoran/cafe/hotel/bakery/grocery. Jika personal, saran rumah tangga.

Jika memberi saran penyimpanan makanan, berikan saran umum dan tetap sarankan user mengecek kondisi makanan manual jika ragu. Jangan berikan saran medis, hukum, finansial, atau topik di luar aplikasi."""


def build_user_context(user_id: str | None, role: str | None, inventory: list | None, page_context: str | None) -> str:
    """Build context string from user data - NO sensitive data."""
    parts = []
    if role:
        parts.append(f"User role: {role}")
    if page_context:
        parts.append(f"Halaman saat ini: {page_context}")

    if inventory and isinstance(inventory, list):
        safe_items = []
        for item in inventory[:10]:
            if not isinstance(item, dict):
                continue
            safe_item = {
                "food_name": item.get("food_name") or item.get("name"),
                "category": item.get("category"),
                "quantity": item.get("quantity"),
                "unit": item.get("unit"),
                "expiration_date": str(item.get("expiration_date") or item.get("expiry_date") or ""),
                "risk_label": item.get("risk_label") or item.get("risk_level"),
            }
            safe_items.append(safe_item)
        if safe_items:
            parts.append(f"Inventory user saat ini (JSON): {json.dumps(safe_items, ensure_ascii=False)}")

    return "\n".join(parts) if parts else ""


def generate_ai_response(message: str, user_id: str | None = None, role: str | None = None,
                         inventory: list | None = None, page_context: str | None = None) -> dict:
    """Generate AI response using Gemini REST API directly (no extra dependency needed)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return FALLBACK_NO_API_KEY

    if not is_topic_allowed(message, page_context):
        return FALLBACK_OFF_TOPIC

    try:
        system_prompt = build_system_prompt()
        user_context = build_user_context(user_id, role, inventory, page_context)

        full_prompt = system_prompt
        if user_context:
            full_prompt += f"\n\nKonteks user:\n{user_context}"
        full_prompt += f"\n\nPertanyaan user: {message}\n\nJawab dalam bahasa Indonesia."

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": full_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 800,
            }
        }

        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=payload,
            timeout=20,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()

        # Extract reply from Gemini response format
        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning(f"Gemini returned no candidates: {data}")
            return FALLBACK_ERROR

        parts = candidates[0].get("content", {}).get("parts", [])
        reply = "".join(part.get("text", "") for part in parts).strip()

        if not reply:
            reply = "Maaf, saya tidak bisa memberikan jawaban saat ini. Coba pertanyaan lain seputar F.R.E.S.H."

        return {
            "reply": reply,
            "source": "gemini_api",
            "topic_allowed": True,
        }
    except requests.HTTPError as e:
        logger.error(f"Gemini API HTTP error: {e.response.status_code} {e.response.text[:300]}")
        return FALLBACK_ERROR
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return FALLBACK_ERROR
