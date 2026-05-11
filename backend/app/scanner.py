"""
F.R.E.S.H AI Food Scanner
=========================
Image-based food classification for the scanner feature.

The scanner now tries to use the Keras vision model in backend/artifacts first:
    - food_vision_model.keras
    - food_labels.json
    - food_metadata.json

If TensorFlow/Pillow/model loading is unavailable, it falls back to the previous
filename heuristic so the app does not crash during local development or when
the backend is deployed without the heavy ML dependencies.
"""

from __future__ import annotations

import importlib.util
import json
import re
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any, Optional


ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
VISION_MODEL_PATH = ARTIFACTS_DIR / "food_vision_model.keras"
LABELS_PATH = ARTIFACTS_DIR / "food_labels.json"
FOOD_METADATA_PATH = ARTIFACTS_DIR / "food_metadata.json"
DEFAULT_IMAGE_SIZE = (224, 224)

_VISION_RUNTIME: dict[str, Any] = {
    "loaded": False,
    "model": None,
    "tf": None,
    "np": None,
    "Image": None,
    "error": None,
}


def _set_runtime_error(error: Any) -> None:
    message = str(error)
    if len(message) > 700:
        message = message[:697] + "..."
    _VISION_RUNTIME["error"] = message


# Food knowledge base used by filename fallback and as enrichment for model
# classes that overlap with the original MVP scanner.
FOOD_DATABASE = {
    "banana": {
        "detected_food": "Banana",
        "category": "Fruit",
        "estimated_shelf_life_days": 3,
        "storage": "Room Temperature",
        "risk_label": "Warning",
        "confidence": 0.92,
        "storage_advice": "Store at room temperature away from direct sunlight. Refrigerate only when fully ripe.",
        "recommendations": [
            "Use within 2-3 days",
            "Make banana smoothie or banana bread",
            "Freeze sliced banana for later use",
            "If still fresh, list in marketplace or donate",
        ],
    },
    "apple": {
        "detected_food": "Apple",
        "category": "Fruit",
        "estimated_shelf_life_days": 7,
        "storage": "Refrigerator",
        "risk_label": "Safe",
        "confidence": 0.91,
        "storage_advice": "Store in refrigerator to extend freshness up to 2 weeks.",
        "recommendations": [
            "Store in refrigerator for longer shelf life",
            "Make apple juice or apple crumble",
            "Great for snacking or salads",
            "Can be frozen for smoothies",
        ],
    },
    "tomato": {
        "detected_food": "Tomato",
        "category": "Vegetable",
        "estimated_shelf_life_days": 5,
        "storage": "Room Temperature",
        "risk_label": "Warning",
        "confidence": 0.88,
        "storage_advice": "Store at room temperature. Refrigerate only if fully ripe to slow ripening.",
        "recommendations": [
            "Use within 3-5 days",
            "Make homemade tomato sauce",
            "Add to salads or sandwiches",
            "Freeze diced tomatoes for cooking",
        ],
    },
    "milk": {
        "detected_food": "Milk",
        "category": "Dairy",
        "estimated_shelf_life_days": 3,
        "storage": "Refrigerator",
        "risk_label": "Warning",
        "confidence": 0.93,
        "storage_advice": "Keep refrigerated at 4C or below. Do not leave at room temperature.",
        "recommendations": [
            "Keep refrigerated at all times",
            "Use for cooking, smoothies, or cereal",
            "Check expiry date before consuming",
            "Can be used for baking if near expiry",
        ],
    },
    "egg": {
        "detected_food": "Egg",
        "category": "Protein",
        "estimated_shelf_life_days": 14,
        "storage": "Refrigerator",
        "risk_label": "Safe",
        "confidence": 0.95,
        "storage_advice": "Store in refrigerator. Keep in original carton to prevent odor absorption.",
        "recommendations": [
            "Store in refrigerator",
            "Use for scrambled, boiled, or fried meals",
            "Check freshness with water float test",
            "Can be frozen beaten for up to 1 year",
        ],
    },
    "bread": {
        "detected_food": "Bread",
        "category": "Bakery",
        "estimated_shelf_life_days": 4,
        "storage": "Room Temperature",
        "risk_label": "Warning",
        "confidence": 0.87,
        "storage_advice": "Store in cool dry place in sealed bag. Freeze for longer storage.",
        "recommendations": [
            "Store in cool dry place",
            "Freeze if not using within 2 days",
            "Make french toast or bread pudding",
            "Use for croutons or breadcrumbs if stale",
        ],
    },
    "chicken": {
        "detected_food": "Chicken",
        "category": "Protein",
        "estimated_shelf_life_days": 2,
        "storage": "Refrigerator",
        "risk_label": "High Risk",
        "confidence": 0.90,
        "storage_advice": "Keep refrigerated below 4C. Cook within 1-2 days or freeze immediately.",
        "recommendations": [
            "Cook immediately or freeze",
            "Do not leave at room temperature",
            "Marinate and cook today for best quality",
            "Freeze in portions for later use",
        ],
    },
    "spinach": {
        "detected_food": "Spinach",
        "category": "Vegetable",
        "estimated_shelf_life_days": 2,
        "storage": "Refrigerator",
        "risk_label": "High Risk",
        "confidence": 0.85,
        "storage_advice": "Store in refrigerator in sealed bag. Use within 2 days for best quality.",
        "recommendations": [
            "Use immediately because spinach wilts fast",
            "Make stir-fry or soup today",
            "Blanch and freeze if not using now",
            "Add to smoothies for nutrition boost",
        ],
    },
    "cheese": {
        "detected_food": "Cheese",
        "category": "Dairy",
        "estimated_shelf_life_days": 10,
        "storage": "Refrigerator",
        "risk_label": "Safe",
        "confidence": 0.89,
        "storage_advice": "Keep wrapped tightly in refrigerator. Hard cheeses last longer than soft.",
        "recommendations": [
            "Keep wrapped tightly in refrigerator",
            "Great for sandwiches, pasta, or snacking",
            "Check for mold before consuming",
            "Can be frozen for up to 6 months",
        ],
    },
    "yogurt": {
        "detected_food": "Yogurt",
        "category": "Dairy",
        "estimated_shelf_life_days": 5,
        "storage": "Refrigerator",
        "risk_label": "Warning",
        "confidence": 0.91,
        "storage_advice": "Keep refrigerated. Do not freeze as it changes texture.",
        "recommendations": [
            "Keep refrigerated",
            "Great for breakfast with fruits",
            "Use as base for smoothies or dips",
            "Can be used in baking as buttermilk substitute",
        ],
    },
}

