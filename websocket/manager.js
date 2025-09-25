// websocket/manager.js - Спрощена версія для WhiteBit
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
    constructor(config) {
        super();
        this.whitebit = config.exchanges.whitebit;
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) return;

        console.log('📡 Запуск WebSocket менеджера для WhiteBit...');

        try {
            // Підключення WebSocket до WhiteBit
            this.whitebit.connectWebSocket();

            // Підписка на основні торгові пари
            this.subscribeToMainPairs();

            this.isRunning = true;
            console.log('✅ WebSocket менеджер запущено');
        } catch (error) {
            console.error('❌ Помилка запуску WebSocket:', error.message);
        }
    }

    async stop() {
        if (!this.isRunning) return;

        console.log('📡 Зупинка WebSocket менеджера...');

        try {
            if (this.whitebit && this.whitebit.disconnect) {
                this.whitebit.disconnect();
            }

            this.isRunning = false;
            console.log('✅ WebSocket менеджер зупинено');
        } catch (error) {
            console.error('❌ Помилка зупинки WebSocket:', error.message);
        }
    }

    subscribeToMainPairs() {
        const mainPairs = ['BTC_USDT', 'ETH_USDT', 'ADA_USDT'];

        mainPairs.forEach(pair => {
            try {
                // Підписка на ціни
                this.whitebit.subscribeToTicker(pair, (data) => {
                    this.handlePriceUpdate(pair, data);
                });

                console.log(`📈 Підписано на ціни ${pair}`);
            } catch (error) {
                console.error(`Помилка підписки на ${pair}:`, error.message);
            }
        });
    }

    handlePriceUpdate(pair, data) {
        // Емітування події оновлення ціни
        this.emit('priceUpdate', {
            exchange: 'whitebit',
            symbol: pair,
            price: data.price,
            volume: data.volume,
            change: data.change,
            timestamp: data.timestamp
        });

        // Логування значних змін цін (більше 2%)
        if (data.change && Math.abs(data.change) >= 2) {
            const direction = data.change > 0 ? '📈' : '📉';
            console.log(`${direction} WhiteBit ${pair}: ${data.change.toFixed(2)}% - $${data.price}`);
        }
    }

    getConnectionStatus() {
        return {
            whitebit: {
                connected: this.whitebit ? this.whitebit.isConnected() : false,
                running: this.isRunning
            }
        };
    }
}

module.exports = WebSocketManager;