"""
Recommendation text builder for food risk predictions.
Generates human-readable action suggestions based on food name, risk level,
days-to-expiry, and category.
"""


def build_recommendation(food_name: str, risk_level: str, days_to_expiry: int, category: str) -> str:
    """Build a recommendation string for a food item based on its risk profile."""
    name = (food_name or "Food Item").strip().title()
    cat = (category or "").lower()
    level = (risk_level or "Safe")

    # Base message by risk level
    if level == "High Risk":
        base = f"{name} berisiko tinggi terbuang. Gunakan hari ini atau pindahkan ke donasi/marketplace."
    elif level == "Warning":
        base = f"{name} mulai mendekati batas aman. Prioritaskan untuk digunakan dalam 1-3 hari."
    else:
        base = f"{name} masih relatif aman disimpan. Tetap cek stok secara berkala."

    # Category-specific idea
    if "fruit" in cat or "buah" in cat:
        idea = " Ide: buat jus, smoothie, salad buah, atau topping sarapan."
    elif "dairy" in cat or "susu" in cat or "milk" in cat:
        idea = " Ide: gunakan untuk smoothie, pancake, kopi susu, atau olahan dessert."
    elif "vegetable" in cat or "sayur" in cat:
        idea = " Ide: buat tumisan, sup, capcay, atau meal prep."
    elif "meat" in cat or "daging" in cat or "protein" in cat:
        idea = " Ide: masak segera, bekukan, atau olah menjadi lauk siap simpan."
    elif "bakery" in cat or "bread" in cat or "roti" in cat:
        idea = " Ide: buat french toast, bread pudding, atau freeze untuk nanti."
    elif "seafood" in cat or "ikan" in cat or "fish" in cat:
        idea = " Ide: masak hari ini, atau bekukan dalam porsi kecil."
    else:
        idea = " Ide: buat menu sederhana dari bahan yang tersedia atau bagikan jika berlebih."

    # Already expired
    if isinstance(days_to_expiry, (int, float)) and days_to_expiry < 0:
        return f"{name} sudah melewati tanggal kedaluwarsa. Jangan dikonsumsi jika kondisi/baunya tidak aman."

    return base + idea
