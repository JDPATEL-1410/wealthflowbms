import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

async function resetAdmin() {
    console.log('🔄 Connecting to MongoDB to reset admin...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('wealthflow');

        // Hash the password 'admin'
        const hashedPassword = await bcrypt.hash('admin', 10);

        // Update the admin in user_profiles
        const result = await db.collection('user_profiles').updateOne(
            { email: 'admin@wealthflow.com' },
            {
                $set: {
                    password: hashedPassword,
                    isActive: true,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        if (result.matchedCount > 0) {
            console.log('✅ Admin password has been hashed successfully!');
        } else {
            console.log('❌ Admin user not found. Creating a new one...');
            // Create if missing
            await db.collection('user_profiles').insertOne({
                id: 'admin_root',
                name: 'System Administrator',
                code: 'ADMIN-001',
                role: 'ADMIN',
                level: 1,
                email: 'admin@wealthflow.com',
                password: hashedPassword,
                isActive: true,
                createdAt: new Date().toISOString()
            });
            console.log('✅ New Admin created with hashed password.');
        }

    } catch (error) {
        console.error('❌ Error resetting admin:', error);
    } finally {
        await client.close();
    }
}

resetAdmin();
