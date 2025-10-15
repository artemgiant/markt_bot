// server.js
const CryptoSpotBot = require('./app');

/**
 * Запуск додатку
 */
async function startServer() {
    try {
        console.log('🚀 Ініціалізація бота...');

        // Створюємо бота
        const bot = new CryptoSpotBot();

        // ВАЖЛИВО: Спочатку ініціалізуємо (підключаємо БД)
        await bot.init();

        // Потім запускаємо веб-сервер
        bot.listen();

        // Обробка сигналів для graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('📨 SIGTERM отримано, зупинка бота...');
            await bot.shutdown();
        });

        process.on('SIGINT', async () => {
            console.log('📨 SIGINT отримано, зупинка бота...');
            await bot.shutdown();
        });

        // Обробка некерованих помилок
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', async (error) => {
            console.error('❌ Uncaught Exception:', error);
            await bot.shutdown();
        });

        console.log('✅ Сервер успішно запущено');

    } catch (error) {
        console.error('⚠️ Помилка запуску:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Запускаємо тільки якщо це головний модуль
if (require.main === module) {
    startServer();
}

module.exports = startServer;