KEYWORD_MAP = {
    "greenbeans": "bean",
    "greenbean": "bean",
    "beans": "bean",
    "bean": "bean",
    "buncis": "bean",
    "banana": "banana",
    "pisang": "banana",
    "apple": "apple",
    "apel": "apple",
    "tomato": "tomato",
    "tomat": "tomato",
    "milk": "milk",
    "susu": "milk",
    "egg": "egg",
    "telur": "egg",
    "bread": "bread",
    "roti": "bread",
    "chicken": "chicken",
    "ayam": "chicken",
    "spinach": "spinach",
    "bayam": "spinach",
    "cheese": "cheese",
    "keju": "cheese",
    "yogurt": "yogurt",
    "broccoli": "broccoli",
    "carrot": "carrot",
    "wortel": "carrot",
    "cabbage": "cabbage",
    "kol": "cabbage",
    "potato": "potato",
    "kentang": "potato",
    "papaya": "papaya",
    "pepaya": "papaya",
    "cucumber": "cucumber",
    "timun": "cucumber",
}

UNKNOWN_FOOD = {
    "detected_food": "Unknown Food",
    "category": "Other",
    "estimated_shelf_life_days": 5,
    "storage": "Refrigerator",
    "risk_label": "Warning",
    "confidence": 0.45,
    "storage_advice": "Store appropriately based on food type. Check packaging for storage instructions.",
    "recommendations": [
        "Identify the food item manually",
        "Check expiry date on packaging",
        "Store appropriately based on food type",
        "When in doubt, refrigerate",
    ],
}


