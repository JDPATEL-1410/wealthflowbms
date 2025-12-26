// Script to seed sample data into MongoDB for testing
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://wealthflow_admin:wealthflow123@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';

// Sample Clients
const SAMPLE_CLIENTS = [
    {
        id: 'c_sample_1',
        pan: 'ABCDE1234F',
        name: 'Rajesh Kumar',
        folios: ['12345678', '87654321'],
        hierarchy: {
            level6Id: '',
            level5Id: '',
            level4Id: '',
            level3Id: '',
            level2Id: '',
            level1Id: 'admin_root',
            level0Id: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'c_sample_2',
        pan: 'FGHIJ5678K',
        name: 'Priya Sharma',
        folios: ['11223344', '44332211'],
        hierarchy: {
            level6Id: '',
            level5Id: '',
            level4Id: '',
            level3Id: '',
            level2Id: '',
            level1Id: 'admin_root',
            level0Id: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'c_sample_3',
        pan: 'LMNOP9012Q',
        name: 'Amit Patel',
        folios: ['55667788'],
        hierarchy: {
            level6Id: '',
            level5Id: '',
            level4Id: '',
            level3Id: '',
            level2Id: '',
            level1Id: 'admin_root',
            level0Id: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

// Sample Transactions
const SAMPLE_TRANSACTIONS = [
    {
        id: 'tx_sample_1',
        batchId: 'batch_sample_1',
        source: 'CAMS',
        uploadDate: new Date().toISOString(),
        transactionDate: '2024-12-01',
        brokeragePeriod: '2024-12',
        folio: '12345678',
        pan: 'ABCDE1234F',
        investorName: 'Rajesh Kumar',
        amcName: 'HDFC Mutual Fund',
        schemeName: 'HDFC Equity Fund - Growth',
        category: 'Equity',
        grossAmount: 5000,
        currentValue: 250000,
        brokerageRate: 2,
        remarks: 'SIP',
        mappedClientId: 'c_sample_1',
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'tx_sample_2',
        batchId: 'batch_sample_1',
        source: 'CAMS',
        uploadDate: new Date().toISOString(),
        transactionDate: '2024-12-05',
        brokeragePeriod: '2024-12',
        folio: '11223344',
        pan: 'FGHIJ5678K',
        investorName: 'Priya Sharma',
        amcName: 'ICICI Prudential Mutual Fund',
        schemeName: 'ICICI Prudential Bluechip Fund',
        category: 'Equity',
        grossAmount: 7500,
        currentValue: 350000,
        brokerageRate: 2.5,
        remarks: 'Lumpsum',
        mappedClientId: 'c_sample_2',
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'tx_sample_3',
        batchId: 'batch_sample_1',
        source: 'KFINTECH',
        uploadDate: new Date().toISOString(),
        transactionDate: '2024-12-10',
        brokeragePeriod: '2024-12',
        folio: '55667788',
        pan: 'LMNOP9012Q',
        investorName: 'Amit Patel',
        amcName: 'SBI Mutual Fund',
        schemeName: 'SBI Small Cap Fund - Regular Growth',
        category: 'Equity',
        grossAmount: 3500,
        currentValue: 180000,
        brokerageRate: 1.8,
        remarks: 'SIP',
        mappedClientId: 'c_sample_3',
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'tx_sample_4',
        batchId: 'batch_sample_2',
        source: 'CAMS',
        uploadDate: new Date().toISOString(),
        transactionDate: '2024-11-15',
        brokeragePeriod: '2024-11',
        folio: '87654321',
        pan: 'ABCDE1234F',
        investorName: 'Rajesh Kumar',
        amcName: 'Axis Mutual Fund',
        schemeName: 'Axis Long Term Equity Fund',
        category: 'ELSS',
        grossAmount: 4200,
        currentValue: 220000,
        brokerageRate: 2.2,
        remarks: 'Tax Saving',
        mappedClientId: 'c_sample_1',
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'tx_sample_5',
        batchId: 'batch_sample_2',
        source: 'KFINTECH',
        uploadDate: new Date().toISOString(),
        transactionDate: '2024-11-20',
        brokeragePeriod: '2024-11',
        folio: '44332211',
        pan: 'FGHIJ5678K',
        investorName: 'Priya Sharma',
        amcName: 'Kotak Mutual Fund',
        schemeName: 'Kotak Emerging Equity Scheme',
        category: 'Equity',
        grossAmount: 6800,
        currentValue: 310000,
        brokerageRate: 2.3,
        remarks: 'Additional Purchase',
        mappedClientId: 'c_sample_2',
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

// Sample Batches
const SAMPLE_BATCHES = [
    {
        id: 'batch_sample_1',
        fileName: 'December_2024_CAMS_Import.xlsx',
        uploadDate: new Date().toISOString(),
        status: 'APPROVED',
        totalLines: 3,
        totalGross: 16000,
        unmappedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'batch_sample_2',
        fileName: 'November_2024_Mixed_Import.xlsx',
        uploadDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'APPROVED',
        totalLines: 2,
        totalGross: 11000,
        unmappedCount: 0,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
];

async function seedSampleData() {
    console.log('🔄 Connecting to MongoDB...');
    const client = await MongoClient.connect(uri);
    const db = client.db('wealthflow');

    console.log('\n📊 Seeding Sample Data...');
    console.log('='.repeat(60));

    // Check existing data
    const existingClients = await db.collection('clients').countDocuments();
    const existingTransactions = await db.collection('transactions').countDocuments();
    const existingBatches = await db.collection('batches').countDocuments();

    console.log(`\nCurrent Database Status:`);
    console.log(`  Clients: ${existingClients}`);
    console.log(`  Transactions: ${existingTransactions}`);
    console.log(`  Batches: ${existingBatches}`);

    if (existingClients > 0 || existingTransactions > 0 || existingBatches > 0) {
        console.log('\n⚠️  Database already has data!');
        console.log('Do you want to:');
        console.log('  1. Skip seeding (data already exists)');
        console.log('  2. Add sample data anyway (will create duplicates)');
        console.log('\nTo clear all data first, use the "Factory Reset" option in Settings > System tab');
        await client.close();
        return;
    }

    // Insert Clients
    console.log('\n➕ Adding sample clients...');
    await db.collection('clients').insertMany(SAMPLE_CLIENTS);
    console.log(`✅ Added ${SAMPLE_CLIENTS.length} clients`);

    // Insert Transactions
    console.log('➕ Adding sample transactions...');
    await db.collection('transactions').insertMany(SAMPLE_TRANSACTIONS);
    console.log(`✅ Added ${SAMPLE_TRANSACTIONS.length} transactions`);

    // Insert Batches
    console.log('➕ Adding sample batches...');
    await db.collection('batches').insertMany(SAMPLE_BATCHES);
    console.log(`✅ Added ${SAMPLE_BATCHES.length} batches`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Sample Data Seeded Successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`  ✅ ${SAMPLE_CLIENTS.length} Clients`);
    console.log(`  ✅ ${SAMPLE_TRANSACTIONS.length} Transactions`);
    console.log(`  ✅ ${SAMPLE_BATCHES.length} Import Batches`);
    console.log(`  💰 Total Gross Brokerage: ₹${SAMPLE_TRANSACTIONS.reduce((sum, tx) => sum + tx.grossAmount, 0).toLocaleString()}`);
    console.log('\n🚀 You can now:');
    console.log('  1. View Reports → See brokerage settlements');
    console.log('  2. View Clients & Hierarchy → Manage clients');
    console.log('  3. View Imports → See batch history');
    console.log('  4. Raise invoices for monthly payouts');
    console.log('\n💡 Refresh your browser to see the data!');

    await client.close();
}

seedSampleData().catch(console.error);
