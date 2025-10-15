// utils/currency.utils.js

/**
 * Розділення торгової пари на базову та котировану валюту
 */
function splitMarket(market) {
    const [base, quote] = market.split('_');
    return { base, quote };
}

/**
 * Форматування числа з обрізанням до 3 знаків після коми
 */
function formatBalance(value) {
    return Math.floor(parseFloat(value) * 1000) / 1000;
}

/**
 * Перевірка чи валідна торгова пара
 */
function isValidMarket(market) {
    return /^[A-Z]+_[A-Z]+$/.test(market);
}

/**
 * Фільтрація балансів (виключення певних монет та нульових балансів)
 */
function filterBalances(balances, excludeCoins = ['DUSDT', 'DBTC']) {
    return Object.entries(balances)
        .filter(([ticker, data]) => {
            // Виключаємо певні монети
            if (excludeCoins.includes(ticker)) {
                return false;
            }

            const available = parseFloat(data.available);
            const freeze = parseFloat(data.freeze);
            const total = available + freeze;

            return total > 0; // Показуємо тільки якщо сума більше 0
        })
        .map(([ticker, data]) => ({
            ticker: ticker,
            available: formatBalance(data.available),
            freeze: formatBalance(data.freeze)
        }));
}

module.exports = {
    splitMarket,
    formatBalance,
    isValidMarket,
    filterBalances
};