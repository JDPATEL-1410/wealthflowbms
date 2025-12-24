# WealthFlow BMS - Free Hosting Guide

## ✅ Sign Up/Sign In Feature - COMPLETED

Your application now has a fully functional authentication system:
- ✅ Sign Up with email and password
- ✅ Sign In with existing credentials
- ✅ User data stored in MongoDB
- ✅ Password validation
- ✅ Duplicate email prevention
- ✅ Automatic login after signup

**Test Credentials Created:**
- Email: test@example.com
- Password: test123456

---

## 🚀 Free Hosting Options

### Option 1: Vercel (Frontend) + MongoDB Atlas (Database) - **RECOMMENDED**

#### Why This Option?
- ✅ **100% Free** for personal projects
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy deployment from GitHub
- ✅ Serverless functions for API
- ✅ 512MB MongoDB storage free forever

#### Step-by-Step Deployment:

### A. Set Up MongoDB Atlas (Free Cloud Database)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up with your email (free forever)

2. **Create a Free Cluster**
   - Click "Build a Database"
   - Select "M0 FREE" tier (512MB storage)
   - Choose a cloud provider (AWS recommended)
   - Select a region closest to you
   - Cluster name: "wealthflow-cluster"
   - Click "Create"

3. **Configure Database Access**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Username: `wealthflow_admin`
   - Password: Generate a secure password (save it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://wealthflow_admin:<password>@wealthflow-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Add database name at the end: `/wealthflow`
   - Final format:
     ```
     mongodb+srv://wealthflow_admin:YOUR_PASSWORD@wealthflow-cluster.xxxxx.mongodb.net/wealthflow?retryWrites=true&w=majority
     ```

### B. Prepare Your Project for Deployment

1. **Update Environment Variables**
   Create a file `.env.production` in your project root:
   ```
   MONGODB_URI=mongodb+srv://wealthflow_admin:YOUR_PASSWORD@wealthflow-cluster.xxxxx.mongodb.net/wealthflow?retryWrites=true&w=majority
   ```

2. **Update package.json Scripts**
   Your package.json should have:
   ```json
   {
     "scripts": {
       "dev": "concurrently \"npm run server\" \"npm run client\"",
       "server": "node server.js",
       "client": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview"
     }
   }
   ```

3. **Create Vercel Configuration**
   Create `vercel.json` in project root (replace existing):
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/api/$1"
       },
       {
         "src": "/(.*)",
         "dest": "/index.html"
       }
     ],
     "env": {
       "MONGODB_URI": "@mongodb_uri"
     }
   }
   ```

4. **Move API to Vercel Serverless Format**
   Create folder structure:
   ```
   /api
     /data.js  (rename from data.ts and update)
   ```

   Update `api/data.js`:
   ```javascript
   import { MongoClient } from 'mongodb';

   const uri = process.env.MONGODB_URI;
   let cachedClient = null;

   async function connectToDatabase() {
     if (cachedClient) {
       return cachedClient;
     }
     const client = new MongoClient(uri);
     await client.connect();
     cachedClient = client;
     return client;
   }

   const VALID_COLLECTIONS = [
     'clients', 'team', 'transactions', 'batches', 
     'amc_mappings', 'scheme_mappings', 'config'
   ];

   export default async function handler(req, res) {
     const client = await connectToDatabase();
     const db = client.db('wealthflow');
     const { method, body, query } = req;

     try {
       switch (method) {
         case 'GET': {
           const type = query.type;
           if (!type || !VALID_COLLECTIONS.includes(type)) {
             return res.status(400).json({ error: 'Invalid or missing collection type' });
           }
           
           const data = await db.collection(type).find({}).toArray();
           return res.status(200).json(data);
         }

         case 'POST': {
           const { collection, payload, upsertField } = body;
           if (!collection || !VALID_COLLECTIONS.includes(collection) || !payload) {
             return res.status(400).json({ error: 'Invalid collection or missing payload' });
           }

           const now = new Date().toISOString();

           if (Array.isArray(payload)) {
             if (upsertField) {
               const operations = payload.map(item => ({
                 updateOne: {
                   filter: { [upsertField]: item[upsertField] },
                   update: { 
                     $set: { ...item, updatedAt: now },
                     $setOnInsert: { createdAt: now }
                   },
                   upsert: true
                 }
               }));
               await db.collection(collection).bulkWrite(operations);
             } else {
               const docsWithTimestamps = payload.map(item => ({
                 ...item,
                 createdAt: now,
                 updatedAt: now
               }));
               await db.collection(collection).insertMany(docsWithTimestamps);
             }
           } else {
             const id = payload.id || payload._id;
             await db.collection(collection).updateOne(
               { id: id },
               { 
                 $set: { ...payload, updatedAt: now },
                 $setOnInsert: { createdAt: now }
               },
               { upsert: true }
             );
           }
           return res.status(200).json({ success: true, timestamp: now });
         }

         case 'DELETE': {
           if (query.action === 'reset') {
             for (const col of VALID_COLLECTIONS) {
               await db.collection(col).deleteMany({});
             }
             return res.status(200).json({ success: true });
           }
           return res.status(400).json({ error: 'Invalid action' });
         }

         default:
           res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
           return res.status(405).end(`Method ${method} Not Allowed`);
       }
     } catch (e) {
       console.error('MongoDB API Error:', e);
       return res.status(500).json({ error: e.message || 'Internal Server Error' });
     }
   }
   ```

### C. Deploy to Vercel

1. **Push Code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit with authentication"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wealthflow-bms.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com/signup
   - Sign up with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Add Environment Variable:
     - Name: `MONGODB_URI`
     - Value: Your MongoDB Atlas connection string
   - Click "Deploy"

3. **Seed Production Database**
   After deployment, run the seed script once:
   - Update `seed.js` to use environment variable
   - Run locally pointing to production DB
   - Or use MongoDB Compass to manually insert the admin user

4. **Access Your App**
   - Your app will be live at: `https://your-project-name.vercel.app`
   - Login with: admin@wealthflow.com / admin123

