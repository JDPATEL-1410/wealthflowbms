// Simple test to verify server is working
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/data';

async function quickTest() {
    console.log('Testing server connection...\n');

    try {
        // Test 1: Fetch user profiles
        console.log('1. Fetching user profiles...');
        const profilesRes = await fetch(`${API_URL}?type=user_profiles`);
        const profiles = await profilesRes.json();
        console.log(`   ✅ Found ${profiles.length} user profile(s)`);

        profiles.forEach(p => {
            console.log(`      - ${p.name} (${p.email}) - Active: ${p.isActive !== false}`);
        });

        // Test 2: Fetch team
        console.log('\n2. Fetching team members...');
        const teamRes = await fetch(`${API_URL}?type=team`);
        const team = await teamRes.json();
        console.log(`   ✅ Found ${team.length} team member(s)`);

        team.forEach(t => {
            console.log(`      - ${t.name} (${t.email})`);
        });

        console.log('\n✅ Server is working correctly!');
        console.log('\nYou can now:');
        console.log('1. Open http://localhost:5174 in your browser');
        console.log('2. Test login with existing users');
        console.log('3. Test password recovery');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\nMake sure the backend server is running:');
        console.error('   node backend/server.js');
    }
}

quickTest();
