# F.R.E.S.H Backend - FastAPI

Backend ini berisi:
- REST API inventory makanan
- prediksi risiko food waste
- rekomendasi penggunaan/donasi
- marketplace/donasi sederhana
- SQLite lokal atau PostgreSQL Railway

## Jalankan lokal

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Buka:
- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

## Deploy Railway

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Environment variable:
- `DATABASE_URL` optional. Kalau pakai Railway Postgres, isi dengan URL dari service Postgres.
- `CORS_ORIGINS` isi domain frontend, contoh `https://fresh.vercel.app`
