// routes/index.js
const express = require('express');
const setupTradingViewRoutes = require('./tradingview.routes');
const setupExchangeRoutes = require('./exchange.routes');
const setupTradingRoutes = require('./trading.routes');
const setupLogsRoutes = require('./logs.routes');

/**
 * Налаштування всіх роутів додатку
 */
function setupRoutes(app, controllers) {
    const router = express.Router();

    // API роути
    router.use('/trading_view', setupTradingViewRoutes(controllers));
    router.use('/exchanges', setupExchangeRoutes(controllers));
    router.use('/', setupTradingRoutes(controllers)); // order, cancel-order, active-orders
    router.use('/logs', setupLogsRoutes(controllers));

    // Старі роути для зворотної сумісності
    setupLegacyRoutes(router, controllers);

    // Монтуємо всі API роути під /api
    app.use('/api', router);

    return router;
}

/**
 * Старі роути для зворотної сумісності
 */
function setupLegacyRoutes(router, controllers) {
    const { exchange } = controllers;

    // Старі роути які були безпосередньо в index.js
    router.get('/status', exchange.getStatus.bind(exchange));
    router.get('/balances/:ticker?', exchange.getBalances.bind(exchange));
    router.post('/exchange/whitebit/enable', exchange.enableExchange.bind(exchange));
    router.post('/exchange/whitebit/disable', exchange.disableExchange.bind(exchange));
}

module.exports = setupRoutes;
