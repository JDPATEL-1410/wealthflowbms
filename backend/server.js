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
        return { client, db };
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
        throw error;
    }
}

const VALID_COLLECTIONS = [
    'clients', 'team', 'transactions', 'batches',
    'amc_mappings', 'scheme_mappings', 'config', 'invoices'
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
            res.status(200).json({ success: true, count: result.upsertedCount + result.modifiedCount });
        } else {
            const filterValue = payload[filterKey] || payload.id || payload._id;
            await db.collection(collection).updateOne(
                { [filterKey]: filterValue },
                { $set: { ...payload, updatedAt: now }, $setOnInsert: { createdAt: now } },
                { upsert: true }
            );
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
            for (const col of VALID_COLLECTIONS) await db.collection(col).deleteMany({});
            return res.status(200).json({ success: true });
        }
        if (type && id && VALID_COLLECTIONS.includes(type)) {
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

app.get('(.*)', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Unified WealthFlow Server running on port ${PORT}`);
});
