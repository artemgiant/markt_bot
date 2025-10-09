const { Pool } = require('pg');

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        if (this.pool) {
            return this.pool;
        }

        console.log('🗄️  Підключення до бази даних...');

        try {
            this.pool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_DATABASE || 'crypto_bot',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                max: 20, // максимум з'єднань
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Тестове підключення
            await this.pool.query('SELECT NOW()');
            console.log('✅ База даних підключена успішно');

            // Обробка помилок підключення
            this.pool.on('error', (err) => {
                console.error('❌ Неочікувана помилка БД:', err);
            });

            return this.pool;

        } catch (error) {
            console.error('❌ Помилка підключення до БД:', error.message);
            this.pool = null;
            throw error;
        }
    }

    async query(text, params) {
        if (!this.pool) {
            throw new Error('Database not connected');
        }
        return this.pool.query(text, params);
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('✅ База даних відключена');
        }
    }

    isConnected() {
        return this.pool !== null;
    }
}

// Singleton instance
const database = new Database();

module.exports = database;