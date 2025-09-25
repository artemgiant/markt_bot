// connectors/whitebit.js
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');

class WhiteBitConnector {
    constructor(config) {
        this.config = config;
        this.baseURL = 'https://whitebit.com';
        this.wsURL = 'wss://api.whitebit.com/ws';
        this.connected = false;
        this.ws = null;
        this.wsId = 1;
        this.subscriptions = new Map();
    }

    // Генерація підпису для приватних API запитів
    generateSignature(data, timestamp, path) {
        const payload = `/api/v4${path}${JSON.stringify(data)}${timestamp}`;
        return crypto
            .createHmac('sha512', this.config.secretKey)
            .update(payload)
            .digest('hex');
    }

    // Загальний метод для API запитів
    async makeRequest(method, endpoint, params = {}, isPrivate = false) {
        try {
            const url = `${this.baseURL}/api/v4${endpoint}`;
            const config = {
                method,
                url,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (isPrivate) {
                const timestamp = Math.floor(Date.now() / 1000);
                const signature = this.generateSignature(params, timestamp, endpoint);

                config.headers['X-TXC-APIKEY'] = this.config.apiKey;
                config.headers['X-TXC-PAYLOAD'] = Buffer.from(JSON.stringify(params)).toString('base64');
                config.headers['X-TXC-SIGNATURE'] = signature;
                config.headers['X-TXC-TIMESTAMP'] = timestamp;
            }

            if (method === 'GET') {
                config.params = params;
            } else {
                config.data = params;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            throw new Error(`WhiteBit API помилка: ${error.response?.data?.message || error.message}`);
        }
    }

    // Тестове підключення
    async testConnection() {
        try {
            await this.makeRequest('GET', '/public/ping');
            this.connected = true;
            console.log('✅ WhiteBit підключення встановлено');
            return true;
        } catch (error) {
            this.connected = false;
            throw new Error(`Помилка підключення до WhiteBit: ${error.message}`);
        }
    }

    isConnected() {
        return this.connected;
    }

    // ===== ПУБЛІЧНІ МЕТОДИ =====

    // Отримання інформації про торгові пари
    async getTradingPairs() {
        try {
            const response = await this.makeRequest('GET', '/public/markets');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання торгових пар: ${error.message}`);
        }
    }

    // Отримання поточних цін
    async getTickers(market = null) {
        try {
            const params = market ? { market } : {};
            const response = await this.makeRequest('GET', '/public/ticker', params);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання цін: ${error.message}`);
        }
    }

    // Отримання стакана заявок
    async getOrderBook(market, limit = 100) {
        try {
            const response = await this.makeRequest('GET', '/public/orderbook', {
                market,
                limit
            });
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання стакана: ${error.message}`);
        }
    }

    // Отримання історії торгів
    async getTrades(market, lastId = null) {
        try {
            const params = { market };
            if (lastId) params.lastId = lastId;

            const response = await this.makeRequest('GET', '/public/trades', params);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання торгів: ${error.message}`);
        }
    }

    // ===== ПРИВАТНІ МЕТОДИ (ТОРГІВЛЯ) =====

    // Отримання балансу спот акаунта
    async getSpotBalance() {
        try {
            const response = await this.makeRequest('POST', '/trade-account/balance', {}, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання балансу: ${error.message}`);
        }
    }

    // Створення лімітного ордера
    async createLimitOrder(market, side, amount, price, options = {}) {
        try {
            const params = {
                market,
                side, // 'buy' або 'sell'
                amount: amount.toString(),
                price: price.toString(),
                ...options
            };

            const response = await this.makeRequest('POST', '/order/new', params, true);

            console.log(`📝 WhiteBit лімітний ордер створено: ${side.toUpperCase()} ${amount} ${market} за ${price}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка створення ордера: ${error.message}`);
        }
    }

    // Створення ринкового ордера
    async createMarketOrder(market, side, amount, options = {}) {
        try {
            const params = {
                market,
                side,
                amount: amount.toString(),
                ...options
            };

            const response = await this.makeRequest('POST', '/order/market', params, true);

            console.log(`📈 WhiteBit ринковий ордер: ${side.toUpperCase()} ${amount} ${market}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка ринкового ордера: ${error.message}`);
        }
    }

    // Купівля за ринковою ціною на певну суму
    async buyMarketByQuote(market, quoteAmount, options = {}) {
        try {
            const params = {
                market,
                side: 'buy',
                quoteAmount: quoteAmount.toString(),
                ...options
            };

            const response = await this.makeRequest('POST', '/order/stock_market', params, true);

            console.log(`💰 WhiteBit купівля на суму: ${quoteAmount} в ${market}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка купівлі за сумою: ${error.message}`);
        }
    }

    // Скасування ордера
    async cancelOrder(market, orderId) {
        try {
            const response = await this.makeRequest('POST', '/order/cancel', {
                market,
                orderId
            }, true);

            console.log(`❌ WhiteBit ордер скасовано: ${orderId}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка скасування ордера: ${error.message}`);
        }
    }

    // Скасування всіх ордерів
    async cancelAllOrders(market = null) {
        try {
            const params = market ? { market } : {};
            const response = await this.makeRequest('POST', '/order/cancel/all', params, true);

            console.log(`❌ WhiteBit всі ордери скасовано${market ? ` для ${market}` : ''}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка скасування всіх ордерів: ${error.message}`);
        }
    }

    // Отримання активних ордерів
    async getActiveOrders(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;

            const response = await this.makeRequest('POST', '/orders', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання активних ордерів: ${error.message}`);
        }
    }

