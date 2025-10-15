// routes/futures.routes.js

const express = require('express');
const router = express.Router();
const { validation } = require('../middleware');

/**
 * Налаштування роутів для ф'ючерсної торгівлі
 */
function setupFuturesRoutes(controllers) {
    const { trading } = controllers;

    // GET /api/futures/markets - Отримати список доступних ф'ючерсних ринків
    router.get('/markets', trading.getMarkets.bind(trading));

    // GET /api/futures/markets/:exchange - Ринки конкретної біржі
    router.get('/markets/:exchange',
        validation.validateExchange,
        trading.getMarkets.bind(trading)
    );

    // GET /api/futures/balance - Баланс колатерального акаунту
    router.get('/balance', trading.getBalance.bind(trading));

    // GET /api/futures/balance/:exchange - Баланс на конкретній біржі
    router.get('/balance/:exchange',
        validation.validateExchange,
        trading.getBalance.bind(trading)
    );

    // GET /api/futures/summary - Загальна інформація про колатеральний акаунт
    router.get('/summary', trading.getSummary.bind(trading));

    // GET /api/futures/summary/:exchange - Summary конкретної біржі
    router.get('/summary/:exchange',
        validation.validateExchange,
        trading.getSummary.bind(trading)
    );

    // GET /api/futures/fee - Комісії для колатеральної торгівлі
    router.get('/fee', trading.getFee.bind(trading));

    // GET /api/futures/fee/:exchange - Комісії конкретної біржі
    router.get('/fee/:exchange',
        validation.validateExchange,
        trading.getFee.bind(trading)
    );

    // GET /api/futures/positions - Відкриті позиції
    router.get('/positions', trading.getPositions.bind(trading));

    // GET /api/futures/positions/:exchange - Позиції конкретної біржі
    router.get('/positions/:exchange',
        validation.validateExchange,
        trading.getPositions.bind(trading)
    );

    // POST /api/futures/positions/close - Закрити позицію
    router.post('/positions/close', trading.closePosition.bind(trading));

    // POST /api/futures/positions/close/:exchange - Закрити позицію на біржі
    router.post('/positions/close/:exchange',
        validation.validateExchange,
        trading.closePosition.bind(trading)
    );

    // POST /api/futures/order/limit - Створити лімітний ордер
    router.post('/order/limit', trading.createLimitOrder.bind(trading));

    // POST /api/futures/order/limit/:exchange - Лімітний ордер на біржі
    router.post('/order/limit/:exchange',
        validation.validateExchange,
        trading.createLimitOrder.bind(trading)
    );

    // POST /api/futures/order/market - Створити ринковий ордер
    router.post('/order/market', trading.createMarketOrder.bind(trading));

    // POST /api/futures/order/market/:exchange - Ринковий ордер на біржі
    router.post('/order/market/:exchange',
        validation.validateExchange,
        trading.createMarketOrder.bind(trading)
    );

    // POST /api/futures/order/stop-limit - Створити стоп-лімітний ордер
    router.post('/order/stop-limit', trading.createStopLimitOrder.bind(trading));

    // POST /api/futures/order/stop-limit/:exchange - Стоп-лімітний ордер на біржі
    router.post('/order/stop-limit/:exchange',
        validation.validateExchange,
        trading.createStopLimitOrder.bind(trading)
    );

    // GET /api/futures/orders/active - Активні ордери
    router.get('/orders/active', trading.getActiveOrders.bind(trading));

    // GET /api/futures/orders/active/:exchange - Активні ордери біржі
    router.get('/orders/active/:exchange',
        validation.validateExchange,
        trading.getActiveOrders.bind(trading)
    );

    // GET /api/futures/orders/history - Історія ордерів
    router.get('/orders/history', trading.getOrderHistory.bind(trading));

    // GET /api/futures/orders/history/:exchange - Історія ордерів біржі
    router.get('/orders/history/:exchange',
        validation.validateExchange,
        trading.getOrderHistory.bind(trading)
    );

    // DELETE /api/futures/order - Скасувати ордер
    router.delete('/order', trading.cancelOrder.bind(trading));

    // DELETE /api/futures/order/:exchange - Скасувати ордер на біржі
    router.delete('/order/:exchange',
        validation.validateExchange,
        trading.cancelOrder.bind(trading)
    );

    // GET /api/futures/trades/history - Історія виконаних угод
    router.get('/trades/history', trading.getTradeHistory.bind(trading));

    // GET /api/futures/trades/history/:exchange - Історія угод біржі
    router.get('/trades/history/:exchange',
        validation.validateExchange,
        trading.getTradeHistory.bind(trading)
    );

    // POST /api/futures/leverage - Встановити leverage
    router.post('/leverage', trading.setLeverage.bind(trading));

    // POST /api/futures/leverage/:exchange - Встановити leverage на біржі
    router.post('/leverage/:exchange',
        validation.validateExchange,
        trading.setLeverage.bind(trading)
    );

    // POST /api/futures/calculate/liquidation-price - Розрахувати ліквідаційну ціну
    router.post('/calculate/liquidation-price', trading.calculateLiquidationPrice.bind(trading));

    // POST /api/futures/calculate/pnl - Розрахувати PNL
    router.post('/calculate/pnl', trading.calculatePNL.bind(trading));

    return router;
}

module.exports = setupFuturesRoutes;