def _normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _display_label(label: str) -> str:
    return label.replace("_", " ").replace("-", " ").strip().title()


def _safe_int(value: Any, default: int = 5) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _load_json(path: Path, default: Any) -> Any:
    try:
        if not path.exists():
            return default
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return default


@lru_cache(maxsize=1)
def _food_metadata() -> dict[str, Any]:
    data = _load_json(FOOD_METADATA_PATH, {})
    return data if isinstance(data, dict) else {}


def _extract_labels(data: Any) -> list[str]:
    if isinstance(data, list):
        return [str(item) for item in data if str(item).strip()]

    if not isinstance(data, dict):
        return []

    for key in ("labels", "classes", "class_names", "food_labels"):
        nested = data.get(key)
        if isinstance(nested, list):
            return [str(item) for item in nested if str(item).strip()]

    for key in ("class_indices", "label_to_index", "class_to_index"):
        mapping = data.get(key)
        if isinstance(mapping, dict):
            pairs = []
            for label, index in mapping.items():
                try:
                    pairs.append((int(index), str(label)))
                except (TypeError, ValueError):
                    continue
            if pairs:
                return [label for _, label in sorted(pairs)]

    if data and all(str(key).isdigit() for key in data.keys()):
        return [str(data[key]) for key in sorted(data.keys(), key=lambda item: int(item))]

    if data and all(isinstance(value, int) for value in data.values()):
        return [label for label, _ in sorted(data.items(), key=lambda item: item[1])]

    return []


def _resolve_class_labels_with_source() -> tuple[list[str], str]:
    raw_labels = _load_json(LABELS_PATH, [])
    labels = _extract_labels(raw_labels)
    metadata = _food_metadata()

    # A labels file containing only "train" usually means the dataset folder was
    # saved instead of class labels. Use metadata keys in that case.
    if (len(labels) <= 1 or labels == ["train"]) and metadata:
        food_keys = [
            key
            for key, value in metadata.items()
            if isinstance(value, dict) and key not in {"labels", "classes", "class_indices"}
        ]
        if food_keys:
            return food_keys, "food_metadata.json"

    return labels, "food_labels.json"


def _resolve_class_labels() -> list[str]:
    labels, _ = _resolve_class_labels_with_source()
    return labels


def get_risk_label(shelf_life_days: int) -> str:
    if shelf_life_days <= 2:
        return "High Risk"
    if shelf_life_days <= 5:
        return "Warning"
    return "Safe"


def _metadata_record_for_label(label: str) -> Optional[dict[str, Any]]:
    metadata = _food_metadata()
    if label in metadata and isinstance(metadata[label], dict):
        return metadata[label]

    normalized_label = _normalize_key(label)
    for key, value in metadata.items():
        if isinstance(value, dict) and _normalize_key(key) == normalized_label:
            return value
    return None


def _food_data_from_label(label: str, confidence: float) -> dict[str, Any]:
    record = _metadata_record_for_label(label)
    normalized_label = _normalize_key(label)

    if record:
        shelf_life = _safe_int(
            record.get("estimated_shelf_life_days")
            or record.get("shelf_life_days")
            or record.get("shelf_life"),
            default=5,
        )
        storage = record.get("storage") or record.get("storage_type") or "Refrigerator"
        recommendations = record.get("recommendations") or [
            f"Use within {shelf_life} days for best quality",
            "Check freshness before consuming",
            "List or donate if still fresh and surplus",
        ]
        storage_advice = record.get("storage_advice") or (
            f"Store in {storage}. Use within {shelf_life} days for best quality."
        )
        return {
            "detected_food": record.get("detected_food")
            or record.get("food_name")
            or record.get("name")
            or _display_label(label),
            "category": record.get("category", "Other"),
            "estimated_shelf_life_days": shelf_life,
            "storage": storage,
            "confidence": confidence,
            "storage_advice": storage_advice,
            "recommendations": recommendations,
            "model_label": label,
        }

    if normalized_label in FOOD_DATABASE:
        food_data = FOOD_DATABASE[normalized_label].copy()
        food_data["confidence"] = confidence
        food_data["model_label"] = label
        return food_data

    food_data = UNKNOWN_FOOD.copy()
    food_data.update(
        {
            "detected_food": _display_label(label) or "Unknown Food",
            "confidence": confidence,
            "model_label": label,
        }
    )
    return food_data


