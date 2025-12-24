import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
console.log('Connecting to:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
const client = new MongoClient(uri);

const MOCK_TEAM = [
    {
        id: 'tm6',
        name: 'Frank Admin',
        code: 'AD001',
        role: 'ADMIN',
        level: 1,
        email: 'admin@wealthflow.com',
        password: 'admin123',
        bankDetails: {
            accountName: 'Frank Admin',
            accountNumber: '1122334455',
            bankName: 'HDFC Bank',
            ifscCode: 'HDFC0001234'
        }
    }
];

const GLOBAL_CONFIG = {
    id: 'global_1',
    name: 'Default FY24 Structure',
    companyExpensePct: 15,
    levels: {
        6: 40, // RM
        5: 10, // ZM
        4: 5,  // RH
        3: 5,  // Partner
        2: 5,  // Associate
        1: 35  // Corp/House
    },
    levelNames: {
        6: 'Relationship Manager (RM)',
        5: 'Zonal Manager (ZM)',
        4: 'Regional Head (RH)',
        3: 'Partner',
        2: 'Associate',
        1: 'Corporate / House'
    },
    scope: 'GLOBAL'
};

async function seedDatabase() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('wealthflow');

        // Seed team collection
        const teamCollection = db.collection('team');
        const teamCount = await teamCollection.countDocuments();

        if (teamCount === 0) {
            await teamCollection.insertMany(MOCK_TEAM);
            console.log('✅ Seeded team collection with admin user');
        } else {
            console.log('ℹ️  Team collection already has data, skipping...');
        }

        // Seed config collection
        const configCollection = db.collection('config');
        const configCount = await configCollection.countDocuments();

        if (configCount === 0) {
            await configCollection.insertOne(GLOBAL_CONFIG);
            console.log('✅ Seeded config collection');
        } else {
            console.log('ℹ️  Config collection already has data, skipping...');
        }

        console.log('\n🎉 Database seeding completed!');
        console.log('\n📝 Login Credentials:');
        console.log('   Email: admin@wealthflow.com');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await client.close();
        console.log('\n👋 MongoDB connection closed');
    }
}

seedDatabase();
