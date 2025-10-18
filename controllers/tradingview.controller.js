// controllers/tradingview.controller.js
const TradingViewConnector = require('../connectors/trading_view');
const { getCurrentISODate } = require('../utils');

class TradingViewController {
    constructor(services) {
        this.tradingService = services.trading;
        this.loggingService = services.logging;
    }

    /**
     * ============================================
     * ПУБЛІЧНІ МЕТОДИ - Entry Points
     * ============================================
     */

    /**
     * Обробка SPOT вебхука від TradingView
     * POST /api/trading_view/spot
     */
    async handleSpotWebhook(req, res) {
        try {
            console.log('📊 Отримано SPOT запит від TradingView');
            console.log('Method:', req.method);
            console.log('Body:', req.body);

            // Базова валідація
            this._validateBaseRequest(req);

            // Перевірка підключення до БД (тільки для spot)
            this._validateDatabaseConnection(req);

            // Форматування даних запиту для логування
            const logData = TradingViewConnector.formatLogEntry(req, {
                route: '/api/trading_view/spot',
                type: 'spot_signal'
            });

            // Логування запиту в файл
            await this.loggingService.logToFile(logData, 'trading_view_logs');

            // Обробка сигналу через сервіс
            const result = await this.tradingService.processTradingViewSignal(req.body);

            // Логування основного запиту в БД
            await this.loggingService.logInfo(
                'trading_view_spot',
                `TradingView SPOT ${result.signal.action} signal for ${result.signal.coinCode}`,
                {
                    signal: result.signal,
                    order: result.order,
                    orderError: result.error,
                    amount: 6,
                    request: {
                        method: req.method,
                        url: req.url,
                        body: req.body,
                        query: req.query,
                        ip: req.ip,
                        headers: {
                            'content-type': req.headers['content-type'],
                            'user-agent': req.headers['user-agent']
                        }
                    },
                    timestamp: getCurrentISODate()
                },
                false // Не логуємо в файл, вже залогували вище
            );

            // Відправка відповіді
            this._sendResponse(res, {
                success: result.success,
                message: result.order
                    ? 'Order created and logged successfully'
                    : 'Signal received but order failed',
                data: {
                    signal: result.signal,
                    order: result.order,
                    error: result.error,
                    logged: {
                        file: true,
                        database: true
                    }
                }
            });

        } catch (error) {
            this._handleError(res, error, req);
        }
    }

    /**
     * Обробка FUTURES вебхука від TradingView
     * POST /api/trading_view/futures
     */
    async handleFuturesWebhook(req, res) {
        try {
            console.log('📊 Отримано FUTURES запит від TradingView');
            console.log('Method:', req.method);
            console.log('Body:', req.body);

            // Базова валідація
            this._validateBaseRequest(req);

            // Специфічна валідація для futures (поки пуста)
            this._validateFuturesRequirements(req);

            // Форматування даних запиту для логування
            const logData = TradingViewConnector.formatLogEntryFutures(req, {
                route: '/api/trading_view/futures',
                type: 'futures_signal'
            });

            // Логування запиту в файл
            await this.loggingService.logToFile(logData, 'trading_view_logs');

            // Обробка futures сигналу через сервіс
            const result = await this.tradingService.processFuturesSignal(req.body);

            // Логування основного запиту в БД (в ту саму таблицю system_logs)
            await this.loggingService.logInfo(
                'trading_view_futures',
                `TradingView FUTURES ${result.signal.action}-${result.signal.positionType} signal for ${result.signal.coinCode}`,
                {
                    signal: result.signal,
                    request: {
                        method: req.method,
                        url: req.url,
                        body: req.body,
                        query: req.query,
                        ip: req.ip,
                        headers: {
                            'content-type': req.headers['content-type'],
                            'user-agent': req.headers['user-agent']
                        }
                    },
                    timestamp: getCurrentISODate()
                },
                false // Не логуємо в файл, вже залогували вище
            );

            // Відправка відповіді
            this._sendResponse(res, {
                success: result.success,
                message: 'Futures signal received and logged',
                data: {
                    signal: result.signal,
                    logged: {
                        file: true,
                        database: true
                    }
                }
            });

        } catch (error) {
            this._handleError(res, error, req);
        }
    }

    /**
     * ============================================
     * ПРИВАТНІ МЕТОДИ - Helpers (Варіант B)
     * ============================================
     */

    /**
     * Базова валідація запиту
     * Перевіряє наявність та коректність req.body
     */
    _validateBaseRequest(req) {
        if (!req.body) {
            throw new Error('Request body is missing');
        }

        const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

        if (!bodyString || bodyString.trim() === '' || bodyString === '{}') {
            throw new Error('Request body is empty');
        }
    }

    /**
     * Валідація підключення до бази даних
     * Використовується тільки для SPOT сигналів
     */
    _validateDatabaseConnection(req) {
        if (!req.app.locals.db) {
            console.error('❌ Database connection is not initialized');
            throw new Error('Database not available');
        }
    }

    /**
     * Специфічна валідація для FUTURES
     * На даному етапі - порожня, залишена для майбутніх розширень
     */
    _validateFuturesRequirements(req) {
        // Поки що немає специфічних вимог для futures
        // Метод залишений для можливості додавання перевірок в майбутньому
    }

    /**
     * Відправка успішної відповіді клієнту
     */
    _sendResponse(res, result) {
        res.json({
            success: result.success,
            status: result.success ? 'ok' : 'error',
            message: result.message,
            data: result.data
        });
    }

    /**
     * Обробка помилок та відправка відповіді
     */
    async _handleError(res, error, req) {
        console.error('❌ Помилка обробки запиту:', error.message);

        // Логування помилки
        try {
            await this.loggingService.logError(
                'tradingview_webhook_error',
                error.message,
                {
                    stack: error.stack,
                    request: {
                        method: req.method,
                        url: req.url,
                        body: req.body,
                        query: req.query,
                        ip: req.ip
                    },
                    timestamp: getCurrentISODate()
                }
            );
        } catch (logError) {
            console.error('❌ Помилка логування:', logError.message);
        }

        res.status(400).json({
            success: false,
            status: 'error',
            error: error.message
        });
    }
}

module.exports = TradingViewController;