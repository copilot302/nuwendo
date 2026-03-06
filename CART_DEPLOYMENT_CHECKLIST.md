# Shopping Cart Deployment Checklist

## What You Committed:
- ✅ Cart database migration (018_create_cart_system.sql)
- ✅ Backend cart API routes (/api/cart/*)
- ✅ Frontend cart components and UI
- ✅ Shopping functionality in PatientDashboard

## Deployment Status:

### 🔄 Auto-Deploy (If Connected to GitHub)

**Railway Backend:**
- Push to main branch → Auto-deploys in ~2-3 minutes
- Check: https://railway.app dashboard for build logs

**Vercel Frontend:**
- Push to main branch → Auto-deploys in ~1-2 minutes  
- Check: https://vercel.com dashboard for deployments

### ⚠️ CRITICAL: Database Migration Required

The cart tables **MUST** be created on Railway's production database!

## Steps to Deploy Shopping Cart:

### Step 1: Wait for Auto-Deploy (2-5 minutes)
Check deployment status:
- Railway: https://railway.app/project/your-project
- Vercel: https://vercel.com/dashboard

### Step 2: Run Migration on Railway Database

**Method A: Railway Shell (Recommended)**
1. Open Railway Dashboard → Backend Service
2. Click **"Shell"** tab
3. Run these commands:
   ```bash
   cd backend/database
   node migrate.js
   ```
4. Look for: "✓ Applied migration: 018_create_cart_system.sql"

**Method B: Local Terminal with Railway DATABASE_URL**
1. Get DATABASE_URL from Railway Dashboard → Backend → Variables
2. Copy the PostgreSQL connection string
3. Run in PowerShell:
   ```powershell
   # Set Railway database URL (replace with your actual URL)
   $env:DATABASE_URL="postgresql://postgres:..."
   
   # Run migration
   cd C:\nuwendo\backend\database
   node migrate.js
   
   # Clear the variable after
   Remove-Item Env:\DATABASE_URL
   ```

### Step 3: Verify Deployment

**Test Backend API:**
```powershell
# Test if cart endpoint exists
curl https://nuwendo-production.up.railway.app/api/cart
```
Should return: 401 Unauthorized (means endpoint exists, just needs auth)

**Test Frontend:**
1. Visit: https://frontend-liart-six-87.vercel.app
2. Login as a patient with shop access
3. Go to Shop tab
4. Look for cart icon in header
5. Try adding items to cart

## Expected Results:

✅ **Cart icon appears** in shop page header  
✅ **Add to Cart button** on each product  
✅ **Modal opens** when clicking "Add to Cart"  
✅ **Quantity selector** works  
✅ **Cart modal** shows items  
✅ **Checkout process** creates orders  

## Troubleshooting:

### If cart features don't appear:
1. **Hard refresh frontend**: Ctrl+Shift+R or Ctrl+F5
2. **Clear browser cache**
3. **Check Vercel deployment** completed successfully

### If you get "Failed to add to cart" error:
1. **Migration not run** → Run migration on Railway database
2. **Check Railway logs** for database errors
3. **Verify cart routes** are deployed (check server.js includes cart routes)

### If cart icon doesn't show item count:
1. **Check browser console** (F12) for errors
2. **Verify authentication** token is valid
3. **Test cart API** directly with curl/Postman

## Quick Verification Commands:

```powershell
# Check if frontend deployed the cart component
curl https://frontend-liart-six-87.vercel.app/ | Select-String -Pattern "CartModal"

# Check Railway deployment time
# (Go to Railway dashboard to see last deployment time)

# Test cart API endpoint
curl https://nuwendo-production.up.railway.app/api/cart -H "Authorization: Bearer YOUR_TOKEN"
```

## Timeline:

- **Code Commit**: ✅ Done
- **Auto-Deploy**: 2-5 minutes from commit
- **Migration**: Manual step (5 minutes)
- **Testing**: 5-10 minutes
- **Total Time**: ~15-20 minutes to fully live

## Need Help?

If after running the migration and waiting for deployments:
- Cart still doesn't appear → Check browser console for errors
- API errors → Check Railway logs
- Frontend not updating → Try hard refresh or clear Vercel deployment cache
