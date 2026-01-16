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
import passport from 'passport';
import configurePassport from './config/passport.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Render proxy (needed when behind proxy)
app.set('trust proxy', 1);

// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wealthflowbms.onrender.com';
const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (Postman, server-to-server, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.log('❌ CORS blocked origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        },
        // If you are using JWT in Authorization header, cookies are not required.
        // Keeping this false avoids cross-site cookie complexity.
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// MongoDB connection
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
}

// Log all requests (debug)
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
            socketTimeoutMS: 45000
        });

        const db = client.db('wealthflow');
        cachedClient = client;
        cachedDb = db;

        // Initialize database
        await initializeDatabase(db);

        // Configure Passport
        configurePassport(passport, db);

        // Make db available to routes
        app.locals.db = db;

        return { client, db };
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        throw error;
    }
}

function looksLikeBcryptHash(value) {
    if (!value || typeof value !== 'string') return false;
    // bcrypt hashes typically start with $2a$ / $2b$ / $2y$
    return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

// Initialize database with default data and indexes
async function initializeDatabase(db) {
    try {
        console.log('🔍 Checking database initialization...');

        // Create unique indexes
        console.log('⚡ Creating unique indexes...');
        try {
            await db.collection('user_profiles').createIndex({ email: 1 }, { unique: true });
            await db.collection('user_profiles').createIndex({ code: 1 }, { unique: true });
            console.log('✅ Unique indexes created for user_profiles');
        } catch (idxError) {
            console.log('ℹ️ Indexes might already exist or there are duplicates:', idxError.message);
        }

        // Default admin
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
            // If admin had legacy field password, migrate safely
            if (existingAdmin.password && !existingAdmin.passwordHash) {
                console.log('🛡️ Migrating admin password to passwordHash (safe)...');

                const legacy = existingAdmin.password;
                const nextHash = looksLikeBcryptHash(legacy) ? legacy : await bcrypt.hash(String(legacy), 10);

                await db.collection('user_profiles').updateOne(
                    { _id: existingAdmin._id },
                    {
                        $set: { passwordHash: nextHash, updatedAt: new Date().toISOString() },
                        $unset: { password: '' }
                    }
                );
            }
        }

        // Normalize + migrate existing users
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

            // Migrate password -> passwordHash safely
            if (user.password && !user.passwordHash) {
                const legacy = String(user.password);
                updates.passwordHash = looksLikeBcryptHash(legacy) ? legacy : await bcrypt.hash(legacy, 10);
                changed = true;
            }

            if (changed) {
                const updateOps = {
                    $set: { ...updates, updatedAt: new Date().toISOString() }
                };

                // Only unset password if we migrated it
                if (updates.passwordHash) {
                    updateOps.$unset = { password: '' };
                }

                await db.collection('user_profiles').updateOne({ _id: user._id }, updateOps);
            }
        }

        // Default config
        const configCount = await db.collection('config').countDocuments();
        if (configCount === 0) {
            const defaultConfig = {
                id: 'global_config',
                name: 'Standard Payout Rules',
                companyExpensePct: 15,
                levels: { 1: 15, 2: 15, 3: 15, 4: 15, 5: 15, 6: 5, 0: 20 },
                levelNames: {
                    1: 'Corporate House',
                    2: 'Partner Level 2',
                    3: 'Regional Level 3',
                    4: 'Zonal Level 4',
                    5: 'Manager Level 5',
                    6: 'Relationship Manager (L6)',
                    0: 'Super Holding'
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
    'clients',
    'transactions',
    'batches',
    'amc_mappings',
    'scheme_mappings',
    'config',
    'invoices',
    'user_profiles' // Consolidated from 'team'
];

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// GET data
app.get('/api/data', authenticate, async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        let { type } = req.query;

        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';

        // Treat 'team' as 'user_profiles' for legacy support
        if (type === 'team') type = 'user_profiles';

        if (!type || !VALID_COLLECTIONS.includes(type)) {
            return res.status(400).json({ error: 'Invalid or missing collection type' });
        }

        // Security: user_profiles should only be accessed via /api/users
        // but if accessed via /api/data, it MUST be admin-only
        if (type === 'user_profiles' && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized to access user profiles' });
        }

        let filter = {};

        // Filter data based on user access levels if not Admin
        if (!isAdmin && userId) {
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

                case 'transactions': {
                    const userClients = await db
                        .collection('clients')
                        .find({
                            $or: [
                                { 'hierarchy.level0Id': userId },
                                { 'hierarchy.level1Id': userId },
                                { 'hierarchy.level2Id': userId },
                                { 'hierarchy.level3Id': userId },
                                { 'hierarchy.level4Id': userId },
                                { 'hierarchy.level5Id': userId },
                                { 'hierarchy.level6Id': userId }
                            ]
                        })
                        .toArray();

                    const clientIds = userClients.map((c) => c.id);
                    filter = { mappedClientId: { $in: clientIds } };
                    break;
                }

                case 'invoices':
                case 'batches':
                    filter = { userId: userId };
                    break;

                default:
                    filter = {};
            }
        }

        const options = {};
        // Safety: ensure passwords never leak
        if (type === 'user_profiles') {
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

        // Block user collections from generic POST
        if (collection === 'user_profiles' || collection === 'team') {
            return res.status(403).json({ error: 'Use dedicated user management endpoints' });
        }

        if (!collection || !VALID_COLLECTIONS.includes(collection) || !payload) {
            return res.status(400).json({ error: 'Invalid collection or missing payload' });
        }

        const now = new Date().toISOString();
        const filterKey = upsertField || 'id';

        if (Array.isArray(payload)) {
            const operations = payload.map((item) => {
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

// Delete data
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

        if (type && id) {
            const collectionType = type === 'team' ? 'user_profiles' : type;

            if (!VALID_COLLECTIONS.includes(collectionType)) {
                return res.status(400).json({ error: 'Invalid type' });
            }

            if (collectionType === 'user_profiles') {
                await db.collection('user_profiles').updateOne(
                    { id: id },
                    { $set: { isActive: false, updatedAt: new Date().toISOString() } }
                );
                return res.status(200).json({ success: true, message: 'User marked as inactive' });
            }

            if (collectionType === 'batches') {
                await db.collection('transactions').deleteMany({ batchId: id });
            }

            await db.collection(collectionType).deleteOne({ id: id });
            return res.status(200).json({ success: true });
        }

        res.status(400).json({ error: 'Invalid parameters' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
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
