import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { authenticate } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// PRODUCTION FIX: Trust Render proxy
app.set('trust proxy', 1);

// PRODUCTION FIX: Proper CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wealthflowbms.onrender.com';
const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
}

// PRODUCTION FIX: Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'no-origin'}`);
    next();
});

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    try {
        const client = await MongoClient.connect(uri, {
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        const db = client.db('wealthflow');
        cachedClient = client;
        cachedDb = db;

        // Initialize database
        await initializeDatabase(db);

        // Make db available to routes
        app.locals.db = db;

        return { client, db };
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        throw error;
    }
}

// Initialize database with default data and indexes
async function initializeDatabase(db) {
    try {
        console.log('🔍 Checking database initialization...');

        // Create unique indexes for email and employeeCode (code)
        console.log('⚡ Creating unique indexes...');
        try {
            await db.collection('user_profiles').createIndex({ email: 1 }, { unique: true });
            await db.collection('user_profiles').createIndex({ code: 1 }, { unique: true });
            console.log('✅ Unique indexes created for user_profiles');
        } catch (idxError) {
            console.log('ℹ️ Indexes might already exist or there are duplicates:', idxError.message);
        }

        // STEP 1: Initialize user_profiles collection with default admin
        const adminEmail = 'admin@wealthflow.com';
        const existingAdmin = await db.collection('user_profiles').findOne({ email: adminEmail });

        if (!existingAdmin) {
            console.log('📋 Creating default admin profile...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            const defaultAdminProfile = {
                id: 'admin_root',
                name: 'System Administrator',
                code: 'ADMIN-001',
                role: 'ADMIN',
                level: 1,
                email: adminEmail,
                passwordHash: hashedPassword,
                bankDetails: {
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: ''
                },
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await db.collection('user_profiles').insertOne(defaultAdminProfile);
            console.log('✅ Default admin profile created');
        } else {
            // Migrating 'password' to 'passwordHash' if necessary
            if (existingAdmin.password && !existingAdmin.passwordHash) {
                console.log('🛡️ Migrating admin password to passwordHash...');
                await db.collection('user_profiles').updateOne(
                    { _id: existingAdmin._id },
                    {
                        $set: { passwordHash: existingAdmin.password },
                        $unset: { password: "" }
                    }
                );
            }
        }

        // STEP 2: Sync and Migrate existing users - normalize everything
        console.log('🔄 Normalizing user data...');
        const allUsers = await db.collection('user_profiles').find({}).toArray();
        for (const user of allUsers) {
            const updates = {};
            let changed = false;

            // Normalize email
            if (user.email && user.email !== user.email.toLowerCase().trim()) {
                updates.email = user.email.toLowerCase().trim();
                changed = true;
            }

            // Normalize code
            if (user.code && user.code !== user.code.trim()) {
                updates.code = user.code.trim();
                changed = true;
            }

            // Migrate password to passwordHash
            if (user.password && !user.passwordHash) {
                updates.passwordHash = user.password;
                changed = true;
            }

            if (changed) {
                await db.collection('user_profiles').updateOne(
                    { _id: user._id },
                    {
                        $set: { ...updates, updatedAt: new Date().toISOString() },
                        ...(updates.passwordHash ? { $unset: { password: "" } } : {})
                    }
                );
            }
        }

        // STEP 3: Check if config collection is empty
        const configCount = await db.collection('config').countDocuments();
        if (configCount === 0) {
            const defaultConfig = {
                id: 'global_config',
                name: 'Standard Payout Rules',
                companyExpensePct: 15,
                levels: { 1: 15, 2: 15, 3: 15, 4: 15, 5: 15, 6: 5, 0: 20 },
                levelNames: {
                    1: 'Corporate House', 2: 'Partner Level 2', 3: 'Regional Level 3',
                    4: 'Zonal Level 4', 5: 'Manager Level 5', 6: 'Relationship Manager (L6)', 0: 'Super Holding'
                },
                scope: 'GLOBAL',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await db.collection('config').insertOne(defaultConfig);
        }

        console.log('✅ Database initialization complete');
    } catch (error) {
        console.error('⚠️ Database initialization error:', error);
    }
}

const VALID_COLLECTIONS = [
    'clients', 'team', 'transactions', 'batches',
    'amc_mappings', 'scheme_mappings', 'config', 'invoices', 'user_profiles'
];

// Authentication Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// API Routes
app.get('/api/data', authenticate, async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { type } = req.query;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        if (!type || !VALID_COLLECTIONS.includes(type)) {
            return res.status(400).json({ error: 'Invalid or missing collection type' });
        }

        // Security: hide passwords and sensitive data
        const projection = (type === 'team' || type === 'user_profiles')
            ? { password: 0, passwordHash: 0 }
            : {};

        let filter = {};
        if (isAdmin !== 'true' && userId) {
            switch (type) {
                case 'clients':
                    filter = {
                        $or: [
                            { 'hierarchy.level0Id': userId },
                            { 'hierarchy.level1Id': userId },
                            { 'hierarchy.level2Id': userId },
                            { 'hierarchy.level3Id': userId },
                            { 'hierarchy.level4Id': userId },
                            { 'hierarchy.level5Id': userId },
                            { 'hierarchy.level6Id': userId }
                        ]
                    };
                    break;
                case 'transactions':
                    const userClients = await db.collection('clients').find({
                        $or: [
                            { 'hierarchy.level0Id': userId },
                            { 'hierarchy.level1Id': userId },
                            { 'hierarchy.level2Id': userId },
                            { 'hierarchy.level3Id': userId },
                            { 'hierarchy.level4Id': userId },
                            { 'hierarchy.level5Id': userId },
                            { 'hierarchy.level6Id': userId }
                        ]
                    }).toArray();
                    const clientIds = userClients.map(c => c.id);
                    filter = { mappedClientId: { $in: clientIds } };
                    break;
                case 'invoices':
                    filter = { userId: userId };
                    break;
                case 'batches':
                    filter = { userId: userId };
                    break;
                default:
                    filter = {};
            }
        }
        const options = {};
        if (type === 'team' || type === 'user_profiles') {
            options.projection = { passwordHash: 0, password: 0 };
        }

        const data = await db.collection(type).find(filter, options).toArray();
        res.status(200).json(data || []);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generic POST for other data (not user creation)
app.post('/api/data', authenticate, async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { collection, payload, upsertField } = req.body;

        // Block user_profiles and team from generic POST to ensure proper hashing/validation
        if (collection === 'user_profiles' || collection === 'team') {
            return res.status(403).json({ error: 'Use dedicated user management endpoints' });
        }

        if (!collection || !VALID_COLLECTIONS.includes(collection) || !payload) {
            return res.status(400).json({ error: 'Invalid collection or missing payload' });
        }
        const now = new Date().toISOString();
        const filterKey = upsertField || 'id';

        if (Array.isArray(payload)) {
            const operations = payload.map(item => {
                const { _id, ...updateData } = item;
                return {
                    updateOne: {
                        filter: { [filterKey]: item[filterKey] || item.id },
                        update: { $set: { ...updateData, updatedAt: now }, $setOnInsert: { createdAt: now } },
                        upsert: true
                    }
                };
            });
            const result = await db.collection(collection).bulkWrite(operations);
            res.status(200).json({
                success: true,
                count: (result.upsertedCount || 0) + (result.modifiedCount || 0)
            });
        } else {
            const filterValue = payload[filterKey] || payload.id;
            const { _id, ...cleanPayload } = payload;
            await db.collection(collection).updateOne(
                { [filterKey]: filterValue },
                { $set: { ...cleanPayload, updatedAt: now }, $setOnInsert: { createdAt: now } },
                { upsert: true }
            );
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error(`❌ Error in POST /api/data for ${req.body.collection}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/data', authenticate, async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { action, type, id } = req.query;

        if (action === 'reset') {
            for (const col of VALID_COLLECTIONS) {
                if (col !== 'user_profiles') {
                    await db.collection(col).deleteMany({});
                }
            }
            await db.collection('user_profiles').updateMany({}, { $set: { isActive: false } });
            return res.status(200).json({ success: true });
        }

        if (type && id && VALID_COLLECTIONS.includes(type)) {
            if (type === 'user_profiles' || type === 'team') {
                await db.collection('user_profiles').updateOne(
                    { id: id },
                    { $set: { isActive: false, updatedAt: new Date().toISOString() } }
                );
                return res.status(200).json({ success: true, message: 'User marked as inactive' });
            }

            if (type === 'batches') {
                await db.collection('transactions').deleteMany({ batchId: id });
                // We don't delete auto-clients here to keep it simple and safe for now
            }

            await db.collection(type).deleteOne({ id: id });
            return res.status(200).json({ success: true });
        }
        res.status(400).json({ error: 'Invalid parameters' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SERVE FRONTEND (Production)
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

async function startServer() {
    try {
        await connectToDatabase();
        app.listen(PORT, () => {
            console.log(`🚀 Unified WealthFlow Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
