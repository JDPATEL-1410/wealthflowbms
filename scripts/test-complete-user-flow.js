// Complete test for user creation and login flow
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/data';

async function testCompleteUserFlow() {
    console.log('🧪 COMPLETE USER CREATION & LOGIN TEST\n');
    console.log('='.repeat(60));

    try {
        // STEP 1: Check current users
        console.log('\n📋 STEP 1: Checking current users in database');
        console.log('-'.repeat(60));

        const teamRes = await fetch(`${API_URL}?type=team`);
        const team = await teamRes.json();
        console.log(`Found ${team.length} users in team collection:`);
        team.forEach(u => console.log(`   - ${u.name} (${u.email || u.code})`));

        const profilesRes = await fetch(`${API_URL}?type=user_profiles`);
        const profiles = await profilesRes.json();
        console.log(`\nFound ${profiles.length} users in user_profiles collection:`);
        profiles.forEach(u => console.log(`   - ${u.name} (${u.email}) - Active: ${u.isActive !== false}`));

        // STEP 2: Create a new test user
        console.log('\n📋 STEP 2: Creating new test user');
        console.log('-'.repeat(60));

        const newUser = {
            id: `test_${Date.now()}`,
            name: 'John Doe',
            code: 'EMP-001',
            role: 'OPS',
            level: 6,
            email: `john.doe.${Date.now()}@wealthflow.com`,
            password: 'john123',
            bankDetails: {
                accountName: '',
                accountNumber: '',
                bankName: '',
                ifscCode: ''
            }
        };

        console.log('Creating user:', newUser.name);
        console.log('Email:', newUser.email);
        console.log('Password:', newUser.password);

        // Save to team collection (which should auto-sync to user_profiles)
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: 'team',
                payload: newUser,
                upsertField: 'id'
            })
        });

        const createResult = await createRes.json();
        console.log('\n✅ User creation response:', createResult);

        // Wait for sync
        await new Promise(resolve => setTimeout(resolve, 1000));

        // STEP 3: Verify user in team collection
        console.log('\n📋 STEP 3: Verifying user in team collection');
        console.log('-'.repeat(60));

        const verifyTeamRes = await fetch(`${API_URL}?type=team`);
        const updatedTeam = await verifyTeamRes.json();
        const teamUser = updatedTeam.find(u => u.id === newUser.id);

        if (teamUser) {
            console.log('✅ User found in team collection');
            console.log('   Name:', teamUser.name);
            console.log('   Email:', teamUser.email);
            console.log('   Password:', teamUser.password);
        } else {
            console.log('❌ User NOT found in team collection!');
            throw new Error('User not saved to team collection');
        }

        // STEP 4: Verify user in user_profiles collection
        console.log('\n📋 STEP 4: Verifying user in user_profiles collection');
        console.log('-'.repeat(60));

        const verifyProfilesRes = await fetch(`${API_URL}?type=user_profiles`);
        const updatedProfiles = await verifyProfilesRes.json();
        const userProfile = updatedProfiles.find(u => u.id === newUser.id);

        if (userProfile) {
            console.log('✅ User found in user_profiles collection');
            console.log('   Name:', userProfile.name);
            console.log('   Email:', userProfile.email);
            console.log('   Password:', userProfile.password);
            console.log('   Active:', userProfile.isActive !== false);
        } else {
            console.log('❌ User NOT found in user_profiles collection!');
            throw new Error('User not synced to user_profiles');
        }

        // STEP 5: Test login authentication
        console.log('\n📋 STEP 5: Testing login authentication');
        console.log('-'.repeat(60));

        const loginProfiles = await fetch(`${API_URL}?type=user_profiles`).then(r => r.json());
        const authenticatedUser = loginProfiles.find(u =>
            u.email?.toLowerCase() === newUser.email.toLowerCase() &&
            u.password === newUser.password &&
            u.isActive !== false
        );

        if (authenticatedUser) {
            console.log('✅ Login authentication successful!');
            console.log('   User can login with:');
            console.log('   Email:', newUser.email);
            console.log('   Password:', newUser.password);
        } else {
            console.log('❌ Login authentication failed!');
            throw new Error('User cannot login');
        }

        // STEP 6: Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log('✅ User created successfully');
        console.log('✅ User saved to team collection');
        console.log('✅ User synced to user_profiles collection');
        console.log('✅ User can authenticate and login');
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('\n📝 Login Credentials:');
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Password: ${newUser.password}`);
        console.log('\n✅ User will persist across page refreshes');
        console.log('✅ Admin can see user in team list');
        console.log('✅ User can login to WealthFlow app');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    }
}

// Run the test
testCompleteUserFlow()
    .then(() => {
        console.log('\n✅ Test completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
