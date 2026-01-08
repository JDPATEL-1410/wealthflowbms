// Migration script to sync existing team members to user_profiles collection
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/data';

async function migrateUsersToProfiles() {
    console.log('🔄 Starting user migration to user_profiles collection...\n');

    try {
        // Step 1: Fetch all team members
        console.log('1️⃣ Fetching team members from database...');
        const teamResponse = await fetch(`${API_URL}?type=team`);
        const teamMembers = await teamResponse.json();
        console.log(`   ✅ Found ${teamMembers.length} team member(s)`);

        if (teamMembers.length === 0) {
            console.log('   ℹ️ No team members to migrate');
            return;
        }

        // Step 2: Fetch existing user profiles
        console.log('\n2️⃣ Fetching existing user profiles...');
        const profilesResponse = await fetch(`${API_URL}?type=user_profiles`);
        const existingProfiles = await profilesResponse.json();
        console.log(`   ✅ Found ${existingProfiles.length} existing profile(s)`);

        const existingProfileIds = new Set(existingProfiles.map(p => p.id));

        // Step 3: Migrate team members to user_profiles
        console.log('\n3️⃣ Migrating team members to user_profiles...');
        let migratedCount = 0;
        let skippedCount = 0;

        for (const member of teamMembers) {
            if (existingProfileIds.has(member.id)) {
                console.log(`   ⏭️ Skipping ${member.name} (already exists in user_profiles)`);
                skippedCount++;
                continue;
            }

            const userProfile = {
                id: member.id,
                name: member.name,
                code: member.code,
                role: member.role,
                level: member.level,
                email: member.email,
                password: member.password,
                bankDetails: member.bankDetails || {
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: ''
                },
                isActive: true,
                createdAt: member.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: 'user_profiles',
                    payload: userProfile,
                    upsertField: 'id'
                })
            });

            if (response.ok) {
                console.log(`   ✅ Migrated ${member.name} (${member.code})`);
                migratedCount++;
            } else {
                console.log(`   ❌ Failed to migrate ${member.name}`);
            }
        }

        // Step 4: Verify migration
        console.log('\n4️⃣ Verifying migration...');
        const verifyResponse = await fetch(`${API_URL}?type=user_profiles`);
        const allProfiles = await verifyResponse.json();
        console.log(`   ✅ Total user profiles in database: ${allProfiles.length}`);

        console.log('\n✅ Migration Summary:');
        console.log(`   • Migrated: ${migratedCount} user(s)`);
        console.log(`   • Skipped: ${skippedCount} user(s) (already existed)`);
        console.log(`   • Total profiles: ${allProfiles.length}`);
        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nPlease ensure:');
        console.error('1. The backend server is running on port 3001');
        console.error('2. MongoDB connection is working');
        console.error('3. You have network connectivity');
    }
}

// Run the migration
console.log('═══════════════════════════════════════════════════════');
console.log('   User Profile Migration Tool');
console.log('═══════════════════════════════════════════════════════\n');

migrateUsersToProfiles();
