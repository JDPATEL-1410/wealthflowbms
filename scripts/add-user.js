// Script to manually add a team member to MongoDB
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 4) {
    console.log('Usage: node scripts/add-user.js <name> <code> <email> <password> [role] [level]');
    console.log('Example: node scripts/add-user.js "John Doe" "JD-001" "john@example.com" "password123" "OPS" "6"');
    process.exit(1);
}

const [name, code, email, password, role = 'OPS', level = '6'] = args;

const newUser = {
    id: `tm_${Date.now()}`,
    name,
    code,
    email,
    password,
    role,
    level: parseInt(level),
    bankDetails: {
        accountName: '',
        accountNumber: '',
        bankName: '',
        ifscCode: '',
        branch: ''
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

async function addUser() {
    console.log('🔄 Connecting to MongoDB...');
    const client = await MongoClient.connect(uri);
    const db = client.db('wealthflow');

    console.log('🔍 Checking if user already exists...');
    const existing = await db.collection('team').findOne({
        $or: [{ code }, { email }]
    });

    if (existing) {
        console.log('❌ User with this code or email already exists!');
        console.log('   Existing user:', existing.name);
        await client.close();
        return;
    }

    console.log('➕ Adding new user...');
    await db.collection('team').insertOne(newUser);

    console.log('✅ User added successfully!');
    console.log('');
    console.log('User Details:');
    console.log('  Name:', newUser.name);
    console.log('  Code:', newUser.code);
    console.log('  Email:', newUser.email);
    console.log('  Password:', newUser.password);
    console.log('  Role:', newUser.role);
    console.log('  Level:', newUser.level);
    console.log('');
    console.log('🎉 User can now log in!');

    await client.close();
}

addUser().catch(console.error);
