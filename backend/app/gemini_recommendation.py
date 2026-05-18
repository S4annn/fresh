"""
F.R.E.S.H Gemini Recommendation Service (via OpenRouter)
=========================================================
Uses OpenRouter API as a SECONDARY feature to generate smart food waste
recommendations based on TensorFlow model classification results.

The TensorFlow model remains the PRIMARY classifier.
OpenRouter (with Gemini/other models) only provides enhanced recommendations,
recipe ideas, marketplace/donation suggestions, and storage advice.

If OpenRouter fails or API key is missing, the system falls back to
food_metadata.json — the scanner never crashes.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

import requests

logger = logging.getLogger(__name__)

# OpenRouter API configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
GEMINI_TIMEOUT = 15  # seconds

# Fallback models to try if the primary model fails
FALLBACK_MODELS = [
    OPENROUTER_MODEL,
    "google/gemini-2.0-flash-001",
    "google/gemini-2.5-flash-preview",
    "meta-llama/llama-4-scout",
]


def _get_api_key() -> Optional[str]:
    """Get OpenRouter API key from environment. Returns None if not configured."""
    key = os.getenv("OPENROUTER_API_KEY", "")
    return key if key else None


def _build_system_instruction() -> str:
    """Build the system instruction for the model."""
    return (
        "Kamu adalah AI recommendation assistant untuk F.R.E.S.H, aplikasi untuk mengurangi food waste. "
        "Kamu tidak melakukan klasifikasi gambar. Klasifikasi gambar sudah dilakukan oleh model TensorFlow milik aplikasi. "
        "Tugasmu hanya membuat rekomendasi berdasarkan hasil klasifikasi tersebut.\n\n"
        "Berikan rekomendasi yang aman, realistis, dan praktis untuk pengguna Indonesia. "
        "Jawab hanya dalam format JSON valid. Jangan pakai markdown. Jangan tambahkan teks di luar JSON.\n\n"
        "Output JSON wajib memiliki field:\n"
        "{\n"
        '  "category": "Vegetable | Fruit | Protein | Dairy | Grain | Other",\n'
        '  "estimated_shelf_life_days": number,\n'
        '  "risk_label": "Safe | Warning | High Risk",\n'
        '  "storage_advice": "string",\n'
        '  "recommendations": ["string", "string", "string"],\n'
        '  "recipe_ideas": ["string", "string", "string"],\n'
        '  "marketplace_suggestion": "string",\n'
        '  "donation_suggestion": "string",\n'
        '  "suggested_inventory": {\n'
        '    "food_name": "string",\n'
        '    "category": "string",\n'
        '    "quantity": 1,\n'
        '    "unit": "pcs",\n'
        '    "storage_condition": "Room Temperature | Refrigerator | Freezer",\n'
        '    "shelf_life": number\n'
        "  },\n"
        '  "confidence_note": "string"\n'
        "}\n\n"
        "Rules:\n"
        "- Jika confidence >= 0.75, rekomendasi boleh lebih yakin.\n"
        "- Jika confidence 0.45 sampai 0.74, beri confidence_note bahwa hasil perlu dicek ulang.\n"
        "- Jika confidence < 0.45, risk_label harus Warning dan rekomendasi harus menyarankan user melakukan manual correction.\n"
        "- Jangan mengklaim makanan pasti benar jika confidence rendah.\n"
        "- Untuk makanan mudah rusak seperti tofu, fish, chicken, milk, seafood, gunakan storage refrigerator/freezer.\n"
        "- Jangan memberi saran medis.\n"
        "- Jangan menyarankan mengonsumsi makanan yang sudah busuk atau tidak layak.\n"
        "- Jika ragu, sarankan cek bau, tekstur, warna, dan tanggal kedaluwarsa.\n"
        "- Semua teks rekomendasi dalam Bahasa Indonesia."
    )


def _build_user_prompt(
    detected_food: str,
    confidence: float,
    top_predictions: list[dict[str, Any]],
    user_role: str = "personal",
    language: str = "id",
) -> str:
    """Build the dynamic user prompt."""
    top_preds_text = ""
    for i, pred in enumerate(top_predictions[:5], 1):
        label = pred.get("label", "Unknown")
        conf = pred.get("confidence", 0)
        top_preds_text += f"  {i}. {label}: {conf:.2f}\n"

    prompt = (
        f"Detected food from TensorFlow model:\n"
        f"- detected_food: {detected_food}\n"
        f"- confidence: {confidence:.2f}\n"
        f"- top_predictions:\n{top_preds_text}"
        f"- user_role: {user_role}\n\n"
        f"Generate food waste recommendation for F.R.E.S.H app in Indonesian.\n"
        f"Return JSON only."
    )
    return prompt


def _clean_json_response(text: str) -> str:
    """Clean response that may be wrapped in markdown code blocks."""
    if not text:
        return text
    # Remove ```json ... ``` wrapping
    text = re.sub(r"^```json\s*", "", text.strip())
    text = re.sub(r"^```\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text.strip())
    return text.strip()


def _validate_recommendation(data: dict[str, Any]) -> bool:
    """Basic validation that the response has required fields."""
    required_fields = [
        "category",
        "estimated_shelf_life_days",
        "risk_label",
        "storage_advice",
        "recommendations",
        "recipe_ideas",
    ]
    return all(field in data for field in required_fields)


class _QuotaExceededError(Exception):
    """Raised when API returns 429 — no point trying other models with same key."""
    pass


def _call_openrouter(model: str, messages: list[dict], api_key: str) -> Optional[dict]:
    """
    Make a single OpenRouter API call.
    Returns parsed JSON response or None on model-not-found.
    Raises _QuotaExceededError on 429.
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 800,
        "top_p": 0.9,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fresh-app.up.railway.app",
        "X-OpenRouter-Title": "F.R.E.S.H Food Waste App",
    }

    response = requests.post(
        OPENROUTER_API_URL,
        json=payload,
        timeout=GEMINI_TIMEOUT,
        headers=headers,
    )

    if response.status_code == 404:
        logger.warning(f"[gemini_recommendation] Model '{model}' not found (404). Trying next...")
        return None

    if response.status_code == 429:
        logger.warning(
            f"[gemini_recommendation] Quota exceeded (429) for model '{model}'. "
            "Skipping remaining fallbacks."
        )
        raise _QuotaExceededError("Rate limit / quota exceeded")

    response.raise_for_status()
    return response.json()


