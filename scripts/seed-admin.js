// Script to seed the admin user into MongoDB
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

const ADMIN_USER = {
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

async function seedAdmin() {
    console.log('🔄 Connecting to MongoDB...');
    const client = await MongoClient.connect(uri);
    const db = client.db('wealthflow');

    console.log('🔍 Checking for existing admin...');
    const existingAdmin = await db.collection('team').findOne({ id: 'admin_root' });

    if (existingAdmin) {
        console.log('✅ Admin user already exists!');
        console.log('   Email:', existingAdmin.email);
        console.log('   Password:', existingAdmin.password);
    } else {
        console.log('➕ Creating admin user...');
        await db.collection('team').insertOne(ADMIN_USER);
        console.log('✅ Admin user created successfully!');
        console.log('   Email: admin@wealthflow.com');
        console.log('   Password: admin');
    }

    await client.close();
    console.log('🎉 Done!');
}

seedAdmin().catch(console.error);
