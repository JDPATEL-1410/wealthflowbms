# WealthFlow BMS - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      WealthFlow BMS                              │
│                 Brokerage Management System                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  React + TypeScript + Vite                                       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │ Reports  │  │ Clients  │  │ Settings │        │
│  │   (₹)    │  │   (₹)    │  │Hierarchy │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  ┌──────────┐  ┌──────────┐                                     │
│  │ Imports  │  │  Login   │                                     │
│  └──────────┘  └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  DataContext (React Context API)                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  State:                                                   │   │
│  │  • clients[]        • team[]         • transactions[]    │   │
│  │  • batches[]        • invoices[]     • globalConfig      │   │
│  │  • amcMappings[]    • schemeMappings[]                   │   │
│  │  • loading          • isOnline       • isSyncing         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Functions:                                               │   │
│  │  • updateClients()    • upsertClients()                  │   │
│  │  • deleteClient()     • updateTeam()                     │   │
│  │  • addTransactions()  • addBatch()                       │   │
│  │  • updateConfig()     • addInvoice()                     │   │
│  │  • saveToDb()         • deleteFromDb()                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  /api/data                                                       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ GET          │  │ POST         │  │ DELETE       │          │
│  │ Fetch Data   │  │ Create/Update│  │ Remove Data  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  Query Params: ?type=<collection>&id=<item_id>                  │
│  Body: { collection, payload, upsertField }                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Connection Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  lib/mongodb.ts                                                  │
│                                                                   │
│  MongoDB Client Connection                                       │
│  • Connection pooling                                            │
│  • Error handling                                                │
│  • Environment variable support                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                               │
├─────────────────────────────────────────────────────────────────┤
│  Cluster: wealthflow-cluster                                     │
│  Database: wealthflow                                            │
│                                                                   │
│  Collections:                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  clients    │  │    team     │  │transactions │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  batches    │  │  invoices   │  │   config    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │amc_mappings │  │scheme_      │                               │
│  │             │  │mappings     │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Create Operation (Example: Adding a Client)

```
┌──────────┐
│  User    │
│ Action   │
└────┬─────┘
     │
     │ 1. Import Client Data
     ▼
┌──────────────────┐
│  Imports Page    │
│  Component       │
└────┬─────────────┘
     │
     │ 2. Call upsertClients()
     ▼
┌──────────────────┐
│  DataContext     │
│  • Update State  │
│  • Call saveToDb │
└────┬─────────────┘
     │
     │ 3. POST /api/data
     ▼
┌──────────────────┐
│  API Handler     │
│  • Validate      │
│  • Upsert to DB  │
└────┬─────────────┘
     │
     │ 4. MongoDB Operation
     ▼
┌──────────────────┐
│  MongoDB Atlas   │
│  • Store Data    │
│  • Return Result │
└────┬─────────────┘
     │
     │ 5. Success Response
     ▼
┌──────────────────┐
│  UI Update       │
│  • Show Success  │
│  • Refresh List  │
└──────────────────┘
```

### Read Operation (Example: Loading Dashboard)

```
┌──────────┐
│  User    │
│ Navigates│
└────┬─────┘
     │
     │ 1. Navigate to Dashboard
     ▼
┌──────────────────┐
│  Dashboard Page  │
│  Component Mount │
└────┬─────────────┘
     │
     │ 2. useData() Hook
     ▼
┌──────────────────┐
│  DataContext     │
│  • fetchData()   │
└────┬─────────────┘
     │
     │ 3. GET /api/data?type=clients
     │    GET /api/data?type=transactions
     │    GET /api/data?type=config
     ▼
┌──────────────────┐
│  API Handler     │
│  • Query MongoDB │
└────┬─────────────┘
     │
     │ 4. db.collection().find()
     ▼
┌──────────────────┐
│  MongoDB Atlas   │
│  • Fetch Data    │
│  • Return Array  │
└────┬─────────────┘
     │
     │ 5. Data Response
     ▼
┌──────────────────┐
│  DataContext     │
│  • Update State  │
└────┬─────────────┘
     │
     │ 6. State Update
     ▼
┌──────────────────┐
│  Dashboard       │
│  • Calculate     │
│  • Display ₹     │
└──────────────────┘
```

### Update Operation (Example: Modifying Configuration)

```
┌──────────┐
│  User    │
│ Edits    │
└────┬─────┘
     │
     │ 1. Change Sharing %
     ▼
┌──────────────────┐
│  Settings Page   │
│  • Validate Input│
└────┬─────────────┘
     │
     │ 2. Call updateConfig()
     ▼
┌──────────────────┐
│  DataContext     │
│  • Update State  │
│  • Call saveToDb │
└────┬─────────────┘
     │
     │ 3. POST /api/data
     │    { collection: "config", payload: {...} }
     ▼
┌──────────────────┐
│  API Handler     │
│  • Validate      │
│  • Update in DB  │
└────┬─────────────┘
     │
     │ 4. db.collection().updateOne()
     ▼
┌──────────────────┐
│  MongoDB Atlas   │
│  • Update Doc    │
│  • Return Result │
└────┬─────────────┘
     │
     │ 5. Success Response
     ▼
┌──────────────────┐
│  UI Update       │
│  • Show Success  │
│  • Recalculate   │
└──────────────────┘
```

