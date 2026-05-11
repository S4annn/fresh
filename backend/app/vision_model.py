"""
F.R.E.S.H Vision Model
======================
Loads food_vision_model.keras and runs inference for the /scan-food endpoint.

Model spec (current):
  - Architecture : MobileNetV2 transfer learning
  - Input size   : 160 x 160 x 3
  - Preprocessing: tf.keras.applications.mobilenet_v2.preprocess_input  (range -1..1)
  - Labels file  : artifacts/food_labels.json
  - Metadata file: artifacts/food_metadata.json

To swap the model:
  1. Replace artifacts/food_vision_model.keras
  2. Replace artifacts/food_labels.json  (list of class names in training order)
  3. Replace artifacts/food_metadata.json (shelf-life / storage info per label)
  4. Restart the backend (or call POST /reload-model)
  5. Verify with GET /debug-model
"""

from __future__ import annotations

import importlib.util
import json
import re
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODEL_PATH    = ARTIFACTS_DIR / "food_vision_model.keras"
LABELS_PATH   = ARTIFACTS_DIR / "food_labels.json"
METADATA_PATH = ARTIFACTS_DIR / "food_metadata.json"

# Must match the IMG_SIZE used during training
IMAGE_SIZE = (160, 160)
CONFIDENCE_THRESHOLD = 0.60

# ─── In-memory asset store (loaded once per process) ─────────────────────────
_ASSETS: dict[str, Any] = {
    "loaded":   False,
    "model":    None,
    "labels":   [],
    "metadata": {},
    "error":    None,
}


# ─── JSON helpers ─────────────────────────────────────────────────────────────
def _safe_json(path: Path, default: Any) -> Any:
    try:
        if not path.exists():
            return default
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"[vision_model] JSON read error {path}: {exc}", flush=True)
        return default


def _extract_labels(raw: Any) -> list[str]:
    """Accept labels as a plain list or various dict shapes."""
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    if isinstance(raw, dict):
        for key in ("labels", "classes", "class_names", "food_labels"):
            value = raw.get(key)
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
        # {"0": "apple", "1": "banana", ...}
        if raw and all(str(k).isdigit() for k in raw):
            return [str(raw[k]) for k in sorted(raw.keys(), key=lambda x: int(x))]
        # {"apple": 0, "banana": 1, ...}
        if raw and all(isinstance(v, int) for v in raw.values()):
            return [lbl for lbl, _ in sorted(raw.items(), key=lambda x: x[1])]
    return []


