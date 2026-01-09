import fetch from 'node-fetch';

async function reproduceError() {
    const API_URL = 'http://localhost:3001/api/data';

    const payload = [{
        id: 'test_id_123',
        name: 'Test Member',
        code: 'T123',
        password: 'password123',
        role: 'OPS',
        level: 6
    }];

    try {
        console.log('Sending request to save user...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: 'team',
                payload: payload,
                upsertField: 'id'
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', data);

        if (!response.ok) {
            console.error('❌ Failed to save user:', data.error);
        } else {
            console.log('✅ Successfully saved user');
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

reproduceError();
