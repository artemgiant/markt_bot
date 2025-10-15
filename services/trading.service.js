// services/trading.service.js
const TradingViewConnector = require('../connectors/trading_view');

class TradingService {
    constructor(models, exchanges, loggingService) {
        this.tradeHistoryModel = models.tradeHistory;
        this.exchanges = exchanges;
        this.loggingService = loggingService;
    }

    /**
     * Обробка сигналу від TradingView
     */
    async processTradingViewSignal(rawSignal, amount = 6) {
        let order = null;
        let orderError = null;

        try {
            // Парсинг сигналу
            const parsedSignal = TradingViewConnector.parseSignalSpot(rawSignal);
            console.log('📈 Парсений сигнал:', parsedSignal);

            // Створення ордера на біржі
            try {
                order = await this.exchanges.whitebit.createMarketOrder(
                    parsedSignal.coinCode,
                    parsedSignal.action,
                    amount
                );
                console.log('✅ Ордер створено:', order);
            } catch (orderErr) {
                orderError = orderErr.message;
                console.error('❌ Помилка створення ордера:', orderErr.message);
            }

            // Збереження в історію угод
            if (order) {
                await this.saveTradeHistory(parsedSignal, order);
            }

            // Логування торгового сигналу
            await this.loggingService.logTradingSignal(
                parsedSignal,
                order,
                orderError
            );

            return {
                success: !!order,
                signal: parsedSignal,
                order: order,
                error: orderError
            };
        } catch (error) {
            console.error('❌ Критична помилка обробки сигналу:', error);

            // Логування критичної помилки
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
     * Збереження угоди в історію
     */
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

    /**
     * Отримання історії угод
     */
    async getTradeHistory(limit = 100, filters = {}) {
        return this.tradeHistoryModel.getHistory(limit, filters);
    }

    /**
     * Отримання статистики угод
     */
    async getTradeStats(filters = {}) {
        return this.tradeHistoryModel.getStats(filters);
    }

    /**
     * Створення ордера
     */
    async createOrder({ exchange, market, side, amount, price, type = 'limit' }) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        let order;
        if (type === 'market') {
            order = await exchangeConnector.createMarketOrder(market, side, amount);
        } else {
            order = await exchangeConnector.createLimitOrder(market, side, amount, price);
        }

        return order;
    }

    /**
     * Скасування ордера
     */
    async cancelOrder(exchange, market, orderId) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.cancelOrder(market, orderId);
    }

    /**
     * Отримання активних ордерів
     */
    async getActiveOrders(exchange, market = null) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.getActiveOrders(market);
    }
}

module.exports = TradingService;


