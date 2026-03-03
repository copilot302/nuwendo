# 🚨 RAILWAY 502 ERROR - MANUAL CONFIGURATION REQUIRED 🚨

## Current Situation

Your backend code is **correct and working** (confirmed by deploy logs), but Railway returns **502 Bad Gateway** when accessed externally.

## Deploy Logs Show Success:
```
✓ Server is running on port 5000
✓ Environment: production
✓ Connected to PostgreSQL database
```

## But External Access Fails:
- https://nuwendo-production.up.railway.app → 502 Bad Gateway
- All API endpoints → 502 Bad Gateway
- Frontend cannot reach backend → CORS error

## 🔧 REQUIRED: Manual Railway Configuration

### Step 1: Check Railway Service Configuration

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Click your project** (nuwendo)
3. **Click backend service**
4. **Go to Settings tab**

### Step 2: Configure Service Settings

Check and set these settings:

#### Root Directory (CRITICAL)
- **Current**: Probably empty or "/"
- **Should be**: `backend`
- **Why**: Railway needs to know where your server code is

#### Start Command (CRITICAL)
- **Current**: Might be using nixpacks auto-detect
- **Should be**: `node server.js`
- **Why**: Explicit command ensures proper startup

#### Port
- **Leave empty** - Railway automatically sets $PORT
- Server listens on: `process.env.PORT || 5000`

### Step 3: Set Environment Variables

In Settings → Variables, ensure these are set:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | ✅ Yes |
| `CORS_ORIGIN` | `https://frontend-liart-six-87.vercel.app` | ✅ Yes |
| `JWT_SECRET` | Your secret key | ✅ Yes |
| `NODE_ENV` | `production` | ⚠️ Recommended |

**IMPORTANT**: Use the **${{Postgres.DATABASE_URL}}** reference format, NOT a raw connection string!

### Step 4: Check Health Check Configuration

1. In Settings, find "Health Check" section
2. **Option A**: Remove/disable health check completely
3. **Option B**: Set health check path to `/ping` with 30s timeout

### Step 5: Redeploy

After making changes:
1. Click **"Deploy"** button or
2. Go to Deployments tab → Click "Redeploy"
3. Wait 1-2 minutes for deployment
4. Check deploy logs for: `✓ Server is running on 0.0.0.0:PORT`

## 🧪 Testing After Configuration

Run these tests:

### Test 1: Ping Endpoint
```powershell
Invoke-WebRequest -Uri "https://nuwendo-production.up.railway.app/ping" -UseBasicParsing
```
Should return: `OK`

### Test 2: Root Endpoint
```powershell
Invoke-WebRequest -Uri "https://nuwendo-production.up.railway.app/" -UseBasicParsing
```
Should return JSON with welcome message

### Test 3: Health Endpoint
```powershell
Invoke-WebRequest -Uri "https://nuwendo-production.up.railway.app/api/health" -UseBasicParsing
```
Should return: `{"status":"OK","database":"Connected"}`

## 🔍 Alternative: Check Railway Deployment Logs

1. Railway Dashboard → Backend Service → **Deployments** tab
2. Click **latest deployment**
3. Check both **Build Logs** and **Deploy Logs**

Look for:
- ✅ `✓ Server is running on 0.0.0.0:PORT` (with the actual port number)
- ❌ Any error messages
- ❌ Application crashes or restarts

## 🐛 If Still 502 After Configuration

### Possibility 1: Railway Region Issue
- Backend might be in wrong region
- Try creating a new service in a different region

### Possibility 2: Port Binding Issue
The deploy logs should show:
```
✓ Server is running on 0.0.0.0:7890  # or whatever port Railway assigns
```

If it shows port 5000 instead of Railway's assigned port, the deployment is using old code.

### Possibility 3: Railway Service Domain
1. Settings → Domains
2. Check if service domain is properly configured
3. Try regenerating the domain

### Possibility 4: Use Railway Shell
1. Railway Dashboard → Backend Service
2. Click **Shell** tab (terminal icon)
3. Run: `curl localhost:$PORT/ping`
4. If this works but external access doesn't, it's a Railway proxy issue

## 📝 Configuration Files Already Set

These files are properly configured in your repo:
- ✅ `railway.json` - Railway deployment config
- ✅ `nixpacks.toml` - Build configuration
- ✅ `backend/server.js` - Listens on 0.0.0.0:$PORT
- ✅ `backend/src/config/database.js` - SSL disabled for Railway

## 🎯 Quick Fix Checklist

- [ ] Railway Settings → Root Directory = `backend`
- [ ] Railway Settings → Start Command = `node server.js`
- [ ] Railway Variables → `CORS_ORIGIN` set
- [ ] Railway Variables → `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- [ ] Health Check → Disabled or set to `/ping`
- [ ] Redeploy service
- [ ] Check deploy logs show `0.0.0.0:PORT`
- [ ] Test `/ping` endpoint externally

## 💡 Why This Happens

Railway has multiple configuration sources:
1. `railway.json` / `nixpacks.toml` files
2. UI Settings (override files)
3. Auto-detection

Sometimes UI settings override file configurations, causing issues.The manual configuration in Railway Dashboard takes highest priority.

## After Fixing

Once the backend responds:
1. Test from frontend: https://frontend-liart-six-87.vercel.app
2. CORS should work (we configured it)
3. Login should work from any device

---

**Current Status**: Backend code is correct, Railway configuration needs manual adjustment in dashboard.
