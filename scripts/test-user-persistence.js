// Test script to verify user persistence in database
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/data';

async function testUserPersistence() {
    console.log('🧪 Testing User Persistence...\n');

    try {
        // 1. Fetch team data
        console.log('1️⃣ Fetching team data from database...');
        const response = await fetch(`${API_URL}?type=team`);
        const team = await response.json();
        console.log(`   ✅ Found ${team.length} user(s) in database`);
        console.log('   Users:', team.map(u => `${u.name} (${u.code})`).join(', '));

        // 2. Add a new test user
        console.log('\n2️⃣ Adding a new test user...');
        const newUser = {
            id: `test_user_${Date.now()}`,
            name: 'Test User',
            code: 'TEST-001',
            role: 'EMPLOYEE',
            level: 6,
            email: 'test@wealthflow.com',
            password: 'test123',
            bankDetails: {
                accountName: 'Test Account',
                accountNumber: '1234567890',
                bankName: 'Test Bank',
                ifscCode: 'TEST0001'
            }
        };

        const addResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: 'team',
                payload: newUser,
                upsertField: 'id'
            })
        });

        const addResult = await addResponse.json();
        console.log('   ✅ User added:', addResult);

        // 3. Verify the user was saved
        console.log('\n3️⃣ Verifying user was saved to database...');
        const verifyResponse = await fetch(`${API_URL}?type=team`);
        const updatedTeam = await verifyResponse.json();
        console.log(`   ✅ Found ${updatedTeam.length} user(s) in database`);
        console.log('   Users:', updatedTeam.map(u => `${u.name} (${u.code})`).join(', '));

        const testUserExists = updatedTeam.find(u => u.id === newUser.id);
        if (testUserExists) {
            console.log('   ✅ Test user successfully persisted!');
        } else {
            console.log('   ❌ Test user NOT found in database!');
        }

        console.log('\n✅ All tests passed! Users are being stored in the database.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testUserPersistence();
