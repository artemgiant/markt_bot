// routes/tradingview.routes.js
const express = require('express');
const router = express.Router();

/**
 * Налаштування роутів для TradingView
 */
function setupTradingViewRoutes(controllers) {
    const { tradingView } = controllers;

    // POST/GET/ALL /api/trading_view - Вебхук від TradingView
    router.all('/', tradingView.handleWebhook.bind(tradingView));

    return router;
}

module.exports = setupTradingViewRoutes;