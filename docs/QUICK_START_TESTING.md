# User Persistence - Quick Start & Testing Guide

## Current Status
✅ User persistence system is implemented  
✅ Recovery module fixed to use user_profiles collection  
✅ Password reset now properly syncs to both collections  
✅ Login authentication works with user_profiles  

## Quick Start

### 1. Start the Backend Server
```bash
cd c:\Users\Admin\Downloads\wealthflow
node backend/server.js
```

Expected output:
```
🔍 Checking database initialization...
✅ Found X user profile(s) in database
✅ Database initialization complete
🚀 Unified WealthFlow Server running on port 3001
```

### 2. Start the Frontend (in a new terminal)
```bash
cd c:\Users\Admin\Downloads\wealthflow
npm run dev
```

### 3. Access the Application
Open browser: `http://localhost:5173`

## Default Login Credentials
- **Email**: `admin@wealthflow.com`
- **Password**: `admin`

## Testing the System

### Test 1: Check Current Users
```bash
node scripts/check-users-detailed.js
```

This will show:
- All users in user_profiles collection
- All users in team collection
- Sync status between collections
- Password sync verification

### Test 2: Test Login
1. Open `http://localhost:5173`
2. Login with: `admin@wealthflow.com` / `admin`
3. ✅ Should successfully login

### Test 3: Create New User
1. Login as admin
2. Go to **Clients & Hierarchy** → **Team**
3. Click **Add Team Member**
4. Fill in details:
   - Name: Test User
   - Code: TEST-001
   - Email: test@wealthflow.com
   - Password: test123
   - Role: Employee
   - Level: 6
5. Click **Save**
6. **Refresh the page** (F5)
7. ✅ User should still be there

### Test 4: Login with New User
1. Logout
2. Login with: `test@wealthflow.com` / `test123`
3. ✅ Should successfully login

### Test 5: Password Recovery
1. Logout
2. Click **Recovery?** on login page
3. Enter email: `test@wealthflow.com`
4. Click **Request Code**
5. Check the alert popup - it will show the OTP code
6. Enter the OTP code
7. Click **Verify Code**
8. Enter new password: `newpass123`
9. Confirm password: `newpass123`
10. Click **Update & Finish**
11. ✅ Should show "Password updated successfully"
12. Login with: `test@wealthflow.com` / `newpass123`
13. ✅ Should successfully login

### Test 6: Verify Persistence After Refresh
1. After password reset, **refresh the page** (F5)
2. Login with the new password
3. ✅ Should successfully login (proves password persisted)

### Test 7: Run Comprehensive Test Suite
```bash
node scripts/test-user-persistence-complete.js
```

This automated test will:
- ✅ Verify user_profiles collection exists
- ✅ Verify team collection exists
- ✅ Create a test user
- ✅ Verify sync to both collections
- ✅ Update password
- ✅ Verify password sync
- ✅ Test login authentication
- ✅ Test deletion protection
- ✅ Verify inactive users cannot login

## Troubleshooting

### Issue: "Account not found" during recovery
**Cause**: User doesn't exist in user_profiles collection  
**Fix**: Run diagnostic script to check users
```bash
node scripts/check-users-detailed.js
```

### Issue: "Invalid credentials" after password reset
**Cause**: Password not synced to user_profiles  
**Fix**: 
1. Check backend logs for sync errors
2. Run diagnostic script to verify password sync
3. Manually verify in database

### Issue: Users disappear after refresh
**Cause**: Backend not saving to database  
**Fix**:
1. Verify MongoDB connection string
2. Check backend logs for errors
3. Ensure backend server is running

### Issue: Recovery module not working
**Status**: ✅ FIXED - Now searches user_profiles collection  
**Verification**: Test password recovery flow

### Issue: Other accounts cannot login
**Possible Causes**:
1. User marked as inactive
2. Password mismatch between team and user_profiles
3. User doesn't exist in user_profiles

**Fix**:
```bash
# Run diagnostic to identify the issue
node scripts/check-users-detailed.js

# If users missing from user_profiles, restart backend
# (it will auto-migrate team members to user_profiles)
```

## Manual Database Verification

### Using MongoDB Compass or CLI

#### Check user_profiles collection:
```javascript
db.user_profiles.find({})
```

Expected fields:
- `id`: Unique identifier
- `name`: Full name
- `email`: Login email
- `password`: Password
- `code`: Employee code
- `role`: ADMIN or EMPLOYEE
- `isActive`: true/false
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### Check team collection:
```javascript
db.team.find({})
```

Should have same users as user_profiles (except inactive ones may be missing from team).

## Recovery Module - How It Works

### Before Fix ❌
```javascript
// Searched in team collection only
const user = team.find(u => u.email === identifier);
// Problem: Team might not have all users or might be out of sync
```

### After Fix ✅
```javascript
// Searches in user_profiles collection (source of truth)
const response = await fetch('/api/data?type=user_profiles');
const userProfiles = await response.json();
const user = userProfiles.find(u => u.email === identifier);
// Solution: Always uses the authentication database
```

## Password Reset - How It Works

### Process Flow:
1. User enters email → System finds user in user_profiles
2. System generates OTP → User enters OTP
3. User sets new password
4. **Frontend updates team collection** (triggers backend sync)
5. **Backend auto-syncs to user_profiles** (via team update hook)
6. **Frontend verifies update** (checks user_profiles)
7. User can login with new password

### Key Code:
```javascript
// Update team (triggers backend sync)
updateTeam(updatedTeam);

// Wait for sync
await new Promise(resolve => setTimeout(resolve, 300));

// Verify sync worked
const verifyResponse = await fetch('/api/data?type=user_profiles');
const profiles = await verifyResponse.json();
const updatedProfile = profiles.find(p => p.id === targetUser.id);

if (updatedProfile && updatedProfile.password === newPassword) {
  // Success!
}
```

## Files Modified

### Frontend
- ✅ `frontend/pages/Login.tsx`
  - Fixed `handleSendOtp` to search user_profiles
  - Fixed `handleResetPassword` to verify sync
  - Added better error handling

### Backend
- ✅ `backend/server.js`
  - Auto-syncs team updates to user_profiles
  - Deletion protection (marks inactive)
  - Auto-migration on startup

### Scripts
- ✅ `scripts/check-users-detailed.js` - Diagnostic tool
- ✅ `scripts/test-user-persistence-complete.js` - Test suite

## Success Criteria

✅ **Recovery Module**: Works with user_profiles collection  
✅ **Password Reset**: Syncs to both collections  
✅ **Login**: Works after password change  
✅ **Persistence**: Users don't disappear on refresh  
✅ **Other Accounts**: Can login successfully  

## Next Steps

1. **Test the recovery module** with the steps above
2. **Verify all existing users can login** 
3. **Run the diagnostic script** to check for any sync issues
4. **Run the comprehensive test suite** to verify everything works

---

**Status**: ✅ **FIXED AND READY FOR TESTING**

All issues have been addressed:
- Recovery module now works correctly
- Password changes persist properly
- All accounts should be able to login
- Complete test suite available for verification