---

### Option 2: Render (Full-Stack) + MongoDB Atlas

#### Pros:
- ✅ Free tier available
- ✅ Supports Node.js backend
- ✅ Automatic SSL
- ✅ Easy deployment

#### Cons:
- ⚠️ Spins down after 15 minutes of inactivity (cold starts)
- ⚠️ 750 hours/month free (enough for 1 app)

#### Deployment Steps:

1. **Set up MongoDB Atlas** (same as Option 1)

2. **Update Your Project**
   - Ensure `server.js` and `package.json` are configured
   - Add `"start": "node server.js"` to package.json scripts

3. **Deploy on Render**
   - Go to https://render.com/
   - Sign up with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - Name: wealthflow-bms
     - Environment: Node
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Add Environment Variable:
     - Key: `MONGODB_URI`
     - Value: Your MongoDB connection string
   - Click "Create Web Service"

---

### Option 3: Railway + MongoDB Atlas

#### Pros:
- ✅ $5 free credit monthly
- ✅ No cold starts
- ✅ Easy deployment

#### Steps:
1. Go to https://railway.app/
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add MongoDB URI as environment variable
6. Deploy

---

## 📊 MongoDB Compass Connection

To view your data in MongoDB Compass:

1. **Download MongoDB Compass**
   - https://www.mongodb.com/try/download/compass

2. **Connect to Your Database**
   - Open Compass
   - Click "New Connection"
   - Paste your MongoDB Atlas connection string
   - Click "Connect"

3. **View Your Data**
   - Select database: `wealthflow`
   - Collections: `team`, `config`, `clients`, etc.
   - You can view, edit, and manage all data

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong passwords** for MongoDB users
3. **Rotate credentials** periodically
4. **Enable 2FA** on Vercel/MongoDB Atlas accounts
5. **Monitor usage** on free tiers to avoid overages

---

## 📝 Post-Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with strong password
- [ ] Network access configured
- [ ] Connection string tested
- [ ] Environment variables set in hosting platform
- [ ] Application deployed successfully
- [ ] Admin user seeded in production database
- [ ] Login tested on live URL
- [ ] Sign-up tested on live URL
- [ ] MongoDB Compass connected to view data

---

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
- Check if IP whitelist includes 0.0.0.0/0
- Verify connection string format
- Ensure password doesn't contain special characters (URL encode if needed)

### "Build failed on Vercel"
- Check build logs for specific errors
- Ensure all dependencies are in package.json
- Verify TypeScript compilation succeeds locally

### "API routes not working"
- Ensure `vercel.json` is configured correctly
- Check environment variables are set
- Review Vercel function logs

---

## 💰 Cost Breakdown (All FREE!)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | Forever Free | 100GB bandwidth/month |
| **MongoDB Atlas** | Forever Free | 512MB storage |
| **Total** | **$0/month** | Perfect for personal projects |

---

## 🎉 You're All Set!

Your WealthFlow BMS application is now ready to be deployed for free with:
- ✅ Full authentication system
- ✅ MongoDB database storage
- ✅ Sign up and sign in functionality
- ✅ Secure password handling
- ✅ Professional hosting

**Next Steps:**
1. Choose your hosting option (Vercel recommended)
2. Set up MongoDB Atlas
3. Deploy your application
4. Share your live URL!

---

**Need Help?** 
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Vite Docs: https://vitejs.dev/guide/
