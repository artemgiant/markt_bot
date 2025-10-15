// database/models/index.js
const SystemLogModel = require('./system-log.model');
const TradeHistoryModel = require('./trade-history.model');

/**
 * Ініціалізація всіх моделей з підключенням до БД
 */
function initModels(db) {
    return {
        systemLog: new SystemLogModel(db),
        tradeHistory: new TradeHistoryModel(db)
    };
}

module.exports = {
    initModels,
    SystemLogModel,
    TradeHistoryModel
};