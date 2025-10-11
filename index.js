// index.js - З підтримкою тільки WhiteBit
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { parseArgs } = require('node:util');
const fs = require('fs');
const path = require('path');

const WhiteBitConnector = require('./connectors/whitebit');
const TradingViewConnector = require('./connectors/trading_view');
const RiskManager = require('./engine/risk');
const WebSocketManager = require('./websocket/manager');
const url = require("url");

const monitoring = require('./connectors/monitoring');
const monitoringRoutes = require('./routes/monitoring');
const settingsRoutes = require('./routes/settings');
const database = require('./config/database');
class CryptoSpotBot {
    constructor(options = {}) {
        this.app = express();
        this.enabledExchanges = ['whitebit']; // Тільки WhiteBit
        this.exchanges = {};
        this.db = null;

        console.log(`🎯 Запуск з біржею: WhiteBit`);

        this.setupMiddleware();
        this.setupConnectors();
        this.setupEngine();
        this.setupRoutes();
        this.isRunning = false;
    }
    async init() {
        try {
            // Підключення до БД
            this.db = await database.connect();
            console.log('✅ CryptoSpotBot ініціалізовано');
            return this;
        } catch (error) {
            console.error('❌ Помилка ініціалізації бота:', error);
            throw error;
        }
    }

    setupConnectors() {
        console.log('🔌 Налаштування WhiteBit коннектора...');

        this.exchanges.whitebit = new WhiteBitConnector({
            apiKey: process.env.WHITEBIT_API_KEY,
            secretKey: process.env.WHITEBIT_SECRET_KEY
        });


        console.log('✅ WhiteBit коннектор ініціалізовано');
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());

        this.app.use('/api/trading_view', express.text({ type: 'text/plain' }));
        this.app.use(monitoring.middleware());

        this.app.use('/settings', settingsRoutes);
        // Статичні файли для моніторингу
        this.app.use('/monitoring/assets', express.static(path.join(__dirname, 'public/monitoring')));
        this.app.use('/settings/assets', express.static(path.join(__dirname, 'public/settings')));

// Роути моніторингу
        this.app.use('/monitoring', monitoringRoutes);
        this.app.use('/settings', settingsRoutes);
        // Middleware для обходу ngrok warning page
        this.app.use((req, res, next) => {
            // Для обходу ngrok warning page
            res.setHeader('ngrok-skip-browser-warning', 'true');
            next();
        });

