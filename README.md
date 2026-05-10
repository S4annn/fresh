# 🥬 F.R.E.S.H — Food Resource Efficiency & Smart Handling

> AI-powered platform to reduce food waste through smart inventory management, predictive analytics, and community sharing.

![F.R.E.S.H](https://img.shields.io/badge/F.R.E.S.H-AI%20Food%20Management-10b981?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss)

## 📋 Overview

F.R.E.S.H is a comprehensive food waste reduction platform that helps users:

- **Track food inventory** with smart expiry management
- **Predict waste risk** using AI/ML models
- **Get recipe recommendations** for food that needs to be used soon
- **Sell surplus food** through a community marketplace
- **Donate excess food** to those in need
- **Analyze impact** with visual analytics dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app will start at `http://localhost:5173`

### Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`

## 🔑 Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000

# Firebase (Optional - for Google Sign In)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note:** The app works fully without Firebase or backend! Demo mode provides full functionality.

## 🔥 Firebase Google Sign In Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → **Google** provider
4. Go to Project Settings → General → Your apps → Add Web App
5. Copy the config values to your `.env` file
6. Add your domain to **Authorized domains** in Firebase Authentication

If Firebase is not configured, the app will show a friendly message and the demo login will still work.

## 📁 Project Structure

```
frontend/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── .env                    # Environment variables
├── .env.example            # Environment template
└── src/
    ├── main.jsx            # App entry + routing
    ├── index.css           # Tailwind + custom styles
    ├── api.js              # API integration layer
    ├── firebase.js         # Firebase configuration
    ├── context/
    │   └── AuthContext.jsx  # Authentication context
    ├── data/
    │   └── dummyData.js    # Demo/fallback data
    ├── layouts/
    │   └── DashboardLayout.jsx  # Dashboard shell
    └── pages/
        ├── LandingPage.jsx
        ├── SignInPage.jsx
        ├── SignUpPage.jsx
        ├── DashboardPage.jsx
        ├── InventoryPage.jsx
        ├── PredictPage.jsx
        ├── RecommendationsPage.jsx
        ├── MarketplacePage.jsx
        ├── DonationPage.jsx
        ├── AnalyticsPage.jsx
        ├── SettingsPage.jsx
        └── NotFoundPage.jsx
```

## 🌐 Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signin` | Sign in page |
| `/signup` | Sign up page |
| `/dashboard` | Main dashboard |
| `/inventory` | Food inventory management |
| `/predict` | AI waste prediction |
| `/recommendations` | Smart recommendations |
| `/marketplace` | Surplus food marketplace |
| `/donation` | Food donation |
| `/analytics` | Analytics dashboard |
| `/settings` | Profile & settings |

## 🛠 Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite 6 | Build tool |
| TailwindCSS 3 | Styling |
| React Router 6 | Routing |
| Recharts | Charts & analytics |
| Lucide React | Icons |
| Firebase | Google authentication |
| FastAPI | Backend API |

## 🚢 Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Set **Root Directory** to `frontend`
5. Set **Framework Preset** to `Vite`
6. Add environment variables in Vercel dashboard
7. Deploy!

For SPA routing, create `frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 🤝 API Integration

The frontend connects to FastAPI backend at `VITE_API_BASE_URL`. If the backend is unavailable, the app gracefully falls back to local dummy data for demo purposes.

### API Endpoints Used:
- `GET /foods` — List food items
- `POST /foods` — Create food item
- `PUT /foods/:id` — Update food item
- `DELETE /foods/:id` — Delete food item
- `POST /predict-risk` — AI risk prediction
- `GET /recommendations` — Get recommendations
- `GET /marketplace/listings` — List marketplace items
- `POST /marketplace/listings` — Create listing
- `GET /donations` — List donations
- `POST /donations` — Create donation
- `GET /analytics` — Get analytics data
- `GET /dashboard` — Dashboard summary

## 📄 License

MIT License © F.R.E.S.H Team
