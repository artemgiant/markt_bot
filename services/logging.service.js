// services/logging.service.js
const fs = require('fs');
const path = require('path');
const { getLogFileName, getCurrentISODate } = require('../utils');

class LoggingService {
    constructor(models, logsDir = 'logs') {
        this.systemLogModel = models.systemLog;
        this.logsDir = logsDir;

        // Створюємо папку для логів якщо її немає
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    /**
     * Логування в файл
     */
    async logToFile(data, prefix = 'log') {
        try {
            const fileName = getLogFileName(prefix);
            const filePath = path.join(this.logsDir, fileName);

            const logEntry = typeof data === 'string' ? data : JSON.stringify(data) + '\n';

            fs.appendFileSync(filePath, logEntry);
            console.log(`✅ Лог записано у файл: ${fileName}`);

            return { success: true, file: fileName };
        } catch (error) {
            console.error('❌ Помилка запису в файл:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Логування в БД
     */
    async logToDB({ level, category, message, details, type }) {
        try {
            const result = await this.systemLogModel.create({
                level,
                category,
                message,
                details,
                type
            });

            console.log(`✅ Лог збережено в БД, ID: ${result.id}`);
            return { success: true, id: result.id };
        } catch (error) {
            console.error('❌ Помилка збереження в БД:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Комбіноване логування (файл + БД)
     */
    async log({ level, category, message, details, type, logToFile = true }) {
        const results = {
            file: null,
            database: null
        };

        // Логування в файл
        if (logToFile) {
            results.file = await this.logToFile({
                timestamp: getCurrentISODate(),
                level,
                category,
                message,
                details,
                type
            }, type || 'log');
        }

        // Логування в БД
        results.database = await this.logToDB({
            level,
            category,
            message,
            details,
            type
        });

        return results;
    }

    /**
     * Логування помилки
     */
    async logError(category, message, details, logToFile = true) {
        return this.log({
            level: 'error',
            category,
            message,
            details: {
                ...details,
                timestamp: getCurrentISODate()
            },
            type: 'error',
            logToFile
        });
    }

    /**
     * Логування інформації
     */
    async logInfo(category, message, details, logToFile = true) {
        return this.log({
            level: 'info',
            category,
            message,
            details: {
                ...details,
                timestamp: getCurrentISODate()
            },
            type: 'info',
            logToFile
        });
    }

    /**
     * Логування торгового сигналу
     */
    async logTradingSignal(signal, order, error = null) {
        return this.log({
            level: error ? 'error' : 'info',
            category: 'trading_signal',
            message: `${signal.action} ${signal.coinCode} - ${order ? 'Success' : 'Failed'}`,
            details: {
                signal,
                order,
                error,
                success: !!order
            },
            type: 'trading_signal',
            logToFile: true
        });
    }

    /**
     * Отримати останні логи
     */
    async getRecentLogs(limit = 50, type = null) {
        return this.systemLogModel.getRecent(limit, type);
    }

    /**
     * Отримати лог за ID
     */
    async getLogById(id) {
        return this.systemLogModel.findById(id);
    }
}

module.exports = LoggingService;