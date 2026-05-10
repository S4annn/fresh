# F.R.E.S.H Backend

Backend FastAPI untuk F.R.E.S.H, aplikasi AI untuk mengurangi food waste. API ini menangani inventory makanan, prediksi risiko, food scanner, marketplace, donasi, analytics, business dashboard, branch, order, dan sustainability report.

Backend disiapkan untuk jalan lokal dengan SQLite dan deploy ke Railway. Frontend bisa dideploy ke Vercel lalu diarahkan ke URL Railway.

## Struktur

```txt
backend/
|-- app/
|   |-- main.py
|   |-- database.py
|   |-- models.py
|   |-- schemas.py
|   |-- ml.py
|   |-- vision_model.py
|   |-- recommendation.py
|   `-- scanner.py
|-- artifacts/
|   |-- food_vision_model.keras
|   |-- food_labels.json
|   |-- food_metadata.json
|   |-- risk_model.joblib
|   `-- model_metadata.json
|-- requirements.txt
|-- railway.json
|-- .env.example
|-- .gitignore
`-- README.md
```

## Install Lokal

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Buka:

```txt
http://localhost:8000/docs
```

Health check:

```txt
http://localhost:8000/health
```

## Environment

Buat file `.env` dari `.env.example`:

```env
DATABASE_URL=sqlite:///./fresh.db
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=development
```

Untuk Railway, isi `CORS_ORIGINS` dengan domain Vercel:

```env
CORS_ORIGINS=https://frontend-vercel-url.vercel.app
```

## Test Endpoint

Prediksi risiko:

```bash
curl -X POST http://localhost:8000/predict-risk ^
  -H "Content-Type: application/json" ^
  -d "{\"food_name\":\"Tomato\",\"category\":\"Vegetable\",\"quantity\":2,\"unit\":\"pcs\",\"days_to_expiry\":2,\"storage_condition\":\"Refrigerator\",\"usage_frequency\":1,\"role\":\"personal\"}"
```

Food scanner:

```bash
curl -X POST http://localhost:8000/scan-food ^
  -F "image=@tomato.jpg"
```

Endpoint penting:

```txt
GET  /
GET  /health
GET  /docs
POST /scan-food
POST /predict-risk
GET  /foods
GET  /marketplace
GET  /marketplace/listings
GET  /donations
GET  /analytics
GET  /business/inventory
GET  /business/orders
GET  /business/branches
GET  /business/analytics
GET  /business/report
```

## Deploy Railway

1. Push project ke GitHub.
2. Buka Railway.
3. Pilih `New Project`.
4. Pilih `Deploy from GitHub Repo`.
5. Jika repo monorepo, set `Root Directory` ke `backend`.
6. Tambahkan variables:

```env
DATABASE_URL=sqlite:///./fresh.db
CORS_ORIGINS=https://frontend-vercel-url.vercel.app
ENVIRONMENT=production
```

7. Railway akan memakai start command dari `railway.json`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

8. Generate domain Railway.
9. Test:

```txt
https://backend-railway-url.up.railway.app/health
https://backend-railway-url.up.railway.app/docs
```

## Connect Frontend Vercel

Di Vercel, set environment variable:

```env
VITE_API_BASE_URL=https://backend-railway-url.up.railway.app
```

Setelah environment diganti, redeploy frontend.

Di Railway, pastikan:

```env
CORS_ORIGINS=https://frontend-vercel-url.vercel.app
```

## TensorFlow Di Railway

Project ini memakai `tensorflow-cpu` agar image scanner bisa mencoba load `food_vision_model.keras`. Jika build Railway terlalu berat:

- coba kecilkan model Keras;
- pakai `tensorflow` hanya jika `tensorflow-cpu` tidak cocok;
- pindahkan AI scanner ke service terpisah seperti Hugging Face Spaces;
- untuk demo, biarkan scanner memakai fallback. Endpoint `/scan-food` tetap return JSON walaupun TensorFlow/model gagal load.

## Catatan

File di `artifacts/` tidak di-ignore karena model perlu ikut deploy untuk MVP. Jika ukuran model terlalu besar untuk deployment, pindahkan model ke storage eksternal dan load lewat URL/service terpisah.
