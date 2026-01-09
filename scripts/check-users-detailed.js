// Quick diagnostic script to check user accounts
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/data';

async function checkUsers() {
    console.log('🔍 Checking User Accounts\n');
    console.log('='.repeat(60));

    try {
        // Check user_profiles
        console.log('\n📋 USER PROFILES COLLECTION:');
        console.log('-'.repeat(60));
        const profilesResponse = await fetch(`${API_URL}?type=user_profiles`);
        const profiles = await profilesResponse.json();

        if (profiles.length === 0) {
            console.log('⚠️  No user profiles found!');
        } else {
            console.log(`Found ${profiles.length} user profile(s):\n`);
            profiles.forEach((profile, index) => {
                console.log(`${index + 1}. ${profile.name}`);
                console.log(`   ID: ${profile.id}`);
                console.log(`   Email: ${profile.email}`);
                console.log(`   Code: ${profile.code}`);
                console.log(`   Password: ${profile.password}`);
                console.log(`   Role: ${profile.role}`);
                console.log(`   Active: ${profile.isActive !== false ? '✅ Yes' : '❌ No'}`);
                console.log('');
            });
        }

        // Check team
        console.log('\n📋 TEAM COLLECTION:');
        console.log('-'.repeat(60));
        const teamResponse = await fetch(`${API_URL}?type=team`);
        const team = await teamResponse.json();

        if (team.length === 0) {
            console.log('⚠️  No team members found!');
        } else {
            console.log(`Found ${team.length} team member(s):\n`);
            team.forEach((member, index) => {
                console.log(`${index + 1}. ${member.name}`);
                console.log(`   ID: ${member.id}`);
                console.log(`   Email: ${member.email}`);
                console.log(`   Code: ${member.code}`);
                console.log(`   Password: ${member.password}`);
                console.log('');
            });
        }

        // Check for sync issues
        console.log('\n🔄 SYNC STATUS:');
        console.log('-'.repeat(60));

        const teamIds = new Set(team.map(t => t.id));
        const profileIds = new Set(profiles.map(p => p.id));

        // Find users in team but not in profiles
        const missingInProfiles = team.filter(t => !profileIds.has(t.id));
        if (missingInProfiles.length > 0) {
            console.log('⚠️  Users in TEAM but NOT in USER_PROFILES:');
            missingInProfiles.forEach(u => console.log(`   - ${u.name} (${u.id})`));
        } else {
            console.log('✅ All team members have user profiles');
        }

        // Find users in profiles but not in team
        const missingInTeam = profiles.filter(p => !teamIds.has(p.id));
        if (missingInTeam.length > 0) {
            console.log('⚠️  Users in USER_PROFILES but NOT in TEAM:');
            missingInTeam.forEach(u => console.log(`   - ${u.name} (${u.id})`));
        } else {
            console.log('✅ All user profiles have team entries');
        }

        // Check for password mismatches
        console.log('\n🔐 PASSWORD SYNC CHECK:');
        console.log('-'.repeat(60));
        let passwordMismatches = 0;

        team.forEach(teamMember => {
            const profile = profiles.find(p => p.id === teamMember.id);
            if (profile && profile.password !== teamMember.password) {
                console.log(`⚠️  Password mismatch for ${teamMember.name}:`);
                console.log(`   Team: ${teamMember.password}`);
                console.log(`   Profile: ${profile.password}`);
                passwordMismatches++;
            }
        });

        if (passwordMismatches === 0) {
            console.log('✅ All passwords are in sync');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Diagnostic complete\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n⚠️  Make sure the backend server is running on http://localhost:3001\n');
    }
}

checkUsers();
