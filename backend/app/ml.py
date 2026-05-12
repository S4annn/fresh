from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Optional

import joblib

# Resilient import: if recommendation module is missing, provide a minimal fallback
# so the app can still start in degraded mode.
try:
    from .recommendation import build_recommendation
except ImportError:  # pragma: no cover
    def build_recommendation(food_name: str, risk_level: str, days_to_expiry: int, category: str) -> str:
        name = (food_name or "Food Item").strip().title()
        if risk_level == "High Risk":
            return f"{name} berisiko tinggi terbuang. Gunakan hari ini atau pindahkan ke donasi/marketplace."
        if risk_level == "Warning":
            return f"{name} mendekati batas aman. Prioritaskan untuk digunakan dalam 1-3 hari."
        return f"{name} masih relatif aman disimpan. Tetap cek stok secara berkala."

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = ROOT / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "risk_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "model_metadata.json"

_model_bundle: Any = None
_model_error: Optional[str] = None


def load_model_bundle() -> Any:
    """Load the optional Scikit-learn risk model without making startup fragile."""
    global _model_bundle, _model_error
    if _model_bundle is not None or _model_error is not None:
        return _model_bundle

    if not MODEL_PATH.exists():
        _model_error = "risk_model.joblib not found; using rule-based fallback"
        return None

    try:
        _model_bundle = joblib.load(MODEL_PATH)
    except Exception as exc:
        _model_error = f"failed to load risk model: {exc}"
        _model_bundle = None
    return _model_bundle


def model_metadata() -> dict[str, Any]:
    if METADATA_PATH.exists():
        try:
            return json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return {"status": "metadata_error", "detail": str(exc)}

    return {"status": "metadata not found", "mode": "rule-based fallback"}


def estimate_shelf_life(category: str) -> int:
    cat = (category or "").lower()
    if any(word in cat for word in ["seafood", "fish", "ikan"]):
        return 2
    if any(word in cat for word in ["meat", "protein", "chicken", "daging", "ayam"]):
        return 3
    if any(word in cat for word in ["vegetable", "sayur"]):
        return 5
    if any(word in cat for word in ["dairy", "milk", "susu", "yogurt"]):
        return 7
    if any(word in cat for word in ["fruit", "buah"]):
        return 7
    if any(word in cat for word in ["bakery", "bread", "roti"]):
        return 5
    return 7


def coerce_expiration_date(expiration_date: Any, days_to_expiry: Optional[int]) -> date:
    if isinstance(expiration_date, date):
        return expiration_date

    if isinstance(expiration_date, str) and expiration_date.strip():
        try:
            return date.fromisoformat(expiration_date[:10])
        except ValueError:
            pass

    fallback_days = 5 if days_to_expiry is None else int(days_to_expiry)
    return date.today() + timedelta(days=fallback_days)


def rule_based_predict(days_to_expiry: int) -> tuple[str, float, str, str]:
    if days_to_expiry <= 2:
        return (
            "High Risk",
            0.85,
            "This item expires soon and should be prioritized.",
            "Use today",
        )
    if days_to_expiry <= 5:
        return (
            "Warning",
            0.55,
            "This item is approaching its expiry window and should be planned soon.",
            "Plan usage within 1-2 days",
        )
    return (
        "Safe",
        0.15,
        "This item still has enough shelf life if stored properly.",
        "Keep monitoring",
    )


def _predict_with_model(
    category: str,
    quantity: float,
    shelf_life: int,
    storage_condition: str,
    days_to_expiry: int,
) -> tuple[Optional[str], Optional[float]]:
    bundle = load_model_bundle()
    if bundle is None:
        return None, None

    try:
        import pandas as pd

        expiry_ratio = days_to_expiry / max(shelf_life, 1)
        row = pd.DataFrame(
            [
                {
                    "category": category,
                    "quantity": float(quantity or 0),
                    "shelf_life": shelf_life,
                    "storage_condition": storage_condition,
                    "days_to_expiry": days_to_expiry,
                    "expiry_ratio": expiry_ratio,
                    "waste_ratio": max(0, 1 - expiry_ratio),
                }
            ]
        )

        pipeline = bundle.get("pipeline") if isinstance(bundle, dict) else bundle
        label_encoder = bundle.get("label_encoder") if isinstance(bundle, dict) else None

        if hasattr(pipeline, "predict_proba"):
            probabilities = pipeline.predict_proba(row)[0]
            pred_idx = int(probabilities.argmax())
            risk_score = float(probabilities[pred_idx])
            classes = getattr(pipeline, "classes_", None)
        else:
            prediction = pipeline.predict(row)[0]
            risk_score = 0.5
            classes = None
            try:
                pred_idx = int(prediction)
            except (TypeError, ValueError):
                pred_idx = None

        if label_encoder is not None and pred_idx is not None:
            risk_label = str(label_encoder.inverse_transform([pred_idx])[0])
        elif classes is not None and pred_idx < len(classes):
            risk_label = str(classes[pred_idx])
        else:
            risk_label = str(prediction if "prediction" in locals() else pred_idx)
        return risk_label, risk_score
    except Exception:
        return None, None


def predict_food_risk(
    food_name: str = "Food Item",
    category: str = "Other",
    quantity: float = 1,
    unit: str = "pcs",
    expiration_date: Any = None,
    days_to_expiry: Optional[int] = None,
    storage_condition: Optional[str] = None,
    storage_type: Optional[str] = None,
    purchase_date: Optional[date] = None,
    shelf_life: Optional[int] = None,
    usage_frequency: Any = None,
    role: str = "personal",
) -> dict[str, Any]:
    storage = storage_condition or storage_type or "Room Temperature"
    expiry_date = coerce_expiration_date(expiration_date, days_to_expiry)
    days = int(days_to_expiry) if days_to_expiry is not None else (expiry_date - date.today()).days
    shelf = int(shelf_life or estimate_shelf_life(category))

    risk_label, risk_score, explanation, suggested_action = rule_based_predict(days)

    model_label, model_score = _predict_with_model(
        category=category,
        quantity=quantity,
        shelf_life=shelf,
        storage_condition=storage,
        days_to_expiry=days,
    )
    source = "rule_based_fallback"
    if model_label:
        risk_label = model_label
        risk_score = float(model_score if model_score is not None else risk_score)
        source = "risk_model_joblib"
        if risk_label == "High Risk":
            explanation = "The model predicts a high waste risk based on expiry, category, quantity, and storage condition."
            suggested_action = "Use today"
        elif risk_label == "Warning":
            explanation = "The model predicts a medium waste risk. Plan usage before quality drops."
            suggested_action = "Plan usage within 1-2 days"
        else:
            explanation = "The model predicts this item is still relatively safe if stored properly."
            suggested_action = "Keep monitoring"

    recommendation = build_recommendation(food_name, risk_label, days, category)
    suitable = risk_label in {"High Risk", "Warning"}

    return {
        "food_name": food_name,
        "category": category,
        "quantity": quantity,
        "unit": unit,
        "days_to_expiry": days,
        "expiration_date": expiry_date.isoformat(),
        "storage_condition": storage,
        "shelf_life": shelf,
        "risk_label": risk_label,
        "risk_level": risk_label,
        "risk_score": round(float(risk_score), 4),
        "confidence": 0.9 if source == "rule_based_fallback" else round(float(risk_score), 4),
        "explanation": explanation,
        "recommendation": recommendation,
        "suggested_action": suggested_action,
        "suitable_for_marketplace": suitable,
        "suitable_for_donation": suitable,
        "source": source,
        "role": role,
    }
