# F.R.E.S.H MVP — Instalasi, Konfigurasi, dan Deployment

Dokumen ini menjelaskan alur lengkap dari dataset sementara, notebook AI, FastAPI backend, React frontend, sampai deployment Railway dan Vercel.

## 1. Arsitektur MVP

```txt
User Browser
   |
   v
React Frontend (Vercel)
   |
   v
FastAPI Backend (Railway)
   |
   +-- SQLite lokal / PostgreSQL Railway
   |
   +-- AI Risk Model: backend/artifacts/risk_model.joblib
```

Fitur MVP:
- Inventory makanan
- Prediksi risiko food waste
- Rekomendasi penggunaan/donasi
- Dashboard ringkas
- Marketplace/donasi sederhana

## 2. Jalankan Notebook AI

### Di Google Colab

1. Upload folder `data/` atau 3 file CSV:
   - `cleaned_dairy_dataset.csv`
   - `cleaned_fruits_dataset.csv`
   - `cleaned_food_wastage_data.csv`

2. Buka:
   - `notebooks/FRESH_AI_Training_Notebook.ipynb`

3. Jalankan semua cell.

4. Download artifact:
   - `risk_model.joblib`
   - `model_metadata.json`

5. Copy ke:
   - `backend/artifacts/`

Catatan:
- Model default di package ini adalah Scikit-learn agar ringan saat deploy.
- Bagian TensorFlow/Keras tetap disediakan sebagai opsional untuk memenuhi learning path AI.

## 3. Jalankan Backend FastAPI Lokal

```bash
cd backend

python -m venv .venv
```

Windows:
```bash
.venv\Scripts\activate
```

Mac/Linux:
```bash
source .venv/bin/activate
```

Install:
```bash
pip install -r requirements.txt
```

Run:
```bash
uvicorn app.main:app --reload
```

Buka:
```txt
http://localhost:8000
http://localhost:8000/docs
```

Test endpoint:
```bash
curl -X POST http://localhost:8000/predict-risk ^
  -H "Content-Type: application/json" ^
  -d "{\"food_name\":\"Susu\",\"category\":\"Dairy\",\"quantity\":1,\"unit\":\"liter\",\"expiration_date\":\"2026-05-12\",\"storage_condition\":\"Refrigerated\",\"shelf_life\":7}"
```

Mac/Linux:
```bash
curl -X POST http://localhost:8000/predict-risk \
  -H "Content-Type: application/json" \
  -d '{"food_name":"Susu","category":"Dairy","quantity":1,"unit":"liter","expiration_date":"2026-05-12","storage_condition":"Refrigerated","shelf_life":7}'
```

## 4. Jalankan Frontend Lokal

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Isi `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Buka:
```txt
http://localhost:5173
```

## 5. Deploy Backend ke Railway

### Opsi A — GitHub

1. Buat repo GitHub, misalnya `fresh-mvp`.
2. Push folder project ini.
3. Buka Railway.
4. New Project → Deploy from GitHub repo.
5. Pilih repo.
6. Root directory arahkan ke:
   ```txt
   backend
   ```
7. Start command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
8. Generate public domain.
9. Test:
   ```txt
   https://your-api.up.railway.app/docs
   ```

### Environment Variable Railway

Minimal:
```env
CORS_ORIGINS=https://your-frontend.vercel.app
```

Opsional PostgreSQL:
```env
DATABASE_URL=${{ Postgres.DATABASE_URL }}
```

Jika tidak pakai PostgreSQL, backend akan memakai SQLite. Untuk demo bisa, tapi untuk production lebih baik pakai PostgreSQL.

## 6. Deploy Frontend ke Vercel

1. Buka Vercel.
2. Add New Project.
3. Import repo GitHub.
4. Root directory:
   ```txt
   frontend
   ```
5. Framework Preset:
   ```txt
   Vite
   ```
6. Build command:
   ```bash
   npm run build
   ```
7. Output directory:
   ```txt
   dist
   ```
8. Environment Variable:
   ```env
   VITE_API_BASE_URL=https://your-api.up.railway.app
   ```
9. Deploy.

## 7. Update CORS Setelah Frontend Jadi

Setelah Vercel memberi domain, misalnya:
```txt
https://fresh-mvp.vercel.app
```

Masukkan ke Railway:
```env
CORS_ORIGINS=https://fresh-mvp.vercel.app
```

Deploy ulang backend.

## 8. Endpoint Penting

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/` | Cek API |
| GET | `/docs` | Swagger API |
| POST | `/predict-risk` | Prediksi risiko makanan |
| POST | `/foods` | Tambah makanan |
| GET | `/foods` | Ambil inventory |
| PUT | `/foods/{id}` | Update makanan |
| DELETE | `/foods/{id}` | Hapus makanan |
| GET | `/dashboard` | Ringkasan dashboard |
| POST | `/marketplace/listings` | Buat listing donasi/jual |
| GET | `/marketplace/listings` | Ambil listing marketplace |

## 9. Improve Lanjutan

### AI
- Tambahkan data real user: frekuensi konsumsi, stok masuk/keluar, kondisi penyimpanan.
- Tambahkan model rekomendasi menu berbasis bahan yang tersedia.
- Gunakan explainability sederhana: alasan kenapa item masuk High Risk.

### Backend
- Tambahkan auth JWT.
- Tambahkan role: household, restaurant, admin.
- Gunakan PostgreSQL dari awal untuk deploy production.
- Tambahkan migration Alembic.
- Tambahkan logging dan monitoring.

### Frontend
- Tambahkan login/register.
- Tambahkan edit food item.
- Tambahkan filter berdasarkan risiko.
- Tambahkan notifikasi expiry.
- Tambahkan halaman detail marketplace.

### Product
- Fokus demo ke 3 alur:
  1. User tambah stok makanan.
  2. AI memprediksi risiko.
  3. User mendapatkan rekomendasi atau membuat listing donasi.
