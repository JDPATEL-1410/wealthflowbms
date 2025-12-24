import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3001;

app.use(express.json());

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

console.log('🔗 Connecting to MongoDB...');
console.log('📍 URI:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password

const VALID_COLLECTIONS = [
    'clients', 'team', 'transactions', 'batches',
    'amc_mappings', 'scheme_mappings', 'config'
];

let db;

// Connect to MongoDB
client.connect()
    .then(() => {
        db = client.db('wealthflow');
        console.log('✅ Connected to MongoDB - wealthflow database');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// API Routes
app.get('/api/data', async (req, res) => {
    try {
        const type = req.query.type;
        if (!type || !VALID_COLLECTIONS.includes(type)) {
            return res.status(400).json({ error: 'Invalid or missing collection type' });
        }

        const data = await db.collection(type).find({}).toArray();
        return res.status(200).json(data);
    } catch (e) {
        console.error('MongoDB API Error:', e);
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        const { collection, payload, upsertField } = req.body;
        if (!collection || !VALID_COLLECTIONS.includes(collection) || !payload) {
            return res.status(400).json({ error: 'Invalid collection or missing payload' });
        }

        const now = new Date().toISOString();

        if (Array.isArray(payload)) {
            // Batch update/insert
            if (upsertField) {
                const operations = payload.map(item => {
                    const { _id, ...updateData } = item;
                    return {
                        updateOne: {
                            filter: { [upsertField]: item[upsertField] },
                            update: {
                                $set: { ...updateData, updatedAt: now },
                                $setOnInsert: { createdAt: now }
                            },
                            upsert: true
                        }
                    };
                });
                await db.collection(collection).bulkWrite(operations);
            } else {
                const docsWithTimestamps = payload.map(item => {
                    const { _id, ...data } = item;
                    return {
                        ...data,
                        createdAt: now,
                        updatedAt: now
                    };
                });
                await db.collection(collection).insertMany(docsWithTimestamps);
            }
        } else {
            // Single document update/insert
            const { _id, ...updateData } = payload;
            const id = payload.id || _id;
            await db.collection(collection).updateOne(
                { id: id },
                {
                    $set: { ...updateData, updatedAt: now },
                    $setOnInsert: { createdAt: now }
                },
                { upsert: true }
            );
        }
        return res.status(200).json({ success: true, timestamp: now });
    } catch (e) {
        console.error('MongoDB API Error:', e);
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
});

app.delete('/api/data', async (req, res) => {
    try {
        if (req.query.action === 'reset') {
            // For safety, only drop collections in our valid list
            for (const col of VALID_COLLECTIONS) {
                await db.collection(col).deleteMany({});
            }
            return res.status(200).json({ success: true });
        }
        return res.status(400).json({ error: 'Invalid action' });
    } catch (e) {
        console.error('MongoDB API Error:', e);
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: wealthflow`);
    console.log(`🔗 MongoDB URI: ${uri}`);
});

process.on('SIGINT', async () => {
    await client.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
});
