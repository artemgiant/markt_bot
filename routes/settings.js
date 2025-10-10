// routes/settings.js - Роути для налаштувань бота
const express = require('express');
const router = express.Router();
const path = require('path');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');

/**
 * @route   GET /settings
 * @desc    Сторінка налаштувань
 * @access  Public
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'settings', 'settings.html'));
});

/**
 * @route   GET /settings/api
 * @desc    Отримати налаштування бота з БД
 * @access  Public
 */
router.get('/api', async (req, res) => {
    try {
        const db = database.getConnection();

        // Отримуємо останні налаштування (один користувач)
        const query = `
            SELECT * FROM bot_settings
            ORDER BY updated_at DESC
                LIMIT 1
        `;

        const result = await db.query(query);

        if (result.rows.length === 0) {
            // Повертаємо стандартні налаштування якщо немає в БД
            return res.json({
                success: true,
                data: getDefaultSettings()
            });
        }

        // Повертаємо налаштування з БД
        const settings = result.rows[0];

        res.json({
            success: true,
            data: {
                id: settings.id,
                botName: settings.bot_name,
                tradingMode: settings.trading_mode,
                tradingPair: settings.trading_pair,
                // ✅ ВИПРАВЛЕНО: Конвертуємо масив в рядок для фронтенду
                additionalPairs: Array.isArray(settings.additional_pairs)
                    ? settings.additional_pairs.join(', ')
                    : (settings.additional_pairs || ''),
                strategyName: settings.strategy_name || '',
                webhookUrl: settings.webhook_url || '',
                positionSize: settings.position_size,
                maxPositionPercent: settings.max_position_percent,
                leverage: settings.leverage,
                futuresPositionSize: settings.futures_position_size,
                marginType: settings.margin_type,
                stopLoss: settings.stop_loss,
                takeProfit: settings.take_profit,
                maxDailyTrades: settings.max_daily_trades,
                autoTrading: settings.auto_trading,
                telegramNotifications: settings.telegram_notifications,
                telegramToken: settings.telegram_token || '',
                telegramChatId: settings.telegram_chat_id || '',
                weekendTrading: settings.weekend_trading,
                trailingStop: settings.trailing_stop,
                trailingActivation: settings.trailing_activation,
                trailingCallback: settings.trailing_callback,
                trailingType: settings.trailing_type,
                // НЕ повертаємо API ключі з міркувань безпеки
            }
        });

    } catch (error) {
        console.error('❌ Помилка отримання налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера при отриманні налаштувань',
            error: error.message
        });
    }
});

/**
 * @route   POST /settings/api
 * @desc    Зберегти налаштування бота
 * @access  Public
 */