def classify_by_filename(filename: str) -> dict[str, Any]:
    name_lower = (filename or "").lower()
    for keyword, food_key in KEYWORD_MAP.items():
        if keyword in name_lower:
            record = _metadata_record_for_label(food_key)
            if record:
                return _food_data_from_label(food_key, 0.72)
            food_data = FOOD_DATABASE.get(food_key, UNKNOWN_FOOD).copy()
            food_data["classifier_note"] = "filename_match"
            return food_data
    food_data = UNKNOWN_FOOD.copy()
    food_data["classifier_note"] = "filename_unknown"
    return food_data


def _load_vision_runtime() -> bool:
    if _VISION_RUNTIME["loaded"]:
        return _VISION_RUNTIME["model"] is not None

    _VISION_RUNTIME["loaded"] = True

    if not VISION_MODEL_PATH.exists():
        _VISION_RUNTIME["error"] = "Vision model file was not found."
        return False

    try:
        import numpy as np
        import tensorflow as tf
        from PIL import Image

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
                model = tf.keras.models.load_model(
                    VISION_MODEL_PATH,
                    compile=False,
                    custom_objects=custom_objects,
                    safe_mode=False,
                )
            except TypeError:
                model = tf.keras.models.load_model(
                    VISION_MODEL_PATH,
                    compile=False,
                    custom_objects=custom_objects,
                )
        finally:
            tf.keras.layers.Dense.from_config = original_dense_from_config

        _VISION_RUNTIME.update(
            {
                "model": model,
                "tf": tf,
                "np": np,
                "Image": Image,
                "error": None,
            }
        )
        return True
    except Exception as exc:  # pragma: no cover - depends on optional runtime
        _set_runtime_error(exc)
        return False


def _target_size_for_model(model: Any) -> tuple[int, int]:
    shape = getattr(model, "input_shape", None)
    if isinstance(shape, list) and shape:
        shape = shape[0]
    if isinstance(shape, tuple) and len(shape) >= 4:
        height, width = shape[1], shape[2]
        if isinstance(height, int) and isinstance(width, int) and height > 0 and width > 0:
            return (width, height)
    return DEFAULT_IMAGE_SIZE


def _output_units_for_model(model: Any) -> Optional[int]:
    shape = getattr(model, "output_shape", None)
    if isinstance(shape, list) and shape:
        shape = shape[0]
    if isinstance(shape, tuple) and shape:
        units = shape[-1]
        if isinstance(units, int) and units > 0:
            return units
    return None


def _prepare_image(image_bytes: bytes, target_size: tuple[int, int]) -> Any:
    np = _VISION_RUNTIME["np"]
    Image = _VISION_RUNTIME["Image"]

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    image = image.resize(target_size)
    # The exported vision model includes its own preprocessing layer, so keep
    # this path aligned with the Colab notebook: raw RGB float32 pixels.
    array = np.asarray(image, dtype="float32")
    return np.expand_dims(array, axis=0)


def _as_probability_vector(predictions: Any) -> Any:
    np = _VISION_RUNTIME["np"]
    vector = np.asarray(predictions)
    if isinstance(predictions, (list, tuple)):
        vector = np.asarray(predictions[0])
    vector = vector.reshape(-1).astype("float32")

    if vector.size == 0:
        return None

    total = float(np.sum(vector))
    min_value = float(np.min(vector))
    max_value = float(np.max(vector))

    if min_value < 0 or max_value > 1 or total < 0.90 or total > 1.10:
        exp = np.exp(vector - np.max(vector))
        vector = exp / np.sum(exp)

    return vector


