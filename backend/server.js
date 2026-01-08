import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';
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

            const defaultAdminProfile = {
                id: 'admin_root',
                name: 'System Administrator',
                code: 'ADMIN-001',
                role: 'ADMIN',
                level: 1,
                email: 'admin@wealthflow.com',
                password: 'admin', // In production, this should be hashed
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
        const data = await db.collection(type).find(filter).toArray();
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
            const operations = payload.map(item => ({
                updateOne: {
                    filter: { [filterKey]: item[filterKey] },
                    update: { $set: { ...item, updatedAt: now }, $setOnInsert: { createdAt: now } },
                    upsert: true
                }
            }));
            const result = await db.collection(collection).bulkWrite(operations);

            // SYNC: If updating team collection, also sync to user_profiles
            if (collection === 'team') {
                console.log(`🔄 Syncing ${payload.length} team member(s) to user_profiles...`);
                const profileOperations = payload.map(member => ({
                    updateOne: {
                        filter: { id: member.id },
                        update: {
                            $set: {
                                id: member.id,
                                name: member.name,
                                code: member.code,
                                role: member.role,
                                level: member.level,
                                email: member.email,
                                password: member.password,
                                bankDetails: member.bankDetails || {},
                                isActive: true,
                                updatedAt: now
                            },
                            $setOnInsert: {
                                createdAt: member.createdAt || now
                            }
                        },
                        upsert: true
                    }
                }));
                await db.collection('user_profiles').bulkWrite(profileOperations);
                console.log('✅ User profiles synced successfully');
            }

            res.status(200).json({ success: true, count: result.upsertedCount + result.modifiedCount });
        } else {
            const filterValue = payload[filterKey] || payload.id || payload._id;
            await db.collection(collection).updateOne(
                { [filterKey]: filterValue },
                { $set: { ...payload, updatedAt: now }, $setOnInsert: { createdAt: now } },
                { upsert: true }
            );

            // SYNC: If updating team collection, also sync to user_profiles
            if (collection === 'team') {
                console.log(`🔄 Syncing team member ${payload.name} to user_profiles...`);
                await db.collection('user_profiles').updateOne(
                    { id: payload.id },
                    {
                        $set: {
                            id: payload.id,
                            name: payload.name,
                            code: payload.code,
                            role: payload.role,
                            level: payload.level,
                            email: payload.email,
                            password: payload.password,
                            bankDetails: payload.bankDetails || {},
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

app.listen(PORT, () => {
    console.log(`🚀 Unified WealthFlow Server running on port ${PORT}`);
});
