const express = require('express');
const router = express.Router();
const path = require('path');
const { body, validationResult } = require('express-validator');

// Імпорт моделі Settings (потрібно створити)
// const Settings = require('../models/Settings');

/**
 * @route   GET /settings
 * @desc    Сторінка налаштувань
 * @access  Public
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'settings', 'settings.html'));
});

/**
 * @route   GET /api/settings
 * @desc    Отримати всі налаштування бота
 * @access  Private
 */
router.get('/api', async (req, res) => {
    try {
        // TODO: Додати аутентифікацію
        // const userId = req.user.id;

        // Тимчасово: отримуємо з бази даних
        const query = `
            SELECT * FROM bot_settings 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `;

        // const result = await pool.query(query, [userId]);

        // Заглушка для тестування
        const settings = {
            id: 1,
            tradingMode: 'spot',
            tradingPair: 'BTC_USDT',
            additionalPairs: '',
            strategyName: '',
            webhookUrl: '',
            positionSize: 100,
            maxPositionPercent: 50,
            leverage: 5,
            marginType: 'isolated',
            stopLoss: 2,
            takeProfit: 3,
            maxDailyTrades: 10,
            autoTrading: true,
            telegramNotifications: false,
            weekendTrading: true,
            trailingStop: false,
            trailingActivation: 1,
            trailingCallback: 0.5,
            trailingType: 'percent'
        };

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('Помилка отримання налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера при отриманні налаштувань',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/settings
 * @desc    Створити або оновити налаштування бота
 * @access  Private
 */
router.post('/', [
    // Валідація даних
    body('tradingMode').isIn(['spot', 'futures']).withMessage('Невірний режим торгівлі'),
    body('apiKey').notEmpty().withMessage('API ключ обов\'язковий'),
    body('apiSecret').notEmpty().withMessage('API секрет обов\'язковий'),
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
        // TODO: Додати аутентифікацію
        // const userId = req.user.id;
        const userId = 1; // Тимчасово для тестування

        const {
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

        // Додаткова валідація для ф'ючерсів
        if (tradingMode === 'futures') {
            if (!leverage || leverage < 1 || leverage > 125) {
                return res.status(400).json({
                    success: false,
                    message: 'Кредитне плече повинно бути від 1 до 125'
                });
            }
        }

        // Шифрування API ключів (рекомендується використовувати crypto)
        const crypto = require('crypto');
        const algorithm = 'aes-256-cbc';
        const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encryptedApiKey = cipher.update(apiKey, 'utf8', 'hex');
        encryptedApiKey += cipher.final('hex');

        const cipher2 = crypto.createCipheriv(algorithm, key, iv);
        let encryptedApiSecret = cipher2.update(apiSecret, 'utf8', 'hex');
        encryptedApiSecret += cipher2.final('hex');

        // Перевірка чи існують налаштування
        const checkQuery = 'SELECT id FROM bot_settings WHERE user_id = $1';
        // const existingSettings = await pool.query(checkQuery, [userId]);

        let query, values;

        // if (existingSettings.rows.length > 0) {
        //     // UPDATE існуючих налаштувань
        //     query = `
        //         UPDATE bot_settings SET
        //             trading_mode = $2,
        //             api_key = $3,
        //             api_secret = $4,
        //             encryption_iv = $5,
        //             trading_pair = $6,
        //             additional_pairs = $7,
        //             strategy_name = $8,
        //             webhook_url = $9,
        //             position_size = $10,
        //             max_position_percent = $11,
        //             leverage = $12,
        //             futures_position_size = $13,
        //             margin_type = $14,
        //             stop_loss = $15,
        //             take_profit = $16,
        //             max_daily_trades = $17,
        //             auto_trading = $18,
        //             telegram_notifications = $19,
        //             telegram_token = $20,
        //             telegram_chat_id = $21,
        //             weekend_trading = $22,
        //             trailing_stop = $23,
        //             trailing_activation = $24,
        //             trailing_callback = $25,
        //             trailing_type = $26,
        //             updated_at = NOW()
        //         WHERE user_id = $1
        //         RETURNING *
        //     `;
        // } else {
        //     // INSERT нових налаштувань
        //     query = `
        //         INSERT INTO bot_settings (
        //             user_id, trading_mode, api_key, api_secret, encryption_iv,
        //             trading_pair, additional_pairs, strategy_name, webhook_url,
        //             position_size, max_position_percent, leverage, futures_position_size,
        //             margin_type, stop_loss, take_profit, max_daily_trades,
        //             auto_trading, telegram_notifications, telegram_token, telegram_chat_id,
        //             weekend_trading, trailing_stop, trailing_activation, trailing_callback,
        //             trailing_type
        //         ) VALUES (
        //             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        //             $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        //         )
        //         RETURNING *
        //     `;
        // }

        values = [
            userId,
            tradingMode,
            encryptedApiKey,
            encryptedApiSecret,
            iv.toString('hex'),
            tradingPair,
            additionalPairs || '',
            strategyName || '',
            webhookUrl || '',
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

        // const result = await pool.query(query, values);

        // Логування для аудиту
        console.log(`[${new Date().toISOString()}] Налаштування збережено для користувача ${userId}`);

        res.json({
            success: true,
            message: 'Налаштування успішно збережено',
            data: {
                id: 1,
                tradingMode,
                tradingPair,
                strategyName,
                // Не повертаємо API ключі у відповіді
            }
        });

    } catch (error) {
        console.error('Помилка збереження налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера при збереженні налаштувань',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/settings
 * @desc    Видалити налаштування (скинути до стандартних)
 * @access  Private
 */
router.delete('/', async (req, res) => {
    try {
        // TODO: Додати аутентифікацію
        // const userId = req.user.id;
        const userId = 1;

        const query = 'DELETE FROM bot_settings WHERE user_id = $1';
        // await pool.query(query, [userId]);

        console.log(`[${new Date().toISOString()}] Налаштування видалено для користувача ${userId}`);

        res.json({
            success: true,
            message: 'Налаштування успішно скинуто'
        });

    } catch (error) {
        console.error('Помилка видалення налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера при видаленні налаштувань',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/settings/test-api
 * @desc    Тестування API ключів WhiteBit
 * @access  Private
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
        // const axios = require('axios');
        // const crypto = require('crypto');

        // Приклад запиту до WhiteBit API
        // const response = await axios.get('https://whitebit.com/api/v4/trade-account/balance', {
        //     headers: {
        //         'X-TXC-APIKEY': apiKey,
        //         // Додати підпис та інші заголовки
        //     }
        // });

        // Заглушка для тестування
        const testResult = {
            success: true,
            balance: 1000.50,
            connection: 'OK'
        };

        res.json({
            success: true,
            message: 'API ключі валідні',
            data: testResult
        });

    } catch (error) {
        console.error('Помилка тестування API:', error);
        res.status(400).json({
            success: false,
            message: 'Невалідні API ключі або помилка з\'єднання',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/settings/export
 * @desc    Експорт налаштувань у JSON
 * @access  Private
 */
router.get('/export', async (req, res) => {
    try {
        // TODO: Додати аутентифікацію
        const userId = 1;

        const query = 'SELECT * FROM bot_settings WHERE user_id = $1';
        // const result = await pool.query(query, [userId]);

        // Заглушка
        const settings = {
            tradingMode: 'spot',
            tradingPair: 'BTC_USDT',
            // Не включаємо API ключі в експорт
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=whitebit_settings_${Date.now()}.json`);
        res.json(settings);

    } catch (error) {
        console.error('Помилка експорту налаштувань:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка експорту налаштувань'
        });
    }
});

module.exports = router;