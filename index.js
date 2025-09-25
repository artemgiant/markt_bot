// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const BinanceConnector = require('./connectors/binance');
const MEXCConnector = require('./connectors/mexc');
const TradingEngine = require('./engine/trading');
const RiskManager = require('./engine/risk');
const WebSocketManager = require('./websocket/manager');

class CryptoFuturesBot {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupConnectors();
        this.setupEngine();
        this.setupRoutes();
        this.isRunning = false;
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupConnectors() {
        // Ініціалізація з'єднань з біржами
        this.binance = new BinanceConnector({
            apiKey: process.env.BINANCE_API_KEY,
            secretKey: process.env.BINANCE_SECRET_KEY,
            testnet: process.env.NODE_ENV !== 'production'
        });

        this.mexc = new MEXCConnector({
            apiKey: process.env.MEXC_API_KEY,
            secretKey: process.env.MEXC_SECRET_KEY
        });
    }

    setupEngine() {
        // Ініціалізація торгового движка
        this.riskManager = new RiskManager({
            maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE),
            riskPercentage: parseFloat(process.env.RISK_PERCENTAGE)
        });

        this.tradingEngine = new TradingEngine({
            exchanges: {
                binance: this.binance,
                mexc: this.mexc
            },
            riskManager: this.riskManager
        });

        this.wsManager = new WebSocketManager({
            binance: this.binance,
            mexc: this.mexc,
            tradingEngine: this.tradingEngine
        });
    }

    setupRoutes() {
        // API маршрути для управління ботом
        this.app.get('/api/status', (req, res) => {
            res.json({
                isRunning: this.isRunning,
                connectedExchanges: {
                    binance: this.binance.isConnected(),
                    mexc: this.mexc.isConnected()
                },
                activePositions: this.tradingEngine.getActivePositions()
            });
        });

        this.app.post('/api/start', async (req, res) => {
            try {
                await this.start();
                res.json({ success: true, message: 'Бот запущено' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/stop', async (req, res) => {
            try {
                await this.stop();
                res.json({ success: true, message: 'Бот зупинено' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/balances', async (req, res) => {
            try {
                const balances = await this.getBalances();
                res.json(balances);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    async start() {
        if (this.isRunning) {
            throw new Error('Бот вже запущено');
        }

        console.log('Запуск торгового бота...');

        // Перевірка з'єднання з біржами
        await this.binance.testConnection();
        await this.mexc.testConnection();

        // Запуск WebSocket з'єднань
        await this.wsManager.start();

        // Запуск торгового движка
        await this.tradingEngine.start();

        this.isRunning = true;
        console.log('Торговий бот успішно запущено');
    }

    async stop() {
        if (!this.isRunning) {
            throw new Error('Бот не запущено');
        }

        console.log('Зупинка торгового бота...');

        // Закриття всіх позицій
        await this.tradingEngine.closeAllPositions();

        // Зупинка WebSocket з'єднань
        await this.wsManager.stop();

        // Зупинка торгового движка
        await this.tradingEngine.stop();

        this.isRunning = false;
        console.log('Торговий бот зупинено');
    }

    async getBalances() {
        const binanceBalance = await this.binance.getFuturesBalance();
        const mexcBalance = await this.mexc.getFuturesBalance();

        return {
            binance: binanceBalance,
            mexc: mexcBalance
        };
    }

    listen() {
        const port = process.env.PORT || 3000;
        this.app.listen(port, () => {
            console.log(`Веб-сервер запущено на порту ${port}`);
        });
    }
}

// Запуск бота
const bot = new CryptoFuturesBot();
bot.listen();

module.exports = CryptoFuturesBot;
