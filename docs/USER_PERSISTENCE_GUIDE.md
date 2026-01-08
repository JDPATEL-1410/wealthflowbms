# User Persistence - Quick Start Guide

## ✅ What Was Fixed

Users are now **permanently stored in MongoDB** and will **NOT disappear on page refresh**.

## 🚀 How to Use

### 1. Start the Backend Server
```bash
cd backend
npm start
```

The server will automatically:
- Connect to MongoDB Atlas
- Seed the default admin user if the database is empty
- Start listening on port 3001

### 2. Start the Frontend (Development)
```bash
cd frontend
npm run dev
```

### 3. Login with Default Admin
- **Email**: admin@wealthflow.com
- **Password**: admin

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

## 👥 Adding New Users

### Via UI (Recommended)
1. Login as admin
2. Go to **Clients & Hierarchy** page
3. Click the **Team** tab
4. Click **Add Team Member**
5. Fill in the details and save

### Via API (Advanced)
```javascript
POST http://localhost:3001/api/data
Content-Type: application/json

{
  "collection": "team",
  "payload": {
    "id": "unique_id_here",
    "name": "John Doe",
    "code": "EMP-001",
    "role": "EMPLOYEE",
    "level": 6,
    "email": "john@example.com",
    "password": "password123",
    "bankDetails": {
      "accountName": "John Doe",
      "accountNumber": "1234567890",
      "bankName": "Example Bank",
      "ifscCode": "EXAM0001"
    }
  },
  "upsertField": "id"
}
```

## 🔄 Verifying Persistence

### Method 1: Refresh Test
1. Login to the application
2. Create a new user
3. **Refresh the page** (F5 or Ctrl+R)
4. Check if the user still exists ✅

### Method 2: Run Test Script
```bash
node scripts/test-api.js
```

This will show:
- All users in the database
- Transaction count
- API health status

## 🗄️ Database Structure

### Team Collection
Each user document contains:
```json
{
  "id": "admin_root",
  "name": "System Administrator",
  "code": "ADMIN-001",
  "role": "ADMIN",
  "level": 1,
  "email": "admin@wealthflow.com",
  "password": "admin",
  "bankDetails": {
    "accountName": "",
    "accountNumber": "",
    "bankName": "",
    "ifscCode": ""
  },
  "createdAt": "2025-12-31T10:30:00.000Z",
  "updatedAt": "2025-12-31T10:30:00.000Z"
}
```

## 🔧 Troubleshooting

### Users Still Disappearing?

**Check 1: Is the backend running?**
```bash
# Should show: 🚀 Unified WealthFlow Server running on port 3001
```

**Check 2: Is MongoDB connected?**
Look for these messages in server logs:
- ✅ Default admin user created successfully
- ✅ Default config created successfully

**Check 3: Check browser console**
Open DevTools (F12) and look for errors in the Console tab

**Check 4: Verify database connection**
```bash
node scripts/test-api.js
```

Should show:
```
✅ Users in Database:
   - System Administrator (ADMIN-001) - admin@wealthflow.com - Role: ADMIN
```

### Can't Login?

1. **Verify credentials**:
   - Email: admin@wealthflow.com
   - Password: admin

2. **Check if user exists**:
   ```bash
   node scripts/test-api.js
   ```

3. **Clear browser cache**:
   - Press Ctrl+Shift+Delete
   - Clear cookies and cached data
   - Try logging in again

### Database Reset

If you need to start fresh:

1. **Via UI**:
   - Login as admin
   - Go to Settings
   - Click "Reset All Data"
   - Restart the backend server

2. **Via MongoDB Atlas**:
   - Go to MongoDB Atlas dashboard
   - Browse Collections
   - Delete all documents from `team` collection
   - Restart backend (will re-seed admin user)

## 📊 Monitoring

### Check Current Users
```bash
node scripts/test-api.js
```

### Check Database in MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Login with your credentials
3. Click on your cluster
4. Click "Browse Collections"
5. Select `wealthflow` database
6. View `team` collection

## 🔐 Security Notes

1. **Change Default Password**: The default admin password is "admin" - change it immediately!

2. **Password Storage**: Currently passwords are stored in plain text. For production:
   - Implement bcrypt password hashing
   - Add password strength requirements
   - Implement password reset via email

3. **Session Management**: Currently using localStorage. For production:
   - Implement JWT tokens
   - Add token expiration
   - Implement refresh tokens

## 📝 Summary

✅ **Users are now stored in MongoDB**  
✅ **Data persists across page refreshes**  
✅ **Default admin user auto-created on first run**  
✅ **All CRUD operations sync to database**  
✅ **Session management with localStorage**  

Your users will **never disappear again**! 🎉
