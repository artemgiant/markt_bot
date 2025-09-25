// connectors/mexc.js
const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');

class MEXCConnector {
    constructor(config) {
        this.config = config;
        this.baseURL = 'https://contract.mexc.com';
        this.wsURL = 'wss://contract.mexc.com/ws';
        this.connected = false;
        this.ws = null;
    }

    generateSignature(params, timestamp) {
        const queryString = new URLSearchParams(params).toString();
        const signaturePayload = `${queryString}&timestamp=${timestamp}`;
        return crypto
            .createHmac('sha256', this.config.secretKey)
            .update(signaturePayload)
            .digest('hex');
    }

    async makeRequest(method, endpoint, params = {}) {
        try {
            const timestamp = Date.now();
            const signature = this.generateSignature(params, timestamp);

            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'X-MEXC-APIKEY': this.config.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            if (method === 'GET') {
                config.params = { ...params, timestamp, signature };
            } else {
                config.data = { ...params, timestamp, signature };
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            throw new Error(`MEXC API помилка: ${error.response?.data?.msg || error.message}`);
        }
    }

    async testConnection() {
        try {
            await this.makeRequest('GET', '/api/v1/contract/ping');
            this.connected = true;
            console.log('✅ MEXC з\'єднання встановлено');
        } catch (error) {
            this.connected = false;
            throw new Error(`Помилка з'єднання з MEXC: ${error.message}`);
        }
    }

    isConnected() {
        return this.connected;
    }

    async getFuturesBalance() {
        try {
            const response = await this.makeRequest('GET', '/api/v1/private/account/assets');
            return {
                totalWalletBalance: parseFloat(response.data.accountEquity),
                totalUnrealizedProfit: parseFloat(response.data.unrealizedPnl),
                availableBalance: parseFloat(response.data.availableBalance)
            };
        } catch (error) {
            throw new Error(`Помилка отримання балансу MEXC: ${error.message}`);
        }
    }

    async getPositions() {
        try {
            const response = await this.makeRequest('GET', '/api/v1/private/position/list/all');
            return response.data.filter(pos => parseFloat(pos.positionSize) !== 0);
        } catch (error) {
            throw new Error(`Помилка отримання позицій: ${error.message}`);
        }
    }

    async setLeverage(symbol, leverage) {
        try {
            await this.makeRequest('POST', '/api/v1/private/position/change_leverage', {
                symbol,
                leverage,
                openType: 2 // Cross margin
            });
            console.log(`Кредитне плече для ${symbol} встановлено на ${leverage}x`);
        } catch (error) {
            console.error(`Помилка встановлення плеча: ${error.message}`);
        }
    }

    async marketBuy(symbol, quantity) {
        try {
            const order = await this.makeRequest('POST', '/api/v1/private/order/submit', {
                symbol,
                side: 1, // Buy
                type: 5, // Market
                vol: quantity
            });

            console.log(`📈 MEXC LONG позиція відкрита: ${symbol} ${quantity}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка відкриття LONG позиції: ${error.message}`);
        }
    }

    async marketSell(symbol, quantity) {
        try {
            const order = await this.makeRequest('POST', '/api/v1/private/order/submit', {
                symbol,
                side: 2, // Sell
                type: 5, // Market
                vol: quantity
            });

            console.log(`📉 MEXC SHORT позиція відкрита: ${symbol} ${quantity}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка відкриття SHORT позиції: ${error.message}`);
        }
    }

    async closePosition(symbol, side, quantity) {
        try {
            const order = await this.makeRequest('POST', '/api/v1/private/order/submit', {
                symbol,
                side: side === 'LONG' ? 2 : 1, // Opposite side to close
                type: 5, // Market
                vol: quantity,
                reduceOnly: true
            });

            console.log(`🔒 MEXC позиція закрита: ${symbol} ${side}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка закриття позиції: ${error.message}`);
        }
    }

    connectWebSocket() {
        this.ws = new WebSocket(this.wsURL);

        this.ws.on('open', () => {
            console.log('📡 MEXC WebSocket з\'єднання встановлено');
        });

        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            this.handleWebSocketMessage(message);
        });

        this.ws.on('close', () => {
            console.log('📡 MEXC WebSocket з\'єднання закрито');
            setTimeout(() => this.connectWebSocket(), 5000);
        });

        this.ws.on('error', (error) => {
            console.error('MEXC WebSocket помилка:', error);
        });
    }

    subscribeToPriceStream(symbol, callback) {
        if (!this.ws) {
            this.connectWebSocket();
        }

        const subscribeMessage = {
            method: 'sub.ticker',
            param: {
                symbol: symbol
            }
        };

        this.ws.send(JSON.stringify(subscribeMessage));
        this.priceCallback = callback;
    }

    handleWebSocketMessage(message) {
        if (message.channel === 'push.ticker' && this.priceCallback) {
            this.priceCallback({
                symbol: message.symbol,
                price: parseFloat(message.data.lastPrice),
                volume: parseFloat(message.data.volume24),
                time: message.ts
            });
        }
    }
}

module.exports = MEXCConnector;
