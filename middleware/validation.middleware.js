// middleware/validation.middleware.js

/**
 * Валідація body для створення ордера
 */
function validateOrderCreation(req, res, next) {
    const { market, side, amount } = req.body;

    if (!market) {
        return res.status(400).json({
            success: false,
            error: 'market is required'
        });
    }

    if (!side || !['buy', 'sell'].includes(side)) {
        return res.status(400).json({
            success: false,
            error: 'side must be "buy" or "sell"'
        });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            error: 'amount must be a positive number'
        });
    }

    next();
}

/**
 * Валідація body для скасування ордера
 */
function validateOrderCancellation(req, res, next) {
    const { market, orderId } = req.body;

    if (!market) {
        return res.status(400).json({
            success: false,
            error: 'market is required'
        });
    }

    if (!orderId) {
        return res.status(400).json({
            success: false,
            error: 'orderId is required'
        });
    }

    next();
}

/**
 * Валідація параметра exchange
 */
function validateExchange(req, res, next) {
    const { exchange } = req.params;

    if (!exchange) {
        return res.status(400).json({
            success: false,
            error: 'exchange parameter is required'
        });
    }

    // Можна додати перевірку чи підтримується біржа
    const supportedExchanges = ['whitebit', 'binance', 'okx']; // приклад
    if (!supportedExchanges.includes(exchange.toLowerCase())) {
        return res.status(400).json({
            success: false,
            error: `Exchange ${exchange} is not supported`
        });
    }

    next();
}

module.exports = {
    validateOrderCreation,
    validateOrderCancellation,
    validateExchange
};