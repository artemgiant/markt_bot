// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const WhiteBitConnector = require('./connectors/whitebit');
const RiskManager = require('./engine/risk');
const WebSocketManager = require('./websocket/manager');
const database = require('./config/database');
const monitoring = require('./connectors/monitoring');

const { initModels } = require('./database/models');
const { initServices } = require('./services');
const { initControllers } = require('./controllers');
const { setupMiddleware, errorHandler, notFoundHandler } = require('./middleware');
const setupRoutes = require('./routes');

// Імпорт існуючих роутів
const monitoringRoutes = require('./routes/monitoring');
const settingsRoutes = require('./routes/settings');

class CryptoSpotBot {
    constructor(options = {}) {
        this.app = express();
        this.enabledExchanges = ['whitebit'];
        this.exchanges = {};
        this.db = null;
        this.models = null;
        this.services = null;
        this.controllers = null;
        this.isRunning = false;

        console.log(`🎯 Запуск з біржею: WhiteBit`);
    }

    /**
     * Ініціалізація бота
     */
    async init() {
        try {
            // Підключення до БД
            this.db = await database.connect();
            console.log('✅ БД підключено');

            // Ініціалізація моделей
            this.models = initModels(this.db);
            console.log('✅ Моделі ініціалізовано');

            // Налаштування коннекторів
            this.setupConnectors();

            // Ініціалізація сервісів
            this.services = initServices(
                this.models,
                this.exchanges,
                path.join(__dirname, 'logs')
            );
            console.log('✅ Сервіси ініціалізовано');

            // Ініціалізація контролерів
            this.controllers = initControllers(this.services);
            console.log('✅ Контролери ініціалізовано');

            // Налаштування middleware
            this.setupMiddleware();

            // Налаштування engine
            this.setupEngine();

            // Налаштування роутів
            this.setupRoutes();

            // Зберігаємо DB в app.locals для доступу в контролерах
            this.app.locals.db = this.db;

            console.log('✅ CryptoSpotBot ініціалізовано');
            return this;
        } catch (error) {
            console.error('❌ Помилка ініціалізації бота:', error);
            throw error;
        }
    }

    /**
     * Налаштування коннекторів до бірж
     */
    setupConnectors() {
        console.log('🔌 Налаштування WhiteBit коннектора...');

        this.exchanges.whitebit = new WhiteBitConnector({
            apiKey: process.env.WHITEBIT_API_KEY,
            secretKey: process.env.WHITEBIT_SECRET_KEY
        });

        console.log('✅ WhiteBit коннектор ініціалізовано');
    }

    /**
     * Налаштування middleware
     */
    setupMiddleware() {
        setupMiddleware(this.app, monitoring);

        // Існуючі роути для моніторингу та налаштувань
        this.app.use('/monitoring', monitoringRoutes);
        this.app.use('/settings', settingsRoutes);
    }

    /**
     * Налаштування торгового движка
     */
    setupEngine() {
        this.riskManager = new RiskManager({
            maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 1000,
            riskPercentage: parseFloat(process.env.RISK_PERCENTAGE) || 2
        });

        this.wsManager = new WebSocketManager({
            exchanges: this.exchanges
        });

        console.log('✅ Торговий движок налаштовано');
    }

    /**
     * Налаштування роутів
     */
    setupRoutes() {
        // Налаштування всіх API роутів
        setupRoutes(this.app, this.controllers);

        // Error handling middleware (має бути останнім)
        this.app.use(notFoundHandler);
        this.app.use(errorHandler);

        console.log('✅ Роути налаштовано');
    }

    /**
     * Запуск бота
     */
    async start() {
        if (this.isRunning) {
            throw new Error('⚠️ Бот вже запущено');
        }

        console.log(`🚀 Запуск спот торгового бота з WhiteBit`);

        // Тестування підключення до WhiteBit
        try {
            await this.exchanges.whitebit.testConnection();
            console.log(`✅ WhiteBit підключено`);
        } catch (error) {
            console.error(`⚠️ WhiteBit помилка: ${error.message}`);
            throw error;
        }

        // Запуск WebSocket менеджера
        if (this.wsManager) {
            await this.wsManager.start();
        }

        this.isRunning = true;
        console.log(`✅ Бот запущено з WhiteBit`);
    }

    /**
     * Зупинка бота
     */
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

    /**
     * Запуск веб-сервера
     */
    listen(port = null) {
        const serverPort = port || process.env.PORT || 3000;
        this.server = this.app.listen(serverPort, () => {
            console.log(`🌐 Веб-сервер запущено на порту ${serverPort}`);
        });
        return this.server;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Закриття підключень...');

        try {
            // Зупиняємо бота якщо він працює
            if (this.isRunning) {
                await this.stop();
            }

            // Закриваємо веб-сервер
            if (this.server) {
                await new Promise((resolve, reject) => {
                    this.server.close((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log('✅ Веб-сервер закрито');
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

module.exports = CryptoSpotBot;