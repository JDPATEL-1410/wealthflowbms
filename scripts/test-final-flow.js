import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';

const uri = 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';
const API_URL = 'http://localhost:3001/api/data';
const AUTH_URL = 'http://localhost:3001/api/auth/login';

async function testUserFlow() {
    console.log('🚀 Starting User Flow Test...');

    const testUser = {
        id: `test_${Date.now()}`,
        name: 'Automation Test User',
        email: `test_${Date.now()}@wealthflow.com`,
        password: 'password123',
        code: `T-${Date.now()}`,
        role: 'OPS',
        level: 6,
        isActive: true
    };

    try {
        // 1. Create User via Data API (Simulating Admin creating a user)
        console.log('📝 Creating user via API...');
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: 'team',
                payload: testUser
            })
        });

        const createData = await createRes.json();
        if (!createData.success) throw new Error('User creation failed');
        console.log('✅ User created and synced to user_profiles');

        // 2. Verify Hashing in Database
        console.log('🔍 Verifying password hashing in DB...');
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('wealthflow');
        const userInDb = await db.collection('user_profiles').findOne({ id: testUser.id });

        if (userInDb.password === testUser.password) {
            throw new Error('❌ SECURITY FAILURE: Password stored in plain text!');
        }
        console.log('✅ Password correctly hashed in database');

        // 3. Test Login with Credentials
        console.log('🔐 Testing login with new credentials...');
        const loginRes = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });

        const loginData = await loginRes.json();
        if (loginData.success) {
            console.log('✅ Login SUCCESSFUL for new user!');
        } else {
            console.log('❌ Login FAILED:', loginData.error);
        }

        await client.close();
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUserFlow();