router.post('/api', [
    // Валідація даних
    body('tradingMode').isIn(['spot', 'futures']).withMessage('Невірний режим торгівлі'),
    body('tradingPair').notEmpty().withMessage('Торгова пара обов\'язкова'),
    body('stopLoss').isFloat({ min: 0.1, max: 100 }).withMessage('Stop Loss повинен бути від 0.1 до 100'),
    body('takeProfit').isFloat({ min: 0.1, max: 1000 }).withMessage('Take Profit повинен бути від 0.1 до 1000'),
    body('maxDailyTrades').isInt({ min: 1 }).withMessage('Максимум угод повинен бути мінімум 1')
], async (req, res) => {
    // Перевірка валідації
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const db = database.getConnection();

        const {
            botName,
            tradingMode,
            apiKey,
            apiSecret,
            tradingPair,
            additionalPairs,
            strategyName,
            webhookUrl,
            positionSize,
            maxPositionPercent,
            leverage,
            futuresPositionSize,
            marginType,
            stopLoss,
            takeProfit,
            maxDailyTrades,
            autoTrading,
            telegramNotifications,
            telegramToken,
            telegramChatId,
            weekendTrading,
            trailingStop,
            trailingActivation,
            trailingCallback,
            trailingType
        } = req.body;

        // ✅ ВИПРАВЛЕНО: Конвертуємо рядок в масив для PostgreSQL
        const additionalPairsArray = additionalPairs
            ? additionalPairs.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0)
            : null;

        // Додаткова валідація для ф'ючерсів
        if (tradingMode === 'futures') {
            if (!leverage || leverage < 1 || leverage > 125) {
                return res.status(400).json({
                    success: false,
                    message: 'Кредитне плече повинно бути від 1 до 125'
                });
            }
        }

        // Перевірка чи існують налаштування
        const checkQuery = 'SELECT id FROM bot_settings LIMIT 1';
        const existingSettings = await db.query(checkQuery);

        let query, values, result;

        if (existingSettings.rows.length > 0) {
            // UPDATE існуючих налаштувань
            query = `
                UPDATE bot_settings SET
                                        bot_name = $1,
                                        trading_mode = $2,
                                        trading_pair = $3,
                                        additional_pairs = $4,
                                        strategy_name = $5,
                                        webhook_url = $6,
                                        position_size = $7,
                                        max_position_percent = $8,
                                        leverage = $9,
                                        futures_position_size = $10,
                                        margin_type = $11,
                                        stop_loss = $12,
                                        take_profit = $13,
                                        max_daily_trades = $14,
                                        auto_trading = $15,
                                        telegram_notifications = $16,
                                        telegram_token = $17,
                                        telegram_chat_id = $18,
                                        weekend_trading = $19,
                                        trailing_stop = $20,
                                        trailing_activation = $21,
                                        trailing_callback = $22,
                                        trailing_type = $23,
                                        updated_at = NOW()
                WHERE id = $24
                    RETURNING id, bot_name, trading_mode, trading_pair, updated_at
            `;

            values = [
                botName || 'WhiteBit Bot',
                tradingMode,
                tradingPair,
                additionalPairsArray, // ✅ Тепер це масив
                strategyName || null,
                webhookUrl || null,
                positionSize || null,
                maxPositionPercent || null,
                leverage || null,
                futuresPositionSize || null,
                marginType || 'isolated',
                stopLoss,
                takeProfit,
                maxDailyTrades,
                autoTrading !== false,
                telegramNotifications || false,
                telegramToken || null,
                telegramChatId || null,
                weekendTrading !== false,
                trailingStop || false,
                trailingActivation || null,
                trailingCallback || null,
                trailingType || 'percent',
                existingSettings.rows[0].id
            ];

            result = await db.query(query, values);
            console.log('✅ Налаштування оновлено в БД');

        } else {
            // INSERT нових налаштувань
            query = `
                INSERT INTO bot_settings (
                    bot_name, trading_mode, trading_pair, additional_pairs,
                    strategy_name, webhook_url, position_size, max_position_percent,
                    leverage, futures_position_size, margin_type, stop_loss,
                    take_profit, max_daily_trades, auto_trading, telegram_notifications,
                    telegram_token, telegram_chat_id, weekend_trading, trailing_stop,
                    trailing_activation, trailing_callback, trailing_type, created_at, updated_at
                ) VALUES (
                             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                             $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
                         )
                    RETURNING id, bot_name, trading_mode, trading_pair, created_at
            `;

            values = [
                botName || 'WhiteBit Bot',
                tradingMode,
                tradingPair,
                additionalPairsArray, // ✅ Тепер це масив
                strategyName || null,
                webhookUrl || null,
                positionSize || null,
                maxPositionPercent || null,
                leverage || null,
                futuresPositionSize || null,
                marginType || 'isolated',
                stopLoss,
                takeProfit,
                maxDailyTrades,
                autoTrading !== false,
                telegramNotifications || false,
                telegramToken || null,
                telegramChatId || null,
                weekendTrading !== false,
                trailingStop || false,
                trailingActivation || null,
                trailingCallback || null,
                trailingType || 'percent'
            ];

            result = await db.query(query, values);
            console.log('✅ Налаштування створено в БД');
        }

        // Логування для аудиту
        await db.query(`
            INSERT INTO system_logs (level, category, message, details, type, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
            'info',
            'settings',
            'Налаштування бота збережено',
            JSON.stringify({
                tradingMode,
                tradingPair,
                additionalPairs: additionalPairsArray,
                stopLoss,
                takeProfit,
                timestamp: new Date().toISOString()
            }),
            'settings_update'
        ]);

        res.json({
            success: true,
            message: 'Налаштування успішно збережено',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Помилка збереження налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера при збереженні налаштувань',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /settings/api
 * @desc    Видалити налаштування (скинути до стандартних)
 * @access  Public
 */
router.delete('/api', async (req, res) => {
    try {
        const db = database.getConnection();

        const query = 'DELETE FROM bot_settings';
        await db.query(query);

        console.log('✅ Налаштування видалено з БД');

        res.json({
            success: true,
            message: 'Налаштування успішно скинуто'
        });

    } catch (error) {
        console.error('❌ Помилка видалення налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера при видаленні налаштувань',
            error: error.message
        });
    }
});

/**
 * @route   POST /settings/test-api
 * @desc    Тестування API ключів WhiteBit
 * @access  Public
 */
router.post('/test-api', [
    body('apiKey').notEmpty().withMessage('API ключ обов\'язковий'),
    body('apiSecret').notEmpty().withMessage('API секрет обов\'язковий')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    try {
        const { apiKey, apiSecret } = req.body;

        // TODO: Реалізувати тестування з'єднання з WhiteBit API
        // Тут має бути виклик до WhiteBit connector

        // Заглушка для тестування
        const testResult = {
            success: true,
            message: 'API ключі валідні',
            connection: 'OK'
        };

        res.json(testResult);

    } catch (error) {
        console.error('❌ Помилка тестування API:', error);
        res.status(400).json({
            success: false,
            message: 'Невалідні API ключі або помилка з\'єднання',
            error: error.message
        });
    }
});

/**
 * @route   GET /settings/export
 * @desc    Експорт налаштувань у JSON
 * @access  Public
 */
router.get('/export', async (req, res) => {
    try {
        const db = database.getConnection();

        const query = 'SELECT * FROM bot_settings LIMIT 1';
        const result = await db.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Налаштування не знайдено'
            });
        }

        const settings = result.rows[0];

        // Видаляємо API ключі з експорту
        delete settings.api_key_id;
        delete settings.id;
        delete settings.created_at;
        delete settings.updated_at;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=whitebit_settings_${Date.now()}.json`);
        res.json(settings);

    } catch (error) {
        console.error('❌ Помилка експорту налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка експорту налаштувань'
        });
    }
});

// Функція для отримання стандартних налаштувань
function getDefaultSettings() {
    return {
        botName: 'WhiteBit Bot',
        tradingMode: 'spot',
        tradingPair: 'BTC_USDT',
        additionalPairs: '',
        strategyName: '',
        webhookUrl: '',
        positionSize: 100,
        maxPositionPercent: 50,
        leverage: 5,
        futuresPositionSize: 100,
        marginType: 'isolated',
        stopLoss: 2,
        takeProfit: 3,
        maxDailyTrades: 10,
        autoTrading: true,
        telegramNotifications: false,
        telegramToken: '',
        telegramChatId: '',
        weekendTrading: true,
        trailingStop: false,
        trailingActivation: 1,
        trailingCallback: 0.5,
        trailingType: 'percent'
    };
}

module.exports = router;