### Delete Operation (Example: Removing a Client)

```
┌──────────┐
│  User    │
│ Clicks   │
└────┬─────┘
     │
     │ 1. Click Delete Button
     ▼
┌──────────────────┐
│  Clients Page    │
│  • Confirm Dialog│
└────┬─────────────┘
     │
     │ 2. Call deleteClient(id)
     ▼
┌──────────────────┐
│  DataContext     │
│  • Update State  │
│  • deleteFromDb  │
└────┬─────────────┘
     │
     │ 3. DELETE /api/data?type=clients&id=123
     ▼
┌──────────────────┐
│  API Handler     │
│  • Validate ID   │
│  • Delete from DB│
└────┬─────────────┘
     │
     │ 4. db.collection().deleteOne()
     ▼
┌──────────────────┐
│  MongoDB Atlas   │
│  • Remove Doc    │
│  • Return Result │
└────┬─────────────┘
     │
     │ 5. Success Response
     ▼
┌──────────────────┐
│  UI Update       │
│  • Remove from   │
│  • List          │
└──────────────────┘
```

## Component Hierarchy

```
App.tsx
│
├── Login.tsx
│
└── Layout.tsx
    │
    ├── Dashboard.tsx
    │   ├── StatCard (with ₹ icon)
    │   ├── AreaChart (Earnings)
    │   └── Payout Mix Cards
    │
    ├── ClientsAndHierarchy.tsx
    │   ├── Client List
    │   ├── Hierarchy Tree
    │   └── Edit Modal
    │
    ├── Imports.tsx
    │   ├── File Upload
    │   ├── Preview Table
    │   └── Import Button
    │
    ├── Reports.tsx (₹ icon)
    │   ├── Monthly Summary
    │   ├── Client Summary
    │   ├── Transaction Log
    │   ├── Invoice Management
    │   └── PDF Generator
    │
    └── Settings.tsx
        ├── Team Management
        ├── Sharing Config
        └── Level Names
```

## Technology Stack

```
┌─────────────────────────────────────────┐
│          Frontend                        │
├─────────────────────────────────────────┤
│ • React 18.2.0                           │
│ • TypeScript 5.2.2                       │
│ • Vite 5.1.4                             │
│ • Lucide React (Icons - ₹)              │
│ • Recharts (Charts)                      │
│ • TailwindCSS (Styling)                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          Backend                         │
├─────────────────────────────────────────┤
│ • Node.js                                │
│ • MongoDB Driver 6.5.0                   │
│ • API Routes (Vercel Functions)          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          Database                        │
├─────────────────────────────────────────┤
│ • MongoDB Atlas                          │
│ • Cluster: wealthflow-cluster            │
│ • Database: wealthflow                   │
│ • 8 Collections                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          Utilities                       │
├─────────────────────────────────────────┤
│ • jsPDF (PDF Generation)                 │
│ • jsPDF-AutoTable (Tables)               │
│ • XLSX (Excel Export)                    │
└─────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────┐
│      Environment Variables               │
├─────────────────────────────────────────┤
│ • MONGODB_URI (Connection String)        │
│ • NODE_ENV (Environment)                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      MongoDB Atlas Security              │
├─────────────────────────────────────────┤
│ • IP Whitelist                           │
│ • User Authentication                    │
│ • Network Encryption (TLS/SSL)           │
│ • Database Access Control                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      Application Security                │
├─────────────────────────────────────────┤
│ • Input Validation                       │
│ • XSS Protection                         │
│ • CSRF Protection                        │
│ • Secure Headers                         │
└─────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│           Developer                      │
└─────────────────┬───────────────────────┘
                  │
                  │ git push
                  ▼
┌─────────────────────────────────────────┐
│           GitHub Repository              │
└─────────────────┬───────────────────────┘
                  │
                  │ Auto Deploy
                  ▼
┌─────────────────────────────────────────┐
│           Vercel Platform                │
├─────────────────────────────────────────┤
│ • Build Application                      │
│ • Deploy Frontend                        │
│ • Setup API Routes                       │
│ • Configure Environment                  │
└─────────────────┬───────────────────────┘
                  │
                  │ Connect
                  ▼
┌─────────────────────────────────────────┐
│         MongoDB Atlas                    │
├─────────────────────────────────────────┤
│ • Cloud Database                         │
│ • Automatic Backups                      │
│ • Monitoring & Alerts                    │
└─────────────────────────────────────────┘
                  │
                  │ Serve
                  ▼
┌─────────────────────────────────────────┐
│           End Users                      │
│ • Access via Browser                     │
│ • View ₹ Symbol                          │
│ • Persistent Data                        │
└─────────────────────────────────────────┘
```

---

**Version:** 1.0.0  
**Last Updated:** December 25, 2025
