# 💰 WealthFlow BMS - Complete Setup Guide

<div align="center">
  <h2>Brokerage Management System</h2>
  <p><strong>A comprehensive platform for managing brokerage transactions, client hierarchies, and financial reporting</strong></p>
</div>

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [System Overview](#-system-overview)
3. [Prerequisites](#-prerequisites)
4. [Installation](#-installation)
5. [Database Setup](#-database-setup)
6. [Running the Application](#-running-the-application)
7. [Features](#-features)
8. [Architecture](#-architecture)
9. [User Guide](#-user-guide)
10. [Troubleshooting](#-troubleshooting)
11. [Deployment](#-deployment)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Create .env.local file with your MongoDB connection string
echo "MONGODB_URI=your_mongodb_connection_string" > .env.local

# 3. Initialize database
npm run init-db

# 4. Start development server
npm run dev
```

**Access the app:** Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:3000`)

---

## 🎯 System Overview

WealthFlow BMS is a full-stack application for managing:
- **Client Hierarchies** (7-level deep organizational structure)
- **Brokerage Transactions** (Import, track, and calculate commissions)
- **Team Management** (Admin and user roles with data filtering)
- **Financial Reports** (Monthly summaries, invoices, and exports)
- **Configuration** (Customizable sharing percentages across hierarchy levels)

### Key Capabilities
✅ **Session Persistence** - Stay logged in across page refreshes  
✅ **Data Persistence** - All data stored in MongoDB Atlas  
✅ **User-Specific Filtering** - See only relevant data based on role  
✅ **Real-time Calculations** - Automatic brokerage distribution  
✅ **Excel Import/Export** - Bulk data operations  
✅ **PDF Generation** - Professional invoices and reports  

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas Account** (free tier available) - [Sign up](https://www.mongodb.com/cloud/atlas)
- **Git** (for version control) - [Download](https://git-scm.com/)
- **Vercel Account** (optional, for deployment) - [Sign up](https://vercel.com/)

---

## 💻 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/JDPATEL-1410/wealthflowbms.git
cd wealthflowbms
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages:
- React, TypeScript, Vite (Frontend)
- MongoDB driver (Database)
- Vercel CLI (Development & Deployment)
- Recharts, jsPDF, XLSX (Utilities)

---

## 🗄️ Database Setup

### Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string

### Step 2: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=wealthflow-cluster
```

Replace `username`, `password`, and `cluster` with your actual MongoDB credentials.

### Step 3: Initialize Database

Run the initialization script to create all required collections and indexes:

```bash
npm run init-db
```

This creates 8 collections:
- `clients` - Client information and hierarchy
- `team` - Team members and roles
- `transactions` - Brokerage transactions
- `batches` - Import batch tracking
- `amc_mappings` - AMC name standardization
- `scheme_mappings` - Scheme name standardization
- `config` - Global configuration
- `invoices` - Generated invoices

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

This starts:
- **Vite dev server** (Frontend)
- **Vercel serverless functions** (API routes)
- **Hot module replacement** (Auto-reload on changes)

**First-time setup:** Vercel CLI will prompt you to:
1. Login to Vercel (creates a free account)
2. Link your project
3. Accept default settings (just press Enter)

### Alternative: Vite Only (No API)

```bash
npm run dev:vite
```

⚠️ **Warning:** This runs only the frontend without API support. Data won't persist.

### Production Build

```bash
npm run build
npm run preview
```

---

## ✨ Features

### 1. **Dashboard**
- Real-time brokerage calculations
- Earnings overview with charts
- Payout distribution across hierarchy levels
- Monthly performance metrics

### 2. **Client & Hierarchy Management**
- 7-level organizational hierarchy (Level 0 to Level 6)
- Client assignment and reassignment
- Bulk import via Excel
- Search and filter capabilities

### 3. **Transaction Import**
- Excel file upload (.xlsx, .xls)
- Automatic data validation
- Duplicate detection
- Batch tracking

### 4. **Reports**
- Monthly summary reports
- Client-wise breakdowns
- Transaction logs
- Invoice generation (PDF)
- Excel export

### 5. **Settings**
- Team member management
- Sharing percentage configuration
- Hierarchy level naming
- AMC/Scheme mapping

### 6. **User Roles**
- **Admin**: Full access to all data and features
- **User**: Access only to assigned clients and transactions

---

## 🏗️ Architecture

### Technology Stack

```
Frontend:
├── React 18.2.0
├── TypeScript 5.2.2
├── Vite 5.1.4
├── TailwindCSS 3.4.1
├── Lucide React (Icons)
└── Recharts (Charts)

Backend:
├── Node.js
├── Vercel Serverless Functions
└── MongoDB Driver 6.5.0

Database:
└── MongoDB Atlas
    ├── Cluster: wealthflow-cluster
    └── Database: wealthflow

Utilities:
├── jsPDF (PDF generation)
├── jsPDF-AutoTable (Tables)
└── XLSX (Excel operations)
```

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Dashboard │  │ Clients  │  │ Reports  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              React State Management                      │
│              (DataContext)                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel Serverless API                       │
│              /api/data                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MongoDB Atlas                               │
│              (8 Collections)                             │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**1. User Login**
```
User enters credentials → Validate against team collection → 
Save session to localStorage → Load user-specific data → 
Show dashboard
```

**2. Page Refresh**
```
Check localStorage for session → Validate user exists → 
Auto-login → Restore user context → Load data from MongoDB → 
User stays on same screen
```

**3. Data Import**
```
Upload Excel file → Parse and validate → Save to MongoDB → 
Update React state → Refresh UI → Data persists permanently
```

---

## 📖 User Guide

### First-Time Setup

1. **Login as Admin**
   - Default credentials are in the team collection
   - Or create a new admin user in Settings

2. **Configure Hierarchy Levels**
   - Go to Settings → System Configuration
   - Name your hierarchy levels (e.g., "Region", "Branch", "Team")

3. **Set Sharing Percentages**
   - Go to Settings → Sharing Configuration
   - Set percentage for each level (must total 100%)

4. **Add Team Members**
   - Go to Settings → Team Management
   - Add users with appropriate roles

5. **Import Clients**
   - Go to Imports → Clients
   - Upload Excel file with client data
   - Assign hierarchy levels

6. **Import Transactions**
   - Go to Imports → Transactions
   - Upload brokerage data
   - System auto-calculates distributions

### Daily Operations

**For Admins:**
- Import new transactions
- Generate monthly invoices
- Review reports
- Manage team members

**For Users:**
- View assigned clients
- Check earnings
- Download reports
- Track performance

### Session Management

✅ **Auto-Login:** Your session persists across page refreshes  
✅ **Manual Logout:** Click your profile → Logout  
✅ **Session Security:** Session validates against database on restore  

---

## 🐛 Troubleshooting

### Issue: Data disappears on refresh

**Cause:** Not using Vercel dev server  
**Solution:**
```bash
# Stop current server (Ctrl+C)
npm run dev  # Use this, not npm run dev:vite
```

### Issue: "Failed to connect to MongoDB"

**Solutions:**
1. Check `.env.local` has correct `MONGODB_URI`
2. Verify MongoDB Atlas cluster is running
3. Whitelist your IP in MongoDB Atlas Network Access
4. Test connection string in MongoDB Compass

### Issue: "Cannot find module './lib/mongodb'"

**Cause:** Incorrect import path  
**Solution:** Already fixed in latest version. Pull latest code:
```bash
git pull origin main
```

### Issue: User logged out on refresh

**Cause:** Old version without session persistence  
**Solution:** Already fixed. Clear browser cache and reload:
```bash
# In browser DevTools (F12)
Application → Local Storage → Clear All
```

### Issue: API routes returning 404

**Cause:** Not using Vercel dev server  
**Solution:**
```bash
npm run dev  # This enables API routes
```

### Issue: Vercel CLI not found

**Solution:**
```bash
npm install  # Reinstall dependencies
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

#### Option 1: Automatic Deployment

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variable: `MONGODB_URI`
6. Click "Deploy"

#### Option 2: Manual Deployment

```bash
# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

### Environment Variables in Production

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `MONGODB_URI` = `your_mongodb_connection_string`
3. Redeploy the project

### Post-Deployment

1. Test the deployed URL
2. Login and verify data persistence
3. Import test data
4. Generate a test report
5. Share the URL with your team

---

## 📊 Database Collections

### clients
```javascript
{
  id: "unique-id",
  name: "Client Name",
  pan: "ABCDE1234F",
  folios: ["F001", "F002"],
  hierarchy: {
    level0Id: "user-id",
    level1Id: "user-id",
    // ... up to level6Id
  }
}
```

### team
```javascript
{
  id: "unique-id",
  name: "Team Member",
  email: "email@example.com",
  code: "TM001",
  role: "ADMIN" | "USER"
}
```

### transactions
```javascript
{
  id: "unique-id",
  mappedClientId: "client-id",
  batchId: "batch-id",
  brokeragePeriod: "2024-12",
  brokerage: 10000,
  pan: "ABCDE1234F",
  // ... other fields
}
```

---

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Use strong MongoDB passwords**
3. **Whitelist specific IPs in production** (not 0.0.0.0/0)
4. **Regularly backup your database**
5. **Keep dependencies updated:** `npm audit fix`

---

## 📞 Support

### Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Initialize database
npm run init-db

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

### Useful Resources

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Vercel Docs](https://vercel.com/docs)
- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

---

## 📝 Version History

### v1.0.0 (Current)
- ✅ Session persistence with localStorage
- ✅ Data persistence to MongoDB Atlas
- ✅ User-specific data filtering
- ✅ 7-level hierarchy support
- ✅ Excel import/export
- ✅ PDF invoice generation
- ✅ Real-time calculations
- ✅ Vercel serverless functions

---

## 🎉 You're All Set!

Your WealthFlow BMS is now ready to use. Start by:

1. Running `npm run dev`
2. Logging in with admin credentials
3. Importing your client data
4. Uploading transaction files
5. Generating your first report

**Need help?** Check the Troubleshooting section or review the inline code comments.

---

**Built with ❤️ for efficient brokerage management**

**Repository:** [https://github.com/JDPATEL-1410/wealthflowbms](https://github.com/JDPATEL-1410/wealthflowbms)

**Last Updated:** December 25, 2025
