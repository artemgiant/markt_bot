// routes/tradingview.routes.js
const express = require('express');
const router = express.Router();

/**
 * Налаштування роутів для TradingView
 */
function setupTradingViewRoutes(controllers) {
    const { tradingView } = controllers;

    // POST /api/trading_view/spot - Вебхук для SPOT сигналів
    router.post('/spot', tradingView.handleSpotWebhook.bind(tradingView));

    // POST /api/trading_view/futures - Вебхук для FUTURES сигналів
    router.post('/futures', tradingView.handleFuturesWebhook.bind(tradingView));

    return router;
}

module.exports = setupTradingViewRoutes;