"""
F.R.E.S.H AI Assistant powered by Gemini REST API.
Secondary feature - does NOT replace AI Food Scanner or Risk Prediction.
"""
import os
import re
import json
import logging
import requests

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"

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
    "restoran", "cafe", "hotel", "grocery", "katering", "saya", "aku", "bagaimana",
    "cara", "apa", "tips", "saran", "rekomendasi", "bantu",
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
    "reply": "Maaf, AI Assistant sedang tidak tersedia. Coba lagi sebentar.",
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
    if not message:
        return False
    if page_context and page_context.lower() in FRESH_PAGES:
        return True
    msg_lower = message.lower()
    return any(keyword in msg_lower for keyword in ALLOWED_KEYWORDS)


def clean_markdown(text: str) -> str:
    """Remove markdown formatting (bold, italic, headers, bullets) from text."""
    if not text:
        return text
    # Remove bold **text** and __text__
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    # Remove italic *text* and _text_ (careful not to touch already-stripped bold)
    text = re.sub(r'(?<!\*)\*([^\*\n]+?)\*(?!\*)', r'\1', text)
    text = re.sub(r'(?<!_)_([^_\n]+?)_(?!_)', r'\1', text)
    # Remove headers (# Title)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Convert bullet markers to dashes
    text = re.sub(r'^\s*[\*\+]\s+', '- ', text, flags=re.MULTILINE)
    # Remove inline code backticks
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Collapse 3+ newlines to 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def build_system_prompt() -> str:
    return """Kamu F.R.E.S.H Assistant, chatbot untuk aplikasi F.R.E.S.H (Food Resource Efficiency & Smart Handling) yang membantu mengurangi food waste.

Kamu hanya jawab topik tentang: food waste, inventory makanan, penyimpanan, resep, marketplace surplus, donasi, analytics, business dashboard, sustainability, subscription/pricing, dan fitur aplikasi F.R.E.S.H.

Jika user tanya di luar topik (politik, coding, dll), tolak sopan dan arahkan ke topik F.R.E.S.H.

Jangan klaim bisa scan gambar. Untuk scan makanan, arahkan ke fitur AI Food Scanner di aplikasi. Jangan gantikan hasil AI Food Scanner atau Risk Prediction.

PENTING tentang format jawaban:
- Pakai bahasa Indonesia ramah, singkat, praktis. Maksimal 3 paragraf pendek.
- JANGAN pakai markdown. JANGAN pakai bintang (**), underscore, atau tanda pagar (#).
- Tulis dalam plain text biasa. Untuk penekanan, gunakan kata yang jelas, bukan tebal/miring.
- Jika bikin daftar, pakai tanda "-" di awal baris.

Untuk user business: saran untuk restoran/cafe/hotel/bakery/grocery.
Untuk user personal: saran rumah tangga.

Jangan berikan saran medis, hukum, atau finansial."""


def build_user_context(role: str | None, inventory: list | None, page_context: str | None,
                       subscription: dict | None = None, analytics: dict | None = None) -> str:
    """Build compact context string - NO sensitive data."""
    parts = []
    if role:
        parts.append(f"Role: {role}")
    if page_context:
        parts.append(f"Halaman: {page_context}")

    if subscription:
        plan = subscription.get("plan_id") or subscription.get("plan")
        if plan:
            parts.append(f"Paket: {plan}")

    if inventory and isinstance(inventory, list) and len(inventory) > 0:
        safe_items = []
        for item in inventory[:15]:
            if not isinstance(item, dict):
                continue
            name = item.get("food_name") or item.get("name") or item.get("item_name")
            if not name:
                continue
            safe_items.append({
                "nama": name,
                "kategori": item.get("category"),
                "jumlah": f"{item.get('quantity', '')} {item.get('unit', '')}".strip(),
                "kedaluwarsa": str(item.get("expiration_date") or item.get("expiry_date") or ""),
                "risk": item.get("risk_label") or item.get("risk_level"),
            })
        if safe_items:
            parts.append(f"Inventory user ({len(safe_items)} item): {json.dumps(safe_items, ensure_ascii=False)}")
    elif inventory is not None:
        parts.append("Inventory user: kosong")

    if analytics and isinstance(analytics, dict):
        summary_parts = []
        for key in ("total_food_items", "high_risk_items", "warning_items", "safe_items"):
            val = analytics.get(key)
            if val is not None:
                summary_parts.append(f"{key}={val}")
        if summary_parts:
            parts.append(f"Analytics: {', '.join(summary_parts)}")

    return "\n".join(parts)


