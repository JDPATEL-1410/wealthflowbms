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
# 1. Install dependencies (from root)
npm install

# 2. Set up environment variables
# Create .env.local file in the root with your MongoDB connection string
echo "MONGODB_URI=your_mongodb_connection_string" > .env.local

# 3. Initialize database
npm run init-db

# 4. Start Backend & API server (Terminal 1)
npm run backend

# 5. Start Frontend dev server (Terminal 2)
npm run frontend
```

**Access the app:** Open your browser to `http://localhost:5173` (Vite will show the exact URL)

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
- **Render Account** (recommended, for deployment) - [Sign up](https://render.com/)

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
- Express, JWT, BcryptJS (Backend)
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

This creates the core collections including:
- `clients`, `user_profiles`, `transactions`, `batches`, `amc_mappings`, `scheme_mappings`, `config`, `invoices`.

---

## 🏃 Running the Application

### Development Mode

WealthFlow uses a unified server architecture.

**1. Start Backend Server**
```bash
npm run backend
```
*Runs Express server on http://localhost:3001*

**2. Start Frontend Dev**
```bash
npm run frontend
```
*Runs Vite dev server on http://localhost:5173*

### Production Mode

```bash
npm run build
npm run backend # Serves frontend assets from /frontend/dist
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
├── Node.js / Express
├── JWT Authentication
└── MongoDB Driver 6.21.0

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
│              Unified Node.js / Express API               │
│              (Routes: /api/auth, /api/users, /api/data)  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MongoDB Atlas                               │
│              (Collections: user_profiles, clients, etc.) │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**1. User Login**
```
User enters credentials → Validate against user_profiles collection → 
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
   - Default credentials are in the user_profiles collection
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

## 🚀 Deployment (Render)

### Deploy to Render (Recommended)

1. **Connect GitHub**: Import your repository to Render.
2. **Create Web Service**:
   - **Environment**: Node
   - **Build Command**: `npm run install-all && npm run build`
   - **Start Command**: `npm run backend`
3. **Environment Variables**:
   - `MONGODB_URI`: Your MongoDB connection string.
   - `JWT_SECRET`: A long random string for authentication.
   - `FRONTEND_URL`: The URL of your Render service (e.g., `https://wealthflowbms.onrender.com`).

---

## 🐛 Troubleshooting

### Issue: API connection failure

**Solution:** Ensure the backend is running.
```bash
npm run backend
```

### Issue: "Failed to connect to MongoDB"

**Solutions:**
1. Check `.env.local` has correct `MONGODB_URI`
2. Verify MongoDB Atlas cluster is running
3. Whitelist your IP in MongoDB Atlas Network Access
4. Test connection string in MongoDB Compass

### Issue: User logged out on refresh

**Cause:** Old version without session persistence  
**Solution:** Already fixed. Clear browser cache and reload:
```bash
# In browser DevTools (F12)
Application → Local Storage → Clear All
```

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