# ─── Asset loader ─────────────────────────────────────────────────────────────
def load_assets(force_reload: bool = False) -> dict[str, Any]:
    """
    Load model + labels + metadata into _ASSETS.
    Safe to call multiple times — only loads once unless force_reload=True.
    """
    if _ASSETS["loaded"] and not force_reload:
        return _ASSETS

    # Reset
    _ASSETS.update({"loaded": True, "model": None, "labels": [], "metadata": {}, "error": None})

    print("=" * 60, flush=True)
    print("[vision_model] Loading assets...", flush=True)
    print("Loading vision model from:", MODEL_PATH, flush=True)
    print("Model exists:", MODEL_PATH.exists(), flush=True)
    print("Labels exists:", LABELS_PATH.exists(), flush=True)
    print("Metadata exists:", METADATA_PATH.exists(), flush=True)
    print(f"  ARTIFACTS_DIR : {ARTIFACTS_DIR}", flush=True)
    print(f"  MODEL_PATH    : {MODEL_PATH}  exists={MODEL_PATH.exists()}", flush=True)
    print(f"  LABELS_PATH   : {LABELS_PATH}  exists={LABELS_PATH.exists()}", flush=True)
    print(f"  METADATA_PATH : {METADATA_PATH}  exists={METADATA_PATH.exists()}", flush=True)

    # ── Labels ────────────────────────────────────────────────────────────────
    raw_labels = _safe_json(LABELS_PATH, [])
    labels = _extract_labels(raw_labels)
    _ASSETS["labels"] = labels
    print(f"  Labels loaded : {len(labels)}  preview={labels[:5]}", flush=True)

    # ── Metadata ──────────────────────────────────────────────────────────────
    metadata = _safe_json(METADATA_PATH, {})
    _ASSETS["metadata"] = metadata if isinstance(metadata, dict) else {}
    print(f"  Metadata keys : {len(_ASSETS['metadata'])}", flush=True)

    # Warn about labels missing from metadata
    missing = [lbl for lbl in labels if lbl not in _ASSETS["metadata"]]
    if missing:
        print(f"  [WARN] Labels missing metadata: {missing}", flush=True)

    # ── Model ─────────────────────────────────────────────────────────────────
    if not MODEL_PATH.exists():
        _ASSETS["error"] = f"Model file not found: {MODEL_PATH}"
        print(f"  [ERROR] {_ASSETS['error']}", flush=True)
        return _ASSETS

    if importlib.util.find_spec("tensorflow") is None:
        _ASSETS["error"] = "tensorflow is not installed (pip install tensorflow-cpu)"
        print(f"  [ERROR] {_ASSETS['error']}", flush=True)
        return _ASSETS

    try:
        import tensorflow as tf

        print(f"  TensorFlow version: {tf.__version__}", flush=True)
        custom_objects = {
            "preprocess_input": tf.keras.applications.mobilenet_v2.preprocess_input,
            "function": tf.keras.applications.mobilenet_v2.preprocess_input,
        }

        # Compatibility shim: some saved models include quantization_config
        # in Dense layer configs which older TF versions don't recognise.
        _orig_dense_from_config = tf.keras.layers.Dense.from_config

        @classmethod  # type: ignore[misc]
        def _compat_dense_from_config(cls: Any, config: dict[str, Any]) -> Any:
            config = {k: v for k, v in config.items() if k != "quantization_config"}
            return _orig_dense_from_config(config)

        tf.keras.layers.Dense.from_config = _compat_dense_from_config
        try:
            with tf.keras.utils.custom_object_scope(custom_objects):
                try:
                    model = tf.keras.models.load_model(
                        MODEL_PATH,
                        compile=False,
                        custom_objects=custom_objects,
                        safe_mode=False,
                    )
                except TypeError:
                    model = tf.keras.models.load_model(
                        MODEL_PATH,
                        compile=False,
                        custom_objects=custom_objects,
                    )
        finally:
            tf.keras.layers.Dense.from_config = _orig_dense_from_config

        # ── Validate output vs labels ─────────────────────────────────────────
        try:
            if model.output_shape[-1] != len(labels):
                raise ValueError(
                    f"Model output classes {model.output_shape[-1]} does not match labels count {len(labels)}"
                )
        except ValueError as exc:
            _ASSETS["error"] = str(exc)
            print(f"  [ERROR] {_ASSETS['error']}", flush=True)
            # Still store the model so /debug-model can report shapes
            _ASSETS["model"] = model
            return _ASSETS

        _ASSETS["model"] = model
        print(f"  Model loaded  : input={model.input_shape}  output={model.output_shape}", flush=True)
        print("=" * 60, flush=True)

    except Exception as exc:
        _ASSETS["model"] = None
        _ASSETS["error"] = str(exc)[:800]
        print(f"  [ERROR] Model load failed: {exc}", flush=True)
        print("=" * 60, flush=True)

    return _ASSETS


# ─── Helpers ──────────────────────────────────────────────────────────────────
def get_risk_label(shelf_life: int) -> str:
    if shelf_life <= 2:
        return "High Risk"
    if shelf_life <= 5:
        return "Warning"
    return "Safe"


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _display_label(label: str) -> str:
    if _normalize(label) == "raddish":
        return "Radish"
    return (label or "Unknown Food").replace("_", " ").replace("-", " ").strip().title()


def _metadata_for(label: str) -> dict[str, Any]:
    metadata = _ASSETS.get("metadata") or {}
    # Exact match
    if label in metadata and isinstance(metadata[label], dict):
        return metadata[label]
    # Case-insensitive / normalised match
    norm = _normalize(label)
    for key, value in metadata.items():
        if isinstance(value, dict) and _normalize(key) == norm:
            return value
    return {}


