// controllers/trading.controller.js

class TradingController {
    constructor(services) {
        this.tradingService = services.trading;
    }

    /**
     * Створення ордера
     */
    async createOrder(req, res) {
        try {
            const { exchange, market, side, amount, price, type = 'limit' } = req.body;

            const order = await this.tradingService.createOrder({
                exchange,
                market,
                side,
                amount,
                price,
                type
            });

            res.json({
                success: true,
                order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Скасування ордера
     */
    async cancelOrder(req, res) {
        try {
            const { exchange, market, orderId } = req.body;
            const result = await this.tradingService.cancelOrder(exchange, market, orderId);

            res.json({
                success: true,
                result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання активних ордерів
     */
    async getActiveOrders(req, res) {
        try {
            const { exchange, market } = req.params;
            const orders = await this.tradingService.getActiveOrders(exchange, market);

            res.json({
                success: true,
                orders
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання історії угод
     */
    async getTradeHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const filters = {
                exchange: req.query.exchange,
                symbol: req.query.symbol,
                side: req.query.side
            };

            const history = await this.tradingService.getTradeHistory(limit, filters);

            res.json({
                success: true,
                count: history.length,
                trades: history
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання статистики угод
     */
    async getTradeStats(req, res) {
        try {
            const filters = {
                exchange: req.query.exchange,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            const stats = await this.tradingService.getTradeStats(filters);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = TradingController;


