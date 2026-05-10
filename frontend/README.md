# F.R.E.S.H Frontend

Frontend F.R.E.S.H adalah aplikasi React untuk demo personal dan business food waste management. Aplikasi ini dibuat dengan Vite, Tailwind CSS, React Router, Recharts, Leaflet, Firebase optional auth, dan dummy data fallback agar tetap bisa dipakai meskipun backend belum lengkap.

## Yang Ada Di Frontend

- Landing page dan pricing page.
- Login/register dengan pilihan role `personal` dan `business`.
- Dashboard personal untuk ringkasan inventory dan quick actions.
- Inventory makanan, risk forecast, scanner, recommendations, marketplace, donation, analytics, notifications, dan settings.
- Dashboard business dengan inventory batch, orders, branches, analytics, dan mode multi-branch.
- Map untuk marketplace/donation memakai Leaflet.
- Fallback data lokal dari `src/data/` supaya demo tidak bergantung penuh pada API.

## Setup Lokal

```bash
cd frontend
npm install
npm run dev
```

App berjalan di:

```txt
http://localhost:5173
```

## Environment

Buat `frontend/.env` jika ingin menghubungkan frontend ke backend lokal:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Firebase bisa ditambahkan kalau ingin Google Sign In:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

Jika Firebase belum dikonfigurasi, demo login tetap bisa digunakan.

## Script

```bash
npm run dev       # development server
npm run build     # build production
npm run preview   # preview hasil build
```

## Struktur Penting

```txt
src/
|-- api.js                 # API wrapper dan fallback scanner
|-- main.jsx               # route utama
|-- firebase.js            # konfigurasi Firebase
|-- context/               # auth dan role context
|-- data/                  # dummy data personal dan business
|-- components/            # komponen reusable seperti FreshMap
|-- layouts/               # layout personal dan business
|-- pages/                 # halaman personal
`-- pages/business/        # halaman business
```

## Catatan

Beberapa API seperti donation, analytics, dan business CRUD masih punya fallback lokal. Ini disengaja agar flow demo tetap mulus sambil backend dikembangkan bertahap.
