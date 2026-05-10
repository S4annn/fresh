from __future__ import annotations

import json
from datetime import date
from pathlib import Path
import joblib
import pandas as pd

from .recommendation import build_recommendation

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = ROOT / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "risk_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "model_metadata.json"

_model_bundle = None

def load_model_bundle():
    global _model_bundle
    if _model_bundle is None and MODEL_PATH.exists():
        _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle

def model_metadata() -> dict:
    if METADATA_PATH.exists():
        return json.loads(METADATA_PATH.read_text())
    return {"status": "metadata not found", "mode": "rule-based fallback"}

def estimate_shelf_life(category: str) -> int:
    cat = (category or "").lower()
    if "dairy" in cat or "susu" in cat:
        return 7
    if "fruit" in cat or "buah" in cat:
        return 7
    if "vegetable" in cat or "sayur" in cat:
        return 5
    if "meat" in cat or "daging" in cat:
        return 3
    return 7

def rule_based_predict(days_to_expiry: int, shelf_life: int) -> tuple[str, float]:
    ratio = days_to_expiry / max(shelf_life, 1)
    if days_to_expiry <= 1 or ratio <= 0.15:
        return "High Risk", 0.85
    if days_to_expiry <= 3 or ratio <= 0.35:
        return "Warning", 0.55
    return "Safe", 0.15

def predict_food_risk(
    food_name: str,
    category: str,
    quantity: float,
    expiration_date: date,
    storage_condition: str = "Room Temperature",
    purchase_date: date | None = None,
    shelf_life: int | None = None
) -> dict:
    today = date.today()
    days_to_expiry = (expiration_date - today).days
    shelf_life = int(shelf_life or estimate_shelf_life(category))

    bundle = load_model_bundle()
    risk_level, risk_score = rule_based_predict(days_to_expiry, shelf_life)

    if bundle is not None:
        pipeline = bundle["pipeline"]
        label_encoder = bundle["label_encoder"]
        row = pd.DataFrame([{
            "category": category,
            "quantity": float(quantity or 0),
            "shelf_life": shelf_life,
            "storage_condition": storage_condition,
            "days_to_expiry": days_to_expiry
        }])
        if hasattr(pipeline, "predict_proba"):
            proba = pipeline.predict_proba(row)[0]
            pred_idx = int(proba.argmax())
            risk_level = str(label_encoder.inverse_transform([pred_idx])[0])
            risk_score = float(proba[pred_idx])
        else:
            pred_idx = int(pipeline.predict(row)[0])
            risk_level = str(label_encoder.inverse_transform([pred_idx])[0])
            risk_score = 0.5

    recommendation = build_recommendation(food_name, risk_level, days_to_expiry, category)

    return {
        "food_name": food_name,
        "category": category,
        "days_to_expiry": days_to_expiry,
        "risk_level": risk_level,
        "risk_score": round(float(risk_score), 4),
        "recommendation": recommendation
    }
