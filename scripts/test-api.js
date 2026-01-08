// Debug script to test API response
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testAPI() {
    console.log('🔍 Testing API Response...\n');

    try {
        // Test team endpoint
        console.log('1️⃣ Testing Team Endpoint...');
        console.log(`Fetching: ${API_URL}/api/data?type=team`);
        const teamResponse = await fetch(`${API_URL}/api/data?type=team`);
        const teamData = await teamResponse.json();

        console.log('\n👥 Team Data:');
        console.log('Status:', teamResponse.status);
        console.log('Is Array:', Array.isArray(teamData));
        console.log('User Count:', Array.isArray(teamData) ? teamData.length : 'N/A');

        if (Array.isArray(teamData) && teamData.length > 0) {
            console.log('\n✅ Users in Database:');
            teamData.forEach(user => {
                console.log(`   - ${user.name} (${user.code}) - ${user.email} - Role: ${user.role}`);
            });
        } else {
            console.log('\n⚠️ No users found in database!');
            console.log('Response:', teamData);
        }

        // Test transactions as admin
        console.log('\n\n2️⃣ Testing Transactions Endpoint...');
        const adminParams = new URLSearchParams({
            type: 'transactions',
            userId: 'admin_root',
            isAdmin: 'true'
        });

        console.log(`Fetching: ${API_URL}/api/data?${adminParams.toString()}`);
        const txResponse = await fetch(`${API_URL}/api/data?${adminParams.toString()}`);
        const txData = await txResponse.json();

        console.log('\n📊 Transaction Data:');
        console.log('Status:', txResponse.status);
        console.log('Is Array:', Array.isArray(txData));
        console.log('Transaction Count:', Array.isArray(txData) ? txData.length : 'N/A');

        if (Array.isArray(txData) && txData.length > 0) {
            console.log('\n✅ Sample Transaction:');
            console.log(JSON.stringify(txData[0], null, 2));

            const totalGross = txData.reduce((sum, tx) => sum + (tx.grossAmount || 0), 0);
            console.log(`\n💰 Total Gross: ₹${totalGross.toLocaleString()}`);
        } else {
            console.log('\n✅ No transactions (expected for fresh database)');
        }

        console.log('\n\n✅ API is working correctly!');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Make sure the backend server is running on port 3001');
    }
}

testAPI();

