# 🔐 PASSPORT.JS AUTHENTICATION - Complete Implementation Guide

## ✅ WHAT I'VE BUILT FOR YOU

A complete authentication system with:
- ✅ Passport.js for authentication
- ✅ Bcrypt for password hashing
- ✅ Express sessions stored in MongoDB
- ✅ Login page as first page
- ✅ User registration
- ✅ Secure password storage
- ✅ Session persistence

## 📦 PACKAGES INSTALLED

```bash
✅ passport - Authentication middleware
✅ passport-local - Username/password strategy
✅ express-session - Session management
✅ bcryptjs - Password hashing
✅ connect-mongo - MongoDB session store
```

## 📁 NEW FILES CREATED

### 1. `backend/config/passport.js`
- Passport.js configuration
- Local strategy for email/password
- User serialization/deserialization
- Password comparison with bcrypt

### 2. `backend/routes/auth.js`
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user
- GET `/api/auth/me` - Get current user
- GET `/api/auth/status` - Check auth status

## 🔧 FILES MODIFIED

### `backend/server.js`
- Added Passport.js imports
- Added express-session middleware
- Added MongoDB session store
- Added authentication routes
- Hashed default admin password
- Set database for Passport

## 🚀 HOW TO USE

### Step 1: Restart Backend Server

**IMPORTANT**: Stop the current backend and restart it!

```bash
# Stop current backend (Ctrl+C)
# Then restart:
cd c:\Users\Admin\Downloads\wealthflow
node backend/server.js
```

You should see:
```
🔄 Connecting to MongoDB...
🔍 Checking database initialization...
✅ Found X user profile(s) in database
✅ Database initialization complete
✅ MongoDB connected successfully
🚀 Unified WealthFlow Server running on port 3001
```

### Step 2: Test Authentication Endpoints

#### Test 1: Check Auth Status
```bash
curl http://localhost:3001/api/auth/status
```

Should return:
```json
{
  "authenticated": false,
  "user": null
}
```

#### Test 2: Login with Default Admin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@wealthflow.com\",\"password\":\"admin\"}" \
  -c cookies.txt
```

Should return:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "admin_root",
    "name": "System Administrator",
    "email": "admin@wealthflow.com",
    "role": "ADMIN",
    "level": 1
  }
}
```

#### Test 3: Check Auth Status Again
```bash
curl http://localhost:3001/api/auth/status -b cookies.txt
```

Should return:
```json
{
  "authenticated": true,
  "user": {
    "id": "admin_root",
    "name": "System Administrator",
    ...
  }
}
```

#### Test 4: Register New User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Test User\",
    \"email\":\"test@wealthflow.com\",
    \"password\":\"test123\",
    \"code\":\"TEST-001\",
    \"role\":\"OPS\",
    \"level\":6
  }"
```

Should return:
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "user_...",
    "name": "Test User",
    "email": "test@wealthflow.com",
    ...
  }
}
```

## 🎨 FRONTEND INTEGRATION

Now you need to update the frontend to use these authentication endpoints.

### Update Login.tsx

