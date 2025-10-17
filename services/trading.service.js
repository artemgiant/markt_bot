// services/trading.service.js
const TradingViewConnector = require('../connectors/trading_view');

class TradingService {
    constructor(models, exchanges, loggingService) {
        this.tradeHistoryModel = models.tradeHistory;
        this.exchanges = exchanges;
        this.loggingService = loggingService;
    }

    /**
     * Обробка SPOT сигналу від TradingView
     */
    async processTradingViewSignal(rawSignal, amount = 6) {
        let order = null;
        let orderError = null;

        try {
            const parsedSignal = TradingViewConnector.parseSignalSpot(rawSignal);
            console.log('📈 Парсений сигнал:', parsedSignal);

            try {
                order = await this.exchanges.whitebit.createSpotMarketOrder(
                    parsedSignal.coinCode,
                    parsedSignal.action,
                    amount
                );
                console.log('✅ Ордер створено:', order);
            } catch (orderErr) {
                orderError = orderErr.message;
                console.error('❌ Помилка створення ордера:', orderErr.message);
            }

            if (order) {
                await this.saveTradeHistory(parsedSignal, order);
            }

            await this.loggingService.logTradingSignal(
                parsedSignal,
                order,
                orderError
            );

            return {
                success: !orderError,
                signal: parsedSignal,
                order: order,
                error: orderError
            };
        } catch (error) {
            console.error('❌ Критична помилка обробки сигналу:', error);

            await this.loggingService.logError(
                'trading_signal_processing',
                'Critical error processing trading signal',
                {
                    error: error.message,
                    stack: error.stack,
                    rawSignal
                }
            );

            throw error;
        }
    }

    /**
     * Обробка FUTURES сигналу від TradingView
     * На цьому етапі - тільки парсинг та вивід в консоль
     */
    async processFuturesSignal(rawSignal) {
        try {
            // Парсинг futures сигналу
            const parsedSignal = TradingViewConnector.parseSignalFutures(rawSignal);

            // Вивід в консоль з красивим форматуванням
            TradingViewConnector.debugSignal(parsedSignal);

            return {
                success: true,
                signal: parsedSignal
            };
        } catch (error) {
            console.error('❌ Помилка обробки futures сигналу:', error);
            throw error;
        }
    }

    async saveTradeHistory(signal, order) {
        try {
            const result = await this.tradeHistoryModel.create({
                signal,
                order
            });

            console.log('✅ Угоду збережено в історію, ID:', result.id);
            return result;
        } catch (error) {
            console.error('❌ Помилка збереження угоди:', error.message);
            throw error;
        }
    }

    async getTradeHistory(limit = 100, filters = {}) {
        return this.tradeHistoryModel.getHistory(limit, filters);
    }

    async getTradeStats(filters = {}) {
        return this.tradeHistoryModel.getStats(filters);
    }

    async createOrder({ exchange, market, side, amount, price, type = 'limit' }) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        let order;
        if (type === 'market') {
            order = await exchangeConnector.createSpotMarketOrder(market, side, amount);
        } else {
            order = await exchangeConnector.createSpotLimitOrder(market, side, amount, price);
        }

        return order;
    }

    async cancelOrder(exchange, market, orderId) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.cancelSpotOrder(market, orderId);
    }

    async getActiveOrders(exchange, market = null) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.getSpotActiveOrders(market);
    }
}

module.exports = TradingService;