def _label_option(label: str) -> dict[str, Any]:
    record = _metadata_for(label)
    display = (
        record.get("detected_food")
        or record.get("food_name")
        or record.get("name")
        or _display_label(label)
    )
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
        "When in doubt, refrigerate and use soon",
    ]
    storage_advice = (
        record.get("storage_advice")
        or f"Store in {storage}. Use within {shelf_life} days for best quality."
    )
    return {
        "label": label,
        "display": display,
        "category": record.get("category", "Other"),
        "estimated_shelf_life_days": shelf_life,
        "risk_label": get_risk_label(shelf_life),
        "storage": storage,
        "storage_advice": storage_advice,
        "recommendations": recommendations,
    }


def _build_response(
    label: str,
    confidence: float,
    source: str,
    top_predictions: list[dict[str, Any]],
    load_error: Optional[str] = None,
) -> dict[str, Any]:
    record = _metadata_for(label)
    detected_food = (
        record.get("detected_food")
        or record.get("food_name")
        or record.get("name")
        or _display_label(label)
    )
    category   = record.get("category", "Other")
    shelf_life = int(
        record.get("estimated_shelf_life_days")
        or record.get("shelf_life_days")
        or record.get("shelf_life")
        or 5
    )
    storage = (
        record.get("storage")
        or record.get("storage_condition")
        or "Refrigerator"
    )
    recommendations = record.get("recommendations") or [
        "Use while still fresh",
        "Check smell, texture, and packaging before consuming",
        "When in doubt, refrigerate and use soon",
    ]
    storage_advice = (
        record.get("storage_advice")
        or f"Store in {storage}. Use within {shelf_life} days for best quality."
    )
    labels = _ASSETS.get("labels") or []
    is_low_confidence = float(confidence) < CONFIDENCE_THRESHOLD

    response: dict[str, Any] = {
        "detected_food":           detected_food,
        "category":                category,
        "confidence":              round(float(confidence), 4),
        "is_low_confidence":       is_low_confidence,
        "needs_review":            is_low_confidence,
        "confidence_threshold":     CONFIDENCE_THRESHOLD,
        "source":                  source,
        "estimated_shelf_life_days": shelf_life,
        "risk_label":              get_risk_label(shelf_life),
        "storage_advice":          storage_advice,
        "recommendations":         recommendations,
        "top_predictions":         top_predictions,
        "available_labels":        labels,
        "label_options":           [_label_option(lbl) for lbl in labels],
        "suggested_inventory": {
            "food_name":        detected_food,
            "category":         category,
            "quantity":         1,
            "unit":             "pcs",
            "storage_condition": storage,
            "shelf_life":       shelf_life,
        },
    }
    if load_error:
        response["error"] = load_error
    return response


def _unknown_response(error: Optional[str] = None) -> dict[str, Any]:
    return _build_response(
        label="Unknown Food",
        confidence=0.0,
        source="fallback_no_model",
        top_predictions=[],
        load_error=error or "Model not available",
    )


