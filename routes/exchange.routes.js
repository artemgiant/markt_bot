// routes/exchange.routes.js
const express = require('express');
const router = express.Router();
const { validation } = require('../middleware');

/**
 * Налаштування роутів для роботи з біржами
 */
function setupExchangeRoutes(controllers) {
    const { exchange } = controllers;

    // POST /api/exchanges/:exchange/start - Запуск біржі
    router.post('/:exchange/start',
        validation.validateExchange,
        exchange.startExchange.bind(exchange)
    );

    // POST /api/exchanges/:exchange/stop - Зупинка біржі
    router.post('/:exchange/stop',
        validation.validateExchange,
        exchange.stopExchange.bind(exchange)
    );

    // POST /api/emergency-stop - Екстрена зупинка всіх бірж
    router.post('/emergency-stop', exchange.emergencyStop.bind(exchange));

    // POST /api/emergency-stop/:exchange - Екстрена зупинка однієї біржі
    router.post('/emergency-stop/:exchange',
        validation.validateExchange,
        exchange.emergencyStop.bind(exchange)
    );

    // GET /api/status - Статус бірж
    router.get('/status', exchange.getStatus.bind(exchange));

    // GET /api/status/:exchange - Статус однієї біржі
    router.get('/status/:exchange',
        validation.validateExchange,
        exchange.getStatus.bind(exchange)
    );

    // GET /api/balances - Баланси всіх бірж
    router.get('/balances', exchange.getBalances.bind(exchange));

    // GET /api/balances/:ticker - Баланс по тікеру на всіх біржах
    router.get('/balances/:ticker', exchange.getBalances.bind(exchange));

    // GET /api/exchange/:exchange/balances - Баланси на конкретній біржі
    router.get('/:exchange/balances',
        validation.validateExchange,
        exchange.getBalances.bind(exchange)
    );

    // POST /api/exchange/:exchange/enable - Увімкнення біржі
    router.post('/:exchange/enable',
        validation.validateExchange,
        exchange.enableExchange.bind(exchange)
    );

    // POST /api/exchange/:exchange/disable - Вимкнення біржі
    router.post('/:exchange/disable',
        validation.validateExchange,
        exchange.disableExchange.bind(exchange)
    );

    // GET /api/trading-pairs - Отримання торгових пар
    router.get('/trading-pairs', exchange.getTradingPairs.bind(exchange));

    // GET /api/trading-pairs/:exchange - Торгові пари конкретної біржі
    router.get('/trading-pairs/:exchange',
        validation.validateExchange,
        exchange.getTradingPairs.bind(exchange)
    );

    // GET /api/test-connection - Тестування підключення до API
    router.get('/test-connection', exchange.testConnection.bind(exchange));

    // GET /api/test-connection/:exchange - Тест підключення до конкретної біржі
    router.get('/test-connection/:exchange',
        validation.validateExchange,
        exchange.testConnection.bind(exchange)
    );

    // GET /api/tickers - Отримання тікерів
    router.get('/tickers', exchange.getTickers.bind(exchange));

    // GET /api/tickers/:market - Тікер конкретного ринку
    router.get('/tickers/:market', exchange.getTickers.bind(exchange));

    // GET /api/tickers/:exchange/:market - Тікер на конкретній біржі
    router.get('/:exchange/tickers/:market?',
        validation.validateExchange,
        exchange.getTickers.bind(exchange)
    );

    return router;
}

module.exports = setupExchangeRoutes;
