// connectors/whitebit.js - Повна версія з ф'ючерсними методами
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
        const now = Date.now();
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
                const nonce = this.generateNonce();
                const requestBody = {
                    request: `/api/v4${endpoint}`,
                    nonce: nonce,
                    nonceWindow: true,
                    ...params
                };

                const timestamp = Date.now();
                const payload = Buffer.from(JSON.stringify(requestBody)).toString('base64');
                const hash = crypto.createHmac("sha512", this.config.secretKey);
                const signature = hash.update(payload).digest("hex");

                config.headers['Content-Type'] = "application/json";
                config.headers['X-TXC-APIKEY'] = this.config.apiKey;
                config.headers['X-TXC-PAYLOAD'] = payload;
                config.headers['X-TXC-SIGNATURE'] = signature;
                config.data = requestBody;

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

            if (isPrivate) {
                console.log(`✅ Успішна відповідь від WhiteBit API:`, {
                    status: response.status,
                    dataKeys: Object.keys(response.data || {}),
                    dataSize: JSON.stringify(response.data).length,
                    responseType: typeof response.data
                });

                if (response.data) {
                    console.log(`📋 Перші 200 символів відповіді:`, JSON.stringify(response.data).substring(0, 200) + '...');
                }
            }

            return response.data;
        } catch (error) {
            console.log(`\n❌ === WHITEBIT API ERROR ===`);
            console.error('🚫 Error Type:', error.constructor.name);
            console.error('🚫 Error Message:', error.message);
            console.log(`📝 Method: ${method}`);
            console.log(`🔑 Endpoint: ${endpoint}`);

            if (error.response) {
                console.log(`📊 HTTP Status: ${error.response.status}`);
                console.log(`📋 Response Headers:`, error.response.headers);
                console.log(`📦 Response Data:`, JSON.stringify(error.response.data, null, 2));

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
            if (!this.config.apiKey || !this.config.secretKey) {
                throw new Error('API ключі не налаштовані. Перевірте .env файл');
            }

            console.log('🧪 Тестування публічного API...');
            await this.makeRequest('GET', '/public/ping');
            this.connected = true;
            console.log('✅ Публічне API працює');

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

    async getTradingPairs() {
        try {
            const response = await this.makeRequest('GET', '/public/markets');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання торгових пар: ${error.message}`);
        }
    }

    async getTickers(market = null) {
        try {
            const params = market ? { market } : {};
            const response = await this.makeRequest('GET', '/public/ticker', params);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання цін: ${error.message}`);
        }
    }

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

    // ===== ПРИВАТНІ МЕТОДИ (СПОТ ТОРГІВЛЯ) =====

    async getSpotBalance(ticker) {
        try {
            let params = {}
            if (ticker) {
                params = {"ticker":ticker}
            }
            const response = await this.makeRequest('POST', '/trade-account/balance', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання балансу: ${error.message}`);
        }
    }

    async createLimitOrder(market, side, amount, price, options = {}) {
        try {
            const params = {
                market,
                side,
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
                const resp = await this.getSpotBalance(ticker)
                params.amount = Math.trunc(resp.available * 1000) / 1000;
            }

            const response = await this.makeRequest('POST', '/order/market', params, true);
            console.log(`📈 WhiteBit ринковий ордер: ${side.toUpperCase()} ${amount} ${market}`);
            return response;
        } catch (error) {
            console.log('Market order error details:', error.response?.data);
            throw error;
        }
    }

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

    subscribeToTrades(market, callback) {
        const id = this.wsId++;
        this.subscriptions.set(`trades_${market}`, { id, callback });

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                id,
                method: 'trades_subscribe',
                params: [market]
            }));
        }

        console.log(`📈 WhiteBit підписка на угоди: ${market}`);
        return id;
    }

    handleWebSocketMessage(message) {
        if (message.method) {
            const [action, type] = message.method.split('_');

            if (action === 'ticker' && type === 'update') {
                this.handleTickerUpdate(message.params);
            } else if (action === 'depth' && type === 'update') {
                this.handleDepthUpdate(message.params);
            } else if (action === 'trades' && type === 'update') {
                this.handleTradesUpdate(message.params);
            }
        }
    }

    handleTickerUpdate(params) {
        const [market, data] = params;
        const subscription = this.subscriptions.get(`ticker_${market}`);

        if (subscription && subscription.callback) {
            subscription.callback({
                market,
                ...data,
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

    disconnect() {
        this.unsubscribeAll();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        console.log('🔗 WhiteBit з\'єднання закрито');
    }

    // ===== ФІ'ЮЧЕРСНІ МЕТОДИ (COLLATERAL TRADING) =====

    /**
     * Отримання балансу колатералу
     */
    async getCollateralBalance() {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/balance', {}, true);
            console.log('💰 WhiteBit баланс колатералу отримано');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання балансу колатералу: ${error.message}`);
        }
    }

    /**
     * Отримання інформації про колатеральні ринки
     */
    async getCollateralMarkets() {
        try {
            const response = await this.makeRequest('GET', '/public/collateral/markets');
            console.log('📊 WhiteBit колатеральні ринки отримано');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання колатеральних ринків: ${error.message}`);
        }
    }

    /**
     * Створення лімітного ордера для колатеральної торгівлі
     */
    async createCollateralLimitOrder(market, side, amount, price, options = {}) {
        try {
            const params = {
                market,
                side,
                amount: amount.toString(),
                price: price.toString(),
                ...options
            };

            const response = await this.makeRequest('POST', '/collateral-account/order', params, true);
            console.log(`📝 WhiteBit колатеральний лімітний ордер: ${side.toUpperCase()} ${amount} ${market} @ ${price}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка створення колатерального ордера: ${error.message}`);
        }
    }

    /**
     * Створення ринкового ордера для колатеральної торгівлі
     */
    async createCollateralMarketOrder(market, side, amount, options = {}) {
        try {
            const params = {
                market,
                side,
                amount: amount.toString(),
                ...options
            };

            const response = await this.makeRequest('POST', '/collateral-account/order/market', params, true);
            console.log(`📈 WhiteBit колатеральний ринковий ордер: ${side.toUpperCase()} ${amount} ${market}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка створення ринкового колатерального ордера: ${error.message}`);
        }
    }

    /**
     * Створення стоп-лімітного ордера для колатеральної торгівлі
     */
    async createCollateralStopLimitOrder(market, side, amount, price, activation_price, options = {}) {
        try {
            const params = {
                market,
                side,
                amount: amount.toString(),
                price: price.toString(),
                activation_price: activation_price.toString(),
                ...options
            };

            const response = await this.makeRequest('POST', '/collateral-account/order/stop-limit', params, true);
            console.log(`🛑 WhiteBit стоп-лімітний ордер: ${side.toUpperCase()} ${amount} ${market} @ ${price}, активація @ ${activation_price}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка створення стоп-лімітного ордера: ${error.message}`);
        }
    }

    /**
     * Отримання активних колатеральних ордерів
     */
    async getCollateralActiveOrders(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;

            const response = await this.makeRequest('POST', '/collateral-account/orders', params, true);
            console.log(`📋 WhiteBit активні колатеральні ордери отримано${market ? ` для ${market}` : ''}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання активних колатеральних ордерів: ${error.message}`);
        }
    }

    /**
     * Отримання історії колатеральних ордерів
     */
    async getCollateralOrderHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;

            const response = await this.makeRequest('POST', '/collateral-account/order/history', params, true);
            console.log(`📜 WhiteBit історія колатеральних ордерів${market ? ` для ${market}` : ''}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання історії колатеральних ордерів: ${error.message}`);
        }
    }

    /**
     * Скасування колатерального ордера
     */
    async cancelCollateralOrder(market, orderId) {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/order/cancel', {
                market,
                orderId: parseInt(orderId)
            }, true);

            console.log(`❌ WhiteBit колатеральний ордер скасовано: ${orderId}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка скасування колатерального ордера: ${error.message}`);
        }
    }

    /**
     * Отримання відкритих позицій
     */
    async getCollateralPositions(market = null) {
        try {
            const params = market ? { market } : {};
            const response = await this.makeRequest('POST', '/collateral-account/positions', params, true);
            console.log(`📊 WhiteBit відкриті позиції${market ? ` для ${market}` : ''}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання позицій: ${error.message}`);
        }
    }

    /**
     * Закриття позиції по ринковій ціні
     */
    async closeCollateralPosition(market, positionId) {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/positions/close', {
                market,
                positionId: parseInt(positionId)
            }, true);

            console.log(`🔒 WhiteBit позиція закрита: ${positionId} на ${market}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка закриття позиції: ${error.message}`);
        }
    }

    /**
     * Отримання історії виконаних угод (trades)
     */
    async getCollateralExecutedHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;

            const response = await this.makeRequest('POST', '/collateral-account/executed-history', params, true);
            console.log(`📈 WhiteBit історія виконаних колатеральних угод${market ? ` для ${market}` : ''}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання історії виконаних угод: ${error.message}`);
        }
    }

    /**
     * Встановлення/зміна левериджу для ринку
     */
    async setCollateralLeverage(market, leverage) {
        try {
            if (leverage < 1 || leverage > 125) {
                throw new Error('Leverage має бути від 1 до 125');
            }

            const response = await this.makeRequest('POST', '/collateral-account/leverage', {
                market,
                leverage: parseInt(leverage)
            }, true);

            console.log(`⚖️ WhiteBit leverage встановлено: ${leverage}x для ${market}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка встановлення leverage: ${error.message}`);
        }
    }

    /**
     * Отримання summary колатерального акаунту
     */
    async getCollateralSummary() {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/summary', {}, true);
            console.log('📊 WhiteBit summary колатерального акаунту отримано');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання summary: ${error.message}`);
        }
    }

    /**
     * Отримання комісій для колатеральної торгівлі
     */
    async getCollateralFee() {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/fee', {}, true);
            console.log('💵 WhiteBit комісії колатеральної торгівлі отримано');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання комісій: ${error.message}`);
        }
    }

    /**
     * Розрахунок ліквідаційної ціни для позиції
     */
    calculateLiquidationPrice(market, leverage, entryPrice, positionSize, side) {
        try {
            const maintenanceMarginRate = 0.005; // 0.5%

            let liquidationPrice;
            if (side.toLowerCase() === 'buy') {
                liquidationPrice = entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
            } else {
                liquidationPrice = entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
            }

            console.log(`📉 Ліквідаційна ціна для ${side} ${market} з leverage ${leverage}x: ${liquidationPrice}`);
            return liquidationPrice;
        } catch (error) {
            throw new Error(`Помилка розрахунку ліквідаційної ціни: ${error.message}`);
        }
    }

    /**
     * Розрахунок потенційного PNL (Profit and Loss)
     */
    calculatePNL(side, entryPrice, currentPrice, positionSize, leverage = 1) {
        try {
            let pnl, pnlPercent, roi;

            if (side.toLowerCase() === 'buy') {
                pnl = (currentPrice - entryPrice) * positionSize;
                pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            } else {
                pnl = (entryPrice - currentPrice) * positionSize;
                pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
            }

            roi = pnlPercent * leverage;

            const result = {
                pnl: pnl.toFixed(8),
                pnlPercent: pnlPercent.toFixed(2),
                roi: roi.toFixed(2),
                side: side,
                leverage: leverage
            };

            console.log(`💰 PNL розраховано:`, result);
            return result;
        } catch (error) {
            throw new Error(`Помилка розрахунку PNL: ${error.message}`);
        }
    }
}

module.exports = WhiteBitConnector;