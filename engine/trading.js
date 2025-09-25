// engine/trading.js
const EventEmitter = require('events');

class TradingEngine extends EventEmitter {
    constructor(config) {
        super();
        this.exchanges = config.exchanges;
        this.riskManager = config.riskManager;
        this.positions = new Map();
        this.strategies = new Map();
        this.isRunning = false;
        this.symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];

        this.setupStrategies();
    }

    setupStrategies() {
        // Приклад простої RSI стратегії
        this.strategies.set('rsi', {
            name: 'RSI Reversal',
            timeframe: '1m',
            parameters: {
                rsiPeriod: 14,
                oversold: 30,
                overbought: 70
            },
            enabled: true
        });

        // Приклад арбітражної стратегії
        this.strategies.set('arbitrage', {
            name: 'Cross-Exchange Arbitrage',
            parameters: {
                minSpread: 0.5, // Мінімальний спред у відсотках
                maxPositionTime: 300000 // 5 хвилин
            },
            enabled: true
        });
    }

    async start() {
        if (this.isRunning) return;

        console.log('🚀 Запуск торгового движка...');

        // Початкове завантаження позицій з бірж
        await this.loadExistingPositions();

        // Запуск моніторингу цін
        this.startPriceMonitoring();

        // Запуск стратегій
        this.startStrategies();

        this.isRunning = true;
        console.log('✅ Торговий движок запущено');
    }

    async stop() {
        if (!this.isRunning) return;

        console.log('🛑 Зупинка торгового движка...');
        this.isRunning = false;
    }

    async loadExistingPositions() {
        try {
            // Завантаження позицій з Binance
            const binancePositions = await this.exchanges.binance.getPositions();
            binancePositions.forEach(pos => {
                this.positions.set(`binance_${pos.symbol}`, {
                    exchange: 'binance',
                    symbol: pos.symbol,
                    side: parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT',
                    size: Math.abs(parseFloat(pos.positionAmt)),
                    entryPrice: parseFloat(pos.entryPrice),
                    unrealizedPnl: parseFloat(pos.unRealizedProfit),
                    openTime: Date.now()
                });
            });

            // Завантаження позицій з MEXC
            const mexcPositions = await this.exchanges.mexc.getPositions();
            mexcPositions.forEach(pos => {
                this.positions.set(`mexc_${pos.symbol}`, {
                    exchange: 'mexc',
                    symbol: pos.symbol,
                    side: pos.side === 1 ? 'LONG' : 'SHORT',
                    size: parseFloat(pos.positionSize),
                    entryPrice: parseFloat(pos.openAvgPrice),
                    unrealizedPnl: parseFloat(pos.unrealizedPnl),
                    openTime: pos.createTime
                });
            });

            console.log(`📊 Завантажено ${this.positions.size} існуючих позицій`);
        } catch (error) {
            console.error('Помилка завантаження позицій:', error.message);
        }
    }

    startPriceMonitoring() {
        this.symbols.forEach(symbol => {
            // Підписка на ціни з Binance
            this.exchanges.binance.subscribeToPriceStream(symbol, (data) => {
                this.handlePriceUpdate('binance', data);
            });

            // Підписка на ціни з MEXC
            this.exchanges.mexc.subscribeToPriceStream(symbol, (data) => {
                this.handlePriceUpdate('mexc', data);
            });
        });
    }

    startStrategies() {
        // Запуск RSI стратегії
        if (this.strategies.get('rsi').enabled) {
            setInterval(() => {
                this.executeRSIStrategy();
            }, 60000); // Кожну хвилину
        }

        // Запуск арбітражної стратегії
        if (this.strategies.get('arbitrage').enabled) {
            setInterval(() => {
                this.executeArbitrageStrategy();
            }, 5000); // Кожні 5 секунд
        }
    }

    handlePriceUpdate(exchange, data) {
        this.emit('priceUpdate', { exchange, ...data });

        // Оновлення поточних цін для арбітражу
        if (!this.currentPrices) this.currentPrices = {};
        if (!this.currentPrices[data.symbol]) this.currentPrices[data.symbol] = {};

        this.currentPrices[data.symbol][exchange] = data.price;

        // Перевірка стоп-лоссів та тейк-профітів
        this.checkStopLossAndTakeProfit(data.symbol, data.price);
    }

    async executeRSIStrategy() {
        // Спрощена реалізація RSI стратегії
        for (const symbol of this.symbols) {
            try {
                const rsi = await this.calculateRSI(symbol);
                const strategy = this.strategies.get('rsi');

                if (rsi < strategy.parameters.oversold) {
                    // Сигнал на покупку
                    await this.openPosition('binance', symbol, 'LONG', 0.001);
                } else if (rsi > strategy.parameters.overbought) {
                    // Сигнал на продаж
                    await this.openPosition('binance', symbol, 'SHORT', 0.001);
                }
            } catch (error) {
                console.error(`Помилка RSI стратегії для ${symbol}:`, error.message);
            }
        }
    }

    async executeArbitrageStrategy() {
        if (!this.currentPrices) return;

        const strategy = this.strategies.get('arbitrage');

        for (const symbol of this.symbols) {
            const prices = this.currentPrices[symbol];
            if (!prices || !prices.binance || !prices.mexc) continue;

            const spread = Math.abs(prices.binance - prices.mexc) / Math.min(prices.binance, prices.mexc) * 100;

            if (spread >= strategy.parameters.minSpread) {
                const cheapExchange = prices.binance < prices.mexc ? 'binance' : 'mexc';
                const expensiveExchange = prices.binance < prices.mexc ? 'mexc' : 'binance';

                console.log(`💰 Арбітражна можливість: ${symbol} спред ${spread.toFixed(2)}%`);

                // Відкриття арбітражних позицій
                await this.openArbitragePosition(symbol, cheapExchange, expensiveExchange, 0.001);
            }
        }
    }

    async openPosition(exchange, symbol, side, quantity) {
        try {
            // Перевірка ризик-менеджменту
            const riskCheck = this.riskManager.checkPositionRisk(symbol, side, quantity);
            if (!riskCheck.allowed) {
                console.log(`❌ Позиція відхилена ризик-менеджером: ${riskCheck.reason}`);
                return;
            }

            const adjustedQuantity = riskCheck.adjustedQuantity;
            let order;

            if (side === 'LONG') {
                order = await this.exchanges[exchange].marketBuy(symbol, adjustedQuantity);
            } else {
                order = await this.exchanges[exchange].marketSell(symbol, adjustedQuantity);
            }

            // Збереження позиції
            const positionKey = `${exchange}_${symbol}`;
            this.positions.set(positionKey, {
                exchange,
                symbol,
                side,
                size: adjustedQuantity,
                entryPrice: order.avgPrice || order.price,
                openTime: Date.now(),
                orderId: order.orderId
            });

            // Встановлення стоп-лосу та тейк-профіту
            await this.setRiskManagementOrders(exchange, symbol, side, adjustedQuantity, order.avgPrice || order.price);

            this.emit('positionOpened', { exchange, symbol, side, quantity: adjustedQuantity });

        } catch (error) {
            console.error(`Помилка відкриття позиції: ${error.message}`);
        }
    }

    async openArbitragePosition(symbol, buyExchange, sellExchange, quantity) {
        try {
            // Одночасне відкриття позицій на обох біржах
            const [buyOrder, sellOrder] = await Promise.all([
                this.exchanges[buyExchange].marketBuy(symbol, quantity),
                this.exchanges[sellExchange].marketSell(symbol, quantity)
            ]);

            console.log(`🔄 Арбітражні позиції відкрито для ${symbol}`);

            // Автоматичне закриття через певний час
            setTimeout(async () => {
                await this.closeArbitragePosition(symbol, buyExchange, sellExchange, quantity);
            }, this.strategies.get('arbitrage').parameters.maxPositionTime);

        } catch (error) {
            console.error(`Помилка арбітражу: ${error.message}`);
        }
    }

    async closeArbitragePosition(symbol, buyExchange, sellExchange, quantity) {
        try {
            await Promise.all([
                this.exchanges[buyExchange].marketSell(symbol, quantity),
                this.exchanges[sellExchange].marketBuy(symbol, quantity)
            ]);

            console.log(`✅ Арбітражні позиції закрито для ${symbol}`);
        } catch (error) {
            console.error(`Помилка закриття арбітражу: ${error.message}`);
        }
    }

    async setRiskManagementOrders(exchange, symbol, side, quantity, entryPrice) {
        try {
            const stopLossPrice = side === 'LONG'
                ? entryPrice * 0.98  // 2% стоп-лос
                : entryPrice * 1.02;

            const takeProfitPrice = side === 'LONG'
                ? entryPrice * 1.04  // 4% тейк-профіт
                : entryPrice * 0.96;

            // Встановлення стоп-лосу
            await this.exchanges[exchange].setStopLoss(symbol, quantity, stopLossPrice, side);

            // Встановлення тейк-профіту
            await this.exchanges[exchange].setTakeProfit(symbol, quantity, takeProfitPrice, side);

        } catch (error) {
            console.error(`Помилка встановлення ризик-менеджменту: ${error.message}`);
        }
    }

    async closeAllPositions() {
        console.log('🔒 Закриття всіх відкритих позицій...');

        for (const [key, position] of this.positions.entries()) {
            try {
                await this.exchanges[position.exchange].closePosition(
                    position.symbol,
                    position.side,
                    position.size
                );

                this.positions.delete(key);
                console.log(`✅ Позиція закрита: ${key}`);
            } catch (error) {
                console.error(`Помилка закриття позиції ${key}: ${error.message}`);
            }
        }
    }

    checkStopLossAndTakeProfit(symbol, currentPrice) {
        // Логіка перевірки стоп-лоссів та тейк-профітів
        for (const [key, position] of this.positions.entries()) {
            if (position.symbol !== symbol) continue;

            const pnlPercent = position.side === 'LONG'
                ? (currentPrice - position.entryPrice) / position.entryPrice * 100
                : (position.entryPrice - currentPrice) / position.entryPrice * 100;

            // Автоматичне закриття при досягненні цілей
            if (pnlPercent <= -2 || pnlPercent >= 4) {
                console.log(`⚡ Автоматичне закриття позиції ${key} з PnL: ${pnlPercent.toFixed(2)}%`);
                this.closePosition(key);
            }
        }
    }

    async closePosition(positionKey) {
        const position = this.positions.get(positionKey);
        if (!position) return;

        try {
            await this.exchanges[position.exchange].closePosition(
                position.symbol,
                position.side,
                position.size
            );

            this.positions.delete(positionKey);
            this.emit('positionClosed', position);

        } catch (error) {
            console.error(`Помилка закриття позиції: ${error.message}`);
        }
    }

    async calculateRSI(symbol, period = 14) {
        // Спрощена реалізація RSI
        // В реальному проекті варто використовувати технічні індикатори
        return Math.random() * 100; // Заглушка
    }

    getActivePositions() {
        return Array.from(this.positions.values());
    }

    getPerformanceStats() {
        const positions = this.getActivePositions();
        const totalPnL = positions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0);

        return {
            activePositions: positions.length,
            totalUnrealizedPnL: totalPnL,
            strategiesEnabled: Array.from(this.strategies.values()).filter(s => s.enabled).length
        };
    }
}

module.exports = TradingEngine;
