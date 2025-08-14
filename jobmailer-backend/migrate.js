// migrate.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'jobmailer',
    password: process.env.DB_PASSWORD || '123456',
    port: process.env.DB_PORT || 5432,
});

async function createEmailHistoryTable() {
    try {
        console.log('🔄 Creating email_history table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                recruiter_email VARCHAR(255) NOT NULL,
                role VARCHAR(100) NOT NULL,
                email_body TEXT,
                resume_file VARCHAR(255),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'sent'
            );
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON email_history(user_id);
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at DESC);
        `);

        console.log('✅ Email history table created successfully!');
        
        // Test the table
        const result = await pool.query('SELECT COUNT(*) FROM email_history');
        console.log(`✅ Table is working! Current records: ${result.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error creating email history table:', error);
    } finally {
        await pool.end();
    }
}

createEmailHistoryTable();
