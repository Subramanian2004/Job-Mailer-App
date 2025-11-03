require('dotenv').config();

async function verifyAPI() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error('❌ No API key found in .env file');
        return;
    }
    
    console.log('✓ API Key found');
    console.log(`Key starts with: ${apiKey.substring(0, 8)}...`);
    
    // Test basic API access
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log('\nTesting API access...');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✓ API access successful!');
            if (data.models && data.models.length > 0) {
                console.log(`\nFound ${data.models.length} models:`);
                data.models.forEach(model => {
                    console.log(`- ${model.name} (${model.displayName || 'No display name'})`);
                });
            } else {
                console.log('\n⚠️  No models found or API returned empty list');
            }
        } else {
            console.error('❌ API error:', data.error?.message || response.statusText);
            if (response.status === 403) {
                console.log('\nPossible issues:');
                console.log('1. API key is invalid or expired');
                console.log('2. Gemini API is not enabled for your project');
                console.log('3. Billing is not set up (for paid tier)');
            }
        }
    } catch (error) {
        console.error('❌ Network/fetch error:', error.message);
    }
}

// Also test if node-fetch is needed
if (typeof fetch === 'undefined') {
    console.log('⚠️  fetch is not available. Installing node-fetch...');
    global.fetch = require('node-fetch');
}

verifyAPI();