def fetch_user_inventory(db, user_id: str, role: str | None = None) -> list:
    """Fetch user's inventory from database."""
    try:
        from .models import FoodItem, BusinessInventory

        if role == "business":
            items = (
                db.query(BusinessInventory)
                .filter(BusinessInventory.business_id == user_id)
                .order_by(BusinessInventory.expiration_date.asc())
                .limit(15)
                .all()
            )
            return [
                {
                    "item_name": i.item_name,
                    "category": i.category,
                    "quantity": i.quantity,
                    "unit": i.unit,
                    "expiration_date": i.expiration_date,
                    "risk_label": i.risk_label,
                }
                for i in items
            ]

        items = (
            db.query(FoodItem)
            .filter(FoodItem.user_id == user_id, FoodItem.is_finished == False)
            .order_by(FoodItem.expiration_date.asc())
            .limit(15)
            .all()
        )
        return [
            {
                "food_name": i.food_name or i.name,
                "category": i.category,
                "quantity": i.quantity,
                "unit": i.unit,
                "expiration_date": i.expiration_date,
                "risk_label": i.risk_label or i.risk_level,
            }
            for i in items
        ]
    except Exception as e:
        logger.warning(f"Failed to fetch inventory: {e}")
        return []


def generate_ai_response(message: str, user_id: str | None = None, role: str | None = None,
                         inventory: list | None = None, page_context: str | None = None,
                         db=None) -> dict:
    """Generate AI response using Gemini REST API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return FALLBACK_NO_API_KEY

    if not is_topic_allowed(message, page_context):
        return FALLBACK_OFF_TOPIC

    # If inventory not provided by frontend but we have db + user_id, fetch from database
    if (inventory is None or len(inventory) == 0) and db is not None and user_id and not user_id.startswith("demo-"):
        inventory = fetch_user_inventory(db, user_id, role)

    try:
        system_prompt = build_system_prompt()
        user_context = build_user_context(role, inventory, page_context)

        full_prompt = system_prompt
        if user_context:
            full_prompt += f"\n\nKonteks user saat ini:\n{user_context}"
        full_prompt += f"\n\nPertanyaan user: {message}"

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": full_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 400,  # Keep responses short & fast
                "topP": 0.9,
            }
        }

        response = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=payload,
            timeout=15,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()

        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning(f"Gemini returned no candidates: {data}")
            return FALLBACK_ERROR

        parts = candidates[0].get("content", {}).get("parts", [])
        reply = "".join(part.get("text", "") for part in parts).strip()

        if not reply:
            return {
                "reply": "Maaf, saya tidak bisa memberikan jawaban. Coba pertanyaan lain seputar F.R.E.S.H.",
                "source": "gemini_empty",
                "topic_allowed": True,
            }

        # Strip markdown formatting
        reply = clean_markdown(reply)

        return {
            "reply": reply,
            "source": "gemini_api",
            "topic_allowed": True,
        }
    except requests.HTTPError as e:
        logger.error(f"Gemini API HTTP error: {e.response.status_code} {e.response.text[:300]}")
        return FALLBACK_ERROR
    except requests.Timeout:
        logger.error("Gemini API timeout")
        return {
            "reply": "Maaf, respons AI terlalu lama. Coba lagi dengan pertanyaan lebih singkat.",
            "source": "gemini_timeout",
            "topic_allowed": True,
        }
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return FALLBACK_ERROR
