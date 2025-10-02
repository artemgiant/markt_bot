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

class CryptoSpotBot {
    constructor(options = {}) {
        this.app = express();
        this.enabledExchanges = ['whitebit']; // Тільки WhiteBit
        this.exchanges = {};

        console.log(`🎯 Запуск з біржею: WhiteBit`);

        this.setupMiddleware();
        this.setupConnectors();
        this.setupEngine();
        this.setupRoutes();
        this.isRunning = false;
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
                // Форматування даних запиту для логування
                const logData = TradingViewConnector.formatLogEntry(req, {
                    route: '/api/trading_view',
                    type: 'trading_view_request'
                });
                const amount = 6


                const logsDir = path.join(__dirname, 'logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }
                const parsedSignal = TradingViewConnector.parseSignalSpot(req.body)

               const  order = await this.exchanges.whitebit.createMarketOrder(parsedSignal.coinCode, parsedSignal.action, amount);



                // Генерація назви файлу з поточною датою
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD формат
                const logFileName = `trading_view_logs_${today}.json`;
                const logFilePath = path.join(logsDir, logFileName);

                // Запис у файл
                fs.appendFileSync(logFilePath, logData);

                // Додатково виводимо в консоль
                console.log(`[${new Date().toISOString()}] TradingView API request logged:`, {
                    method: req.method,
                    url: req.url,
                    query: req.query,
                    ip: req.ip
                });

                // Відповідь клієнту
                res.json({
                    status: 'success',
                    message: 'Request logged successfully',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Error logging request:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Failed to log request',
                    error: error.message
                });
            }
        })



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
}

// Запуск додатка
if (require.main === module) {
    try {
        const bot = new CryptoSpotBot();
        bot.listen();

        // Обробка сигналів для graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('🔨 SIGTERM отримано, зупинка бота...');
            await bot.stop();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            console.log('🔨 SIGINT отримано, зупинка бота...');
            await bot.stop();
            process.exit(0);
        });

    } catch (error) {
        console.error('⚠ Помилка запуску:', error.message);
        process.exit(1);
    }
}

module.exports = CryptoSpotBot;