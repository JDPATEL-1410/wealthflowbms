# Deployment Guide for Render (Unified Frontend & Backend)

This application is configured as a monorepo with a unified backend that serves the frontend. This allows you to deploy the entire application as a **single Web Service** on Render, saving costs and simplifying configuration.

## Prerequisites
- A GitHub/GitLab repository containing this code.
- A Render account.
- A MongoDB Atlas cluster (connection string needed).

## Step-by-Step Deployment

1.  **Create New Web Service**
    - Go to your Render Dashboard.
    - Click **New +** -> **Web Service**.
    - Connect your repository.

2.  **Configure Service Settings**
    - **Name**: `wealthflow-app` (or your choice)
    - **Region**: Closest to your users.
    - **Branch**: `main` (or your working branch).
    - **Root Directory**: `.` (Leave empty/default).
    - **Runtime**: `Node`.
    - **Build Command**: `npm install && npm run build`
        - *This installs dependencies for both frontend/backend and builds the frontend static files.*
    - **Start Command**: `npm run backend`
        - *This starts the Express server which serves both the API and the React frontend.*

3.  **Environment Variables**
    Add the following environment variables in the "Environment" tab:

    | Key | Value (Example) | Description |
    |-----|-----------------|-------------|
    | `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/...` | Your MongoDB connection string. |
    | `JWT_SECRET` | `long-random-string-here` | Secret key for signing tokens. |
    | `NODE_ENV` | `production` | Optimizes build and runtime. |

4.  **Deploy**
    - Click **Create Web Service**.
    - Wait for the build to complete. Render will run the build command, then the start command.

## Verification
Once deployed, visit your Render URL (e.g., `https://wealthflow-app.onrender.com`).
- **Frontend**: You should see the login page.
- **Backend API**: Visit `https://your-app.onrender.com/api/auth/status` to check API health.

## Multiple User & Admin Login
The application now uses **Passport.js** for secure authentication.
- **Admins** and **Users** log in via the same login page.
- The system automatically detects their role (`ADMIN`, `PARTNER`, etc.) based on their credentials.
- **Admin Access**: If logged in as Admin, you gain access to the Admin Dashboard and User Management features.

## Troubleshooting
- **Build Fails**: Check if `npm install` succeeded. Ensure `frontend/dist` validates.
- **White Screen**: Check browser console. If 404s for assets, ensure `server.js` static path is correct.
- **Database Error**: Check Render logs. Verify `MONGODB_URI` is correct and IP Access List in MongoDB Atlas allows access from anywhere (`0.0.0.0/0`) or Render IPs.