def generate_food_recommendation_with_gemini(
    detected_food: str,
    confidence: float,
    top_predictions: list[dict[str, Any]],
    user_role: str = "personal",
    language: str = "id",
) -> Optional[dict[str, Any]]:
    """
    Generate food waste recommendation using OpenRouter API.

    Args:
        detected_food: The food label from TensorFlow model
        confidence: Confidence score (0-1) from TensorFlow model
        top_predictions: List of top predictions from TensorFlow model
        user_role: "personal" or "business"
        language: Response language (default "id" for Indonesian)

    Returns:
        Dict with recommendation fields, or None if API fails.
        Caller should fall back to food_metadata.json if None is returned.
    """
    api_key = _get_api_key()
    if not api_key:
        logger.info("[gemini_recommendation] No OPENROUTER_API_KEY configured, skipping.")
        return None

    system_instruction = _build_system_instruction()
    user_prompt = _build_user_prompt(
        detected_food=detected_food,
        confidence=confidence,
        top_predictions=top_predictions,
        user_role=user_role,
        language=language,
    )

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_prompt},
    ]

    # Deduplicate fallback models, preserving order
    seen = set()
    models_to_try = []
    for m in FALLBACK_MODELS:
        if m not in seen:
            seen.add(m)
            models_to_try.append(m)

    data = None
    used_model = None

    for model in models_to_try:
        try:
            data = _call_openrouter(model, messages, api_key)
            if data is not None:
                used_model = model
                break
        except _QuotaExceededError:
            return None
        except requests.Timeout:
            logger.error(f"[gemini_recommendation] Timeout with model '{model}'.")
            continue
        except requests.HTTPError as e:
            logger.error(
                f"[gemini_recommendation] HTTP error with model '{model}': "
                f"{e.response.status_code if e.response else 'unknown'}"
            )
            continue
        except Exception as e:
            logger.error(f"[gemini_recommendation] Error with model '{model}': {e}")
            continue

    if data is None:
        logger.error("[gemini_recommendation] All models failed. Returning None for fallback.")
        return None

    # Parse OpenRouter response (OpenAI-compatible format)
    try:
        choices = data.get("choices", [])
        if not choices:
            logger.warning("[gemini_recommendation] No choices in response.")
            return None

        raw_text = choices[0].get("message", {}).get("content", "").strip()

        if not raw_text:
            logger.warning("[gemini_recommendation] Empty content in response.")
            return None

        # Clean and parse JSON
        cleaned_text = _clean_json_response(raw_text)
        result = json.loads(cleaned_text)

        if not isinstance(result, dict):
            logger.warning("[gemini_recommendation] Response is not a dict.")
            return None

        if not _validate_recommendation(result):
            logger.warning(
                f"[gemini_recommendation] Missing required fields. Keys: {list(result.keys())}"
            )
            return None

        logger.info(
            f"[gemini_recommendation] Success for '{detected_food}' "
            f"(confidence={confidence:.2f}, model={used_model})"
        )
        return result

    except json.JSONDecodeError as e:
        logger.error(f"[gemini_recommendation] JSON parse error: {e}")
        return None
    except Exception as e:
        logger.error(f"[gemini_recommendation] Unexpected error parsing response: {e}")
        return None


def is_gemini_configured() -> bool:
    """Check if OpenRouter API key is configured."""
    return bool(_get_api_key())


def gemini_debug_info() -> dict[str, Any]:
    """Return debug info about API configuration (never exposes API key)."""
    return {
        "gemini_configured": is_gemini_configured(),
        "provider": "openrouter",
        "openrouter_model": OPENROUTER_MODEL,
        "fallback_models": FALLBACK_MODELS,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "timeout_seconds": GEMINI_TIMEOUT,
    }


def list_available_models() -> dict[str, Any]:
    """
    List available models via OpenRouter API.
    Used by GET /debug-gemini/models endpoint.
    """
    api_key = _get_api_key()
    if not api_key:
        return {
            "error": "OPENROUTER_API_KEY not configured",
            "models": [],
        }

    try:
        response = requests.get(
            "https://openrouter.ai/api/v1/models",
            timeout=10,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        data = response.json()

        # Filter to show only relevant models (Gemini + popular ones)
        models = []
        for model in data.get("data", []):
            model_id = model.get("id", "")
            # Show Google models and a few popular alternatives
            if any(prefix in model_id for prefix in ["google/", "meta-llama/", "anthropic/"]):
                models.append({
                    "id": model_id,
                    "name": model.get("name", ""),
                    "pricing": {
                        "prompt": model.get("pricing", {}).get("prompt", ""),
                        "completion": model.get("pricing", {}).get("completion", ""),
                    },
                })

        return {
            "models": models[:50],  # Limit output
            "count": len(models),
            "current_model": OPENROUTER_MODEL,
            "provider": "openrouter",
        }

    except requests.HTTPError as e:
        return {
            "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}",
            "models": [],
        }
    except Exception as e:
        return {
            "error": str(e)[:200],
            "models": [],
        }
