# 🚀 F.R.E.S.H. Railway Deployment Guide

## 📋 Environment Variables Configuration

### Backend Service Variables

```bash
# === DATABASE CONFIGURATION ===
# Railway akan otomatis membuat ini saat menambah PostgreSQL service
DATABASE_URL=postgresql://username:password@host.railway.app:port/database_name

# === CORS CONFIGURATION ===
# Ganti dengan domain Vercel frontend Anda
CORS_ORIGINS=https://fresh-app.vercel.app,http://localhost:5173

# === ENVIRONMENT ===
ENVIRONMENT=production

# === SECURITY ===
# Ganti dengan secret key yang aman untuk production
SECRET_KEY=your-super-secure-secret-key-for-production-2024

# === OPTIONAL CONFIGURATION ===
# Untuk debugging (jangan di production)
# DEBUG=false
```

### Frontend Service Variables

```bash
# === API CONFIGURATION ===
# Ganti dengan Railway backend URL
VITE_API_BASE_URL=https://your-backend.up.railway.app

# === OPTIONAL CONFIGURATION ===
# VITE_APP_NAME=F.R.E.S.H.
# VITE_APP_VERSION=1.0.0
```

## 🛠️ Setup Steps

### 1. Railway Database Setup

1. **Add PostgreSQL Service**
   ```
   Railway Dashboard → New Project → + New → Database → PostgreSQL
   ```

2. **Get Database URL**
   - Railway otomatis membuat `DATABASE_URL`
   - Format: `postgresql://username:password@host.railway.app:7432/database`

3. **Connect Backend to Database**
   - Pilih backend service
   - Tab "Variables"
   - Pastikan `DATABASE_URL` ada (Railway auto-generate)

### 2. CORS Configuration

**PENTING:** Frontend Vercel harus diizinkan akses API

```bash
# Example untuk production
CORS_ORIGINS=https://fresh-demo.vercel.app,http://localhost:5173

# Multiple domains (comma separated)
CORS_ORIGINS=https://domain1.vercel.app,https://domain2.vercel.app,http://localhost:5173
```

### 3. Security Configuration

```bash
# Generate secure secret key:
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Contoh hasil:
SECRET_KEY=9f2e1a8c7b6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f
```

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. CORS Error
```
Error: Access-Control-Allow-Origin
```
**Solution:** Pastikan `CORS_ORIGINS` mengandung domain frontend Anda

#### 2. Database Connection Error
```
Error: could not connect to server
```
**Solution:** 
- Pastikan `DATABASE_URL` benar
- Check Railway database service status
- Restart backend service

#### 3. Environment Variables Not Working
```
Error: DATABASE_URL not found
```
**Solution:**
- Check spelling di Railway Variables tab
- Restart service setelah mengubah variables
- Pastikan tidak ada trailing spaces

### Debug Commands

#### Check Database Connection
```bash
# Di Railway service console
python -c "
from app.database import get_database_info
from app import models
info = get_database_info()
print('Database Type:', info['type'])
print('Database URL configured:', bool(info['url']))
"
```

#### Test API Endpoints
```bash
# Test health endpoint
curl https://your-backend.up.railway.app/health

# Test foods endpoint
curl https://your-backend.up.railway.app/foods
```

## 🚀 Deployment Checklist

### Pre-Deployment Checklist

- [ ] PostgreSQL service added di Railway
- [ ] `DATABASE_URL` tersedia di backend variables
- [ ] `CORS_ORIGINS` di-set dengan domain frontend
- [ ] `SECRET_KEY` di-set dengan secure key
- [ ] `ENVIRONMENT=production`
- [ ] Frontend `VITE_API_BASE_URL` di-set ke Railway URL

### Post-Deployment Verification

- [ ] Backend health check: `GET /health`
- [ ] Database connection test
- [ ] Frontend dapat akses API (no CORS errors)
- [ ] User registration/login berfungsi
- [ ] Food CRUD operations berfungsi
- [ ] Marketplace/DONATIONS berfungsi

## 📱 Testing Production URLs

### Backend URLs
```bash
# Health check
https://your-backend.up.railway.app/health

# Database info
https://your-backend.up.railway.app/database/info

# API endpoints
https://your-backend.up.railway.app/foods
https://your-backend.up.railway.app/marketplace
https://your-backend.up.railway.app/donations
```

### Frontend URLs
```bash
# Vercel deployment
https://your-frontend.vercel.app

# Test API integration
https://your-frontend.vercel.app -> harus bisa load data dari backend
```

## 🔄 Migration from Local to Production

### 1. Export Local Data
```bash
# Dari local SQLite
python -c "
import sqlite3, json
conn = sqlite3.connect('fresh.db')
# Export logic...
"
```

### 2. Import to Railway PostgreSQL
```bash
# Via Railway console atau API
# Atau gunakan migration service yang sudah dibuat
```

## 📞 Support & Debugging

### Railway Dashboard Access
1. Project → Backend Service → "Logs" tab untuk debugging
2. "Metrics" tab untuk performance monitoring
3. "Variables" tab untuk environment management

### Common Debug Commands
```bash
# Check environment variables
print(os.getenv('DATABASE_URL'))
print(os.getenv('CORS_ORIGINS'))

# Test database connection
from app.database import engine
print(engine.url)
```

---

## 🎯 Quick Start Summary

1. **Railway**: Add PostgreSQL service
2. **Backend**: Set `DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`
3. **Frontend**: Set `VITE_API_BASE_URL`
4. **Deploy**: Railway backend + Vercel frontend
5. **Test**: Verify API connection & CORS

**🚀 Your F.R.E.S.H. app is now running on PostgreSQL Railway!**
