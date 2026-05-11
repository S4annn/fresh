# F.R.E.S.H

F.R.E.S.H adalah MVP web app untuk membantu mengurangi food waste lewat pencatatan stok makanan, prediksi risiko kedaluwarsa, rekomendasi pemakaian, marketplace surplus, dan donasi makanan.

Project ini dibuat sebagai kombinasi antara aplikasi frontend, backend API, dan model machine learning sederhana. Targetnya bukan cuma menampilkan dashboard, tapi memberi alur yang cukup nyata: user menambahkan makanan, sistem menghitung risiko terbuang, lalu user bisa memilih tindakan seperti memasak, menjual surplus, atau membuat donasi.

## Kenapa Project Ini Dibuat

Banyak makanan terbuang bukan karena langsung tidak layak makan, tapi karena tidak sempat dipantau. Bahan makanan yang sebenarnya masih bisa dimasak, dijual murah, atau didonasikan sering terlupakan sampai melewati masa pakai.

F.R.E.S.H mencoba menyelesaikan masalah itu dengan pendekatan yang lebih praktis:

- stok makanan dicatat dengan tanggal beli dan tanggal kedaluwarsa;
- sistem memberi label risiko seperti `Safe`, `Warning`, atau `High Risk`;
- user mendapat rekomendasi tindakan berdasarkan kondisi makanan;
- surplus makanan bisa diarahkan ke marketplace atau donasi;
- bisnis seperti cafe, restoran, bakery, dan hotel punya dashboard sendiri untuk memantau stok per cabang.

## Fitur Utama

### Personal

- Dashboard ringkasan stok makanan.
- Inventory makanan dengan kategori, jumlah, lokasi penyimpanan, dan tanggal kedaluwarsa.
- Prediksi risiko food waste menggunakan model ML dan fallback lokal.
- AI food scanner untuk membaca gambar makanan, dengan model Keras jika tersedia dan fallback berdasarkan nama file.
- Rekomendasi resep, penyimpanan, marketplace, atau donasi.
- Marketplace surplus makanan berbasis lokasi.
- Halaman donasi dengan data demo dan peta.
- Analytics untuk melihat stok, risiko, donasi, marketplace, estimasi penghematan, dan dampak lingkungan.

### Business

- Mode akun business untuk restoran, cafe, hotel, bakery, catering, dan grocery store.
- Dashboard bisnis dengan estimasi kerugian yang bisa dicegah.
- Inventory stok bisnis per batch, supplier, cabang, dan storage area.
- Orders untuk marketplace dan donation pickup.
- Branch management.
- Business analytics untuk waste reduction, surplus sold, donation, dan performa cabang.

## Tech Stack

| Bagian | Teknologi |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS |
| Routing | React Router |
| Chart | Recharts |
| Map | Leaflet, React Leaflet |
| Icon | Lucide React |
| Auth | Firebase Google Sign In, dengan demo login fallback |
| Backend | FastAPI, Pydantic, SQLAlchemy |
| Database | SQLite lokal, bisa diarahkan ke PostgreSQL Railway |
| Machine Learning | Scikit-learn, Joblib, optional TensorFlow/Keras untuk scanner |
| Deployment | Vercel untuk frontend, Railway untuk backend |

## Struktur Project

```txt
fresh_mvp_complete/
|-- backend/
|   |-- app/
|   |   |-- main.py              # FastAPI routes
|   |   |-- ml.py                # risk prediction
|   |   |-- scanner.py           # image scanner + fallback
|   |   |-- models.py            # SQLAlchemy models
|   |   |-- schemas.py           # request/response schema
|   |   `-- database.py          # SQLite/Postgres connection
|   |-- artifacts/
|   |   |-- risk_model.joblib
|   |   |-- model_metadata.json
|   |   |-- food_vision_model.keras
|   |   |-- food_labels.json
|   |   `-- food_metadata.json
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- pages/               # personal pages
|   |   |-- pages/business/      # business pages
|   |   |-- layouts/             # dashboard layouts
|   |   |-- data/                # dummy/fallback data
|   |   |-- components/          # reusable components
|   |   |-- api.js               # API wrapper + fallback scanner
|   |   `-- main.jsx             # app routes
|   |-- package.json
|   `-- vite.config.js
|-- data/                        # cleaned sample datasets
|-- notebooks/                   # AI training notebook
|-- docs/                        # install/deploy notes
`-- README.md
```

## Cara Menjalankan

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend berjalan di:

```txt
http://localhost:8000
http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di:

```txt
http://localhost:5173
```

