// websocket/manager.js
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
    constructor(config) {
        super();
        this.binance = config.binance;
        this.mexc = config.mexc;
        this.tradingEngine = config.tradingEngine;

        this.connections = new Map();
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 10;
        this.reconnectDelay = parseInt(process.env.WS_RECONNECT_DELAY) || 5000;

        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) return;

        console.log('📡 Запуск WebSocket менеджера...');

        // Підключення до Binance WebSocket
        this.connectBinanceStreams();

        // Підключення до MEXC WebSocket
        this.connectMEXCStreams();

        this.isRunning = true;
        console.log('✅ WebSocket менеджер запущено');
    }

    async stop() {
        if (!this.isRunning) return;

        console.log('📡 Зупинка WebSocket менеджера...');

        // Закриття всіх з'єднань
        for (const [key, connection] of this.connections.entries()) {
            if (connection && connection.close) {
                connection.close();
            }
        }

        this.connections.clear();
        this.reconnectAttempts.clear();
        this.isRunning = false;

        console.log('✅ WebSocket менеджер зупинено');
    }

    connectBinanceStreams() {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];

        symbols.forEach(symbol => {
            try {
                // Підписка на ціни
                const priceStream = this.binance.subscribeToPriceStream(symbol, (data) => {
                    this.handlePriceUpdate('binance', data);
                });

                this.connections.set(`binance_price_${symbol}`, priceStream);
                console.log(`📈 Підключено до Binance цін для ${symbol}`);

            } catch (error) {
                console.error(`Помилка підключення до Binance ${symbol}:`, error.message);
                this.scheduleReconnect('binance', symbol);
            }
        });
    }

    connectMEXCStreams() {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];

        symbols.forEach(symbol => {
            try {
                // Підписка на ціни MEXC
                this.mexc.subscribeToPriceStream(symbol, (data) => {
                    this.handlePriceUpdate('mexc', data);
                });

                console.log(`📈 Підключено до MEXC цін для ${symbol}`);

            } catch (error) {
                console.error(`Помилка підключення до MEXC ${symbol}:`, error.message);
                this.scheduleReconnect('mexc', symbol);
            }
        });
    }

    handlePriceUpdate(exchange, data) {
        // Передача даних до торгового движка
        if (this.tradingEngine) {
            this.tradingEngine.handlePriceUpdate(exchange, data);
        }

        // Емітування події для інших компонентів
        this.emit('priceUpdate', {
            exchange,
            symbol: data.symbol,
            price: data.price,
            volume: data.volume,
            timestamp: Date.now()
        });

        // Логування для важливих змін цін
        this.logSignificantPriceMovements(exchange, data);
    }

    logSignificantPriceMovements(exchange, data) {
        const key = `${exchange}_${data.symbol}`;
        const lastPrice = this.lastPrices && this.lastPrices.get(key);

        if (!this.lastPrices) {
            this.lastPrices = new Map();
        }

        if (lastPrice) {
            const changePercent = ((data.price - lastPrice) / lastPrice) * 100;

            // Логування значних рухів цін (більше 1%)
            if (Math.abs(changePercent) >= 1) {
                const direction = changePercent > 0 ? '📈' : '📉';
                console.log(`${direction} ${exchange.toUpperCase()} ${data.symbol}: ${changePercent.toFixed(2)}% - $${data.price}`);
            }
        }

        this.lastPrices.set(key, data.price);
    }

    scheduleReconnect(exchange, symbol) {
        const key = `${exchange}_${symbol}`;
        const currentAttempts = this.reconnectAttempts.get(key) || 0;

        if (currentAttempts >= this.maxReconnectAttempts) {
            console.error(`❌ Максимальна кількість спроб перепідключення досягнута для ${key}`);
            return;
        }

        const delay = this.reconnectDelay * Math.pow(2, currentAttempts); // Експоненційна затримка

        console.log(`🔄 Перепідключення ${key} через ${delay}ms (спроба ${currentAttempts + 1})`);

        setTimeout(() => {
            this.reconnectAttempts.set(key, currentAttempts + 1);

            if (exchange === 'binance') {
                this.connectBinanceStreams();
            } else if (exchange === 'mexc') {
                this.connectMEXCStreams();
            }
        }, delay);
    }

    getConnectionStatus() {
        const status = {};

        for (const [key, connection] of this.connections.entries()) {
            status[key] = {
                connected: connection && connection.readyState === 1,
                reconnectAttempts: this.reconnectAttempts.get(key) || 0
            };
        }

        return status;
    }

    // Метод для відправки повідомлень через WebSocket
    sendMessage(exchange, message) {
        const connection = this.connections.get(`${exchange}_main`);

        if (connection && connection.readyState === 1) {
            connection.send(JSON.stringify(message));
            return true;
        }

        console.error(`Неможливо відправити повідомлення: ${exchange} не підключено`);
        return false;
    }

    // Метод для підписки на додаткові потоки даних
    subscribeToStream(exchange, streamType, symbol, callback) {
        const key = `${exchange}_${streamType}_${symbol}`;

        try {
            let stream;

            if (exchange === 'binance') {
                // Додаткові потоки Binance
                if (streamType === 'orderbook') {
                    stream = this.binance.subscribeToOrderBookStream(symbol, callback);
                } else if (streamType === 'trades') {
                    stream = this.binance.subscribeToTradesStream(symbol, callback);
                }
            } else if (exchange === 'mexc') {
                // Додаткові потоки MEXC
                if (streamType === 'orderbook') {
                    stream = this.mexc.subscribeToOrderBookStream(symbol, callback);
                }
            }

            if (stream) {
                this.connections.set(key, stream);
                console.log(`📊 Підписано на ${streamType} для ${symbol} на ${exchange}`);
                return true;
            }

        } catch (error) {
            console.error(`Помилка підписки на ${key}:`, error.message);
        }

        return false;
    }
}

module.exports = WebSocketManager;
