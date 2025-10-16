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
        this.lastNonce = Date.now();
    }

    // ================================================
    // БАЗОВІ МЕТОДИ
    // ================================================

    generateNonce() {
        const now = Date.now();
        if (now <= this.lastNonce) {
            this.lastNonce = this.lastNonce + 1;
        } else {
            this.lastNonce = now;
        }
        return this.lastNonce;
    }

    async makeRequest(method, endpoint, params = {}, isPrivate = false) {
        try {
            const url = `${this.baseURL}/api/v4${endpoint}`;
            const config = { method, url, headers: {} };

            if (isPrivate) {
                const nonce = this.generateNonce();
                const requestBody = {
                    request: `/api/v4${endpoint}`,
                    nonce: nonce,
                    nonceWindow: true,
                    ...params
                };

                const payload = Buffer.from(JSON.stringify(requestBody)).toString('base64');
                const hash = crypto.createHmac("sha512", this.config.secretKey);
                const signature = hash.update(payload).digest("hex");

                config.headers['Content-Type'] = "application/json";
                config.headers['X-TXC-APIKEY'] = this.config.apiKey;
                config.headers['X-TXC-PAYLOAD'] = payload;
                config.headers['X-TXC-SIGNATURE'] = signature;
                config.data = requestBody;
            } else {
                if (method === 'GET') {
                    config.params = params;
                } else {
                    config.data = params;
                }
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {

            const errorMessage = error.response?.data?.message || error.response?.data?.errors || error.message;
            throw new Error(`WhiteBit API помилка: ${errorMessage}`);
        }
    }

    async testConnection() {
        try {
            if (!this.config.apiKey || !this.config.secretKey) {
                throw new Error('API ключі не налаштовані');
            }
            await this.makeRequest('GET', '/public/ping');
            this.connected = true;
            await this.getSpotBalance();
            return true;
        } catch (error) {
            this.connected = false;
            throw new Error(`Помилка підключення до WhiteBit: ${error.message}`);
        }
    }

    isConnected() {
        return this.connected;
    }

    // ================================================
    // ПУБЛІЧНІ МЕТОДИ
    // ================================================

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
            throw new Error(`Помилка отримання тікерів: ${error.message}`);
        }
    }

    async getOrderBook(market, limit = 100, level = 0) {
        try {
            const params = { market, limit, level };
            const response = await this.makeRequest('GET', '/public/orderbook', params);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання книги ордерів: ${error.message}`);
        }
    }

    async getServerTime() {
        try {
            const response = await this.makeRequest('GET', '/public/time');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання часу сервера: ${error.message}`);
        }
    }

    // ================================================
    // SPOT - Баланси
    // ================================================

    async getSpotBalance() {
        try {
            const response = await this.makeRequest('POST', '/trade-account/balance', {}, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання спот балансу: ${error.message}`);
        }
    }

    async getSpotTradeHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;
            const response = await this.makeRequest('POST', '/trade-account/executed-history', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання історії спот торгів: ${error.message}`);
        }
    }

    // ================================================
    // SPOT - Ордери
    // ================================================

    async createSpotLimitOrder(market, side, amount, price, options = {}) {
        try {
            const params = {
                market,
                side,
                amount: amount.toString(),
                price: price.toString(),
                ...options
            };
            const response = await this.makeRequest('POST', '/order/new', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка створення спот лімітного ордера: ${error.message}`);
        }
    }

    async createSpotMarketOrder(market, side, amount, options = {}) {
        try {
            const params = {
                market,
                side,
                amount: amount.toString(),
                ...options
            };
            const response = await this.makeRequest('POST', '/order/market', params, true);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async buySpotMarketByQuote(market, quoteAmount, options = {}) {
        try {
            const params = {
                market,
                side: 'buy',
                quoteAmount: quoteAmount.toString(),
                ...options
            };
            const response = await this.makeRequest('POST', '/order/stock_market', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка спот купівлі за сумою: ${error.message}`);
        }
    }

    async getSpotActiveOrders(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;
            const response = await this.makeRequest('POST', '/orders', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання активних спот ордерів: ${error.message}`);
        }
    }

    async getSpotOrderHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;
            const response = await this.makeRequest('POST', '/order/history', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання історії спот ордерів: ${error.message}`);
        }
    }

    async cancelSpotOrder(market, orderId) {
        try {
            const response = await this.makeRequest('POST', '/order/cancel', {
                market,
                orderId: parseInt(orderId)
            }, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка скасування спот ордера: ${error.message}`);
        }
    }

    async cancelAllSpotOrders(market = null) {
        try {
            const params = market ? { market } : {};
            const response = await this.makeRequest('POST', '/order/cancel/all', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка скасування всіх спот ордерів: ${error.message}`);
        }
    }

    // ================================================
    // FUTURES - Баланси та позиції
    // ================================================

    async getCollateralBalance() {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/balance', {}, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання ф'ючерсного балансу: ${error.message}`);
        }
    }

    async getCollateralMarkets() {
        try {
            const response = await this.makeRequest('GET', '/public/collateral/markets');
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання ф'ючерсних ринків: ${error.message}`);
        }
    }

    async getCollateralPositions(market = null) {
        try {
            const params = market ? { market } : {};
            const response = await this.makeRequest('POST', '/collateral-account/positions', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання ф'ючерсних позицій: ${error.message}`);
        }
    }

    async getCollateralFee() {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/fee', {}, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання ф'ючерсних комісій: ${error.message}`);
        }
    }

    async getCollateralExecutedHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;
            const response = await this.makeRequest('POST', '/collateral-account/executed-history', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання історії ф'ючерсних угод: ${error.message}`);
        }
    }

    // ================================================
    // FUTURES - Управління позиціями
    // ================================================

    async closeCollateralPosition(market, positionId) {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/positions/close', {
                market,
                positionId: parseInt(positionId)
            }, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка закриття ф'ючерсної позиції: ${error.message}`);
        }
    }

    calculateLiquidationPrice(side, entryPrice, positionSize, leverage = 1, maintenanceMarginRate = 0.005) {
        try {
            let liquidationPrice;
            const marginAmount = (entryPrice * positionSize) / leverage;

            if (side.toLowerCase() === 'buy') {
                liquidationPrice = entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
            } else {
                liquidationPrice = entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
            }

            return {
                liquidationPrice: liquidationPrice.toFixed(8),
                entryPrice: entryPrice,
                leverage: leverage,
                side: side,
                positionSize: positionSize,
                marginAmount: marginAmount.toFixed(8),
                maintenanceMarginRate: maintenanceMarginRate
            };
        } catch (error) {
            throw new Error(`Помилка розрахунку ліквідаційної ціни: ${error.message}`);
        }
    }

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

            return {
                pnl: pnl.toFixed(8),
                pnlPercent: pnlPercent.toFixed(2),
                roi: roi.toFixed(2),
                side: side,
                leverage: leverage
            };
        } catch (error) {
            throw new Error(`Помилка розрахунку PNL: ${error.message}`);
        }
    }

    // ================================================
    // FUTURES - Ордери
    // ================================================

    async createCollateralLimitOrder(market, side, amount, price, options = {}) {
        try {
            const params = {
                market,
                side, // 'buy' or 'sell'
                amount: amount.toString(), // amount of stock currency
                price: price.toString()
            };

            // Додаткові опціональні параметри
            if (options.clientOrderId) params.clientOrderId = options.clientOrderId;
            if (options.postOnly !== undefined) params.postOnly = options.postOnly;
            if (options.stopLoss) params.stopLoss = options.stopLoss.toString();
            if (options.takeProfit) params.takeProfit = options.takeProfit.toString();
            if (options.stp) params.stp = options.stp; // 'no' / 'cancel_both' / 'cancel_new' / 'cancel_old'
            if (options.positionSide) params.positionSide = options.positionSide; // 'LONG' / 'SHORT' / 'BOTH'

            const response = await this.makeRequest('POST', '/order/collateral/limit', params, true);
            console.log(`📝 WhiteBit ф'ючерсний лімітний ордер: ${side.toUpperCase()} ${amount} ${market} @ ${price}`);
            return response;
        } catch (error) {
            throw new Error(`Помилка створення ф'ючерсного лімітного ордера: ${error.message}`);
        }
    }

    async createCollateralMarketOrder(market, side, amount, options = {}) {
        try {
            const params = {
                market,
                side, // 'buy' or 'sell'
                amount: amount.toString() // amount of stock currency
            };

            // Додаткові опціональні параметри згідно API v4 документації
            if (options.clientOrderId) params.clientOrderId = options.clientOrderId;
            if (options.stopLoss) params.stopLoss = options.stopLoss.toString();
            if (options.takeProfit) params.takeProfit = options.takeProfit.toString();
            if (options.stp) params.stp = options.stp; // 'no' / 'cancel_both' / 'cancel_new' / 'cancel_old'
            if (options.positionSide) params.positionSide = options.positionSide; // 'LONG' / 'SHORT' / 'BOTH'


            const response = await this.makeRequest('POST', '/order/collateral/market', params, true);

            console.log(response)

            return response;

        } catch (error) {
            console.error('Full error:', JSON.stringify(error.response?.data || error, null, 2));

            const apiError = error.response?.data;
            const details = apiError ?
                `\nCode: ${apiError.code}\nMessage: ${apiError.message}\nErrors: ${JSON.stringify(apiError.errors)}` :
                '';

            throw new Error(`Помилка створення ф'ючерсного ринкового ордера: ${error.message}${details}`);
        }
    }

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
            return response;
        } catch (error) {
            throw new Error(`Помилка створення ф'ючерсного стоп-лімітного ордера: ${error.message}`);
        }
    }

    async getCollateralActiveOrders(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;
            const response = await this.makeRequest('POST', '/collateral-account/orders', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання активних ф'ючерсних ордерів: ${error.message}`);
        }
    }

    async getCollateralOrderHistory(market = null, limit = 50, offset = 0) {
        try {
            const params = { limit, offset };
            if (market) params.market = market;
            const response = await this.makeRequest('POST', '/collateral-account/order/history', params, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка отримання історії ф'ючерсних ордерів: ${error.message}`);
        }
    }

    async cancelCollateralOrder(market, orderId) {
        try {
            const response = await this.makeRequest('POST', '/collateral-account/order/cancel', {
                market,
                orderId: parseInt(orderId)
            }, true);
            return response;
        } catch (error) {
            throw new Error(`Помилка скасування ф'ючерсного ордера: ${error.message}`);
        }
    }

    // ================================================
    // WEBSOCKET
    // ================================================

    connectWebSocket() {
        this.ws = new WebSocket(this.wsURL);

        this.ws.on('open', () => {
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
            this.connected = false;
            setTimeout(() => {
                if (!this.connected) {
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
    }

    disconnect() {
        this.unsubscribeAll();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

module.exports = WhiteBitConnector;