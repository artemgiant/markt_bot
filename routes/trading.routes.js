// routes/trading.routes.js
const express = require('express');
const router = express.Router();
const { validation } = require('../middleware');

/**
 * Налаштування роутів для торгівлі
 */
function setupTradingRoutes(controllers) {
    const { trading } = controllers;

    // POST /api/order - Створення ордера
    router.post('/order',
        validation.validateOrderCreation,
        trading.createOrder.bind(trading)
    );

    // POST /api/cancel-order - Скасування ордера
    router.post('/cancel-order',
        validation.validateOrderCancellation,
        trading.cancelOrder.bind(trading)
    );

    // GET /api/active-orders - Активні ордери на всіх біржах
    router.get('/active-orders', trading.getActiveOrders.bind(trading));

    // GET /api/active-orders/:exchange - Активні ордери на біржі
    router.get('/active-orders/:exchange', trading.getActiveOrders.bind(trading));

    // GET /api/active-orders/:exchange/:market - Активні ордери по ринку
    router.get('/active-orders/:exchange/:market', trading.getActiveOrders.bind(trading));

    // GET /api/trade-history - Історія угод
    router.get('/trade-history', trading.getTradeHistory.bind(trading));

    // GET /api/trade-stats - Статистика угод
    router.get('/trade-stats', trading.getTradeStats.bind(trading));

    return router;
}

module.exports = setupTradingRoutes;
