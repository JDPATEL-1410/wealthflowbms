// MongoDB Database Initialization Script
// This script creates all required collections in the wealthflow database

import clientPromise from '../lib/mongodb';

const COLLECTIONS = [
    'clients',
    'team',
    'transactions',
    'batches',
    'amc_mappings',
    'scheme_mappings',
    'config',
    'invoices'
];

async function initializeDatabase() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        const client = await clientPromise;
        const db = client.db('wealthflow');

        console.log('✅ Connected to wealthflow database');
        console.log('\n📦 Initializing collections...\n');

        // Get existing collections
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);

        // Create collections if they don't exist
        for (const collectionName of COLLECTIONS) {
            if (existingNames.includes(collectionName)) {
                console.log(`✓ ${collectionName} - Already exists`);
            } else {
                await db.createCollection(collectionName);
                console.log(`✓ ${collectionName} - Created successfully`);
            }
        }

        console.log('\n📊 Creating indexes for performance...\n');

        // Create indexes for better query performance

        // Clients collection indexes
        await db.collection('clients').createIndex({ id: 1 }, { unique: true });
        await db.collection('clients').createIndex({ pan: 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level0Id': 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level1Id': 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level2Id': 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level3Id': 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level4Id': 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level5Id': 1 });
        await db.collection('clients').createIndex({ 'hierarchy.level6Id': 1 });
        console.log('✓ clients - Indexes created');

        // Team collection indexes
        await db.collection('team').createIndex({ id: 1 }, { unique: true });
        await db.collection('team').createIndex({ email: 1 });
        await db.collection('team').createIndex({ code: 1 });
        console.log('✓ team - Indexes created');

        // Transactions collection indexes
        await db.collection('transactions').createIndex({ id: 1 }, { unique: true });
        await db.collection('transactions').createIndex({ mappedClientId: 1 });
        await db.collection('transactions').createIndex({ batchId: 1 });
        await db.collection('transactions').createIndex({ brokeragePeriod: 1 });
        await db.collection('transactions').createIndex({ pan: 1 });
        console.log('✓ transactions - Indexes created');

        // Batches collection indexes
        await db.collection('batches').createIndex({ id: 1 }, { unique: true });
        await db.collection('batches').createIndex({ userId: 1 });
        await db.collection('batches').createIndex({ uploadDate: -1 });
        console.log('✓ batches - Indexes created');

        // AMC Mappings collection indexes
        await db.collection('amc_mappings').createIndex({ original: 1 }, { unique: true });
        console.log('✓ amc_mappings - Indexes created');

        // Scheme Mappings collection indexes
        await db.collection('scheme_mappings').createIndex({ original: 1 }, { unique: true });
        console.log('✓ scheme_mappings - Indexes created');

        // Config collection indexes
        await db.collection('config').createIndex({ id: 1 }, { unique: true });
        console.log('✓ config - Indexes created');

        // Invoices collection indexes
        await db.collection('invoices').createIndex({ id: 1 }, { unique: true });
        await db.collection('invoices').createIndex({ userId: 1 });
        await db.collection('invoices').createIndex({ month: 1 });
        await db.collection('invoices').createIndex({ status: 1 });
        console.log('✓ invoices - Indexes created');

        console.log('\n✅ Database initialization complete!\n');
        console.log('📋 Summary:');
        console.log('   Database: wealthflow');
        console.log('   Collections: 8');
        console.log('   Indexes: Created for optimal performance');
        console.log('\n🎉 Your MongoDB database is ready to use!\n');

        // Display collection stats
        console.log('📊 Collection Statistics:\n');
        for (const collectionName of COLLECTIONS) {
            const count = await db.collection(collectionName).countDocuments();
            const indexes = await db.collection(collectionName).indexes();
            console.log(`   ${collectionName}:`);
            console.log(`      Documents: ${count}`);
            console.log(`      Indexes: ${indexes.length}`);
            console.log('');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase();
