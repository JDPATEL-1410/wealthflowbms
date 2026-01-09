import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './config/passport.js';
import { setDatabase } from './config/passport.js';
import authRoutes from './routes/auth.js';
import bcrypt from 'bcryptjs';

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
    credentials: true, // CRITICAL: Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'wealthflow-secret-key-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        dbName: 'wealthflow',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: isProduction, // true in production (HTTPS)
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: isProduction ? 'none' : 'lax'
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// PRODUCTION FIX: Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'no-origin'} - Auth: ${req.isAuthenticated()}`);
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

        // Initialize database with default admin user if team collection is empty
        await initializeDatabase(db);

        // Set database for Passport
        setDatabase(db);

        // Make db available to routes
        app.locals.db = db;

        return { client, db };
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        throw error;
    }
}

// Initialize database with default data if collections are empty
async function initializeDatabase(db) {
    try {
        console.log('🔍 Checking database initialization...');

        // STEP 1: Initialize user_profiles collection with default admin
        const userProfilesCount = await db.collection('user_profiles').countDocuments();

        if (userProfilesCount === 0) {
            console.log('📋 Creating user_profiles collection with default admin...');

            // Hash default admin password
            const hashedPassword = await bcrypt.hash('admin', 10);

            const defaultAdminProfile = {
                id: 'admin_root',
                name: 'System Administrator',
                code: 'ADMIN-001',
                role: 'ADMIN',
                level: 1,
                email: 'admin@wealthflow.com',
                password: hashedPassword, // Hashed password
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
            console.log('✅ Default admin profile created in user_profiles');
        } else {
            console.log(`✅ Found ${userProfilesCount} user profile(s) in database`);

            // EMERGENCY CHECK: Ensure existing admin has a hashed password
            const adminUser = await db.collection('user_profiles').findOne({ email: 'admin@wealthflow.com' });
            if (adminUser && adminUser.password === 'admin') {
                console.log('🛡️ Plain-text admin password detected. Hashing for security...');
                const hashedPassword = await bcrypt.hash('admin', 10);
                await db.collection('user_profiles').updateOne(
                    { email: 'admin@wealthflow.com' },
                    { $set: { password: hashedPassword } }
                );
                console.log('✅ Admin password hashed successfully');
            }
        }

        // STEP 2: Sync team collection with user_profiles
        // Ensure all team members have corresponding user profiles
        const teamMembers = await db.collection('team').find({}).toArray();
        const userProfiles = await db.collection('user_profiles').find({}).toArray();
        const profileIds = new Set(userProfiles.map(p => p.id));

        let migratedCount = 0;
        for (const member of teamMembers) {
            if (!profileIds.has(member.id)) {
                // Migrate team member to user_profiles
                const userProfile = {
                    id: member.id,
                    name: member.name,
                    code: member.code,
                    role: member.role,
                    level: member.level,
                    email: member.email,
                    password: member.password,
                    bankDetails: member.bankDetails || {
                        accountName: '',
                        accountNumber: '',
                        bankName: '',
                        ifscCode: ''
                    },
                    isActive: true,
                    createdAt: member.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await db.collection('user_profiles').insertOne(userProfile);
                migratedCount++;
                console.log(`✅ Migrated user ${member.name} to user_profiles`);
            }
        }

        if (migratedCount > 0) {
            console.log(`✅ Migrated ${migratedCount} team member(s) to user_profiles`);
        }

        // STEP 3: Check if team collection needs default admin
        const teamCount = await db.collection('team').countDocuments();

        if (teamCount === 0) {
            console.log('📋 Initializing team collection with default admin...');

            const defaultAdmin = {
                id: 'admin_root',
                name: 'System Administrator',
                code: 'ADMIN-001',
                role: 'ADMIN',
                level: 1,
                email: 'admin@wealthflow.com',
                password: 'admin',
                bankDetails: {
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: ''
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await db.collection('team').insertOne(defaultAdmin);
            console.log('✅ Default admin user created in team collection');
        }

        // STEP 4: Check if config collection is empty
        const configCount = await db.collection('config').countDocuments();

        if (configCount === 0) {
            console.log('📋 Initializing database with default config...');

            const defaultConfig = {
                id: 'global_config',
                name: 'Standard Payout Rules',
                companyExpensePct: 15,
                levels: {
                    1: 15,
                    2: 15,
                    3: 15,
                    4: 15,
                    5: 15,
                    6: 5,
                    0: 20
                },
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
            console.log('✅ Default config created successfully');
        }

        console.log('✅ Database initialization complete');
    } catch (error) {
        console.error('⚠️ Database initialization error:', error);
        // Don't throw - allow app to continue even if seeding fails
    }
}

const VALID_COLLECTIONS = [
    'clients', 'team', 'transactions', 'batches',
    'amc_mappings', 'scheme_mappings', 'config', 'invoices', 'user_profiles'
];

// Authentication Routes
app.use('/api/auth', authRoutes);

// API Routes
app.get('/api/data', async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { type, userId, isAdmin } = req.query;
        if (!type || !VALID_COLLECTIONS.includes(type)) {
            return res.status(400).json({ error: 'Invalid or missing collection type' });
        }
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
            options.projection = { password: 0 };
        }

        const data = await db.collection(type).find(filter, options).toArray();
        res.status(200).json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { collection, payload, upsertField } = req.body;
        if (!collection || !VALID_COLLECTIONS.includes(collection) || !payload) {
            return res.status(400).json({ error: 'Invalid collection or missing payload' });
        }
        const now = new Date().toISOString();
        const filterKey = upsertField || 'id';

        if (Array.isArray(payload)) {
            // SECURITY: Hash passwords if updating team collection in bulk
            let processedPayload = payload.map(item => ({ ...item })); // Deep-ish copy of array items

            if (collection === 'team') {
                console.log(`🔐 Checking passwords for ${processedPayload.length} team members...`);
                for (let i = 0; i < processedPayload.length; i++) {
                    const pass = processedPayload[i].password;
                    if (pass && typeof pass === 'string' && !pass.startsWith('$2a$')) {
                        console.log(`🔑 Hashing password for: ${processedPayload[i].name || processedPayload[i].email}`);
                        processedPayload[i].password = await bcrypt.hash(pass, 10);
                    }
                }
            }

            const operations = processedPayload.map(item => {
                // Remove _id from set bit to avoid immutable field error
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

            // SYNC: If updating team collection, also sync to user_profiles
            if (collection === 'team') {
                console.log(`🔄 Syncing ${processedPayload.length} team member(s) to user_profiles...`);
                const profileOperations = processedPayload.map(member => {
                    const { _id, password, ...profileData } = member;
                    return {
                        updateOne: {
                            filter: { id: member.id },
                            update: {
                                $set: {
                                    ...profileData,
                                    password: password, // Use hashed password
                                    isActive: true,
                                    updatedAt: now
                                },
                                $setOnInsert: {
                                    createdAt: member.createdAt || now
                                }
                            },
                            upsert: true
                        }
                    };
                });
                await db.collection('user_profiles').bulkWrite(profileOperations);
                console.log('✅ User profiles synced successfully');
            }

            res.status(200).json({
                success: true,
                count: (result.upsertedCount || 0) + (result.modifiedCount || 0)
            });
        } else {
            const filterValue = payload[filterKey] || payload.id;

            // SECURITY: If this is the team collection and a password is provided, hash it
            let finalPayload = { ...payload };
            if (collection === 'team' && payload.password && typeof payload.password === 'string' && !payload.password.startsWith('$2a$')) {
                console.log(`🔐 Hashing password for team member ${payload.name}...`);
                const salt = await bcrypt.genSalt(10);
                finalPayload.password = await bcrypt.hash(payload.password, salt);
            }

            // Remove _id from set bit
            const { _id, ...cleanPayload } = finalPayload;

            await db.collection(collection).updateOne(
                { [filterKey]: filterValue },
                { $set: { ...cleanPayload, updatedAt: now }, $setOnInsert: { createdAt: now } },
                { upsert: true }
            );

            // SYNC: If updating team collection, also sync to user_profiles
            if (collection === 'team') {
                console.log(`🔄 Syncing team member ${payload.name} to user_profiles...`);
                const { _id: dummy, password: finalPassword, ...syncData } = finalPayload;
                await db.collection('user_profiles').updateOne(
                    { id: payload.id },
                    {
                        $set: {
                            ...syncData,
                            password: finalPassword,
                            isActive: true,
                            updatedAt: now
                        },
                        $setOnInsert: {
                            createdAt: payload.createdAt || now
                        }
                    },
                    { upsert: true }
                );
                console.log('✅ User profile synced successfully');
            }

            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error(`❌ Error in POST /api/data for ${collection || 'unknown'}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/data', async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { action, type, id } = req.query;

        if (action === 'reset') {
            console.log('⚠️ CRITICAL: Resetting all data...');
            for (const col of VALID_COLLECTIONS) {
                // Skip user_profiles to preserve user accounts
                if (col !== 'user_profiles') {
                    await db.collection(col).deleteMany({});
                    console.log(`✅ Cleared ${col} collection`);
                }
            }
            // Mark all user profiles as inactive instead of deleting
            await db.collection('user_profiles').updateMany({}, { $set: { isActive: false } });
            console.log('✅ Marked all user profiles as inactive');
            return res.status(200).json({ success: true });
        }

        if (type && id && VALID_COLLECTIONS.includes(type)) {
            // PROTECTION: Prevent deletion of user_profiles
            if (type === 'user_profiles') {
                console.log(`⚠️ Cannot delete user profile ${id}. Marking as inactive instead.`);
                await db.collection('user_profiles').updateOne(
                    { id: id },
                    { $set: { isActive: false, updatedAt: new Date().toISOString() } }
                );
                return res.status(200).json({ success: true, message: 'User marked as inactive' });
            }

            // SYNC: If deleting from team, mark user profile as inactive (don't delete)
            if (type === 'team') {
                console.log(`🔄 Marking user profile ${id} as inactive...`);
                await db.collection('user_profiles').updateOne(
                    { id: id },
                    { $set: { isActive: false, updatedAt: new Date().toISOString() } }
                );
                console.log('✅ User profile marked as inactive');
            }

            // COMPREHENSIVE CASCADE DELETE for batches
            if (type === 'batches') {
                console.log(`Starting cascade delete for batch ${id}...`);

                // Step 1: Get all transactions from this batch to find affected clients
                const transactionsToDelete = await db.collection('transactions').find({ batchId: id }).toArray();
                const affectedClientIds = [...new Set(transactionsToDelete.map(tx => tx.mappedClientId).filter(Boolean))];

                console.log(`Found ${transactionsToDelete.length} transactions affecting ${affectedClientIds.length} clients`);

                // Step 2: Delete all transactions from this batch
                const txDeleteResult = await db.collection('transactions').deleteMany({ batchId: id });
                console.log(`Deleted ${txDeleteResult.deletedCount} transactions`);

                // Step 3: Find and delete orphaned auto-created clients
                let orphanedClientsDeleted = 0;
                for (const clientId of affectedClientIds) {
                    if (clientId.startsWith('c_auto_')) {
                        const remainingTxCount = await db.collection('transactions').countDocuments({ mappedClientId: clientId });
                        if (remainingTxCount === 0) {
                            await db.collection('clients').deleteOne({ id: clientId });
                            orphanedClientsDeleted++;
                            console.log(`Deleted orphaned client ${clientId}`);
                        }
                    }
                }

                console.log(`Cascade delete summary: ${txDeleteResult.deletedCount} transactions, ${orphanedClientsDeleted} orphaned clients`);
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

// Catch-all route for SPA
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server with database connection
async function startServer() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await connectToDatabase();
        console.log('✅ MongoDB connected successfully');

        app.listen(PORT, () => {
            console.log(`🚀 Unified WealthFlow Server running on port ${PORT}`);
            console.log(`📊 API available at http://localhost:${PORT}/api/data`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('Please check your MongoDB connection string and try again.');
        process.exit(1);
    }
}

startServer();
