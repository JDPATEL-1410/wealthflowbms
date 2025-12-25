# WealthFlow BMS - MongoDB Setup Guide

## Overview
This guide will help you set up WealthFlow BMS with MongoDB Atlas for persistent data storage. All data will be stored in MongoDB and will persist across refreshes and logouts.

## Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (already configured)
- Your MongoDB connection string: `mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/`

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

This will install all required packages including:
- `mongodb` - MongoDB driver for Node.js
- `react` & `react-dom` - Frontend framework
- `lucide-react` - Icon library (now using IndianRupee icon instead of DollarSign)
- `recharts` - Charts library
- `jspdf` & `jspdf-autotable` - PDF generation
- `xlsx` - Excel file handling

### 2. Environment Configuration
Create a `.env.local` file in the root directory (if not already exists):

```env
MONGODB_URI=mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster
NODE_ENV=development
```

**Note:** The connection string is already configured in `lib/mongodb.ts` as a fallback, so the `.env.local` file is optional.

### 3. MongoDB Database Structure
The application uses the following collections in the `wealthflow` database:

- **clients** - Client information with hierarchy
- **team** - Team members and their roles
- **transactions** - Brokerage transactions
- **batches** - Import batches
- **amc_mappings** - AMC name mappings
- **scheme_mappings** - Scheme name mappings
- **config** - Global sharing configuration
- **invoices** - Payout invoices

### 4. Data Persistence Features

#### Automatic Data Synchronization
- All data operations (Create, Read, Update, Delete) are automatically synced with MongoDB
- Data persists across:
  - Page refreshes
  - Browser sessions
  - User logouts
  - Application restarts

#### CRUD Operations
The application implements full CRUD operations for:

1. **Clients**
   - Add new clients
   - Update client hierarchy
   - Delete clients
   - Upsert clients (merge on PAN)

2. **Team Members**
   - Add team members
   - Update member details
   - Delete members
   - Custom level configurations

3. **Transactions**
   - Import transactions from CAMS/KFintech
   - Update transaction status
   - Calculate payouts
   - Generate reports

4. **Invoices**
   - Raise invoices
   - Update invoice status
   - Generate PDF invoices
   - Track payments

5. **Configuration**
   - Update sharing percentages
   - Modify level names
   - Adjust company expense percentage

### 5. Running the Application

#### Development Mode
```bash
npm run dev
```
The application will start on `http://localhost:5173`

#### Production Build
```bash
npm run build
npm run preview
```

### 6. API Endpoints

The application uses a single API endpoint `/api/data` with the following methods:

#### GET - Fetch Data
```
GET /api/data?type=<collection_name>
```
Example: `GET /api/data?type=clients`

#### POST - Create/Update Data
```
POST /api/data
Body: {
  collection: "clients",
  payload: {...},
  upsertField: "id"  // optional, defaults to "id"
}
```

#### DELETE - Remove Data
```
DELETE /api/data?type=<collection>&id=<item_id>
```
Example: `DELETE /api/data?type=clients&id=client123`

#### DELETE ALL - Reset Database
```
DELETE /api/data?action=reset
```
**Warning:** This will delete ALL data from ALL collections!

### 7. Currency Symbol Update

The application now uses the **Indian Rupee (₹)** symbol throughout:
- Dashboard statistics
- Reports and invoices
- Transaction displays
- All monetary values

The `DollarSign` icon from lucide-react has been replaced with `IndianRupee` icon in:
- `pages/Dashboard.tsx`
- `pages/Reports.tsx`

### 8. Deployment

#### Vercel Deployment
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard:
   - `MONGODB_URI` - Your MongoDB connection string

#### Environment Variables for Production
```env
MONGODB_URI=mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster
NODE_ENV=production
```

### 9. MongoDB Atlas Configuration

Your MongoDB cluster is already configured:
- **Cluster Name:** wealthflow-cluster
- **Database:** wealthflow
- **Username:** wealthflow_admin
- **Password:** wealthflow123

#### Network Access
Ensure your MongoDB Atlas cluster allows connections from:
- Your development IP address
- Vercel IP ranges (for production)
- Or set to "Allow access from anywhere" (0.0.0.0/0) for testing

### 10. Data Backup

To backup your MongoDB data:

```bash
# Using MongoDB Compass (GUI)
1. Connect to your cluster
2. Select database "wealthflow"
3. Export collections as JSON

# Using mongodump (CLI)
mongodump --uri="mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/wealthflow"
```

### 11. Troubleshooting

#### Connection Issues
- Verify MongoDB Atlas network access settings
- Check if connection string is correct
- Ensure MongoDB Atlas cluster is running

#### Data Not Persisting
- Check browser console for API errors
- Verify MongoDB connection in Network tab
- Check if `DataContext` is properly wrapping the app

#### Performance Issues
- MongoDB Atlas free tier has limitations
- Consider upgrading to a paid tier for production
- Add indexes to frequently queried fields

### 12. Security Best Practices

1. **Never commit `.env.local` to Git**
   - Already added to `.gitignore`

2. **Use environment variables for sensitive data**
   - MongoDB connection strings
   - API keys

3. **Implement authentication**
   - Current implementation uses mock authentication
   - Consider implementing JWT or OAuth for production

4. **Database Security**
   - Use strong passwords
   - Enable MongoDB Atlas IP whitelist
   - Regular security audits

## Features Summary

✅ **Persistent Data Storage** - All data stored in MongoDB Atlas  
✅ **CRUD Operations** - Full Create, Read, Update, Delete support  
✅ **Auto-Sync** - Real-time synchronization with database  
✅ **Indian Rupee Symbol** - Currency symbol changed from $ to ₹  
✅ **Offline Indicator** - Shows connection status  
✅ **Data Validation** - Input validation before database operations  
✅ **Error Handling** - Graceful error handling with user feedback  
✅ **Export Capabilities** - PDF and Excel export functionality  

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify MongoDB Atlas connection
3. Review API responses in Network tab
4. Check this documentation

---

**Last Updated:** December 2025  
**Version:** 1.0.0
