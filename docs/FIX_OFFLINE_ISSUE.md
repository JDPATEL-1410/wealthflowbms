# 🔧 FIX: Backend Connection & User Persistence

## Issue Identified
The cloud icon shows "OFFLINE" because the frontend cannot connect to the backend API. This prevents users from being saved to the database.

## Root Cause
The frontend is using relative API URLs (`/api/data`) which require the Vite dev server's proxy to work correctly. The proxy needs to forward requests to the backend on port 3001.

## Fixes Applied

### 1. Created API Configuration (`frontend/config/apiConfig.ts`)
- Centralized API URL management
- Environment variable support
- Helper functions for building API URLs

### 2. Created Environment File (`frontend/.env`)
```
VITE_API_URL=http://localhost:3001
```

### 3. Updated DataContext.tsx
- Now uses `getApiUrl()` helper for all API calls
- Better error handling and logging
- Shows detailed error messages in console

### 4. Added Console Logging
When saving users, you'll now see:
```
💾 Saving team to database...
✅ team saved successfully
```

## How to Fix the "OFFLINE" Issue

### Step 1: Restart the Frontend Dev Server

**IMPORTANT**: You need to restart the frontend server to pick up the changes!

1. **Stop the current frontend server** (if running):
   - Press `Ctrl+C` in the terminal running `npm run dev`

2. **Start the frontend server again**:
   ```bash
   cd c:\Users\Admin\Downloads\wealthflow
   npm run dev
   ```

3. **Wait for it to start**:
   ```
   VITE v5.4.21  ready in 926 ms
   ➜  Local:   http://localhost:5174/
   ```

### Step 2: Verify Backend is Running

The backend should already be running on port 3001. Check the terminal:
```
🔄 Connecting to MongoDB...
✅ MongoDB connected successfully
🚀 Unified WealthFlow Server running on port 3001
```

If not running, start it:
```bash
node backend/server.js
```

### Step 3: Test the Connection

1. Open your browser to `http://localhost:5174`
2. Check the cloud icon in the header
3. ✅ Should show "ONLINE" (green)
4. ❌ If still "OFFLINE", check browser console for errors

## Testing User Creation

### Test 1: Create a New User

1. Login as admin (`admin@wealthflow.com` / `admin`)
2. Go to **Clients & Hierarchy** → **Hierarchy** tab
3. Click **"Add New User"**
4. Fill in the form:
   ```
   Full Name: Test User
   Code: TEST-001
   Email: test@wealthflow.com
   Password: test123
   Role: OPS
   Level: 6
   ```
5. Click **"Save User Profile"**

### What You Should See in Browser Console:

```
Creating new user: {id: "tm_...", name: "Test User", ...}
📝 Updating team with 3 members
💾 Saving team to database...
✅ team saved successfully
User saved to database
```

### Test 2: Verify Persistence

1. **Refresh the page** (F5)
2. ✅ User should still be in the team list
3. ✅ Cloud icon should still show "ONLINE"

### Test 3: Test Login

1. Logout
2. Login with new user:
   - Email: `test@wealthflow.com`
   - Password: `test123`
3. ✅ Should successfully login
4. ✅ Dashboard should show

## Troubleshooting

### Issue: Cloud Still Shows "OFFLINE"

**Solution 1: Check Proxy Configuration**
```bash
# Make sure vite.config.ts has the proxy setup
# It should proxy /api to http://localhost:3001
```

**Solution 2: Check Browser Console**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors like:
   - `Failed to fetch`
   - `ERR_CONNECTION_REFUSED`
   - `404 Not Found`

**Solution 3: Verify Backend is Accessible**
```bash
# Test backend directly
curl http://localhost:3001/api/data?type=team
```

Should return JSON with users.

**Solution 4: Clear Browser Cache**
1. Hard refresh: `Ctrl+Shift+R`
2. Or clear cache in DevTools → Network tab → "Disable cache"

### Issue: Users Not Saving

**Check Console Logs:**
```
💾 Saving team to database...
❌ Failed to save team to MongoDB: Error: ...
```

**Common Causes:**
1. Backend not running
2. MongoDB connection failed
3. Network error

**Solution:**
1. Check backend terminal for errors
2. Verify MongoDB connection string
3. Restart backend server

### Issue: Users Disappear After Refresh

**This should NOT happen anymore!**

If it does:
1. Check browser console for save errors
2. Verify backend logs show successful save
3. Check MongoDB directly to see if data is there

## Directory Structure

```
wealthflow/
├── frontend/
│   ├── config/
│   │   └── apiConfig.ts          ← NEW: API configuration
│   ├── contexts/
│   │   └── DataContext.tsx       ← UPDATED: Uses getApiUrl
│   ├── .env                      ← NEW: Environment variables
│   └── vite.config.ts            ← Proxy configuration
├── backend/
│   └── server.js                 ← Backend API server
└── scripts/
    └── test-complete-user-flow.js ← Test script
```

## Quick Commands

### Start Backend:
```bash
node backend/server.js
```

### Start Frontend:
```bash
cd frontend
npm run dev
```

### Test User Creation:
```bash
node scripts/test-complete-user-flow.js
```

### Check Backend Health:
```bash
curl http://localhost:3001/api/data?type=team
```

## Expected Behavior

### When Creating a User:

1. ✅ Cloud icon shows "ONLINE"
2. ✅ Fill in user form
3. ✅ Click "Save User Profile"
4. ✅ See console logs:
   ```
   💾 Saving team to database...
   ✅ team saved successfully
   ```
5. ✅ Success alert with login credentials
6. ✅ User appears in team list
7. ✅ Refresh page - user still there
8. ✅ User can login with credentials

### When System is Working:

- ✅ Cloud icon: **ONLINE** (green)
- ✅ Users save to database
- ✅ Users persist across refreshes
- ✅ Users can login
- ✅ Dashboard shows after login

## Next Steps

1. **Restart frontend server** (IMPORTANT!)
2. **Check cloud icon** - should show ONLINE
3. **Create a test user**
4. **Verify persistence** by refreshing
5. **Test login** with new user

---

**Status**: ✅ **FIXES APPLIED**

All code changes have been made. You just need to **restart the frontend server** for the changes to take effect!

```bash
# Stop current frontend (Ctrl+C)
# Then restart:
npm run dev
```

After restarting, the cloud icon should show "ONLINE" and users will save correctly! 🎉
