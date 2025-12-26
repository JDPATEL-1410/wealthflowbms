// Quick check of all collections
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

async function checkAll() {
    const client = await MongoClient.connect(uri);
    const db = client.db('wealthflow');

    const counts = {
        team: await db.collection('team').countDocuments(),
        clients: await db.collection('clients').countDocuments(),
        transactions: await db.collection('transactions').countDocuments(),
        batches: await db.collection('batches').countDocuments(),
        invoices: await db.collection('invoices').countDocuments()
    };

    console.log('📊 Database Status:');
    console.log('==================');
    console.log(`Team Members: ${counts.team}`);
    console.log(`Clients: ${counts.clients}`);
    console.log(`Transactions: ${counts.transactions}`);
    console.log(`Batches: ${counts.batches}`);
    console.log(`Invoices: ${counts.invoices}`);

    if (counts.transactions > 0) {
        const totalGross = await db.collection('transactions').aggregate([
            { $group: { _id: null, total: { $sum: '$grossAmount' } } }
        ]).toArray();
        console.log(`\n💰 Total Gross Brokerage: ₹${totalGross[0]?.total || 0}`);
    }

    await client.close();
}

checkAll().catch(console.error);
