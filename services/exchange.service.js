// services/exchange.service.js
const { filterBalances } = require('../utils');

class ExchangeService {
    constructor(exchanges) {
        this.exchanges = exchanges;
    }

    /**
     * Отримання балансів з біржі
     */
    async getBalances(exchange, ticker = null) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        const balances = await exchangeConnector.getSpotBalance(ticker);

        // Фільтруємо та форматуємо баланси
        if (!ticker) {
            return filterBalances(balances);
        }

        return balances;
    }

    /**
     * Отримання всіх балансів з усіх бірж
     */
    async getAllBalances(ticker = null) {
        const results = {};

        for (const [name, connector] of Object.entries(this.exchanges)) {
            try {
                const balances = await connector.getSpotBalance(ticker);
                results[name] = ticker ? balances : filterBalances(balances);
            } catch (error) {
                results[name] = { error: error.message };
            }
        }

        return results;
    }

    /**
     * Тестування підключення до біржі
     */
    async testConnection(exchange) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.testConnection();
    }

    /**
     * Увімкнення біржі
     */
    async enableExchange(exchange) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        await exchangeConnector.testConnection();
        console.log(`✅ Біржа ${exchange} увімкнена`);

        return { success: true, exchange };
    }

    /**
     * Вимкнення біржі
     */
    disableExchange(exchange) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        if (exchangeConnector.disconnect) {
            exchangeConnector.disconnect();
        }

        console.log(`🔴 Біржа ${exchange} вимкнена`);

        return { success: true, exchange };
    }

    /**
     * Отримання торгових пар
     */
    async getTradingPairs(exchange) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.getTradingPairs();
    }

    /**
     * Отримання тікерів
     */
    async getTickers(exchange, market = null) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        return exchangeConnector.getTickers(market);
    }

    /**
     * Перевірка статусу підключення
     */
    getConnectionStatus(exchange = null) {
        if (exchange) {
            const connector = this.exchanges[exchange];
            return connector ? connector.isConnected() : false;
        }

        // Статус всіх бірж
        const status = {};
        for (const [name, connector] of Object.entries(this.exchanges)) {
            status[name] = connector.isConnected();
        }

        return status;
    }

    /**
     * Екстрена зупинка (скасування всіх ордерів)
     */
    async emergencyStop(exchange) {
        const exchangeConnector = this.exchanges[exchange];

        if (!exchangeConnector) {
            throw new Error(`Exchange ${exchange} not found`);
        }

        console.log(`🚨 ЕКСТРЕНА ЗУПИНКА для ${exchange}`);

        // Скасування всіх ордерів
        await exchangeConnector.cancelAllOrders();

        // Відключення біржі
        if (exchangeConnector.disconnect) {
            exchangeConnector.disconnect();
        }

        return { success: true, message: 'Екстрену зупинку виконано' };
    }

    /**
     * Екстрена зупинка всіх бірж
     */
    async emergencyStopAll() {
        console.log('🚨 ЕКСТРЕНА ЗУПИНКА ВСІХ БІРЖ');

        const results = {};

        for (const [name, connector] of Object.entries(this.exchanges)) {
            try {
                await connector.cancelAllOrders();

                if (connector.disconnect) {
                    connector.disconnect();
                }

                results[name] = { success: true };
            } catch (error) {
                results[name] = { success: false, error: error.message };
            }
        }

        return results;
    }
}

module.exports = ExchangeService;