def _filename_fallback(filename: Optional[str], error: Optional[str] = None) -> dict[str, Any]:
    """Last-resort: guess from filename keywords."""
    name = _normalize(filename or "")
    keyword_map = {
        "tomato": "tomato", "tomat": "tomato",
        "banana": "banana", "pisang": "banana",
        "apple":  "apple",  "apel":  "apple",
        "carrot": "carrot", "wortel": "carrot",
        "spinach": "spinach", "bayam": "spinach",
        "potato": "potato", "kentang": "potato",
        "cabbage": "cabbage", "kol": "cabbage",
        "lettuce": "lettuce",
        "corn": "corn", "jagung": "corn",
        "cucumber": "cucumber", "timun": "cucumber",
        "mango": "mango", "mangga": "mango",
        "orange": "orange", "jeruk": "orange",
        "watermelon": "watermelon", "semangka": "watermelon",
        "pineapple": "pineapple", "nanas": "pineapple",
        "grapes": "grapes", "anggur": "grapes",
        "onion": "onion", "bawang": "onion",
        "garlic": "garlic",
        "ginger": "ginger", "jahe": "ginger",
        "eggplant": "eggplant", "terong": "eggplant",
        "pear": "pear",
        "kiwi": "kiwi",
        "lemon": "lemon",
        "paprika": "paprika",
        "capsicum": "capsicum",
        "cauliflower": "cauliflower",
        "beetroot": "beetroot",
        "peas": "peas",
        "sweetpotato": "sweetpotato",
        "sweetcorn": "sweetcorn",
        "pomegranate": "pomegranate",
        "turnip": "turnip",
        "raddish": "raddish",
        "soybeans": "soy beans", "soybean": "soy beans",
        "chilli": "chilli pepper", "chili": "chilli pepper",
        "jalepeno": "jalepeno",
    }
    for keyword, label in keyword_map.items():
        if keyword in name:
            return _build_response(
                label=label,
                confidence=0.45,
                source="fallback_no_model",
                top_predictions=[{"label": _display_label(label), "confidence": 0.45}],
                load_error=error,
            )
    return _unknown_response(error)


# ─── Main inference function ──────────────────────────────────────────────────
def predict_food_from_image(
    image_bytes: bytes,
    filename: Optional[str] = None,
) -> dict[str, Any]:
    """
    Run inference on image_bytes.
    Returns a response dict always — never raises.
    """
    assets = load_assets()
    model  = assets.get("model")
    labels = assets.get("labels") or []
    error  = assets.get("error")

    # Model not available → filename fallback
    if model is None:
        print(f"[vision_model] Model unavailable, using filename fallback. error={error}", flush=True)
        return _filename_fallback(filename, error)

    # Output/label mismatch → filename fallback
    output_units = model.output_shape[-1] if model.output_shape else None
    if output_units and labels and output_units != len(labels):
        mismatch_err = (
            f"Model output classes {output_units} does not match labels count {len(labels)}"
        )
        print(f"[vision_model] {mismatch_err}", flush=True)
        return _filename_fallback(filename, mismatch_err)

    try:
        import numpy as np
        import tensorflow as tf
        from PIL import Image

        # ── Preprocess ────────────────────────────────────────────────────────
        # IMPORTANT: use MobileNetV2 preprocess_input (scales to -1..1),
        # NOT simple /255.0 normalisation.
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image = image.resize(IMAGE_SIZE)
        array = np.array(image, dtype="float32")
        batch = np.expand_dims(array, axis=0)
        batch = tf.keras.applications.mobilenet_v2.preprocess_input(batch)

        # ── Predict ───────────────────────────────────────────────────────────
        raw_preds   = model.predict(batch, verbose=0)
        probs       = np.asarray(raw_preds).reshape(-1).astype("float32")

        if probs.size == 0:
            return _filename_fallback(filename, "Model returned empty predictions")

        # ── Top-5 predictions ─────────────────────────────────────────────────
        top_n    = min(5, len(probs))
        top_idxs = np.argsort(probs)[::-1][:top_n]
        top_predictions = [
            {
                "label":      _label_option(labels[i])["display"] if i < len(labels) else f"Class {i}",
                "confidence": round(float(probs[i]), 4),
            }
            for i in top_idxs
        ]

        # ── Best prediction ───────────────────────────────────────────────────
        best_idx    = int(top_idxs[0])
        best_conf   = float(probs[best_idx])
        best_label  = labels[best_idx] if best_idx < len(labels) else f"class_{best_idx}"

        print(
            f"[vision_model] Predicted: {best_label} ({best_conf:.3f})  "
            f"top5={[(p['label'], round(p['confidence'],3)) for p in top_predictions]}",
            flush=True,
        )

        return _build_response(
            label=best_label,
            confidence=best_conf,
            source="tensorflow_vision_model",
            top_predictions=top_predictions,
        )

    except Exception as exc:
        err_msg = str(exc)[:700]
        print(f"[vision_model] Inference error: {err_msg}", flush=True)
        _ASSETS["error"] = err_msg
        return _filename_fallback(filename, err_msg)


