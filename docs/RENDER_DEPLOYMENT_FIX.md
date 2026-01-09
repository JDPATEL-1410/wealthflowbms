# 🚨 RENDER DEPLOYMENT FIX - Login & Signup Issues

## 🎯 ROOT CAUSES IDENTIFIED

### 1. **CORS Configuration Missing** ⚠️ CRITICAL
**Current Code (Line 14):**
```javascript
app.use(cors());
```

**Problem:** No credentials support, no origin restriction
**Impact:** Cookies won't work, cross-origin requests fail

### 2. **Trust Proxy Not Set** ⚠️ CRITICAL  
**Missing:** `app.set('trust proxy', 1)`
**Impact:** Express doesn't trust Render's proxy, cookies fail

### 3. **Frontend API URL** ⚠️ HIGH
**Current:** Uses relative URLs or localhost
**Impact:** Production calls go to wrong server

### 4. **No Authentication System** ⚠️ CRITICAL
**Current:** Uses localStorage for session
**Impact:** No proper JWT or session management

---

## 🔧 COMPLETE FIX - STEP BY STEP

### Fix 1: Update Backend CORS & Proxy

**File: `backend/server.js`**

Replace lines 10-15 with:

```javascript
const app = express();
const PORT = process.env.PORT || 3001;

// PRODUCTION FIX: Trust Render proxy
app.set('trust proxy', 1);

// PRODUCTION FIX: Proper CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wealthflowbms.onrender.com';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // CRITICAL: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json({ limit: '50mb' }));

// PRODUCTION FIX: Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});
```

### Fix 2: Update Frontend API Configuration

**File: `frontend/config/apiConfig.ts`**

Replace entire file:

```typescript
// API Configuration for Production
const isDevelopment = import.meta.env.DEV;
const PROD_API_URL = 'https://wealthflowbms.onrender.com';
const DEV_API_URL = 'http://localhost:3001';

// Use environment variable or fallback to auto-detection
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 
  (isDevelopment ? DEV_API_URL : PROD_API_URL);

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');

// API endpoints
export const API_ENDPOINTS = {
  data: `${API_BASE_URL}/api/data`,
};

// Helper function to build API URLs
export function getApiUrl(endpoint: string, params?: Record<string, string>): string {
  const url = `${API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }
  
  return url;
}

