# F.R.E.S.H MVP - Instalasi, Konfigurasi, dan Deployment

Dokumen ini berisi langkah teknis untuk menjalankan F.R.E.S.H dari lokal sampai deployment. README utama menjelaskan konteks project, sedangkan file ini fokus ke setup.

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
    +-- Risk Model: backend/artifacts/risk_model.joblib
    |
    +-- Vision Model optional: backend/artifacts/food_vision_model.keras
```

Fitur MVP:

- inventory makanan;
- prediksi risiko food waste;
- rekomendasi penggunaan, marketplace, atau donasi;
- dashboard personal;
- dashboard business berbasis dummy data dan stub API;
- scanner makanan dengan model vision atau fallback.

## 2. Jalankan Notebook AI

Notebook training ada di:

```txt
notebooks/FRESH_AI_Training_Notebook.ipynb
```

Dataset sample ada di:

```txt
data/cleaned_dairy_dataset.csv
data/cleaned_fruits_dataset.csv
data/cleaned_food_wastage_data.csv
```

Alur training:

1. Upload folder `data/` atau tiga file CSV ke Google Colab.
2. Buka notebook training.
3. Jalankan semua cell.
4. Download artifact model.
5. Copy artifact ke `backend/artifacts/`.

Artifact utama:

```txt
risk_model.joblib
model_metadata.json
```

Artifact scanner optional:

```txt
food_vision_model.keras
food_labels.json
food_metadata.json
```

Catatan: model risk prediction memakai Scikit-learn agar ringan untuk deployment. TensorFlow/Keras hanya dipakai jika scanner vision ingin dijalankan penuh.

## 3. Jalankan Backend Lokal

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Mac/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Buka:

```txt
http://localhost:8000
http://localhost:8000/docs
```

Test prediksi risiko:

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
npm run dev
```

Jika ingin memakai backend lokal, buat `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Buka:

```txt
http://localhost:5173
```

## 5. Deploy Backend ke Railway

### Opsi GitHub

1. Push project ke GitHub.
2. Buka Railway.
3. Pilih `New Project`.
4. Pilih `Deploy from GitHub repo`.
5. Pilih repository F.R.E.S.H.
6. Set root directory ke:

```txt
backend
```

7. Set start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

8. Generate public domain.
9. Test Swagger:

```txt
https://your-api.up.railway.app/docs
```

### Environment Railway

Minimal:

```env
CORS_ORIGINS=https://your-frontend.vercel.app
```

Opsional jika memakai PostgreSQL Railway:

```env
DATABASE_URL=${{ Postgres.DATABASE_URL }}
```

Jika tidak memakai PostgreSQL, backend memakai SQLite. Untuk demo masih cukup, tetapi untuk production lebih baik memakai PostgreSQL.

## 6. Deploy Frontend ke Vercel

1. Buka Vercel.
2. Pilih `Add New Project`.
3. Import repository GitHub.
4. Set root directory ke:

```txt
frontend
```

5. Framework preset:

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

8. Environment variable:

```env
VITE_API_BASE_URL=https://your-api.up.railway.app
```

9. Deploy.

## 7. Update CORS

Setelah frontend punya domain Vercel, misalnya:

```txt
https://fresh-mvp.vercel.app
```

Masukkan domain itu ke Railway:

```env
CORS_ORIGINS=https://fresh-mvp.vercel.app
```

Redeploy backend setelah environment diganti.

## 8. Endpoint Penting

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/` | Cek API |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger docs |
| GET | `/model/metadata` | Metadata model |
| POST | `/predict-risk` | Prediksi risiko makanan |
| GET | `/foods` | Ambil inventory |
| POST | `/foods` | Tambah makanan |
| PUT | `/foods/{food_id}` | Update makanan |
| DELETE | `/foods/{food_id}` | Hapus makanan |
| GET | `/dashboard` | Ringkasan dashboard |
| POST | `/scan-food` | Scan gambar makanan |
| GET | `/scan-food/status` | Status scanner |
| GET | `/marketplace/listings` | Ambil listing marketplace |
| POST | `/marketplace/listings` | Buat listing marketplace |
| GET | `/business/inventory` | Stub inventory bisnis |
| GET | `/business/orders` | Stub order bisnis |
| GET | `/business/branches` | Stub cabang bisnis |
| GET | `/business/analytics` | Placeholder analytics bisnis |

## 9. Bagian Yang Masih Bisa Dilanjutkan

### AI

- Latih model dengan data real user.
- Tambahkan fitur frekuensi konsumsi, stok masuk/keluar, dan kondisi penyimpanan yang lebih detail.
- Buat rekomendasi menu berdasarkan bahan yang tersedia.
- Tambahkan alasan prediksi supaya user tahu kenapa item masuk `High Risk`.

### Backend

- Tambahkan auth JWT atau integrasi Firebase token verification.
- Tambahkan endpoint donation terpisah.
- Lengkapi CRUD business inventory, orders, dan branches.
- Tambahkan migration Alembic.
- Tambahkan logging dan monitoring.

### Frontend

- Kurangi dummy data setelah backend lengkap.
- Tambahkan notifikasi expiry berbasis jadwal.
- Tambahkan filter risiko yang lebih detail.
- Tambahkan halaman detail marketplace dan donation.
- Tambahkan empty state dan error state yang lebih konsisten.

### Product

Demo paling kuat sebaiknya fokus ke tiga alur:

1. user menambahkan stok makanan;
2. sistem memprediksi risiko makanan terbuang;
3. user mengambil tindakan lewat rekomendasi, marketplace, atau donasi.
