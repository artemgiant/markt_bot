// controllers/index.js
const TradingViewController = require('./tradingview.controller');
const ExchangeController = require('./exchange.controller');
const TradingController = require('./trading.controller');
const LogsController = require('./logs.controller');

/**
 * Ініціалізація всіх контролерів
 */
function initControllers(services) {
    return {
        tradingView: new TradingViewController(services),
        exchange: new ExchangeController(services),
        trading: new TradingController(services),
        logs: new LogsController(services)
    };
}

module.exports = {
    initControllers,
    TradingViewController,
    ExchangeController,
    TradingController,
    LogsController
};