// services/exchange.service.js
const { filterBalances } = require('../utils');

class ExchangeService {
    constructor(exchanges, loggingService) {
        this.exchanges = exchanges;
        this.loggingService = loggingService;
        this.enabledExchanges = new Set(['whitebit']); // За замовчуванням включена whitebit
    }

    /**
     * Отримання коннектора біржі
     * @param {string} exchangeName - Назва біржі (whitebit, binance, тощо)
     * @returns {object|null} - Коннектор біржі або null
     */
    getConnector(exchangeName) {
        if (!exchangeName) {
            console.warn('⚠️ Exchange name not provided');
            return null;
        }

        const normalizedName = exchangeName.toLowerCase();

        if (!this.exchanges[normalizedName]) {
            console.warn(`⚠️ Exchange connector not found: ${normalizedName}`);
            return null;
        }

        if (!this.enabledExchanges.has(normalizedName)) {
            console.warn(`⚠️ Exchange is disabled: ${normalizedName}`);
            return null;
        }

        return this.exchanges[normalizedName];
    }

    /**
     * Тестування підключення до біржі
     */
    async testConnection(exchangeName = 'whitebit') {
        try {
            const connector = this.getConnector(exchangeName);
            if (!connector) {
                throw new Error(`${exchangeName} не підключено`);
            }

            await connector.testConnection();
            console.log(`✅ ${exchangeName} connection tested successfully`);
            return true;
        } catch (error) {
            console.error(`❌ ${exchangeName} connection test failed:`, error.message);
            throw error;
        }
    }

    /**
     * Увімкнення біржі
     */
    async enableExchange(exchangeName) {
        const connector = this.exchanges[exchangeName];
        if (!connector) {
            throw new Error(`Exchange ${exchangeName} not found`);
        }

        this.enabledExchanges.add(exchangeName);
        console.log(`✅ ${exchangeName} enabled`);
        return true;
    }

    /**
     * Вимкнення біржі
     */
    disableExchange(exchangeName) {
        this.enabledExchanges.delete(exchangeName);
        console.log(`🛑 ${exchangeName} disabled`);
    }

    /**
     * Отримання статусу підключень
     */
    getConnectionStatus(exchangeName = null) {
        if (exchangeName) {
            const connector = this.exchanges[exchangeName];
            return {
                [exchangeName]: {
                    enabled: this.enabledExchanges.has(exchangeName),
                    connected: connector ? connector.isConnected() : false
                }
            };
        }

        const status = {};
        for (const [name, connector] of Object.entries(this.exchanges)) {
            status[name] = {
                enabled: this.enabledExchanges.has(name),
                connected: connector.isConnected()
            };
        }
        return status;
    }

    /**
     * Отримання балансів
     */
    async getBalances(exchangeName, ticker = null) {
        const connector = this.getConnector(exchangeName);
        if (!connector) {
            throw new Error(`${exchangeName} не підключено`);
        }

        try {
            const balance = await connector.getSpotBalance();

            if (ticker) {
                return balance[ticker] || { available: '0', freeze: '0' };
            }

            // Використовуємо filterBalances для фільтрації балансів
            return filterBalances(balance);
        } catch (error) {
            throw new Error(`Помилка отримання балансу: ${error.message}`);
        }
    }

    /**
     * Отримання балансів з усіх бірж
     */
    async getAllBalances(ticker = null) {
        const allBalances = {};

        for (const exchangeName of this.enabledExchanges) {
            try {
                allBalances[exchangeName] = await this.getBalances(exchangeName, ticker);
            } catch (error) {
                console.error(`❌ Error getting balance from ${exchangeName}:`, error.message);
                allBalances[exchangeName] = { error: error.message };
            }
        }

        return allBalances;
    }

    /**
     * Отримання тікерів
     */
    async getTickers(exchangeName = 'whitebit', market = null) {
        const connector = this.getConnector(exchangeName);
        if (!connector) {
            throw new Error(`${exchangeName} не підключено`);
        }

        try {
            return await connector.getTickers(market);
        } catch (error) {
            throw new Error(`Помилка отримання тікерів: ${error.message}`);
        }
    }

    /**
     * Отримання торгових пар
     */
    async getTradingPairs(exchangeName = 'whitebit') {
        const connector = this.getConnector(exchangeName);
        if (!connector) {
            throw new Error(`${exchangeName} не підключено`);
        }

        try {
            return await connector.getTradingPairs();
        } catch (error) {
            throw new Error(`Помилка отримання торгових пар: ${error.message}`);
        }
    }

    /**
     * Екстрена зупинка біржі
     */
    async emergencyStop(exchangeName) {
        console.log(`🚨 EMERGENCY STOP for ${exchangeName}`);
        this.disableExchange(exchangeName);

        // Тут можна додати логіку скасування всіх активних ордерів
        // const connector = this.exchanges[exchangeName];
        // if (connector) {
        //     await connector.cancelAllOrders();
        // }
    }

    /**
     * Екстрена зупинка всіх бірж
     */
    async emergencyStopAll() {
        console.log('🚨 EMERGENCY STOP ALL EXCHANGES');
        for (const exchangeName of this.enabledExchanges) {
            await this.emergencyStop(exchangeName);
        }
    }
}

module.exports = ExchangeService;