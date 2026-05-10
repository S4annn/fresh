from __future__ import annotations

import importlib.util
import json
import re
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ARTIFACTS_DIR / "food_vision_model.keras"
LABELS_PATH = ARTIFACTS_DIR / "food_labels.json"
METADATA_PATH = ARTIFACTS_DIR / "food_metadata.json"
IMAGE_SIZE = (160, 160)

_ASSETS: dict[str, Any] = {
    "loaded": False,
    "model": None,
    "labels": [],
    "metadata": {},
    "error": None,
}


def _safe_json(path: Path, default: Any) -> Any:
    try:
        if not path.exists():
            return default
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _extract_labels(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(item) for item in raw if str(item).strip()]
    if isinstance(raw, dict):
        for key in ("labels", "classes", "class_names", "food_labels"):
            value = raw.get(key)
            if isinstance(value, list):
                return [str(item) for item in value if str(item).strip()]
        if raw and all(str(key).isdigit() for key in raw):
            return [str(raw[key]) for key in sorted(raw.keys(), key=lambda item: int(item))]
        if raw and all(isinstance(value, int) for value in raw.values()):
            return [label for label, _ in sorted(raw.items(), key=lambda item: item[1])]
    return []


@lru_cache(maxsize=1)
def load_assets() -> dict[str, Any]:
    """Load TensorFlow model and JSON metadata once; never raise during API use."""
    if _ASSETS["loaded"]:
        return _ASSETS

    _ASSETS["loaded"] = True
    print("ARTIFACTS_DIR:", ARTIFACTS_DIR, flush=True)
    print("MODEL_PATH:", MODEL_PATH, flush=True)
    print("MODEL_EXISTS:", MODEL_PATH.exists(), flush=True)
    print("LABELS_EXISTS:", LABELS_PATH.exists(), flush=True)
    print("METADATA_EXISTS:", METADATA_PATH.exists(), flush=True)

    labels = _extract_labels(_safe_json(LABELS_PATH, []))
    metadata = _safe_json(METADATA_PATH, {})
    _ASSETS["labels"] = labels
    _ASSETS["metadata"] = metadata if isinstance(metadata, dict) else {}

    if not MODEL_PATH.exists():
        _ASSETS["error"] = "food_vision_model.keras not found"
        print("MODEL_LOAD_ERROR:", _ASSETS["error"], flush=True)
        return _ASSETS

    if importlib.util.find_spec("tensorflow") is None:
        _ASSETS["error"] = "tensorflow is not installed"
        print("MODEL_LOAD_ERROR:", _ASSETS["error"], flush=True)
        return _ASSETS

    try:
        import tensorflow as tf

        custom_objects = {
            "preprocess_input": tf.keras.applications.mobilenet_v2.preprocess_input,
            "function": tf.keras.applications.mobilenet_v2.preprocess_input,
        }
        original_dense_from_config = tf.keras.layers.Dense.from_config

        @classmethod
        def dense_from_config_compat(cls: Any, config: dict[str, Any]) -> Any:
            clean_config = dict(config)
            clean_config.pop("quantization_config", None)
            return original_dense_from_config(clean_config)

        try:
            tf.keras.layers.Dense.from_config = dense_from_config_compat
            try:
                _ASSETS["model"] = tf.keras.models.load_model(
                    MODEL_PATH,
                    compile=False,
                    custom_objects=custom_objects,
                    safe_mode=False,
                )
            except TypeError:
                _ASSETS["model"] = tf.keras.models.load_model(
                    MODEL_PATH,
                    compile=False,
                    custom_objects=custom_objects,
                )
        finally:
            tf.keras.layers.Dense.from_config = original_dense_from_config

        _ASSETS["error"] = None
        print("MODEL_LOADED: True", flush=True)
    except Exception as exc:
        _ASSETS["model"] = None
        _ASSETS["error"] = str(exc)[:700]
        print("MODEL_LOAD_ERROR:", str(exc), flush=True)

    return _ASSETS


def get_risk_label(shelf_life: int) -> str:
    if shelf_life <= 2:
        return "High Risk"
    if shelf_life <= 5:
        return "Warning"
    return "Safe"


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _display_label(label: str) -> str:
    return (label or "Unknown Food").replace("_", " ").replace("-", " ").strip().title()


def _metadata_for(label: str) -> dict[str, Any]:
    metadata = load_assets().get("metadata") or {}
    if label in metadata and isinstance(metadata[label], dict):
        return metadata[label]

    normalized_label = _normalize(label)
    for key, value in metadata.items():
        if isinstance(value, dict) and _normalize(key) == normalized_label:
            return value
    return {}


