// connectors/trading_view.js
const http = require('http');
const url = require('url');
const {static} = require("express");


class TradingViewConnector {
    /**
     * Парсинг FUTURES сигналу
     * Формат: ENTER-LONG_BINANCE_SOLUSDT_BOT-NAME-ENBIiG_5M_e5009c...
     */
    static parseSignalFutures(signalString) {
        const cleanSignal = signalString.trim();
        const parts = cleanSignal.split('_');

        if (parts.length < 5) {
            throw new Error(`Невірний формат сигналу. Отримано ${parts.length} частин, очікується мінімум 5`);
        }

        let action = '';
        let type = '';
        let side;

        if (parts[0].includes('ENTER-LONG')) {
            action = 'ENTER';
            type = 'LONG';
        } else if (parts[0].includes('EXIT-LONG')) {
            action = 'EXIT';
            type = 'LONG';
        } else if (parts[0].includes('ENTER-SHORT')) {
            action = 'ENTER';
            type = 'SHORT';
        } else if (parts[0].includes('EXIT-SHORT')) {
            action = 'EXIT';
            type = 'SHORT';
        } else if (parts[0].includes('EXIT-ALL')) {
            action = 'EXIT';
            type = 'ALL';
        } else {
            throw new Error(`Невідомий тип дії: ${parts[0]}`);
        }


        if (action === 'ENTER' && type === 'LONG') {
            side = 'buy';  // Відкриваємо Long позицію = купуємо
            } else if (action === 'ENTER' && type === 'SHORT') {
            side = 'sell'; // Відкриваємо Short позицію = продаємо
        } else if (action === 'EXIT' && type === 'LONG') {
            side = 'sell'; // Закриваємо Long позицію = продаємо
        } else if (action === 'EXIT' && type === 'SHORT') {
            side = 'buy';  // Закриваємо Short позицію = купуємо
        }


        return {
            action: action,              // ENTER/EXIT
            positionType: type,          // LONG/SHORT/ALL
            side: side,   // sell
            exchange: parts[1],          // BINANCE
            coinCode: parts[2].replace('-','_'),          // SOL_USDT
            botName: parts[3],           // BOT-NAME-ENBIiG
            timeframe: parts[4],         // 5M
            hash: parts[5] || '',        // e5009c... (якщо є)
            originalSignal: cleanSignal
        };
    }

    /**
     * Парсинг SPOT сигналу
     * Формат: BUY_BINANCE_BTCUSDT_BOT-NAME-ENBIiG_1M_e5009c...
     */
    static parseSignalSpot(signalString) {
        // signalString = "BUY_BINANCE_DBTC-DUSDT_BOT-NAME-ENBIiG_1M_e5009c035e87043ed06ccde0";

        const cleanSignal = signalString.trim();
        const parts = cleanSignal.split('_');

        if (parts.length < 5) {
            throw new Error(`Невірний формат сигналу. Отримано ${parts.length} частин, очікується мінімум 5`);
        }

        return {
            action: parts[0].toLowerCase(),              // sell/buy
            exchange: parts[1],                          // BINANCE
            coinCode: parts[2].replace('-','_'),        // BTCUSDT
            botName: parts[3],                           // BOT-NAME-ENBIiG
            timeframe: parts[4],                         // 1M
            hash: parts[5] || '',                        // хеш (якщо є)
            originalSignal: cleanSignal
        };
    }

    /**
     * Вивід детальної інформації про розпарсений FUTURES сигнал в консоль
     */
    static debugSignal(parsedSignal) {
        console.log('\n📊 ============================================');
        console.log('📊 FUTURES SIGNAL RECEIVED');
        console.log('📊 ============================================');
        console.log('   Action:     ', parsedSignal.action);
        console.log('   Direction:  ', parsedSignal.positionType);
        console.log('   Exchange:   ', parsedSignal.exchange);
        console.log('   Symbol:     ', parsedSignal.coinCode);
        console.log('   Bot Name:   ', parsedSignal.botName);
        console.log('   Timeframe:  ', parsedSignal.timeframe);
        if (parsedSignal.hash) {
            console.log('   Hash:       ', parsedSignal.hash);
        }
        console.log('📊 ============================================');

        // Логіка інтерпретації сигналу
        if (parsedSignal.action === 'ENTER') {
            if (parsedSignal.positionType === 'LONG') {
                console.log('   ✅ ВІДКРИВАЄМО ЛОНГ ПОЗИЦІЮ');
            } else if (parsedSignal.positionType === 'SHORT') {
                console.log('   ✅ ВІДКРИВАЄМО ШОРТ ПОЗИЦІЮ');
            }
        } else if (parsedSignal.action === 'EXIT') {
            if (parsedSignal.positionType === 'LONG') {
                console.log('   ❌ ЗАКРИВАЄМО ЛОНГ ПОЗИЦІЮ');
            } else if (parsedSignal.positionType === 'SHORT') {
                console.log('   ❌ ЗАКРИВАЄМО ШОРТ ПОЗИЦІЮ');
            } else if (parsedSignal.positionType === 'ALL') {
                console.log('   ❌ ЗАКРИВАЄМО ВСІ ПОЗИЦІЇ');
            }
        }
        console.log('📊 ============================================\n');
    }

    /**
     * Форматування лог-записів для SPOT сигналів
     */
    static formatLogEntry(req, additionalData = {}) {
        const timestamp = new Date().toISOString();

        const parsedSignal = this.parseSignalSpot(req.body);

        const logEntry = {
            timestamp,
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
            body: req.body,
            params: req.params,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            ...additionalData,
            parsedSignal
        };

        return JSON.stringify(logEntry, null, 2) + ',\n';
    }

    /**
     * Форматування лог-записів для FUTURES сигналів
     */
    static formatLogEntryFutures(req, additionalData = {}) {
        const timestamp = new Date().toISOString();

        const parsedSignal = this.parseSignalFutures(req.body);

        const logEntry = {
            timestamp,
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
            body: req.body,
            params: req.params,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            ...additionalData,
            parsedSignal
        };

        return JSON.stringify(logEntry, null, 2) + ',\n';
    }
}

module.exports = TradingViewConnector;