# 💼 WealthFlow BMS - Brokerage Management System

A modern, full-stack brokerage management system built with React, TypeScript, and MongoDB Atlas. Features comprehensive authentication, client management, transaction tracking, and analytics.

![WealthFlow BMS](https://img.shields.io/badge/Status-Production%20Ready-success)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-green)
![React](https://img.shields.io/badge/Frontend-React%2018-blue)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)

## 🌟 Features

### 🔐 Authentication System
- **Sign Up**: Create new user accounts with email validation
- **Sign In**: Secure login with password protection
- **User Management**: Store and manage users in MongoDB Atlas
- **Role-Based Access**: Admin, Finance, Operations, and Viewer roles
- **Data Isolation**: Strict hierarchy-based visibility (Users only see their own portfolio)
- **Session Management**: Secure user sessions

### 📊 Dashboard & Analytics
- Real-time brokerage tracking
- Monthly payout calculations
- Client-wise reports
- AMC and Scheme analysis
- Transaction logs
- Visual charts and graphs

### 👥 Client Management
- Client hierarchy management
- PAN-based client mapping
- Folio tracking
- Relationship manager assignments

### 📈 Reports
- Monthly brokerage reports
- Client-wise summaries
- AMC-wise analysis
- Scheme-wise breakdowns
- Transaction logs
- Payout invoices

### ⚙️ Settings
- Global configuration
- Sharing rules
- Level-wise payout percentages (Level 0-6 supported)
- AMC and Scheme standardization
- Bank Details management with Account Type selection

## 🚀 Live Demo

**Coming Soon**: Deploy to Vercel for live demo

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Data Visualization

### Backend
- **Node.js** - Runtime
- **Express** - API Server
- **MongoDB Atlas** - Cloud Database
- **Vercel Serverless** - API Functions

### Tools & Libraries
- **jsPDF** - PDF Generation
- **XLSX** - Excel Export
- **dotenv** - Environment Variables

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier)
- Git installed

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/JDPATEL-1410/wealthflowbms.git
   cd wealthflowbms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   ```

4. **Seed the database** (First time only)
   ```bash
   node seed.js
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:5173
   ```

## 🔑 Default Credentials

After seeding the database, use these credentials to login:

- **Email**: `admin@wealthflow.com`
- **Password**: `admin123`

## 📁 Project Structure

```
wealthflowbms/
├── api/                    # Vercel serverless functions
│   └── data.js            # MongoDB API endpoints
├── components/            # React components
│   └── Layout.tsx         # Main layout component
├── contexts/              # React contexts
│   └── DataContext.tsx    # Global state management
├── pages/                 # Application pages
│   ├── Auth.tsx          # Authentication (Login/Signup)
│   ├── Dashboard.tsx     # Main dashboard
│   ├── Imports.tsx       # Data import page
│   ├── ClientsAndHierarchy.tsx
│   ├── Reports.tsx       # Analytics & reports
│   └── Settings.tsx      # Configuration
├── services/              # Business logic
│   └── mockData.ts       # Initial data
├── lib/                   # Utilities
│   └── mongodb.ts        # MongoDB connection
├── public/               # Static assets
├── .env.local           # Environment variables (not in git)
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
├── vercel.json          # Vercel deployment config
└── README.md            # This file
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub** (Already done!)
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variable:
     - Name: `MONGODB_URI`
     - Value: Your MongoDB Atlas connection string
   - Click "Deploy"

3. **Your app will be live at**:
   ```
   https://your-project-name.vercel.app
   ```

### Environment Variables for Production

Add these in Vercel dashboard:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wealthflow?retryWrites=true&w=majority
```

## 📖 Usage Guide

### Creating a New Account

1. Click on the "Sign Up" tab
2. Fill in your details:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
   - Confirm Password
3. Click "Create Account"
4. You'll be redirected to login automatically

### Importing Transactions

1. Navigate to "Imports" (Admin only)
2. Select brokerage period (YYYY-MM)
3. Choose source (CAMS/KFINTECH)
4. Upload Excel file
5. Review and validate data
6. Submit for processing

### Viewing Reports

1. Go to "Reports" section
2. Choose report type:
   - Overview
   - Monthly
   - Client-wise
   - AMC-wise
   - Scheme-wise
   - Transaction Log
   - Payouts
3. Apply filters as needed
4. Export to PDF or Excel

## 🔒 Security Features

- ✅ Password validation (minimum 6 characters)
- ✅ Email uniqueness check
- ✅ Secure MongoDB Atlas connection
- ✅ Environment variable protection
- ✅ Role-based access control
- ✅ Session management

### Production Security Recommendations

For production deployment, consider adding:
- Password hashing (bcrypt)
- JWT token authentication
- Rate limiting
- Email verification
- Two-factor authentication
- HTTPS enforcement

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**JD Patel**
- GitHub: [@JDPATEL-1410](https://github.com/JDPATEL-1410)
- Repository: [wealthflowbms](https://github.com/JDPATEL-1410/wealthflowbms)

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Deployed on [Vercel](https://vercel.com)
- Icons by [Lucide](https://lucide.dev/)

## 📞 Support

For support, email jdpatel1410@gmail.com or open an issue in the GitHub repository.

## 🗺️ Roadmap

- [ ] Email verification for new signups
- [ ] Password reset via email
- [ ] Two-factor authentication
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive improvements
- [ ] Dark mode support
- [ ] Export to multiple formats
- [ ] Automated email reports
- [ ] API documentation
- [ ] Unit and integration tests

## 📊 Database Schema

### Collections

- **team**: User accounts and team members
- **clients**: Client information and hierarchy
- **transactions**: Brokerage transactions
- **batches**: Import batch tracking
- **config**: Global configuration
- **amc_mappings**: AMC name standardization
- **scheme_mappings**: Scheme name standardization

## 🐛 Known Issues

None at the moment! Report issues on GitHub.

## 📈 Version History

- **v1.1.0** (2024-12-24)
  - Added Level 0 Hierarchy
  - Implemented Strict Data Isolation (RM-wise privacy)
  - Added Account Type dropdown (Savings/Current/NRE/NRO)
  - Restricted Dev Context Switcher to Admin only
  - Updated configuration UI for all levels
- **v1.0.0** (2024-12-24)
  - Initial release
  - Authentication system
  - MongoDB Atlas integration
  - Dashboard and analytics
  - Client management
  - Reports and exports

---

**Made with ❤️ by JD Patel**

⭐ Star this repository if you find it helpful!