def _food_response(label: str, confidence: float, source: str) -> dict[str, Any]:
    record = _metadata_for(label)
    detected_food = (
        record.get("detected_food")
        or record.get("food_name")
        or record.get("name")
        or _display_label(label)
    )
    category = record.get("category", "Other")
    shelf_life = int(
        record.get("estimated_shelf_life_days")
        or record.get("shelf_life_days")
        or record.get("shelf_life")
        or 5
    )
    storage = record.get("storage") or record.get("storage_condition") or "Refrigerator"
    recommendations = record.get("recommendations") or [
        "Use while still fresh",
        "Check smell, texture, and packaging before consuming",
    ]

    return {
        "detected_food": detected_food,
        "category": category,
        "confidence": round(float(confidence), 4),
        "source": source,
        "estimated_shelf_life_days": shelf_life,
        "risk_label": get_risk_label(shelf_life),
        "storage_advice": record.get("storage_advice") or f"Store in {storage}.",
        "recommendations": recommendations,
        "suggested_inventory": {
            "food_name": detected_food,
            "category": category,
            "quantity": 1,
            "unit": "pcs",
            "storage_condition": storage,
            "shelf_life": shelf_life,
        },
    }


def _fallback_from_filename(filename: Optional[str]) -> dict[str, Any]:
    name = _normalize(filename or "")
    keyword_map = {
        "tomato": "Tomato",
        "tomat": "Tomato",
        "banana": "Banana",
        "pisang": "Banana",
        "bean": "Bean",
        "buncis": "Bean",
        "broccoli": "Broccoli",
        "carrot": "Carrot",
        "wortel": "Carrot",
        "cabbage": "Cabbage",
        "kol": "Cabbage",
        "potato": "Potato",
        "kentang": "Potato",
        "papaya": "Papaya",
        "pepaya": "Papaya",
        "cucumber": "Cucumber",
        "timun": "Cucumber",
        "lettuce": "Cabbage",
    }
    for keyword, label in keyword_map.items():
        if keyword in name:
            return _food_response(label, 0.45, "fallback_filename")
    return _unknown_response()


def _unknown_response() -> dict[str, Any]:
    return {
        "detected_food": "Unknown Food",
        "category": "Other",
        "confidence": 0.0,
        "source": "fallback_no_model",
        "estimated_shelf_life_days": 5,
        "risk_label": "Warning",
        "storage_advice": "Store appropriately based on the food type.",
        "recommendations": [
            "Identify the food manually",
            "Check expiry date and freshness before consuming",
            "When unsure, keep refrigerated and use soon",
        ],
        "suggested_inventory": {
            "food_name": "Unknown Food",
            "category": "Other",
            "quantity": 1,
            "unit": "pcs",
            "storage_condition": "Refrigerator",
            "shelf_life": 5,
        },
    }


def predict_food_from_image(image_bytes: bytes, filename: Optional[str] = None) -> dict[str, Any]:
    assets = load_assets()
    model = assets.get("model")
    labels = assets.get("labels") or []

    if model is None:
        if assets.get("error"):
            print("MODEL_UNAVAILABLE:", assets.get("error"), flush=True)
        return _fallback_from_filename(filename)

    try:
        import numpy as np
        from PIL import Image

        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image = image.resize(IMAGE_SIZE)
        array = np.asarray(image, dtype="float32") / 255.0
        batch = np.expand_dims(array, axis=0)

        predictions = model.predict(batch, verbose=0)
        probabilities = np.asarray(predictions).reshape(-1)
        if probabilities.size == 0:
            return _fallback_from_filename(filename)

        pred_idx = int(np.argmax(probabilities))
        confidence = float(probabilities[pred_idx])
        label = labels[pred_idx] if pred_idx < len(labels) else f"class_{pred_idx}"
        return _food_response(label, confidence, "tensorflow_vision_model")
    except Exception as exc:
        _ASSETS["error"] = str(exc)[:700]
        print("MODEL_PREDICT_ERROR:", str(exc), flush=True)
        return _fallback_from_filename(filename)


def vision_model_status() -> dict[str, Any]:
    assets = load_assets()
    return {
        "artifacts_dir": str(ARTIFACTS_DIR),
        "model_file": str(MODEL_PATH),
        "model_available": MODEL_PATH.exists(),
        "labels_file": str(LABELS_PATH),
        "labels_count": len(assets.get("labels") or []),
        "metadata_file": str(METADATA_PATH),
        "metadata_count": len(assets.get("metadata") or {}),
        "tensorflow_installed": importlib.util.find_spec("tensorflow") is not None,
        "model_loaded": assets.get("model") is not None,
        "last_error": assets.get("error"),
    }
