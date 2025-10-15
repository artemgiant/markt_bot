// controllers/tradingview.controller.js
const TradingViewConnector = require('../connectors/trading_view');
const { getCurrentISODate } = require('../utils');

class TradingViewController {
    constructor(services) {
        this.tradingService = services.trading;
        this.loggingService = services.logging;
    }

    /**
     * Обробка вебхука від TradingView
     */
    async handleWebhook(req, res) {
        try {
            console.log('📊 Отримано запит від TradingView');
            console.log('Method:', req.method);
            console.log('Body:', req.body);
            console.log('Query:', req.query);

            // Перевірка підключення до БД
            if (!req.app.locals.db) {
                console.error('❌ Database connection is not initialized');
                return res.status(500).json({
                    success: false,
                    error: 'Database not available'
                });
            }

            // Форматування даних запиту для логування
            const logData = TradingViewConnector.formatLogEntry(req, {
                route: '/api/trading_view',
                type: 'trading_view_request'
            });

            // Логування запиту в файл
            await this.loggingService.logToFile(logData, 'trading_view_logs');

            // Обробка сигналу через сервіс
            const result = await this.tradingService.processTradingViewSignal(req.body);

            // Логування основного запиту в БД
            await this.loggingService.logInfo(
                'trading_view',
                `TradingView ${result.signal.action} signal for ${result.signal.coinCode}`,
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

            // Відповідь клієнту
            res.json({
                success: result.success,
                status: result.success ? 'success' : 'failed',
                message: result.order
                    ? 'Order created and logged successfully'
                    : 'Signal received but order failed',
                timestamp: getCurrentISODate(),
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
            console.error('❌ Критична помилка обробки запиту:', error);
            console.error('Stack trace:', error.stack);

            // Спроба записати помилку в БД
            try {
                await this.loggingService.logError(
                    'trading_view_error',
                    'Critical error processing TradingView webhook',
                    {
                        error: error.message,
                        stack: error.stack,
                        request: {
                            method: req.method,
                            url: req.url,
                            body: req.body
                        },
                        timestamp: getCurrentISODate()
                    }
                );
            } catch (dbError) {
                console.error('❌ Не вдалося записати помилку в БД:', dbError.message);
            }

            res.status(500).json({
                success: false,
                status: 'error',
                message: 'Failed to process request',
                error: error.message,
                timestamp: getCurrentISODate()
            });
        }
    }
}

module.exports = TradingViewController;
