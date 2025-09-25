// connectors/binance.js
const Binance = require('node-binance-api');

class BinanceConnector {
    constructor(config) {
        this.config = config;
        this.client = new Binance({
            APIKEY: config.apiKey,
            APISECRET: config.secretKey,
            test: config.testnet || false,
            verbose: false
        });

        this.connected = false;
        this.leverage = parseInt(process.env.LEVERAGE) || 10;
    }

    async testConnection() {
        try {
            await this.client.futuresTime();
            this.connected = true;
            console.log('✅ Binance з\'єднання встановлено');
        } catch (error) {
            this.connected = false;
            throw new Error(`Помилка з'єднання з Binance: ${error.message}`);
        }
    }

    isConnected() {
        return this.connected;
    }

    async getFuturesBalance() {
        try {
            const account = await this.client.futuresAccount();
            return {
                totalWalletBalance: parseFloat(account.totalWalletBalance),
                totalUnrealizedProfit: parseFloat(account.totalUnrealizedProfit),
                totalMarginBalance: parseFloat(account.totalMarginBalance),
                availableBalance: parseFloat(account.availableBalance)
            };
        } catch (error) {
            throw new Error(`Помилка отримання балансу Binance: ${error.message}`);
        }
    }

    async getPositions() {
        try {
            const positions = await this.client.futuresPositionRisk();
            return Object.values(positions).filter(pos =>
                parseFloat(pos.positionAmt) !== 0
            );
        } catch (error) {
            throw new Error(`Помилка отримання позицій: ${error.message}`);
        }
    }

    async setLeverage(symbol, leverage) {
        try {
            await this.client.futuresLeverage(symbol, leverage);
            console.log(`Кредитне плече для ${symbol} встановлено на ${leverage}x`);
        } catch (error) {
            console.error(`Помилка встановлення плеча: ${error.message}`);
        }
    }

    async marketBuy(symbol, quantity, options = {}) {
        try {
            await this.setLeverage(symbol, this.leverage);

            const order = await this.client.futuresMarketBuy(symbol, quantity, {
                newOrderRespType: 'RESULT',
                ...options
            });

            console.log(`📈 Binance LONG позиція відкрита: ${symbol} ${quantity}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка відкриття LONG позиції: ${error.message}`);
        }
    }

    async marketSell(symbol, quantity, options = {}) {
        try {
            await this.setLeverage(symbol, this.leverage);

            const order = await this.client.futuresMarketSell(symbol, quantity, {
                newOrderRespType: 'RESULT',
                ...options
            });

            console.log(`📉 Binance SHORT позиція відкрита: ${symbol} ${quantity}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка відкриття SHORT позиції: ${error.message}`);
        }
    }

    async closePosition(symbol, side, quantity) {
        try {
            let order;
            if (side === 'LONG') {
                order = await this.client.futuresMarketSell(symbol, quantity, {
                    reduceOnly: true
                });
            } else {
                order = await this.client.futuresMarketBuy(symbol, quantity, {
                    reduceOnly: true
                });
            }

            console.log(`🔒 Binance позиція закрита: ${symbol} ${side}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка закриття позиції: ${error.message}`);
        }
    }

    async setStopLoss(symbol, quantity, stopPrice, side) {
        try {
            let order;
            if (side === 'LONG') {
                order = await this.client.futuresMarketSell(symbol, quantity, {
                    type: 'STOP_MARKET',
                    stopPrice: stopPrice,
                    reduceOnly: true,
                    priceProtect: true
                });
            } else {
                order = await this.client.futuresMarketBuy(symbol, quantity, {
                    type: 'STOP_MARKET',
                    stopPrice: stopPrice,
                    reduceOnly: true,
                    priceProtect: true
                });
            }

            console.log(`🛡️ Stop Loss встановлено: ${symbol} на ${stopPrice}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка встановлення Stop Loss: ${error.message}`);
        }
    }

    async setTakeProfit(symbol, quantity, price, side) {
        try {
            let order;
            if (side === 'LONG') {
                order = await this.client.futuresSell(symbol, quantity, price, {
                    type: 'TAKE_PROFIT',
                    stopPrice: price,
                    timeInForce: 'GTC',
                    reduceOnly: true,
                    priceProtect: true
                });
            } else {
                order = await this.client.futuresBuy(symbol, quantity, price, {
                    type: 'TAKE_PROFIT',
                    stopPrice: price,
                    timeInForce: 'GTC',
                    reduceOnly: true,
                    priceProtect: true
                });
            }

            console.log(`🎯 Take Profit встановлено: ${symbol} на ${price}`);
            return order;
        } catch (error) {
            throw new Error(`Помилка встановлення Take Profit: ${error.message}`);
        }
    }

    async cancelAllOrders(symbol) {
        try {
            await this.client.futuresCancelAll(symbol);
            console.log(`❌ Всі ордери скасовано для ${symbol}`);
        } catch (error) {
            console.error(`Помилка скасування ордерів: ${error.message}`);
        }
    }

    subscribeToPriceStream(symbol, callback) {
        return this.client.websockets.futuresChart(symbol, '1m', (symbol, interval, chart) => {
            const tick = chart[Object.keys(chart).pop()];
            callback({
                symbol: symbol,
                price: parseFloat(tick.close),
                volume: parseFloat(tick.volume),
                time: tick.time
            });
        });
    }
}

module.exports = BinanceConnector;