    // Отримання історії ордерів
    async getOrderHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;

            const response = await this.makeRequest('POST', '/order/history', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка історії ордерів: ${error.message}`);
        }
    }

    // Отримання історії торгів
    async getTradeHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;

            const response = await this.makeRequest('POST', '/trade-account/executed-history', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка історії торгів: ${error.message}`);
        }
    }

    // ===== WEBSOCKET МЕТОДИ =====

    connectWebSocket() {
        this.ws = new WebSocket(this.wsURL);

        this.ws.on('open', () => {
            console.log('📡 WhiteBit WebSocket підключено');
            this.connected = true;
        });

        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleWebSocketMessage(message);
            } catch (error) {
                console.error('WhiteBit WS помилка парсингу:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('📡 WhiteBit WebSocket закрито');
            this.connected = false;
            // Автоматичне перепідключення через 5 секунд
            setTimeout(() => {
                if (!this.connected) {
                    console.log('🔄 WhiteBit перепідключення...');
                    this.connectWebSocket();
                }
            }, 5000);
        });

        this.ws.on('error', (error) => {
            console.error('WhiteBit WebSocket помилка:', error);
        });
    }

    // Підписка на ціни
    subscribeToTicker(market, callback) {
        const id = this.wsId++;
        this.subscriptions.set(`ticker_${market}`, { id, callback });

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                id,
                method: 'ticker_subscribe',
                params: [market]
            }));
        }

        console.log(`📈 WhiteBit підписка на ціни: ${market}`);
        return id;
    }

    // Підписка на стакан заявок
    subscribeToDepth(market, limit = 100, callback) {
        const id = this.wsId++;
        this.subscriptions.set(`depth_${market}`, { id, callback });

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                id,
                method: 'depth_subscribe',
                params: [market, limit, "0", true]
            }));
        }

        console.log(`📊 WhiteBit підписка на стакан: ${market}`);
        return id;
    }

    // Підписка на торги
    subscribeToTrades(market, callback) {
        const id = this.wsId++;
        this.subscriptions.set(`trades_${market}`, { id, callback });

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                id,
                method: 'deals_subscribe',
                params: [market]
            }));
        }

        console.log(`💹 WhiteBit підписка на торги: ${market}`);
        return id;
    }

    // Обробка повідомлень WebSocket
    handleWebSocketMessage(message) {
        if (message.method) {
            switch (message.method) {
                case 'ticker_update':
                    this.handleTickerUpdate(message.params);
                    break;
                case 'depth_update':
                    this.handleDepthUpdate(message.params);
                    break;
                case 'deals_update':
                    this.handleTradesUpdate(message.params);
                    break;
                default:
                    console.log('WhiteBit невідомий метод:', message.method);
            }
        }
    }

    handleTickerUpdate(params) {
        const [market, data] = params;
        const subscription = this.subscriptions.get(`ticker_${market}`);

        if (subscription && subscription.callback) {
            subscription.callback({
                market,
                price: parseFloat(data.last),
                volume: parseFloat(data.volume),
                change: parseFloat(data.change),
                timestamp: Date.now()
            });
        }
    }

    handleDepthUpdate(params) {
        const [fullUpdate, market, data] = params;
        const subscription = this.subscriptions.get(`depth_${market}`);

        if (subscription && subscription.callback) {
            subscription.callback({
                market,
                fullUpdate,
                bids: data.bids || [],
                asks: data.asks || [],
                timestamp: Date.now()
            });
        }
    }

    handleTradesUpdate(params) {
        const [market, trades] = params;
        const subscription = this.subscriptions.get(`trades_${market}`);

        if (subscription && subscription.callback) {
            subscription.callback({
                market,
                trades: trades.map(trade => ({
                    id: trade.id,
                    price: parseFloat(trade.price),
                    amount: parseFloat(trade.amount),
                    side: trade.type,
                    timestamp: trade.time
                }))
            });
        }
    }

    // Відписка від всіх підписок
    unsubscribeAll() {
        for (const [key, subscription] of this.subscriptions.entries()) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const method = key.split('_')[0] + '_unsubscribe';
                this.ws.send(JSON.stringify({
                    id: subscription.id,
                    method,
                    params: []
                }));
            }
        }
        this.subscriptions.clear();
        console.log('📡 WhiteBit всі підписки скасовано');
    }

    // Закриття з'єднання
    disconnect() {
        this.unsubscribeAll();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        console.log('📡 WhiteBit з\'єднання закрито');
    }
}

module.exports = WhiteBitConnector;
