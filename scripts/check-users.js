// Script to check all users in MongoDB
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

async function checkUsers() {
    console.log('🔄 Connecting to MongoDB...');
    const client = await MongoClient.connect(uri);
    const db = client.db('wealthflow');

    console.log('\n📋 All Team Members in Database:');
    console.log('='.repeat(60));

    const users = await db.collection('team').find({}).toArray();

    if (users.length === 0) {
        console.log('❌ No users found in database!');
    } else {
        console.log(`✅ Found ${users.length} user(s):\n`);
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email || 'N/A'}`);
            console.log(`   Code: ${user.code}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Level: ${user.level}`);
            console.log(`   Password: ${user.password}`);
            console.log(`   Created: ${user.createdAt || 'N/A'}`);
            console.log('');
        });
    }

    await client.close();
    console.log('🎉 Done!');
}

checkUsers().catch(console.error);
