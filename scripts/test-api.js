// Debug script to test API response
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'https://wealthflowbms.vercel.app';

async function testAPI() {
    console.log('🔍 Testing API Response...\n');

    // Test as admin
    const adminParams = new URLSearchParams({
        type: 'transactions',
        userId: 'admin_root',
        isAdmin: 'true'
    });

    try {
        console.log(`Fetching: ${API_URL}/api/data?${adminParams.toString()}`);
        const response = await fetch(`${API_URL}/api/data?${adminParams.toString()}`);
        const data = await response.json();

        console.log('\n📊 API Response:');
        console.log('Status:', response.status);
        console.log('Is Array:', Array.isArray(data));
        console.log('Transaction Count:', Array.isArray(data) ? data.length : 'N/A');

        if (Array.isArray(data) && data.length > 0) {
            console.log('\n✅ Sample Transaction:');
            console.log(JSON.stringify(data[0], null, 2));

            const totalGross = data.reduce((sum, tx) => sum + (tx.grossAmount || 0), 0);
            console.log(`\n💰 Total Gross: ₹${totalGross.toLocaleString()}`);
        } else {
            console.log('\n❌ No transactions returned!');
            console.log('Response:', data);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();
