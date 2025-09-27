// engine/risk.js - Простий менеджер ризиків
class RiskManager {
    constructor(config) {
        this.maxPositionSize = config.maxPositionSize || 1000;
        this.riskPercentage = config.riskPercentage || 2;
        this.maxDailyLoss = config.maxDailyLoss || 5000;
        this.dailyLoss = 0;
        this.totalTrades = 0;
        this.successfulTrades = 0;

        // Скидання щоденної статистики о півночі
        this.resetDailyStats();
    }

    // Перевірка чи можемо розмістити ордер
    canPlaceOrder(orderAmount, currentBalance) {
        // Перевірка максимального розміру позиції
        if (orderAmount > this.maxPositionSize) {
            console.log(`⚠️ Розмір ордера (${orderAmount}) перевищує максимум (${this.maxPositionSize})`);
            return false;
        }

        // Перевірка достатності балансу
        if (orderAmount > currentBalance * 0.95) {
            console.log(`⚠️ Недостатньо коштів для ордера (${orderAmount})`);
            return false;
        }

        // Перевірка щоденних збитків
        if (this.dailyLoss >= this.maxDailyLoss) {
            console.log(`⚠️ Досягнуто максимум щоденних збитків (${this.maxDailyLoss})`);
            return false;
        }

        return true;
    }

    // Розрахунок розміру позиції на основі ризику
    calculatePositionSize(balance, entryPrice, stopLoss) {
        if (!stopLoss || stopLoss <= 0) {
            // Якщо немає стоп-лосса, використовуємо фіксований відсоток від балансу
            return Math.min(balance * (this.riskPercentage / 100), this.maxPositionSize);
        }

        const riskAmount = balance * (this.riskPercentage / 100);
        const priceRisk = Math.abs(entryPrice - stopLoss) / entryPrice;
        const positionSize = riskAmount / priceRisk;

        return Math.min(positionSize, this.maxPositionSize);
    }

    // Реєстрація торгівлі
    registerTrade(profit, loss = 0) {
        this.totalTrades++;

        if (profit > 0) {
            this.successfulTrades++;
            console.log(`✅ Прибуткова торгівля: +${profit.toFixed(2)} USDT`);
        } else if (loss > 0) {
            this.dailyLoss += loss;
            console.log(`❌ Збиткова торгівля: -${loss.toFixed(2)} USDT`);
        }

        this.logStatistics();
    }

    // Отримання статистики успішності
    getSuccessRate() {
        if (this.totalTrades === 0) return 0;
        return (this.successfulTrades / this.totalTrades) * 100;
    }

    // Перевірка чи потрібно зменшити ризик
    shouldReduceRisk() {
        const successRate = this.getSuccessRate();

        // Зменшуємо ризик якщо успішність нижче 40%
        if (this.totalTrades >= 10 && successRate < 40) {
            return true;
        }

        // Зменшуємо ризик якщо втратили більше 70% від максимальних щоденних збитків
        if (this.dailyLoss > this.maxDailyLoss * 0.7) {
            return true;
        }

        return false;
    }

    // Отримання поточних налаштувань ризику
    getRiskSettings() {
        return {
            maxPositionSize: this.maxPositionSize,
            riskPercentage: this.riskPercentage,
            maxDailyLoss: this.maxDailyLoss,
            dailyLoss: this.dailyLoss,
            remainingDailyRisk: Math.max(0, this.maxDailyLoss - this.dailyLoss),
            successRate: this.getSuccessRate(),
            totalTrades: this.totalTrades,
            shouldReduceRisk: this.shouldReduceRisk()
        };
    }

    // Оновлення налаштувань ризику
    updateRiskSettings(newSettings) {
        if (newSettings.maxPositionSize) {
            this.maxPositionSize = newSettings.maxPositionSize;
        }
        if (newSettings.riskPercentage) {
            this.riskPercentage = Math.min(newSettings.riskPercentage, 10); // Максимум 10%
        }
        if (newSettings.maxDailyLoss) {
            this.maxDailyLoss = newSettings.maxDailyLoss;
        }

        console.log('✅ Налаштування ризику оновлено:', this.getRiskSettings());
    }

    // Логування поточної статистики
    logStatistics() {
        const stats = this.getRiskSettings();
        console.log(`📊 Статистика ризиків: Успішність ${stats.successRate.toFixed(1)}%, Торгівель: ${stats.totalTrades}, Залишок лімітів: ${stats.remainingDailyRisk.toFixed(2)} USDT`);
    }

    // Скидання щоденної статистики
    resetDailyStats() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const millisecondsUntilMidnight = tomorrow.getTime() - now.getTime();

        // setTimeout(() => {
        //     this.dailyLoss = 0;
        //     console.log('🔄 Щоденна статистика збитків скинута');
        //
        //     // Встановлюємо наступний скид
        //     this.resetDailyStats();
        // }, millisecondsUntilMidnight);
    }

    // Перевірка на досягнення лімітів
    checkLimits(orderAmount, currentProfit = 0) {
        const warnings = [];

        if (orderAmount > this.maxPositionSize * 0.8) {
            warnings.push('Розмір ордера близький до максимального');
        }

        if (this.dailyLoss > this.maxDailyLoss * 0.8) {
            warnings.push('Щоденні збитки близькі до ліміту');
        }

        const successRate = this.getSuccessRate();
        if (this.totalTrades >= 5 && successRate < 50) {
            warnings.push(`Низька успішність торгівлі: ${successRate.toFixed(1)}%`);
        }

        return warnings;
    }
}

module.exports = RiskManager;