Jika ingin menghubungkan frontend ke backend lokal, buat file `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Firebase bersifat opsional. Kalau konfigurasi Firebase belum diisi, demo login tetap bisa dipakai.

## Alur Demo Yang Disarankan

1. Login menggunakan demo mode sebagai personal user atau business user.
2. Buka dashboard untuk melihat ringkasan stok.
3. Tambahkan item makanan di inventory.
4. Coba halaman Predict untuk melihat risk score dan rekomendasi.
5. Coba AI Scanner dengan gambar makanan atau nama file seperti `banana.jpg`, `tomato.jpg`, atau `chicken.jpg`.
6. Pindahkan makanan berisiko ke marketplace atau donation flow.
7. Untuk mode business, cek inventory batch, branch, orders, dan analytics.

## Backend API Yang Sudah Ada

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/` | Cek API berjalan |
| GET | `/health` | Health check |
| GET | `/model/metadata` | Metadata model risk prediction |
| POST | `/predict-risk` | Prediksi risiko food waste |
| GET | `/foods` | Ambil daftar inventory |
| POST | `/foods` | Tambah item makanan |
| PUT | `/foods/{food_id}` | Update item makanan |
| DELETE | `/foods/{food_id}` | Hapus item makanan |
| GET | `/dashboard` | Ringkasan inventory user |
| POST | `/scan-food` | Upload gambar makanan untuk scanner |
| GET | `/scan-food/status` | Status model scanner |
| GET | `/marketplace/listings` | Ambil listing marketplace aktif |
| POST | `/marketplace/listings` | Buat listing marketplace/donasi sederhana |
| GET | `/business/inventory` | Stub inventory bisnis |
| GET | `/business/orders` | Stub order bisnis |
| GET | `/business/branches` | Stub cabang bisnis |
| GET | `/business/analytics` | Placeholder analytics bisnis |

Beberapa halaman frontend masih memakai dummy data atau fallback lokal supaya demo tetap bisa berjalan walaupun backend belum lengkap.

## Model AI

Risk prediction menggunakan pipeline Scikit-learn yang disimpan di:

```txt
backend/artifacts/risk_model.joblib
```

Input yang dipakai model antara lain:

- kategori makanan;
- jumlah;
- shelf life;
- kondisi penyimpanan;
- sisa hari menuju kedaluwarsa;
- rasio masa simpan;
- rasio potensi waste.

Untuk scanner gambar, backend akan mencoba memakai:

```txt
backend/artifacts/food_vision_model.keras
backend/artifacts/food_labels.json
backend/artifacts/food_metadata.json
```

Kalau TensorFlow, Pillow, atau model vision belum siap, scanner tetap mengembalikan hasil fallback agar aplikasi tidak rusak saat demo.

## Updating AI Scanner Model

Untuk mengganti model AI Food Scanner:

1. Ganti file di `backend/artifacts`.
2. Pastikan nama file tetap:
   - `food_vision_model.keras`
   - `food_labels.json`
   - `food_metadata.json`
3. Pastikan jumlah output class model sama dengan jumlah label di `food_labels.json`.
4. Restart backend lokal atau redeploy Railway setelah file diganti.
5. Test `GET /debug-model` dan pastikan `model_load_success` bernilai `true`.
6. Test `POST /scan-food` dengan field multipart `image` dan pastikan response memiliki `source: "tensorflow_vision_model"` serta `top_predictions`.

## Model Accuracy Notes

Jika confidence scanner sering rendah, dataset training perlu ditambah dan divariasikan.

- Gunakan gambar training dari kamera HP, bukan hanya PNG transparan atau gambar katalog.
- Variasikan background, angle, lighting, ukuran objek, bentuk makanan, dan kondisi makanan.
- Jangan campur `food_vision_model.keras`, `food_labels.json`, dan `food_metadata.json` dari training berbeda.
- Jika model diganti, ganti juga labels dan metadata dari training yang sama.
- Setelah mengganti model atau artifact scanner, redeploy Railway.
- Confidence rendah bukan hasil final; user harus melakukan manual correction sebelum menambahkan item ke inventory.

## Deployment Singkat

Frontend bisa dideploy ke Vercel dengan root directory:

```txt
frontend
```

Backend bisa dideploy ke Railway dengan root directory:

```txt
backend
```

Start command backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Environment penting:

```env
VITE_API_BASE_URL=https://your-api.up.railway.app
CORS_ORIGINS=https://your-frontend.vercel.app
DATABASE_URL=optional_postgres_url
```

Panduan lebih detail ada di [docs/INSTALL_DEPLOY.md](docs/INSTALL_DEPLOY.md).


## License

MIT License.
