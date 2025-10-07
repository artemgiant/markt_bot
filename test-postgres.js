const { Pool } = require('pg');

// Налаштування підключення до бази даних
const pool = new Pool({
    user: 'remote_root',
    host: '164.92.139.111',      // IP адреса вашого сервера
    database: 'market_bot',
    password: 'aR9^zN(chG4$wV6',
    port: 5432,
});

async function testConnection() {
    try {
        console.log('Спроба підключення до PostgreSQL...');

        // Тест підключення
        const client = await pool.connect();
        console.log('✅ Підключення до PostgreSQL успішне!');

        // Виконання запитків для отримання інформації
        const result = await client.query(`
      SELECT 
        NOW() as current_time,
        CURRENT_DATABASE() as database_name,
        CURRENT_USER as current_user,
        version() as postgres_version
    `);

        const info = result.rows[0];

        console.log('📊 Інформація про підключення:');
        console.log('   📅 Поточний час сервера:', info.current_time);
        console.log('   🗄️  Назва бази даних:', info.database_name);
        console.log('   👤 Поточний користувач:', info.current_user);
        console.log('   🚀 Версія PostgreSQL:', info.postgres_version.split(' ')[0] + ' ' + info.postgres_version.split(' ')[1]);

        // Додаткова інформація про сервер
        const serverInfo = await client.query(`
      SELECT 
        CURRENT_CATALOG as catalog_name,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `);

        const server = serverInfo.rows[0];
        console.log('   📂 Каталог (назва БД):', server.catalog_name);
        console.log('   🌐 IP сервера:', server.server_ip || 'localhost');
        console.log('   🔌 Порт сервера:', server.server_port);

        // Закриття підключення
        client.release();
        console.log('🔌 З\'єднання закрито');

    } catch (error) {
        console.log('❌ Помилка підключення до PostgreSQL:');
        console.log('   Повідомлення:', error.message);
        console.log('   Код помилки:', error.code);

        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Перевірте чи запущений PostgreSQL сервер');
        } else if (error.code === '28P01') {
            console.log('💡 Неправильний пароль або користувач');
        } else if (error.code === '3D000') {
            console.log('💡 База даних не існує');
        } else if (error.code === 'ENOTFOUND') {
            console.log('💡 Неправильна IP адреса сервера');
        }
    } finally {
        // Закриття пулу підключень
        await pool.end();
        console.log('🏁 Тест завершено');
    }
}

// Запуск тесту
testConnection();