// Test API connection
export async function testApiConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing API connection to:', getApiUrl('/api/data', { type: 'team' }));
    const response = await fetch(getApiUrl('/api/data', { type: 'team' }), {
      credentials: 'include' // CRITICAL: Send cookies
    });
    console.log('✅ API connection test:', response.ok ? 'SUCCESS' : 'FAILED');
    return response.ok;
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return false;
  }
}
```

### Fix 3: Update DataContext with Credentials

**File: `frontend/contexts/DataContext.tsx`**

Find all `fetch()` calls and add `credentials: 'include'`:

**Line 72-81 (fetchData function):**
```typescript
const results = await Promise.allSettled([
  fetch(buildUrl('clients'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('team'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('batches'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('transactions'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('amc_mappings'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('scheme_mappings'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('config'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('invoices'), { credentials: 'include' }).then(res => res.json()),
  fetch(buildUrl('user_profiles'), { credentials: 'include' }).then(res => res.json()),
]);
```

**Line 136-140 (saveToDb function):**
```typescript
const response = await fetch(getApiUrl('/api/data'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // ADD THIS
  body: JSON.stringify({ collection, payload, upsertField })
});
```

**Line 154-157 (deleteFromDb function):**
```typescript
const response = await fetch(getApiUrl('/api/data', { type: collection, id }), {
  method: 'DELETE',
  credentials: 'include' // ADD THIS
});
```

### Fix 4: Update Login Page

**File: `frontend/pages/Login.tsx`**

Find the `handleSendOtp` function (around line 80-97) and update:

```typescript
const handleSendOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  const identifier = email.trim().toLowerCase();
  
  try {
    // Fetch from user_profiles collection for recovery
    const response = await fetch(getApiUrl('/api/data', { type: 'user_profiles' }), {
      credentials: 'include' // ADD THIS
    });
    const userProfiles = await response.json();
    
    // ... rest of the function
  } catch (error) {
    console.error('Recovery error:', error);
    setError('Unable to process recovery request. Please try again.');
  }
};
```

Find the `handleResetPassword` function (around line 108-155) and update:

```typescript
const handleResetPassword = async (e: React.FormEvent) => {
  // ... validation code ...

  if (targetUser) {
    try {
      setIsAuthenticating(true);
      
      // Update team collection with full user data
      const updatedTeam = team.map(u =>
        u.id === targetUser.id ? { ...u, password: newPassword, updatedAt: new Date().toISOString() } : u
      );
      updateTeam(updatedTeam);

      // Wait a moment for team update to sync
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify the update was successful by checking user_profiles
      const verifyResponse = await fetch(getApiUrl('/api/data', { type: 'user_profiles' }), {
        credentials: 'include' // ADD THIS
      });
      
      // ... rest of the function
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  }
};
```

---

## 📦 RENDER CONFIGURATION

### Environment Variables to Set in Render

Go to your Render dashboard → Your service → Environment:

```bash
# Backend Service
MONGODB_URI=mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/wealthflow?retryWrites=true&w=majority
FRONTEND_URL=https://wealthflowbms.onrender.com
NODE_ENV=production
PORT=3001

# Frontend Service (if separate)
VITE_API_URL=https://your-backend-service.onrender.com
```

### Build Commands

**Backend:**
```bash
# Build Command (if needed)
npm install

# Start Command
node backend/server.js
```

**Frontend:**
```bash
# Build Command
npm install && npm run build

# Start Command (Render serves static files)
# Leave empty or use: npx serve -s dist -l 3000
```

### Important Render Settings

1. **Auto-Deploy**: ON
2. **Branch**: main
3. **Root Directory**: Leave empty (or set to backend/ if needed)
4. **Health Check Path**: `/api/data?type=team`

---

## 🧪 DEBUG CHECKLIST

### Step 1: Check Browser Console

Open DevTools (F12) → Console tab:

```javascript
// Should see:
🌐 API Base URL: https://wealthflowbms.onrender.com
🔧 Environment: Production
🧪 Testing API connection to: https://wealthflowbms.onrender.com/api/data?type=team
✅ API connection test: SUCCESS
```

### Step 2: Check Network Tab

1. Open DevTools (F12) → Network tab
2. Try to login
3. Look for `/api/data` requests
4. Check:
   - **Request URL**: Should be `https://wealthflowbms.onrender.com/api/data`
   - **Status**: Should be `200 OK`
   - **Response Headers**: Should have `Access-Control-Allow-Origin`
   - **Request Headers**: Should have `Origin: https://wealthflowbms.onrender.com`

### Step 3: Check CORS Headers

In Network tab, click on the request → Headers:

**Response Headers should include:**
```
Access-Control-Allow-Origin: https://wealthflowbms.onrender.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### Step 4: Check Backend Logs

In Render dashboard → Your service → Logs:

```
Should see:
🔄 Connecting to MongoDB...
✅ MongoDB connected successfully
🚀 Unified WealthFlow Server running on port 3001

When making requests:
POST /api/data - Origin: https://wealthflowbms.onrender.com
💾 Saving team to database...
✅ team saved successfully
```

---

## ✅ TEST PLAN

### Test 1: Create User

1. Login as admin: `admin@wealthflow.com` / `admin`
2. Go to Clients & Hierarchy → Hierarchy
3. Click "Add New User"
4. Fill in:
   - Name: Test User
   - Code: TEST-001
   - Email: test@wealthflow.com
   - Password: test123
5. Click "Save User Profile"
6. ✅ Should see success message
7. ✅ Check browser console for: `✅ team saved successfully`
8. ✅ Check Render logs for: `✅ User profile synced successfully`

### Test 2: Verify Persistence

1. **Refresh the page** (F5)
2. ✅ User should still be in the list
3. ✅ Cloud icon should show "ONLINE"

### Test 3: Login with New User

1. Logout
2. Login with: `test@wealthflow.com` / `test123`
3. ✅ Should successfully login
4. ✅ Dashboard should show

### Test 4: Session Persistence

1. While logged in, **refresh the page** (F5)
2. ✅ Should stay logged in
3. ✅ Should not redirect to login page

### Test 5: Logout

1. Click logout
2. ✅ Should redirect to login page
3. ✅ localStorage should be cleared
4. Try to access dashboard directly
5. ✅ Should redirect to login

---

## 🚀 DEPLOYMENT STEPS

### 1. Update Code Locally

Apply all the fixes above to your local codebase.

### 2. Test Locally

```bash
# Start backend
node backend/server.js

# Start frontend (new terminal)
npm run dev

# Test everything works locally
```

### 3. Commit and Push

```bash
git add .
git commit -m "Fix: Production CORS, proxy, and API configuration for Render deployment"
git push origin main
```

### 4. Render Will Auto-Deploy

Wait for Render to rebuild (check Logs tab)

### 5. Test Production

1. Go to https://wealthflowbms.onrender.com
2. Check console for API URL
3. Try login
4. Create user
5. Verify persistence

---

## 🔍 COMMON ISSUES & SOLUTIONS

### Issue: Still shows "OFFLINE"

**Check:**
1. Frontend `VITE_API_URL` environment variable
2. Backend is running (check Render logs)
3. CORS origin matches exactly

**Fix:**
```bash
# In Render → Frontend service → Environment
VITE_API_URL=https://your-backend-service.onrender.com
```

### Issue: CORS Error in Console

**Error:**
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**Fix:**
1. Verify `FRONTEND_URL` env var in backend
2. Check `allowedOrigins` array includes your frontend URL
3. Ensure `credentials: true` in both CORS config and fetch calls

### Issue: Users Not Saving

**Check Backend Logs:**
```
Should see:
💾 Saving team to database...
✅ team saved successfully
🔄 Syncing team member Test User to user_profiles...
✅ User profile synced successfully
```

**If missing:**
1. Check MongoDB connection string
2. Verify database name in connection string
3. Check network access in MongoDB Atlas

### Issue: Login Redirects Back

**Check:**
1. User exists in `user_profiles` collection
2. Password matches exactly
3. `isActive` is `true`
4. Browser console for authentication errors

---

## 📝 SUMMARY OF CHANGES

### Backend (`backend/server.js`)
- ✅ Added `app.set('trust proxy', 1)`
- ✅ Configured CORS with credentials and allowed origins
- ✅ Added request logging

### Frontend (`frontend/config/apiConfig.ts`)
- ✅ Auto-detect production vs development
- ✅ Use correct API URL for each environment
- ✅ Added connection testing

### Frontend (`frontend/contexts/DataContext.tsx`)
- ✅ Added `credentials: 'include'` to all fetch calls

### Frontend (`frontend/pages/Login.tsx`)
- ✅ Added `credentials: 'include'` to recovery fetch calls

### Render Configuration
- ✅ Set `FRONTEND_URL` environment variable
- ✅ Set `MONGODB_URI` environment variable
- ✅ Set `VITE_API_URL` for frontend (if separate service)

---

**All changes are ready to commit and deploy!** 🚀
