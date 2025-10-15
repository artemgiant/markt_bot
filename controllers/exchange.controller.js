// controllers/exchange.controller.js

class ExchangeController {
    constructor(services) {
        this.exchangeService = services.exchange;
    }

    /**
     * Запуск біржі
     */
    async startExchange(req, res) {
        try {
            const { exchange } = req.params;

            await this.exchangeService.testConnection(exchange);
            console.log(`✅ ${exchange} запущено через веб-інтерфейс`);

            res.json({
                success: true,
                message: `${exchange} запущено`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Зупинка біржі
     */
    stopExchange(req, res) {
        try {
            const { exchange } = req.params;

            this.exchangeService.disableExchange(exchange);
            console.log(`🛑 ${exchange} зупинено через веб-інтерфейс`);

            res.json({
                success: true,
                message: `${exchange} зупинено`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Екстрена зупинка
     */
    async emergencyStop(req, res) {
        try {
            console.log('🚨 ЕКСТРЕНА ЗУПИНКА через веб-інтерфейс');

            const { exchange } = req.params;

            if (exchange) {
                await this.exchangeService.emergencyStop(exchange);
            } else {
                await this.exchangeService.emergencyStopAll();
            }

            res.json({
                success: true,
                message: 'Екстрену зупинку виконано'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання статусу бірж
     */
    getStatus(req, res) {
        try {
            const { exchange } = req.params;
            const connectedExchanges = this.exchangeService.getConnectionStatus(exchange);

            res.json({
                success: true,
                connectedExchanges,
                activeOrders: [] // Можна додати логіку для отримання активних ордерів
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання балансів
     */
    async getBalances(req, res) {
        try {
            const { exchange, ticker } = req.params;

            let balances;
            if (exchange) {
                balances = { [exchange]: await this.exchangeService.getBalances(exchange, ticker) };
            } else {
                balances = await this.exchangeService.getAllBalances(ticker);
            }

            res.json({
                success: true,
                balances
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Увімкнення біржі
     */
    async enableExchange(req, res) {
        try {
            const { exchange } = req.params;
            const result = await this.exchangeService.enableExchange(exchange);

            res.json({
                success: true,
                message: `Біржа ${exchange} увімкнена`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Вимкнення біржі
     */
    disableExchange(req, res) {
        try {
            const { exchange } = req.params;
            this.exchangeService.disableExchange(exchange);

            res.json({
                success: true,
                message: `Біржа ${exchange} вимкнена`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання торгових пар
     */
    async getTradingPairs(req, res) {
        try {
            const { exchange } = req.params;
            const pairs = await this.exchangeService.getTradingPairs(exchange);

            res.json({
                success: true,
                pairs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Тестування підключення до API
     */
    async testConnection(req, res) {
        try {
            const { exchange } = req.params || 'whitebit';
            console.log(`🧪 Тестування підключення до ${exchange} API...`);

            // Тест публічного API
            await this.exchangeService.getTickers(exchange);
            console.log('✅ Публічне API працює');

            // Тест приватного API
            await this.exchangeService.getBalances(exchange);
            console.log('✅ Приватне API працює');

            res.json({
                success: true,
                message: 'Всі тести пройшли успішно',
                tests: {
                    public: 'OK',
                    private: 'OK'
                }
            });
        } catch (error) {
            console.error('❌ Помилка тестування:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                tests: {
                    public: 'Потрібно перевірити',
                    private: 'Помилка'
                }
            });
        }
    }

    /**
     * Отримання тікерів
     */
    async getTickers(req, res) {
        try {
            const { exchange, market } = req.params;
            const tickers = await this.exchangeService.getTickers(exchange, market);

            res.json({
                success: true,
                tickers
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ExchangeController;


