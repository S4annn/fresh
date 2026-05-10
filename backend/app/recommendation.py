def build_recommendation(food_name: str, risk_level: str, days_to_expiry: int, category: str) -> str:
    name = food_name.strip().title()
    cat = category.lower()

    if risk_level == "High Risk":
        base = f"{name} berisiko tinggi terbuang. Gunakan hari ini atau pindahkan ke donasi/marketplace."
    elif risk_level == "Warning":
        base = f"{name} mulai mendekati batas aman. Prioritaskan untuk digunakan dalam 1-3 hari."
    else:
        base = f"{name} masih relatif aman disimpan. Tetap cek stok secara berkala."

    if "fruit" in cat or "buah" in cat:
        idea = " Ide: buat jus, smoothie, salad buah, atau topping sarapan."
    elif "dairy" in cat or "susu" in cat or "milk" in cat:
        idea = " Ide: gunakan untuk smoothie, pancake, kopi susu, atau olahan dessert."
    elif "vegetable" in cat or "sayur" in cat:
        idea = " Ide: buat tumisan, sup, capcay, atau meal prep."
    elif "meat" in cat or "daging" in cat:
        idea = " Ide: masak segera, bekukan, atau olah menjadi lauk siap simpan."
    else:
        idea = " Ide: buat menu sederhana dari bahan yang tersedia atau bagikan jika berlebih."

    if days_to_expiry < 0:
        return f"{name} sudah melewati tanggal kedaluwarsa. Jangan dikonsumsi jika kondisi/baunya tidak aman."
    return base + idea
