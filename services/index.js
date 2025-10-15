// services/index.js
const LoggingService = require('./logging.service');
const TradingService = require('./trading.service');
const ExchangeService = require('./exchange.service');

/**
 * Ініціалізація всіх сервісів
 */
function initServices(models, exchanges, logsDir = 'logs') {
    const loggingService = new LoggingService(models, logsDir);
    const tradingService = new TradingService(models, exchanges, loggingService);
    const exchangeService = new ExchangeService(exchanges);

    return {
        logging: loggingService,
        trading: tradingService,
        exchange: exchangeService
    };
}

module.exports = {
    initServices,
    LoggingService,
    TradingService,
    ExchangeService
};