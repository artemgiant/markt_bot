// connectors/whitebit.js - Виправлена версія з nonce
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

        // Для генерації nonce
        this.lastNonce = Date.now();
    }

    // Генерація унікального nonce
    generateNonce() {
        const now = Date.now(); // Мілісекунди
        // Якщо поточний час дорівнює попередньому, збільшуємо на 1
        if (now <= this.lastNonce) {
            this.lastNonce = this.lastNonce + 1;
        } else {
            this.lastNonce = now;
        }
        return this.lastNonce;
    }


    // Загальний метод для API запитів
    async makeRequest(method, endpoint, params = {}, isPrivate = false) {
        try {
            const url = `${this.baseURL}/api/v4${endpoint}`;
            const config = {
                method,
                url,
                headers:{}

            };

            if (isPrivate) {
                // Додаємо обов'язкові поля для приватних методів
                const nonce = this.generateNonce();
                const requestBody = {
                    request: `/api/v4${endpoint}`, // ОБОВ'ЯЗКОВЕ поле request
                    nonce: nonce,                  // ОБОВ'ЯЗКОВЕ поле nonce (в мілісекундах)
                    nonceWindow: true,             // Рекомендоване поле
                    ...params                      // Додаткові параметри
                };

                // ВИПРАВЛЕНО: timestamp в мілісекундах
                const timestamp = Date.now(); // Мілісекунди замість секунд!

                // Генеруємо payload та підпис
                const payload = Buffer.from(JSON.stringify(requestBody)).toString('base64');

                const hash = crypto.createHmac("sha512", this.config.secretKey);
                const signature = hash.update(payload).digest("hex");


                // ВИПРАВЛЕНО: Додаємо всі обов'язкові заголовки
                config.headers['Content-Type'] =  "application/json";
                config.headers['X-TXC-APIKEY'] = this.config.apiKey;
                config.headers['X-TXC-PAYLOAD'] = payload;  // ОБОВ'ЯЗКОВИЙ заголовок!
                config.headers['X-TXC-SIGNATURE'] = signature;

                config.data = requestBody;

                // Детальний дебаг приватних запитів
                console.log(`\n📋 === WHITEBIT API DEBUG ===`);
                console.log(`🔗 URL: ${url}`);
                console.log(`📝 Method: ${method}`);
                console.log(`🔑 Endpoint: ${endpoint}`);
                console.log(`⏰ Timestamp (ms): ${timestamp}`);
                console.log(`🎲 Nonce (ms): ${nonce}`);
                console.log(`📦 Request Body:`, JSON.stringify(requestBody, null, 2));
                console.log(`🔐 Payload (base64):`, payload);
                console.log(`🔏 Signature:`, signature);
                console.log(`📋 ========================\n`);

            } else {
                if (method === 'GET') {
                    config.params = params;
                    console.log(`🌐 Публічний GET запит: ${url} з параметрами:`, params);
                } else {
                    config.data = params;
                    console.log(`🌐 Публічний POST запит: ${url} з даними:`, params);
                }
            }


            const response = await axios(config);

            // Дебаг відповіді
            if (isPrivate) {
                console.log(`✅ Успішна відповідь від WhiteBit API:`, {
                    status: response.status,
                    dataKeys: Object.keys(response.data || {}),
                    dataSize: JSON.stringify(response.data).length,
                    responseType: typeof response.data
                });

                // Показуємо частину відповіді для дебагу
                if (response.data) {
                    console.log(`📋 Перші 200 символів відповіді:`, JSON.stringify(response.data).substring(0, 200) + '...');
                }
            }

            return response.data;
        } catch (error) {
            // Детальний дебаг помилок
            console.log(`\n❌ === WHITEBIT API ERROR ===`);

            console.error('🚫 Error Type:', error.constructor.name);
            console.error('🚫 Error Message:', error.message);



            console.log(`📝 Method: ${method}`);
            console.log(`🔑 Endpoint: ${endpoint}`);

            if (error.response) {
                console.log(`📊 HTTP Status: ${error.response.status}`);
                console.log(`📋 Response Headers:`, error.response.headers);
                console.log(`📦 Response Data:`, JSON.stringify(error.response.data, null, 2));

                // Специфічні помилки WhiteBit
                if (error.response.data) {
                    const errorData = error.response.data;
                    if (errorData.message) {
                        console.log(`🚫 Error Message: ${errorData.message}`);
                    }
                    if (errorData.errors) {
                        console.log(`🚫 Detailed Errors:`, errorData.errors);
                    }
                    if (errorData.code) {
                        console.log(`🚫 Error Code: ${errorData.code}`);
                    }
                }
            } else if (error.request) {
                console.log(`🚫 No Response Received:`, error.request);
            } else {
                console.log(`🚫 Request Setup Error: ${error.message}`);
            }
            console.log(`❌ ========================\n`);

            const errorMessage = error.response?.data?.message || error.response?.data?.errors || error.message;
            throw new Error(`WhiteBit API помилка: ${errorMessage}`);
        }
    }

    // Тестове підключення
    async testConnection() {
        try {
            // Перевірка наявності API ключів
            if (!this.config.apiKey || !this.config.secretKey) {
                throw new Error('API ключі не налаштовані. Перевірте .env файл');
            }

            console.log('🧪 Тестування публічного API...');
            await this.makeRequest('GET', '/public/ping');
            this.connected = true;
            console.log('✅ Публічне API працює');

            // Додаткова перевірка приватного API
            console.log('🧪 Тестування приватного API...');
            await this.getSpotBalance();
            console.log('✅ Приватне API працює');

            console.log('✅ WhiteBit підключення встановлено повністю');
            return true;
        } catch (error) {
            this.connected = false;
            console.error('❌ Помилка підключення до WhiteBit:', error.message);
            throw new Error(`Помилка підключення до WhiteBit: ${error.message}`);
        }
    }

    isConnected() {
        return this.connected;
    }

    // ===== ПУБЛІЧНІ МЕТОДИ =====

    // Отримання торгових пар
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
    async getSpotBalance(ticker) {
        try {
            let params = {}
            if (ticker) {
                params =  {"ticker":ticker}
            }
            const response = await this.makeRequest('POST', '/trade-account/balance', params, true);

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
            let params = {
                market,
                side,
                amount: amount.toString(),
                "clientOrderId": "demo_order_".nonce,
                ...options
            };

            if(side=='buy'){
                params.amount = amount.toString();
            }else if(side=='sell'){
                const ticker = market.split('_')[0]

                console.log(ticker);
                const resp =   await this.getSpotBalance(ticker)

                params.amount = parseFloat(resp.available).toFixed(3);

            }

            const response = await this.makeRequest('POST', '/order/market', params, true);

            console.log(`📈 WhiteBit ринковий ордер: ${side.toUpperCase()} ${amount} ${market}`);
            return response;
        } catch (error) {
            console.log('Market order error details:', error.response?.data);
            throw error;
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
                orderId: parseInt(orderId)
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
            console.log('🔗 WhiteBit WebSocket підключено');
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
            console.log('🔗 WhiteBit WebSocket закрито');
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
        console.log('🔗 WhiteBit всі підписки скасовано');
    }

    // Закриття з'єднання
    disconnect() {
        this.unsubscribeAll();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        console.log('🔗 WhiteBit з\'єднання закрито');
    }
}

module.exports = WhiteBitConnector;



