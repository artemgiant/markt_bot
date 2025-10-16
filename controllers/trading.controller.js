// controllers/trading.controller.js

class TradingController {
    constructor(services) {
        this.tradingService = services.trading;
        this.exchangeService = services.exchange;
    }

    /**
     * Створення ордера
     */
    async createOrder(req, res) {
        try {
            const { exchange, market, side, amount, price, type = 'limit' } = req.body;

            const order = await this.tradingService.createOrder({
                exchange,
                market,
                side,
                amount,
                price,
                type
            });

            res.json({
                success: true,
                order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Скасування ордера
     */
    async cancelOrder(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, orderId } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const result = await connector.cancelCollateralOrder(market, orderId);

            res.json({
                success: true,
                message: 'Ордер скасовано',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання активних ордерів
     */
    async getActiveOrders(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, limit = 50, offset = 0 } = req.query;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const orders = await connector.getCollateralActiveOrders(
                market,
                parseInt(limit),
                parseInt(offset)
            );

            res.json({
                success: true,
                data: orders,
                count: Array.isArray(orders) ? orders.length : 0
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання історії ордерів
     */
    async getOrderHistory(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, limit = 50, offset = 0 } = req.query;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const orders = await connector.getCollateralOrderHistory(
                market,
                parseInt(limit),
                parseInt(offset)
            );

            res.json({
                success: true,
                data: orders,
                count: Array.isArray(orders) ? orders.length : 0
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання історії угод
     */
    async getTradeHistory(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, limit = 50, offset = 0 } = req.query;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const trades = await connector.getCollateralExecutedHistory(
                market,
                parseInt(limit),
                parseInt(offset)
            );

            res.json({
                success: true,
                data: trades,
                count: Array.isArray(trades) ? trades.length : 0
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання статистики угод
     */
    async getTradeStats(req, res) {
        try {
            const filters = {
                exchange: req.query.exchange,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            const stats = await this.tradingService.getTradeStats(filters);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ===== ФІ'ЮЧЕРСНІ МЕТОДИ =====

    /**
     * Отримати ф'ючерсні ринки
     */
    async getMarkets(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const connector = this.exchangeService.getConnector(exchange);

            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const markets = await connector.getCollateralMarkets();

            res.json({
                success: true,
                data: markets
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримати баланс колатералу
     */
    async getBalance(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const connector = this.exchangeService.getConnector(exchange);

            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const balance = await connector.getCollateralBalance();

            res.json({
                success: true,
                data: balance
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримати summary колатерального акаунту
     */
    async getSummary(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const connector = this.exchangeService.getConnector(exchange);

            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const summary = await connector.getCollateralSummary();

            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримати комісії
     */
    async getFee(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const connector = this.exchangeService.getConnector(exchange);

            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const fee = await connector.getCollateralFee();

            res.json({
                success: true,
                data: fee
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримати відкриті позиції
     */
    async getPositions(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market } = req.query;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            const positions = await connector.getCollateralPositions(market);

            res.json({
                success: true,
                data: positions,
                count: Array.isArray(positions) ? positions.length : 0
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Закрити позицію
     */
    async closePosition(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, positionId } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!market || !positionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: market, positionId'
                });
            }

            const result = await connector.closeCollateralPosition(market, positionId);

            res.json({
                success: true,
                message: 'Позиція закрита',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Створити лімітний ордер
     */
    async createLimitOrder(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, side, amount, price, clientOrderId, postOnly } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!market || !side || !amount || !price) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: market, side, amount, price'
                });
            }

            const options = {};
            if (clientOrderId) options.clientOrderId = clientOrderId;
            if (postOnly !== undefined) options.postOnly = postOnly;

            const order = await connector.createCollateralLimitOrder(
                market,
                side,
                amount,
                price,
                options
            );

            res.json({
                success: true,
                message: 'Лімітний ордер створено',
                data: order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Створити ринковий ордер
     */
    async createMarketOrder(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, side, amount, clientOrderId, positionSide } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!market || !side || !amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: market, side, amount'
                });
            }

            const options = {};
            if (clientOrderId) options.clientOrderId = clientOrderId;
            if (positionSide) options.positionSide = positionSide;

            const order = await connector.createCollateralMarketOrder(
                market,
                side,
                amount,
                options
            );

            res.json({
                success: true,
                message: 'Ринковий ордер створено',
                data: order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Створити стоп-лімітний ордер
     */
    async createStopLimitOrder(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, side, amount, price, activation_price, clientOrderId } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!market || !side || !amount || !price || !activation_price) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: market, side, amount, price, activation_price'
                });
            }

            const options = {};
            if (clientOrderId) options.clientOrderId = clientOrderId;

            const order = await connector.createCollateralStopLimitOrder(
                market,
                side,
                amount,
                price,
                activation_price,
                options
            );

            res.json({
                success: true,
                message: 'Стоп-лімітний ордер створено',
                data: order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Встановити leverage
     */
    async setLeverage(req, res) {
        try {
            const exchange = req.params.exchange || 'whitebit';
            const { market, leverage } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!market || !leverage) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: market, leverage'
                });
            }

            if (leverage < 1 || leverage > 125) {
                return res.status(400).json({
                    success: false,
                    error: 'Leverage має бути від 1 до 125'
                });
            }

            const result = await connector.setCollateralLeverage(market, parseInt(leverage));

            res.json({
                success: true,
                message: `Leverage встановлено: ${leverage}x для ${market}`,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Розрахувати ліквідаційну ціну
     */
    async calculateLiquidationPrice(req, res) {
        try {
            const exchange = 'whitebit'; // За замовчуванням
            const { market, leverage, entryPrice, positionSize, side } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!market || !leverage || !entryPrice || !positionSize || !side) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: market, leverage, entryPrice, positionSize, side'
                });
            }

            const liquidationPrice = connector.calculateLiquidationPrice(
                market,
                parseInt(leverage),
                parseFloat(entryPrice),
                parseFloat(positionSize),
                side
            );

            res.json({
                success: true,
                data: {
                    market,
                    leverage,
                    entryPrice: parseFloat(entryPrice),
                    positionSize: parseFloat(positionSize),
                    side,
                    liquidationPrice: liquidationPrice
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Розрахувати PNL
     */
    async calculatePNL(req, res) {
        try {
            const exchange = 'whitebit'; // За замовчуванням
            const { side, entryPrice, currentPrice, positionSize, leverage = 1 } = req.body;

            const connector = this.exchangeService.getConnector(exchange);
            if (!connector) {
                return res.status(400).json({
                    success: false,
                    error: `${exchange} не підключено`
                });
            }

            if (!side || !entryPrice || !currentPrice || !positionSize) {
                return res.status(400).json({
                    success: false,
                    error: 'Потрібні параметри: side, entryPrice, currentPrice, positionSize'
                });
            }

            const pnl = connector.calculatePNL(
                side,
                parseFloat(entryPrice),
                parseFloat(currentPrice),
                parseFloat(positionSize),
                parseInt(leverage)
            );

            res.json({
                success: true,
                data: pnl
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = TradingController;