def classify_with_model(image_bytes: bytes) -> Optional[dict[str, Any]]:
    if not image_bytes or not _load_vision_runtime():
        return None

    try:
        model = _VISION_RUNTIME["model"]
        np = _VISION_RUNTIME["np"]

        target_size = _target_size_for_model(model)
        batch = _prepare_image(image_bytes, target_size)
        predictions = model.predict(batch, verbose=0)
        probabilities = _as_probability_vector(predictions)

        if probabilities is None:
            return None

        labels = _resolve_class_labels()
        if labels and len(labels) > 1 and probabilities.size != len(labels):
            _set_runtime_error(
                f"Model output size ({probabilities.size}) does not match labels count ({len(labels)}). "
                f"Re-export the model with Dense({len(labels)}, activation='softmax') and matching class labels."
            )
            return None

        predicted_index = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_index])

        if not labels or predicted_index >= len(labels):
            label = f"class_{predicted_index}"
        else:
            label = labels[predicted_index]

        return _food_data_from_label(label, confidence)
    except Exception as exc:  # pragma: no cover - depends on optional runtime
        _set_runtime_error(exc)
        return None


def build_scan_response(food_data: dict[str, Any], classifier: str) -> dict[str, Any]:
    shelf_life = _safe_int(food_data.get("estimated_shelf_life_days"), default=5)
    risk_label = get_risk_label(shelf_life)

    response = {
        "detected_food": food_data["detected_food"],
        "category": food_data["category"],
        "confidence": food_data.get("confidence", 0.75),
        "estimated_shelf_life_days": shelf_life,
        "risk_label": risk_label,
        "storage_advice": food_data.get("storage_advice", "Store appropriately."),
        "recommendations": food_data.get("recommendations", []),
        "classifier": classifier,
        "suggested_inventory": {
            "food_name": food_data["detected_food"],
            "category": food_data["category"],
            "quantity": 1,
            "unit": "pcs",
            "storage_type": food_data.get("storage", "Refrigerator"),
            "days_to_expiry": shelf_life,
        },
    }

    if food_data.get("model_label"):
        response["model_label"] = food_data["model_label"]
    if food_data.get("classifier_note"):
        response["classifier_note"] = food_data["classifier_note"]

    return response


def scanner_model_status() -> dict[str, Any]:
    labels, labels_source = _resolve_class_labels_with_source()
    metadata = _food_metadata()
    tensorflow_installed = importlib.util.find_spec("tensorflow") is not None
    pillow_installed = importlib.util.find_spec("PIL") is not None
    model = _VISION_RUNTIME.get("model")
    output_shape = str(getattr(model, "output_shape", None)) if model is not None else None
    input_shape = str(getattr(model, "input_shape", None)) if model is not None else None
    output_units = _output_units_for_model(model) if model is not None else None
    output_matches_labels = output_units is None or len(labels) <= 1 or output_units == len(labels)

    return {
        "model_file": str(VISION_MODEL_PATH),
        "model_available": VISION_MODEL_PATH.exists(),
        "tensorflow_installed": tensorflow_installed,
        "pillow_installed": pillow_installed,
        "labels_count": len(labels),
        "labels_source": labels_source,
        "labels_preview": labels[:10],
        "metadata_count": len(metadata),
        "model_loaded": model is not None,
        "model_input_shape": input_shape,
        "model_output_shape": output_shape,
        "model_output_units": output_units,
        "output_matches_labels": output_matches_labels,
        "can_attempt_model": bool(VISION_MODEL_PATH.exists() and tensorflow_installed and pillow_installed),
        "active": bool(model is not None and output_matches_labels and _VISION_RUNTIME.get("error") is None),
        "last_error": _VISION_RUNTIME.get("error"),
    }


def scan_food_image(filename: str, image_bytes: Optional[bytes] = None) -> dict[str, Any]:
    model_result = classify_with_model(image_bytes) if image_bytes else None
    if model_result:
        return build_scan_response(model_result, classifier="vision_model")

    food_data = classify_by_filename(filename)
    return build_scan_response(food_data, classifier="filename_fallback")
