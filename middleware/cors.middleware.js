// middleware/cors.middleware.js
const cors = require('cors');

/**
 * Налаштування CORS для всіх роутів
 */
function setupCors() {
    return cors({
        origin: '*', // Дозволити всі джерела (в продакшні краще обмежити)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    });
}

module.exports = setupCors;