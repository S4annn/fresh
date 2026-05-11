# 🔧 Railway Deployment Troubleshooting

## 🚨 Common Issues & Solutions

### ❌ Error: `ModuleNotFoundError: No module named 'psycopg2'`

**Problem:** Railway build gagal karena psycopg2 tidak terinstall.

**Solution:**
1. Pastikan `psycopg2-binary` ada di `requirements.txt`
2. Push changes ke GitHub
3. Redeploy Railway service

**Verification:**
```bash
# Test psycopg2 availability
python -c "import psycopg2; print('psycopg2 available')"
```

---

### ❌ Error: Database Connection Failed

**Problem:** Backend tidak bisa connect ke PostgreSQL Railway.

**Debug Steps:**
1. **Check DATABASE_URL:**
   ```bash
   # Di Railway service console
   echo $DATABASE_URL
   ```

2. **Test connection dengan debug endpoint:**
   ```bash
   curl https://your-backend.up.railway.app/debug-db
   ```

3. **Expected response:**
   ```json
   {
     "database_connected": true,
     "database_type": "postgresql",
     "database_url_preview": "containers-us-west-1.railway.app:5432/database",
     "test_query": 1,
     "environment": "production",
     "psycopg2_available": true
   }
   ```

**Common Solutions:**
- Restart Railway service
- Check DATABASE_URL format
- Verify PostgreSQL service status

---

### ❌ Error: CORS Issues

**Problem:** Frontend tidak bisa akses API backend.

**Debug Steps:**
1. **Check CORS_ORIGINS:**
   ```bash
   # Di Railway service variables
   CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
   ```

2. **Test CORS:**
   ```bash
   curl -H "Origin: https://your-app.vercel.app" \
        https://your-backend.up.railway.app/health
   ```

**Solution:** Pastikan domain Vercel ada di CORS_ORIGINS.

---

### ❌ Error: Build Timeout

**Problem:** Railway build timeout karena dependencies besar.

**Solutions:**
1. **Optimize requirements.txt:**
   - Hapus dependencies yang tidak perlu
   - Gunakan specific versions

2. **Use Railway build optimization:**
   ```dockerfile
   # Di Dockerfile
   RUN pip install --no-cache-dir -r requirements.txt
   ```

---

### ❌ Error: Environment Variables Not Loading

**Problem:** Environment variables tidak terbaca di runtime.

**Debug Steps:**
1. **Check Railway Variables tab:**
   - Pastikan variables sudah di-set
   - Tidak ada extra spaces
   - Case-sensitive names

2. **Test with debug endpoint:**
   ```bash
   curl https://your-backend.up.railway.app/debug-db
   ```

**Solution:** Restart service setelah mengubah variables.

---

## 🔍 Debug Commands

### **Local Testing**
```bash
# Test database connection
cd backend
python -c "
from app.database import get_database_info
print(get_database_info())
"

# Test models
python -c "
from app import models
print('Models loaded successfully')
"

# Test API endpoints
uvicorn app.main:app --reload
curl http://localhost:8000/health
curl http://localhost:8000/debug-db
```

### **Railway Testing**
```bash
# Test deployment
curl https://your-backend.up.railway.app/health

# Test database
curl https://your-backend.up.railway.app/debug-db

# Test API endpoints
curl https://your-backend.up.railway.app/foods
```

---

## 📋 Railway Deployment Checklist

### **Pre-Deployment**
- [ ] `psycopg2-binary` di requirements.txt
- [ ] `DATABASE_URL` environment variable set
- [ ] `CORS_ORIGINS` includes frontend domain
- [ ] `SECRET_KEY` set untuk production
- [ ] `ENVIRONMENT=production`
- [ ] Dockerfile copies requirements.txt

### **Post-Deployment**
- [ ] Build successful
- [ ] Service running
- [ ] `/health` endpoint works
- [ ] `/debug-db` shows `database_connected: true`
- [ ] No CORS errors
- [ ] Database tables created

---

## 🚀 Quick Fix Commands

### **Force Redeploy**
```bash
# Push changes untuk trigger redeploy
git add .
git commit -m "fix: add psycopg2-binary and debug endpoint"
git push origin main
```

### **Check Railway Logs**
1. Railway Dashboard → Backend Service
2. Tab "Logs"
3. Check startup errors

### **Restart Service**
1. Railway Dashboard → Backend Service
2. Click "Restart"
3. Wait for deployment

---

## 📱 Environment Variables Reference

### **Required Variables**
```bash
# Database (Railway auto-generate)
DATABASE_URL=postgresql://postgres:password@host.railway.app:5432/database

# Security (You set)
SECRET_KEY=your-secure-jwt-secret-key-2024

# CORS (Important!)
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173

# Environment
ENVIRONMENT=production
```

### **Optional Variables**
```bash
# Debug mode (jangan di production)
DEBUG=false

# Custom settings
MAX_UPLOAD_SIZE=10485760  # 10MB
```

---

## 🔧 Advanced Troubleshooting

### **Database Schema Issues**
```bash
# Test table creation
curl https://your-backend.up.railway.app/debug-db

# Check if tables exist
python -c "
from app.database import engine
from app import models
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print('Tables:', tables)
"
```

### **Performance Issues**
```bash
# Check Railway metrics
# Railway Dashboard → Backend Service → Metrics

# Monitor database connections
curl https://your-backend.up.railway.app/debug-db
```

### **Memory Issues**
```bash
# Check memory usage
# Railway Dashboard → Backend Service → Metrics

# Optimize requirements.txt
# Hapus dependencies yang tidak perlu
```

---

## 🎯 Success Indicators

✅ **Deployment Successful When:**
- Railway build completes without errors
- Service status: "Running"
- `/health` returns `{"status": "ok"}`
- `/debug-db` returns `{"database_connected": true}`
- Frontend can access API without CORS errors
- Database tables created successfully

✅ **API Working When:**
```bash
# Test endpoints
curl https://your-backend.up.railway.app/foods
curl https://your-backend.up.railway.app/marketplace
curl https://your-backend.up.railway.app/donations
```

---

## 📞 Support Resources

### **Railway Documentation**
- [Railway Docs](https://docs.railway.app/)
- [PostgreSQL Service](https://docs.railway.app/reference/services/postgres)
- [Environment Variables](https://docs.railway.app/reference/variables)

### **FastAPI Documentation**
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [SQLAlchemy PostgreSQL](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)

### **Useful Commands**
```bash
# Check Python version (Railway uses 3.11)
python --version

# Check installed packages
pip list | grep psycopg2

# Test PostgreSQL connection
python -c "
import psycopg2
print('psycopg2 version:', psycopg2.__version__)
"
```

---

## 🚨 Emergency Recovery

### **If Deployment Fails Completely**
1. **Rollback to previous commit:**
   ```bash
   git log --oneline
   git revert HEAD
   git push origin main
   ```

2. **Use SQLite fallback:**
   ```bash
   # Temporarily remove DATABASE_URL
   # Railway akan fallback ke SQLite
   ```

3. **Contact Support:**
   - Railway: support@railway.app
   - Check GitHub Actions logs

---

## 🎉 Conclusion

**Dengan troubleshooting guide ini, Railway deployment F.R.E.S.H. seharusnya berhasil!**

**Key Points:**
- `psycopg2-binary` WAJIB di requirements.txt
- `DATABASE_URL` harus benar formatnya
- `CORS_ORIGINS` harus include frontend domain
- Gunakan `/debug-db` untuk troubleshooting
- Restart service setelah mengubah variables

**🚀 Happy deploying!**
