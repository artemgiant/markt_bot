// engine/risk.js
class RiskManager {
    constructor(config) {
        this.maxPositionSize = config.maxPositionSize || 1000;
        this.riskPercentage = config.riskPercentage || 2;
        this.maxDrawdown = config.maxDrawdown || 10;
        this.maxDailyLoss = config.maxDailyLoss || 5;

        this.dailyPnL = 0;
        this.totalPnL = 0;
        this.openPositions = new Map();

        // Скидання щоденної статистики
        this.resetDailyStats();
    }

    resetDailyStats() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntilReset = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            this.dailyPnL = 0;
            console.log('📊 Щоденна статистика PnL скинута');
            this.resetDailyStats();
        }, timeUntilReset);
    }

    checkPositionRisk(symbol, side, requestedQuantity) {
        // Перевірка щоденних втрат
        if (this.dailyPnL <= -this.maxDailyLoss) {
            return {
                allowed: false,
                reason: `Досягнуто ліміт щоденних втрат: ${this.maxDailyLoss}%`,
                adjustedQuantity: 0
            };
        }

        // Перевірка загального просідання
        if (this.totalPnL <= -this.maxDrawdown) {
            return {
                allowed: false,
                reason: `Досягнуто максимальне просідання: ${this.maxDrawdown}%`,
                adjustedQuantity: 0
            };
        }

        // Перевірка розміру позиції
        const existingPosition = this.openPositions.get(symbol);
        const currentSize = existingPosition ? existingPosition.size : 0;
        const newTotalSize = currentSize + requestedQuantity;

        if (newTotalSize > this.maxPositionSize) {
            const allowedQuantity = Math.max(0, this.maxPositionSize - currentSize);

            if (allowedQuantity === 0) {
                return {
                    allowed: false,
                    reason: `Досягнуто максимальний розмір позиції для ${symbol}`,
                    adjustedQuantity: 0
                };
            }

            return {
                allowed: true,
                reason: `Розмір позиції скоригований з ${requestedQuantity} до ${allowedQuantity}`,
                adjustedQuantity: allowedQuantity
            };
        }

        // Розрахунок оптимального розміру позиції на основі ризику
        const riskAdjustedQuantity = this.calculatePositionSize(requestedQuantity);

        return {
            allowed: true,
            reason: 'Позиція дозволена',
            adjustedQuantity: Math.min(requestedQuantity, riskAdjustedQuantity)
        };
    }

    calculatePositionSize(requestedQuantity) {
        // Розрахунок розміру позиції на основі відсотка ризику
        const accountBalance = 10000; // Приклад балансу, в реальності отримувати з біржі
        const riskAmount = accountBalance * (this.riskPercentage / 100);

        // Спрощений розрахунок - в реальності враховувати волатильність
        const maxQuantity = riskAmount / 100; // Приклад розрахунку

        return Math.min(requestedQuantity, maxQuantity);
    }

    updatePosition(symbol, quantity, pnl) {
        this.openPositions.set(symbol, {
            size: quantity,
            pnl: pnl
        });

        this.updatePnL(pnl);
    }

    closePosition(symbol) {
        const position = this.openPositions.get(symbol);
        if (position) {
            this.updatePnL(position.pnl);
            this.openPositions.delete(symbol);
        }
    }

    updatePnL(pnl) {
        this.dailyPnL += pnl;
        this.totalPnL += pnl;

        console.log(`💰 PnL оновлено: Щоденний: ${this.dailyPnL.toFixed(2)}%, Загальний: ${this.totalPnL.toFixed(2)}%`);
    }

    getExposure() {
        let totalExposure = 0;
        for (const position of this.openPositions.values()) {
            totalExposure += position.size;
        }
        return totalExposure;
    }

    getRiskMetrics() {
        return {
            dailyPnL: this.dailyPnL,
            totalPnL: this.totalPnL,
            openPositions: this.openPositions.size,
            totalExposure: this.getExposure(),
            riskUtilization: (this.getExposure() / this.maxPositionSize) * 100
        };
    }

    isTradeAllowed() {
        return this.dailyPnL > -this.maxDailyLoss && this.totalPnL > -this.maxDrawdown;
    }
}

module.exports = RiskManager;