        this.app.use(express.static('public'));


    }

    setupEngine() {
        this.riskManager = new RiskManager({
            maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 1000,
            riskPercentage: parseFloat(process.env.RISK_PERCENTAGE) || 2
        });

        this.wsManager = new WebSocketManager({
            exchanges: this.exchanges
        });
    }

    setupRoutes() {
        // Запуск WhiteBit



        this.app.post('/api/exchanges/whitebit/start', async (req, res) => {
            try {
                await this.exchanges.whitebit.testConnection();
                console.log(`✅ WhiteBit запущено через веб-інтерфейс`);
                res.json({
                    success: true,
                    message: 'WhiteBit запущено'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Зупинка WhiteBit
        this.app.post('/api/exchanges/whitebit/stop', async (req, res) => {
            try {
                if (this.exchanges.whitebit.disconnect) {
                    this.exchanges.whitebit.disconnect();
                }

                console.log(`🛑 WhiteBit зупинено через веб-інтерфейс`);

                res.json({
                    success: true,
                    message: 'WhiteBit зупинено'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Екстрена зупинка
        this.app.post('/api/emergency-stop', async (req, res) => {
            try {
                console.log('🚨 ЕКСТРЕНА ЗУПИНКА через веб-інтерфейс');

                // Скасування всіх ордерів на WhiteBit
                await this.exchanges.whitebit.cancelAllOrders();

                // Відключення біржі
                if (this.exchanges.whitebit.disconnect) {
                    this.exchanges.whitebit.disconnect();
                }

                res.json({
                    success: true,
                    message: 'Екстрену зупинку виконано'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Статус біржі
        this.app.get('/api/status', (req, res) => {
            const connectedExchanges = {
                whitebit: this.exchanges.whitebit.isConnected()
            };

            res.json({
                isRunning: this.isRunning,
                enabledExchanges: this.enabledExchanges,
                connectedExchanges,
                activeOrders: [] // Можна додати логіку для отримання активних ордерів
            });
        });

        this.app.all('/api/trading_view', async (req, res) => {
            try {
                console.log('📊 Отримано запит від TradingView');
                console.log('Method:', req.method);
                console.log('Body:', req.body);
                console.log('Query:', req.query);



                // Перевірка підключення до БД
                if (!this.db) {
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

                // Парсинг сигналу
                const parsedSignal = TradingViewConnector.parseSignalSpot(req.body);
                console.log('📈 Парсений сигнал:', parsedSignal);

                // Сума для ордера
                const amount = 6;

                // Створення ордера на біржі
                let order = null;
                let orderError = null;

                try {
                    order = await this.exchanges.whitebit.createMarketOrder(
                        parsedSignal.coinCode,
                        parsedSignal.action,
                        amount
                    );


                    // order  = {
                    //     orderId: 1797091915534,
                    //     clientOrderId: "",
                    //     market: "SOL_USDT",
                    //     side: "buy",
                    //     type: "market",
                    //     timestamp: 1760194851.123597,
                    //     dealMoney: "5.99169621",
                    //     dealStock: "0.0327",
                    //     amount: "6",
                    //     left: "0.00830379",
                    //     dealFee: "0.0000327",
                    //     ioc: false,
                    //     status: "PARTIALLY_FILLED",
                    //     postOnly: false,
                    //     stp: "no"
                    // };


                    console.log('✅ Ордер створено:', order);
                } catch (orderErr) {
                    orderError = orderErr.message;
                    console.error('❌ Помилка створення ордера:', orderErr.message);
                }

                // 1. ЗБЕРЕЖЕННЯ У ФАЙЛ (старий метод)
                const logsDir = path.join(__dirname, 'logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }

                const today = new Date().toISOString().split('T')[0];
                const logFileName = `trading_view_logs_${today}.json`;
                const logFilePath = path.join(logsDir, logFileName);

                fs.appendFileSync(logFilePath, logData);
                console.log('✅ Лог записано у файл:', logFileName);

                // 2. ЗБЕРЕЖЕННЯ В БАЗУ ДАНИХ (новий метод)
                try {
                    // Запис основного запиту
                    const requestLog = await this.db.query(`
                INSERT INTO system_logs (level, category, message, details, type, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id, created_at
            `, [
                        'info',
                        'trading_view',
                        `TradingView ${parsedSignal.action} signal for ${parsedSignal.coinCode}`,
                        JSON.stringify({
                            signal: parsedSignal,
                            order: order,
                            orderError: orderError,
                            amount: amount,
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
                            timestamp: new Date().toISOString()
                        }),
                        'trading_view_request'
                    ]);


                    console.log('✅ Запис успішно збережено в БД');
                    console.log('📝 ID запису:', requestLog.rows[0].id);

                    const result = await insertTradeHistory(parsedSignal, order,this.db);

                    console.log('Trade saved with ID:', result.id);

                    // Окремий запис торгового сигналу
                    await this.db.query(`
                INSERT INTO system_logs (level, category, message, details, type, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
                        orderError ? 'error' : 'info',
                        'trading_signal',
                        `${parsedSignal.action} ${parsedSignal.coinCode} - ${order ? 'Success' : 'Failed'}`,
                        JSON.stringify({
                            signal: parsedSignal,
                            order: order,
                            error: orderError,
                            amount: amount,
                            success: !!order
                        }),
                        'trading_signal'
                    ]);

                    console.log('✅ Торговий сигнал збережено в БД');

                } catch (dbError) {
                    console.error('❌ Помилка збереження в БД:', dbError);
                    // Не перериваємо виконання, якщо БД не працює
                }


                // Відповідь клієнту
                res.json({
                    success: true,
                    status: 'success',
                    message: order ? 'Order created and logged successfully' : 'Signal received but order failed',
                    timestamp: new Date().toISOString(),
                    data: {
                        signal: parsedSignal,
                        order: order,
                        error: orderError,
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
                    if (this.db) {
                        await this.db.query(`
                            INSERT INTO system_logs (level, category, message, details, type, created_at)
                            VALUES ($1, $2, $3, $4, $5, NOW())
                        `, [
                            'error',
                            'trading_view_error',
                            'Critical error processing TradingView webhook',
                            JSON.stringify({
                                error: error.message,
                                stack: error.stack,
                                request: {
                                    method: req.method,
                                    url: req.url,
                                    body: req.body
                                },
                                timestamp: new Date().toISOString()
                            }),
                            'error'
                        ]);
                    }
                } catch (dbError) {
                    console.error('❌ Не вдалося записати помилку в БД:', dbError.message);
                }

                // Також логуємо у файл
                try {
                    const logsDir = path.join(__dirname, 'logs');
                    const today = new Date().toISOString().split('T')[0];
                    const errorLogPath = path.join(logsDir, `errors_${today}.json`);

                    fs.appendFileSync(errorLogPath, JSON.stringify({
                        timestamp: new Date().toISOString(),
                        error: error.message,
                        stack: error.stack,
                        request: {
                            method: req.method,
                            url: req.url,
                            body: req.body
                        }
                    }) + '\n');
                } catch (fileError) {
                    console.error('❌ Не вдалося записати помилку у файл:', fileError.message);
                }

                res.status(500).json({
                    success: false,
                    status: 'error',
                    message: 'Failed to process request',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        async function insertTradeHistory(parsedSignal, order,db) {
            // Розділення символу на базову та котировану валюту
            const [baseCurrency, quoteCurrency] = order.market.split('_');

            // Конвертація статусу з WhiteBIT формату в формат БД
            const statusMap = {
                'PARTIALLY_FILLED': 'partially_filled',
                'FILLED': 'filled',
                'NEW': 'new',
                'CANCELLED': 'cancelled'
            };

            // Конвертація timestamp з Unix в PostgreSQL timestamp
            const executedAt = new Date(order.timestamp * 1000);

            const query = {
                text: `INSERT INTO public.trade_history (
            exchange, order_id, client_order_id, symbol, 
            base_currency, quote_currency, side, order_type, status,
            amount, deal_stock, deal_money, deal_fee, fee, fee_currency,
            left_amount, ioc, post_only, stp, api_timestamp,
            signal_action, signal_bot_name, signal_timeframe, 
            signal_hash, original_signal, executed_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26
        ) RETURNING id`,
                values: [
                    parsedSignal.exchange,
                    order.orderId.toString(),
                    order.clientOrderId || null,
                    order.market,
                    baseCurrency,
                    quoteCurrency,
                    order.side,
                    order.type,
                    statusMap[order.status] || order.status.toLowerCase(),
                    parseFloat(order.amount),
                    parseFloat(order.dealStock),
                    parseFloat(order.dealMoney),
                    parseFloat(order.dealFee),
                    parseFloat(order.dealFee),
                    baseCurrency, // fee_currency - зазвичай в базовій валюті для buy
                    parseFloat(order.left),
                    order.ioc,
                    order.postOnly,
                    order.stp,
                    order.timestamp,
                    parsedSignal.action,
                    parsedSignal.botName,
                    parsedSignal.timeframe,
                    parsedSignal.hash,
                    parsedSignal.originalSignal,
                    executedAt
                ]
            };

            try {
                const result = await db.query(query);
                console.log('Trade inserted with ID:', result.rows[0].id);
                return result.rows[0];
            } catch (error) {
                console.error('Error inserting trade:', error);
                throw error;
            }
        }


        // Метод для перегляду останніх логів з БД
        this.app.get('/api/logs/recent', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const type = req.query.type; // фільтр по типу

                let query = `
            SELECT id, level, category, message, type, created_at
            FROM system_logs
            ${type ? 'WHERE type = $1' : ''}
            ORDER BY created_at DESC
            LIMIT ${type ? '$2' : '$1'}
        `;

                const params = type ? [type, limit] : [limit];
                const result = await this.db.query(query, params);

                res.json({
                    success: true,
                    count: result.rows.length,
                    logs: result.rows
                });
            } catch (error) {
                console.error('❌ Помилка отримання логів:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

// Детальна інформація про один лог
        this.app.get('/api/logs/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.db.query(`
            SELECT *
            FROM system_logs
            WHERE id = $1
        `, [id]);

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Log not found'
                    });
                }

                res.json({
                    success: true,
                    log: result.rows[0]
                });
            } catch (error) {
                console.error('❌ Помилка отримання логу:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
// Детальна інформація про один лог
        this.app.get('/api/logs/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.db.query(`
            SELECT *
            FROM system_logs
            WHERE id = $1
        `, [id]);

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Log not found'
                    });
                }

                res.json({
                    success: true,
                    log: result.rows[0]
                });
            } catch (error) {
                console.error('❌ Помилка отримання логу:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Баланси
        this.app.get('/api/balances/:ticker?', async (req, res) => {
            try {
                const balances = {};
                let filtered = {};
                try {
                    balances.whitebit = await this.exchanges.whitebit.getSpotBalance( req.params.ticker);
                    const excludeCoins = ['DUSDT', 'DBTC']; // монети які НЕ виводити
                    filtered = Object.entries(balances.whitebit)
                        .filter(([ticker, data]) => {

                            if (excludeCoins.includes(ticker)) {
                                return false;
                            }
                            const available = parseFloat(data.available);
                            const freeze = parseFloat(data.freeze);
                            const total = available + freeze;
                            return total > 0; // повертаємо тільки якщо сума більше 0
                        })
                        .map(([ticker, data]) => ({
                            ticker: ticker,
                            available: Math.floor(parseFloat(data.available) * 1000) / 1000,
                            freeze:  Math.floor(parseFloat(data.freeze) * 1000) / 1000
                        }));


                } catch (error) {
                    balances.whitebit = { error: error.message };
                }


                balances.whitebit = filtered

                res.json(balances);

            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Увімкнення WhiteBit
        this.app.post('/api/exchange/whitebit/enable', async (req, res) => {
            try {
                await this.exchanges.whitebit.testConnection();
                console.log(`✅ Біржа WhiteBit увімкнена`);

                res.json({ success: true, message: 'Біржа WhiteBit увімкнена' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Вимкнення WhiteBit
        this.app.post('/api/exchange/whitebit/disable', (req, res) => {
            if (this.exchanges.whitebit.disconnect) {
                this.exchanges.whitebit.disconnect();
            }

            console.log(`🔴 Біржа WhiteBit вимкнена`);
            res.json({ success: true, message: 'Біржа WhiteBit вимкнена' });
        });

        // Отримання торгових пар
        this.app.get('/api/trading-pairs', async (req, res) => {
            try {
                const pairs = await this.exchanges.whitebit.getTradingPairs();
                res.json({ success: true, pairs });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Тестування API підключення
        this.app.get('/api/test-connection', async (req, res) => {
            try {
                console.log('🧪 Тестування підключення до WhiteBit API...');

                // Тест публічного API
                const publicTest = await this.exchanges.whitebit.getTickers();
                console.log('✅ Публічне API працює');

                // Тест приватного API
                const privateTest = await this.exchanges.whitebit.getSpotBalance();
                console.log('✅ Приватне API працює');

                res.json({
                    success: true,
                    message: 'Всі тести пройшли успішно',
                    tests: {
                        public: 'OK',
                        private: 'OK'
                    }
                });
            } catch (error) {
                console.error('❌ Помилка тестування:', error.message);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    tests: {
                        public: 'Потрібно перевірити',
                        private: 'Помилка'
                    }
                });
            }
        });
        this.app.get('/api/tickers/:market?', async (req, res) => {
            try {
                const { market } = req.params;
                const tickers = await this.exchanges.whitebit.getTickers(market);
                res.json({ success: true, tickers });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Створення ордера
        this.app.post('/api/order', async (req, res) => {
            try {
                const { market, side, amount, price, type = 'limit' } = req.body;

                let order;
                if (type === 'market') {
                    order = await this.exchanges.whitebit.createMarketOrder(market, side, amount);
                } else {
                    order = await this.exchanges.whitebit.createLimitOrder(market, side, amount, price);
                }

                res.json({ success: true, order });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Скасування ордера
        this.app.post('/api/cancel-order', async (req, res) => {
            try {
                const { market, orderId } = req.body;
                const result = await this.exchanges.whitebit.cancelOrder(market, orderId);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Активні ордери
        this.app.get('/api/active-orders/:market?', async (req, res) => {
            try {
                const { market } = req.params;
                const orders = await this.exchanges.whitebit.getActiveOrders(market);
                res.json({ success: true, orders });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    async start() {
        if (this.isRunning) {
            throw new Error('⚠ Бот вже запущено');
        }

        console.log(`🚀 Запуск спот торгового бота з WhiteBit`);

        // Тестування підключення до WhiteBit
        try {
            await this.exchanges.whitebit.testConnection();
            console.log(`✅ WhiteBit підключено`);
        } catch (error) {
            console.error(`⚠ WhiteBit помилка: ${error.message}`);
            throw error;
        }

        // Запуск WebSocket менеджера
        if (this.wsManager) {
            await this.wsManager.start();
        }

        this.isRunning = true;
        console.log(`✅ Бот запущено з WhiteBit`);
    }

    async stop() {
        if (!this.isRunning) {
            console.log('⚠️ Бот вже зупинено');
            return;
        }

        console.log('🛑 Зупинка торгового бота...');

        // Скасування всіх ордерів
        try {
            await this.exchanges.whitebit.cancelAllOrders();
        } catch (error) {
            console.error('Помилка скасування ордерів:', error.message);
        }

        // Зупинка WebSocket
        if (this.wsManager) {
            await this.wsManager.stop();
        }

        // Відключення біржі
        if (this.exchanges.whitebit.disconnect) {
            this.exchanges.whitebit.disconnect();
        }

        this.isRunning = false;
        console.log('✅ Торговий бот зупинено');
    }

    listen() {
        const port = process.env.PORT || 3000;
        this.app.listen(port, () => {
            console.log(`🌐 Веб-сервер запущено на порту ${port}`);
        });
    }
    async shutdown() {
        console.log('🛑 Закриття підключень...');

        try {
            // Зупиняємо бота якщо він працює
            if (this.isRunning) {
                await this.stop();
            }

            // Відключаємо базу даних
            if (this.db) {
                await database.disconnect();
                console.log('✅ База даних відключена');
            }

            console.log('✅ Shutdown завершено');
            process.exit(0);
        } catch (error) {
            console.error('❌ Помилка shutdown:', error);
            process.exit(1);
        }
    }

}

// Запуск додатка
// Запуск додатка
if (require.main === module) {
    (async () => {
        try {
            console.log('🚀 Ініціалізація бота...');

            // Створюємо бота
            const bot = new CryptoSpotBot();

            // ВАЖЛИВО: Спочатку ініціалізуємо (підключаємо БД)
            await bot.init();

            // Потім запускаємо веб-сервер
            bot.listen();

            // Обробка сигналів для graceful shutdown
            process.on('SIGTERM', async () => {
                console.log('🔨 SIGTERM отримано, зупинка бота...');
                await bot.shutdown();
            });

            process.on('SIGINT', async () => {
                console.log('🔨 SIGINT отримано, зупинка бота...');
                await bot.shutdown();
            });

            // Обробка некерованих помилок
            process.on('unhandledRejection', (reason, promise) => {
                console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            });

            process.on('uncaughtException', (error) => {
                console.error('❌ Uncaught Exception:', error);
                process.exit(1);
            });

        } catch (error) {
            console.error('⚠️ Помилка запуску:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    })();
}

module.exports = CryptoSpotBot;


module.exports = CryptoSpotBot;