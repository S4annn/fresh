"""
F.R.E.S.H AI Food Scanner
=========================
This module handles image-based food classification.

Current implementation: Rule-based fallback classifier using filename heuristics.

TODO: Replace with real CNN/Transfer Learning model when available.
Steps to upgrade:
1. Train a MobileNetV2 or EfficientNet model on food dataset
2. Save model to artifacts/food_classifier.h5
3. Uncomment the TensorFlow section below
4. Replace `classify_by_filename()` with `classify_with_model()`
"""

import os
import random
from typing import Optional

# ─── Food Knowledge Base ──────────────────────────────────────────────────────
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
            "If still fresh, list in marketplace or donate"
        ]
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
            "Can be frozen for smoothies"
        ]
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
            "Freeze diced tomatoes for cooking"
        ]
    },
    "milk": {
        "detected_food": "Milk",
        "category": "Dairy",
        "estimated_shelf_life_days": 3,
        "storage": "Refrigerator",
        "risk_label": "Warning",
        "confidence": 0.93,
        "storage_advice": "Keep refrigerated at 4°C or below. Do not leave at room temperature.",
        "recommendations": [
            "Keep refrigerated at all times",
            "Use for cooking, smoothies, or cereal",
            "Check expiry date before consuming",
            "Can be used for baking if near expiry"
        ]
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
            "Versatile for cooking — scrambled, boiled, or fried",
            "Check freshness with water float test",
            "Can be frozen (beaten) for up to 1 year"
        ]
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
            "Use for croutons or breadcrumbs if stale"
        ]
    },
    "chicken": {
        "detected_food": "Chicken",
        "category": "Protein",
        "estimated_shelf_life_days": 2,
        "storage": "Refrigerator",
        "risk_label": "High Risk",
        "confidence": 0.90,
        "storage_advice": "Keep refrigerated below 4°C. Cook within 1-2 days or freeze immediately.",
        "recommendations": [
            "Cook immediately or freeze",
            "Do not leave at room temperature",
            "Marinate and cook today for best quality",
            "Freeze in portions for later use"
        ]
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
            "Use immediately — spinach wilts fast",
            "Make stir-fry or soup today",
            "Blanch and freeze if not using now",
            "Add to smoothies for nutrition boost"
        ]
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
            "Can be frozen for up to 6 months"
        ]
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
            "Can be used in baking as buttermilk substitute"
        ]
    },
}

# Keyword mapping for filename-based detection
KEYWORD_MAP = {
    "banana": "banana", "pisang": "banana",
    "apple": "apple", "apel": "apple",
    "tomato": "tomato", "tomat": "tomato",
    "milk": "milk", "susu": "milk",
    "egg": "egg", "telur": "egg",
    "bread": "bread", "roti": "bread",
    "chicken": "chicken", "ayam": "chicken",
    "spinach": "spinach", "bayam": "spinach",
    "cheese": "cheese", "keju": "cheese",
    "yogurt": "yogurt",
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
        "When in doubt, refrigerate"
    ]
}


def get_risk_label(shelf_life_days: int) -> str:
    """Determine risk label based on shelf life."""
    if shelf_life_days <= 2:
        return "High Risk"
    elif shelf_life_days <= 5:
        return "Warning"
    return "Safe"


def classify_by_filename(filename: str) -> dict:
    """
    Fallback classifier based on filename keywords.
    Replace this with classify_with_model() when CNN model is available.
    """
    name_lower = filename.lower()
    for keyword, food_key in KEYWORD_MAP.items():
        if keyword in name_lower:
            food_data = FOOD_DATABASE.get(food_key, UNKNOWN_FOOD).copy()
            return food_data
    return UNKNOWN_FOOD.copy()


# ─── TODO: Replace with real model when available ─────────────────────────────
# def classify_with_model(image_bytes: bytes) -> dict:
#     """
#     Classify food using trained CNN model.
#     Requires: artifacts/food_classifier.h5
#     """
#     import tensorflow as tf
#     import numpy as np
#     from PIL import Image
#     import io
#
#     MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'food_classifier.h5')
#     CLASS_LABELS = list(FOOD_DATABASE.keys())  # Must match training labels
#
#     # Load model (lazy load in production)
#     model = tf.keras.models.load_model(MODEL_PATH)
#
#     # Preprocess image to 224x224 (MobileNetV2 input size)
#     img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
#     img = img.resize((224, 224))
#     img_array = tf.keras.preprocessing.image.img_to_array(img)
#     img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)
#     img_array = np.expand_dims(img_array, axis=0)
#
#     # Predict
#     predictions = model.predict(img_array)
#     predicted_class_idx = np.argmax(predictions[0])
#     confidence = float(predictions[0][predicted_class_idx])
#     food_key = CLASS_LABELS[predicted_class_idx]
#
#     food_data = FOOD_DATABASE.get(food_key, UNKNOWN_FOOD).copy()
#     food_data['confidence'] = confidence
#     return food_data
# ─────────────────────────────────────────────────────────────────────────────


def build_scan_response(food_data: dict) -> dict:
    """Build the full scan response from food data."""
    shelf_life = food_data.get("estimated_shelf_life_days", 5)
    risk_label = get_risk_label(shelf_life)

    return {
        "detected_food": food_data["detected_food"],
        "category": food_data["category"],
        "confidence": food_data.get("confidence", 0.75),
        "estimated_shelf_life_days": shelf_life,
        "risk_label": risk_label,
        "storage_advice": food_data.get("storage_advice", "Store appropriately."),
        "recommendations": food_data.get("recommendations", []),
        "suggested_inventory": {
            "food_name": food_data["detected_food"],
            "category": food_data["category"],
            "quantity": 1,
            "unit": "pcs",
            "storage_type": food_data.get("storage", "Refrigerator"),
            "days_to_expiry": shelf_life,
        }
    }


def scan_food_image(filename: str, image_bytes: Optional[bytes] = None) -> dict:
    """
    Main entry point for food scanning.
    Currently uses filename-based classification as fallback.
    Replace with model-based classification when CNN model is ready.
    """
    # TODO: When model is available, use:
    # if image_bytes and os.path.exists(MODEL_PATH):
    #     food_data = classify_with_model(image_bytes)
    # else:
    #     food_data = classify_by_filename(filename)

    food_data = classify_by_filename(filename)
    return build_scan_response(food_data)