Replace the login logic with API calls to `/api/auth/login`:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsAuthenticating(true);

  try {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // IMPORTANT!
      body: JSON.stringify({
        email: email.toLowerCase(),
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    console.log('✅ Login successful:', data.user);
    
    // Call parent onLogin with user data
    onLogin(data.user);

  } catch (error: any) {
    console.error('❌ Login error:', error);
    setError(error.message || 'Login failed');
  } finally {
    setIsAuthenticating(false);
  }
};
```

### Add Registration Form

Create a registration component or add to Login.tsx:

```typescript
const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  try {
    const response = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: registerForm.name,
        email: registerForm.email.toLowerCase(),
        password: registerForm.password,
        code: registerForm.code,
        role: 'OPS',
        level: 6
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    console.log('✅ Registration successful:', data.user);
    
    // Auto-login after registration
    onLogin(data.user);

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    setError(error.message || 'Registration failed');
  }
};
```

### Update App.tsx to Check Auth on Load

```typescript
useEffect(() => {
  // Check if user is already authenticated
  const checkAuth = async () => {
    try {
      const response = await fetch(getApiUrl('/api/auth/status'), {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setSessionRestored(true);
    }
  };

  checkAuth();
}, []);
```

### Add Logout Function

```typescript
const handleLogout = async () => {
  try {
    await fetch(getApiUrl('/api/auth/logout'), {
      method: 'POST',
      credentials: 'include'
    });

    setCurrentUser(null);
    setIsLoggedIn(false);
    
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

## 🔒 SECURITY FEATURES

### Password Hashing
- All passwords hashed with bcrypt (10 rounds)
- Default admin password is hashed
- Passwords never stored in plain text

### Session Security
- Sessions stored in MongoDB (not in memory)
- HttpOnly cookies (can't be accessed by JavaScript)
- Secure flag in production (HTTPS only)
- SameSite protection
- 24-hour session expiration

### Authentication Checks
- Middleware to protect routes
- User must be authenticated to access protected endpoints
- Inactive users cannot login

## 📊 DATABASE STRUCTURE

### user_profiles Collection
```json
{
  "id": "user_1736412345678",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2a$10$...", // Hashed with bcrypt
  "code": "USR-001",
  "role": "OPS",
  "level": 6,
  "bankDetails": {...},
  "isActive": true,
  "createdAt": "2026-01-09T10:00:00.000Z",
  "updatedAt": "2026-01-09T10:00:00.000Z"
}
```

### sessions Collection (Auto-created)
```json
{
  "_id": "session_id",
  "expires": ISODate("2026-01-10T10:00:00.000Z"),
  "session": {
    "cookie": {...},
    "passport": {
      "user": "user_id"
    }
  }
}
```

## 🧪 TESTING CHECKLIST

### Backend Tests

- [ ] Server starts without errors
- [ ] Can call `/api/auth/status`
- [ ] Can login with admin credentials
- [ ] Can register new user
- [ ] Can logout
- [ ] Session persists across requests
- [ ] Protected routes require authentication

### Frontend Tests

- [ ] Login page shows first
- [ ] Can login with admin credentials
- [ ] Dashboard shows after login
- [ ] Can register new user
- [ ] Can logout
- [ ] Session persists on page refresh
- [ ] Redirects to login when not authenticated

## 🔍 DEBUGGING

### Check Backend Logs

When logging in, you should see:
```
POST /api/auth/login - Origin: http://localhost:5174 - Auth: false
🔐 Attempting login for: admin@wealthflow.com
✅ Login successful for: admin@wealthflow.com
```

### Check Browser Console

Should see:
```
✅ Login successful: {id: "admin_root", name: "System Administrator", ...}
```

### Check Network Tab

1. Open DevTools (F12) → Network tab
2. Login
3. Look for `/api/auth/login` request
4. Check Response Headers for `Set-Cookie`
5. Check subsequent requests have `Cookie` header

### Common Issues

**Issue: "Not authenticated" error**
- Check `credentials: 'include'` in fetch calls
- Check CORS allows credentials
- Check cookie is being set

**Issue: "Invalid email or password"**
- Check password is correct
- Check user exists in database
- Check password is hashed correctly

**Issue: Session not persisting**
- Check MongoDB session store is working
- Check cookie settings
- Check trust proxy setting

## 📝 NEXT STEPS

1. **Update Frontend Login Component**
   - Use `/api/auth/login` endpoint
   - Add `credentials: 'include'`
   - Handle success/error responses

2. **Add Registration Form**
   - Create registration UI
   - Use `/api/auth/register` endpoint
   - Validate inputs

3. **Update App.tsx**
   - Check auth status on load
   - Protect routes
   - Handle logout

4. **Test Everything**
   - Test login
   - Test registration
   - Test logout
   - Test session persistence

## 🎯 SUMMARY

You now have a complete, secure authentication system with:

✅ Passport.js integration
✅ Bcrypt password hashing
✅ MongoDB session storage
✅ Login/Register/Logout endpoints
✅ Session persistence
✅ Protected routes
✅ Security best practices

**All backend code is ready! Just update the frontend to use the new endpoints.** 🚀

---

**Default Login:**
- Email: `admin@wealthflow.com`
- Password: `admin`

**Test it now:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@wealthflow.com\",\"password\":\"admin\"}"
```
