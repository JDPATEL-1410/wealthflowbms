// Vercel Serverless Function for MongoDB Operations
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';
const options = {};

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = await MongoClient.connect(uri, options);
    const db = client.db('wealthflow');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

const VALID_COLLECTIONS = [
    'clients', 'team', 'transactions', 'batches',
    'amc_mappings', 'scheme_mappings', 'config', 'invoices'
];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    let db;
    try {
        const connection = await connectToDatabase();
        db = connection.db;
    } catch (err) {
        console.error("Failed to connect to MongoDB Cluster:", err);
        return res.status(503).json({ error: 'Database Connection Failed' });
    }

    const { method, body, query } = req;

    try {
        switch (method) {
            case 'GET': {
                const type = query.type;
                const userId = query.userId;
                const isAdmin = query.isAdmin === 'true';

                if (!type || !VALID_COLLECTIONS.includes(type)) {
                    return res.status(400).json({ error: 'Invalid or missing collection type' });
                }

                let filter = {};

                // Apply user-specific filtering for non-admin users
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
                return res.status(200).json(data || []);
            }

            case 'POST': {
                const { collection, payload, upsertField } = body;
                if (!collection || !VALID_COLLECTIONS.includes(collection) || !payload) {
                    return res.status(400).json({ error: 'Invalid collection or missing payload' });
                }

                const now = new Date().toISOString();
                const filterKey = upsertField || 'id';

                if (Array.isArray(payload)) {
                    if (payload.length === 0) return res.status(200).json({ success: true, count: 0 });

                    const operations = payload.map(item => ({
                        updateOne: {
                            filter: { [filterKey]: item[filterKey] },
                            update: {
                                $set: { ...item, updatedAt: now },
                                $setOnInsert: { createdAt: now }
                            },
                            upsert: true
                        }
                    }));
                    const result = await db.collection(collection).bulkWrite(operations);
                    return res.status(200).json({ success: true, count: result.upsertedCount + result.modifiedCount });
                } else {
                    const filterValue = payload[filterKey] || payload.id || payload._id;
                    if (!filterValue) return res.status(400).json({ error: 'Payload missing identifying key (id)' });

                    await db.collection(collection).updateOne(
                        { [filterKey]: filterValue },
                        {
                            $set: { ...payload, updatedAt: now },
                            $setOnInsert: { createdAt: now }
                        },
                        { upsert: true }
                    );
                    return res.status(200).json({ success: true, timestamp: now });
                }
            }

            case 'DELETE': {
                if (query.action === 'reset') {
                    for (const col of VALID_COLLECTIONS) {
                        await db.collection(col).deleteMany({});
                    }
                    return res.status(200).json({ success: true });
                }

                const type = query.type;
                const id = query.id;
                if (type && id && VALID_COLLECTIONS.includes(type)) {
                    await db.collection(type).deleteOne({ id: id });
                    return res.status(200).json({ success: true });
                }

                return res.status(400).json({ error: 'Invalid action or missing parameters' });
            }

            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).end(`Method ${method} Not Allowed`);
        }
    } catch (e) {
        console.error('MongoDB Operation Error:', e);
        return res.status(500).json({ error: e.message || 'Internal Server Error' });
    }
}
