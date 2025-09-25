// strategies/spot-strategies.js
class SpotStrategies {
    constructor(whitebit, riskManager) {
        this.whitebit = whitebit;
        this.riskManager = riskManager;
        this.dcaOrders = new Map();
        this.gridOrders = new Map();
    }

    // DCA (Dollar Cost Averaging) стратегія
    async executeDCAStrategy(market, baseAmount, priceDropPercent = 5) {
        try {
            const ticker = await this.whitebit.getTickers(market);
            const currentPrice = parseFloat(ticker[market].last);

            const dcaKey = `dca_${market}`;
            const lastOrder = this.dcaOrders.get(dcaKey);

            if (!lastOrder || this.shouldTriggerDCA(currentPrice, lastOrder.price, priceDropPercent)) {
                // Купуємо на фіксовану суму
                const order = await this.whitebit.buyMarketByQuote(market, baseAmount);

                this.dcaOrders.set(dcaKey, {
                    price: currentPrice,
                    amount: baseAmount,
                    timestamp: Date.now(),
                    orderId: order.orderId
                });

                console.log(`💰 DCA: Купівля ${market} на суму ${baseAmount} USDT за ціною ${currentPrice}`);
                return order;
            }
        } catch (error) {
            console.error(`DCA помилка для ${market}:`, error.message);
        }
    }

    shouldTriggerDCA(currentPrice, lastPrice, dropPercent) {
        if (!lastPrice) return true;

        const priceChange = ((currentPrice - lastPrice) / lastPrice) * 100;
        return priceChange <= -dropPercent;
    }

    // Grid Trading стратегія
    async executeGridStrategy(market, gridLevels = 5, gridSpacing = 2) {
        try {
            const ticker = await this.whitebit.getTickers(market);
            const currentPrice = parseFloat(ticker[market].last);

            const gridKey = `grid_${market}`;

            if (!this.gridOrders.has(gridKey)) {
                await this.createGridOrders(market, currentPrice, gridLevels, gridSpacing);
            } else {
                await this.manageGridOrders(market, currentPrice);
            }
        } catch (error) {
            console.error(`Grid помилка для ${market}:`, error.message);
        }
    }

    async createGridOrders(market, centerPrice, levels, spacing) {
        const orders = [];
        const gridSize = centerPrice * (spacing / 100);

        // Створення сітки ордерів
        for (let i = 1; i <= levels; i++) {
            const buyPrice = centerPrice - (gridSize * i);
            const sellPrice = centerPrice + (gridSize * i);

            // Buy orders
            try {
                const buyOrder = await this.whitebit.createLimitOrder(
                    market, 'buy', '0.001', buyPrice
                );
                orders.push({ type: 'buy', price: buyPrice, orderId: buyOrder.orderId });
            } catch (error) {
                console.error(`Помилка створення buy ордера:`, error.message);
            }

            // Sell orders
            try {
                const sellOrder = await this.whitebit.createLimitOrder(
                    market, 'sell', '0.001', sellPrice
                );
                orders.push({ type: 'sell', price: sellPrice, orderId: sellOrder.orderId });
            } catch (error) {
                console.error(`Помилка створення sell ордера:`, error.message);
            }
        }

        this.gridOrders.set(`grid_${market}`, {
            centerPrice,
            orders,
            levels,
            spacing,
            timestamp: Date.now()
        });

        console.log(`🔷 Grid створено для ${market}: ${orders.length} ордерів`);
    }

    async manageGridOrders(market, currentPrice) {
        const gridData = this.gridOrders.get(`grid_${market}`);
        if (!gridData) return;

        // Перевіряємо виконані ордери і створюємо нові
        const activeOrders = await this.whitebit.getActiveOrders(market);
        const activeOrderIds = new Set(activeOrders.records.map(o => o.id));

        for (const order of gridData.orders) {
            if (!activeOrderIds.has(order.orderId)) {
                // Ордер виконано, створюємо новий на протилежній стороні
                console.log(`✅ Grid ордер виконано: ${order.type} за ${order.price}`);
                await this.recreateGridOrder(market, order, currentPrice, gridData);
            }
        }
    }

    async recreateGridOrder(market, executedOrder, currentPrice, gridData) {
        try {
            const gridSize = gridData.centerPrice * (gridData.spacing / 100);

            if (executedOrder.type === 'buy') {
                // Створюємо sell ордер вище поточної ціни
                const sellPrice = currentPrice + gridSize;
                const newOrder = await this.whitebit.createLimitOrder(
                    market, 'sell', '0.001', sellPrice
                );

                // Оновлюємо масив ордерів
                const orderIndex = gridData.orders.findIndex(o => o.orderId === executedOrder.orderId);
                gridData.orders[orderIndex] = {
                    type: 'sell',
                    price: sellPrice,
                    orderId: newOrder.orderId
                };
            } else {
                // Створюємо buy ордер нижче поточної ціни
                const buyPrice = currentPrice - gridSize;
                const newOrder = await this.whitebit.createLimitOrder(
                    market, 'buy', '0.001', buyPrice
                );

                const orderIndex = gridData.orders.findIndex(o => o.orderId === executedOrder.orderId);
                gridData.orders[orderIndex] = {
                    type: 'buy',
                    price: buyPrice,
                    orderId: newOrder.orderId
                };
            }
        } catch (error) {
            console.error(`Помилка відтворення grid ордера:`, error.message);
        }
    }
}

module.exports = SpotStrategies;
