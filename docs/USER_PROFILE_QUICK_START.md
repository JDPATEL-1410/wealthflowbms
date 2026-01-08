# User Profile Persistence - Quick Start Guide

## ✅ Problem Fixed
User profiles no longer disappear on page refresh. All user data is now permanently stored in a dedicated `user_profiles` database collection that is protected from deletion.

## 🚀 Quick Start

### 1. Restart Your Server
```bash
npm run dev
```

The server will automatically:
- Create the `user_profiles` collection
- Migrate existing users to user_profiles
- Set up deletion protection

### 2. Test the Fix
Run the automated test:
```bash
node scripts/test-user-profile-persistence.js
```

### 3. Verify Everything Works
1. Login with: `admin@wealthflow.com` / `admin`
2. Create a new user in the Team section
3. Refresh the page (F5)
4. ✅ User should still be there!

## 🔒 What Changed

### Before
- Users stored only in `team` collection
- Could be accidentally deleted
- Data lost on certain operations

### After
- Users stored in dedicated `user_profiles` collection
- **NEVER deleted** (only marked as inactive)
- Complete data persistence and audit trail

## 📊 How It Works

```
User Created → Saved to 'team' → Auto-synced to 'user_profiles'
                                         ↓
                                  PROTECTED STORAGE
                                  (Never deleted)
```

## 🛡️ Protection Features

1. **Auto-Sync**: Team changes automatically sync to user_profiles
2. **Deletion Protection**: Users marked as "inactive" instead of deleted
3. **Data Recovery**: Inactive users can be reactivated
4. **Audit Trail**: Complete history of all user changes

## 📝 Common Tasks

### Create a New User
1. Go to **Clients & Hierarchy** → **Team** tab
2. Click **Add Team Member**
3. Fill in details and save
4. ✅ User is automatically saved to both `team` and `user_profiles`

### Delete a User
1. Go to **Clients & Hierarchy** → **Team** tab
2. Click delete on a user
3. ✅ User removed from team but profile preserved as inactive

### Reactivate a User
1. Access MongoDB directly or use admin tools
2. Set `isActive: true` on the user profile
3. ✅ User can log in again

## 🔍 Verification

### Check User Profiles in Database
```javascript
// In MongoDB or via API
GET /api/data?type=user_profiles

// Response shows all user profiles with isActive status
```

### Check Server Logs
Look for these messages on server start:
```
🔍 Checking database initialization...
✅ Found X user profile(s) in database
✅ Database initialization complete
```

## ⚠️ Important Notes

1. **User profiles are NEVER deleted** - only marked as inactive
2. **Inactive users cannot log in** - they get "Account is inactive" message
3. **Data is always preserved** - complete audit trail maintained
4. **Auto-sync is automatic** - no manual intervention needed

## 🐛 Troubleshooting

### Users Still Disappearing?
```bash
# 1. Check server logs
npm run dev

# 2. Run test script
node scripts/test-user-profile-persistence.js

# 3. Check MongoDB connection
# Verify MONGODB_URI in .env or server.js
```

### Can't Login?
- Check if user is marked as inactive
- Verify user exists in `user_profiles` collection
- Clear browser localStorage and try again

### Need to Migrate Existing Users?
```bash
node scripts/migrate-user-profiles.js
```

## ✨ Benefits

✅ **100% Data Persistence** - Users never disappear
✅ **Deletion Protection** - No accidental data loss
✅ **Audit Trail** - Complete user history
✅ **Easy Recovery** - Reactivate inactive users
✅ **Automatic Sync** - No manual work needed

## 📞 Support

If you encounter any issues:
1. Check the server logs for errors
2. Run the test script to verify setup
3. Review the detailed documentation in `USER_PERSISTENCE_FIX.md`

---

**Status**: ✅ **FULLY WORKING**

Your user data is now completely protected and will persist across all operations!