# ─── Status / debug helpers ───────────────────────────────────────────────────
def vision_model_status() -> dict[str, Any]:
    """Lightweight status — does NOT trigger model load."""
    assets  = _ASSETS
    model   = assets.get("model")
    labels  = assets.get("labels") or []
    metadata = assets.get("metadata") or {}

    output_units = model.output_shape[-1] if (model and model.output_shape) else None
    input_shape  = str(model.input_shape)  if model else None
    output_shape = str(model.output_shape) if model else None

    missing_metadata = [lbl for lbl in labels if lbl not in metadata]

    return {
        "artifacts_dir":        str(ARTIFACTS_DIR),
        "model_file":           str(MODEL_PATH),
        "model_available":      MODEL_PATH.exists(),
        "labels_file":          str(LABELS_PATH),
        "labels_available":     LABELS_PATH.exists(),
        "metadata_file":        str(METADATA_PATH),
        "metadata_available":   METADATA_PATH.exists(),
        "tensorflow_installed": importlib.util.find_spec("tensorflow") is not None,
        "model_loaded":         model is not None,
        "model_input_shape":    input_shape,
        "model_output_shape":   output_shape,
        "model_output_units":   output_units,
        "labels_count":         len(labels),
        "labels_preview":       labels[:10],
        "metadata_count":       len(metadata),
        "missing_metadata":     missing_metadata,
        "output_matches_labels": (
            output_units is None
            or not labels
            or output_units == len(labels)
        ),
        "active":    model is not None and not assets.get("error"),
        "last_error": assets.get("error"),
    }


def debug_model_info() -> dict[str, Any]:
    """
    Full debug info — triggers model load if not yet loaded.
    Used by GET /debug-model.
    """
    assets  = load_assets()
    model   = assets.get("model")
    labels  = assets.get("labels") or []
    metadata = assets.get("metadata") or {}

    tf_version = None
    tf_installed = importlib.util.find_spec("tensorflow") is not None
    if tf_installed:
        try:
            import tensorflow as tf
            tf_version = tf.__version__
        except Exception:
            pass

    output_units = model.output_shape[-1] if (model and model.output_shape) else None
    input_shape  = str(model.input_shape)  if model else None
    output_shape = str(model.output_shape) if model else None
    missing_metadata = [lbl for lbl in labels if lbl not in metadata]

    return {
        "artifacts_dir":         str(ARTIFACTS_DIR),
        "model_path":            str(MODEL_PATH),
        "model_exists":          MODEL_PATH.exists(),
        "labels_path":           str(LABELS_PATH),
        "labels_exists":         LABELS_PATH.exists(),
        "metadata_path":         str(METADATA_PATH),
        "metadata_exists":       METADATA_PATH.exists(),
        "tensorflow_import":     tf_installed,
        "tensorflow_installed":  tf_installed,
        "tensorflow_version":    tf_version,
        "model_load_success":    model is not None and not assets.get("error"),
        "model_input_shape":     input_shape,
        "model_output_shape":    output_shape,
        "model_output_units":    output_units,
        "labels_count":          len(labels),
        "labels_preview":        labels[:15],
        "metadata_count":        len(metadata),
        "metadata_keys_preview": list(metadata.keys())[:15],
        "missing_metadata":      missing_metadata,
        "output_matches_labels": (
            output_units is None
            or not labels
            or output_units == len(labels)
        ),
        "image_size_used":       list(IMAGE_SIZE),
        "preprocessing":         "mobilenet_v2.preprocess_input (range -1 to 1)",
        "error":                 assets.get("error"),
    }


def debug_labels_info() -> dict[str, Any]:
    """Return labels and correction metadata for the active scanner artifacts."""
    assets = load_assets()
    labels = assets.get("labels") or []
    return {
        "labels_count": len(labels),
        "labels": labels,
        "label_options": [_label_option(label) for label in labels],
        "error": assets.get("error"),
    }
