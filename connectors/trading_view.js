const http = require('http');
const url = require('url');
const {static} = require("express");


class TradingViewConnector {
// Функція для парсингу сигналу
    static  parseSignalFutures(signalString) {
        const cleanSignal = signalString.trim();
        const parts = cleanSignal.split('_');

        if (parts.length < 5) {
            throw new Error(`Невірний формат сигналу. Отримано ${parts.length} частин, очікується мінімум 5`);
        }

        let action = '';
        let type = '';

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

        return {
            action: action,              // ENTER/EXIT
            positionType: type,          // LONG/SHORT/ALL
            exchange: parts[1],          // BINANCE
            coinCode: parts[2],          // MYXUSDT
            botName: parts[3],           // BOT-NAME-ENBIIG
            timeframe: parts[4],         // 1M
            hash: parts[5] || '',        // хеш (якщо є)
            originalSignal: cleanSignal
        };
    }



    static  parseSignalSpot(signalString) {


       // signalString = "BUY_BINANCE_DBTC-DUSDT_BOT-NAME-ENBIiG_1M_e5009c035e87043ed06ccde0";

        const cleanSignal = signalString.trim();
        const parts = cleanSignal.split('_');

        if (parts.length < 5) {
            throw new Error(`Невірний формат сигналу. Отримано ${parts.length} частин, очікується мінімум 5`);
        }


        return {
            action: parts[0].toLocaleLowerCase(),              // sell/bay
            exchange: parts[1],          // BINANCE
            coinCode: parts[2].replace('-','_'),          // MYXUSDT
            botName: parts[3],           // BOT-NAME-ENBIIG
            timeframe: parts[4],         // 1M
            hash: parts[5] || '',        // хеш (якщо є)
            originalSignal: cleanSignal
        };
    }


   static  debugSignal(parsedSignal) {
        try {


            console.log('\n--- РОЗПАРСЕНИЙ СИГНАЛ ---');
            console.log('🎯 Дія:', parsedSignal.action);
            console.log('📈 Тип позиції:', parsedSignal.positionType);
            console.log('🏢 Біржа:', parsedSignal.exchange);
            console.log('💰 Код монети:', parsedSignal.coinCode);
            console.log('🤖 Назва бота:', parsedSignal.botName);
            console.log('⏰ Таймфрейм:', parsedSignal.timeframe);
            if (parsedSignal.hash) {
                console.log('🔗 Хеш:', parsedSignal.hash);
            }

            // Логіка обробки сигналів
            console.log('\n--- ДІЯ ---');
            if (parsedSignal.action === 'ENTER') {
                if (parsedSignal.positionType === 'LONG') {
                    console.log('✅ ВІДКРИВАЄМО ЛОНГ ПОЗИЦІЮ');
                } else if (parsedSignal.positionType === 'SHORT') {
                    console.log('✅ ВІДКРИВАЄМО ШОРТ ПОЗИЦІЮ');
                }
            } else if (parsedSignal.action === 'EXIT') {
                if (parsedSignal.positionType === 'LONG') {
                    console.log('❌ ЗАКРИВАЄМО ЛОНГ ПОЗИЦІЮ');
                } else if (parsedSignal.positionType === 'SHORT') {
                    console.log('❌ ЗАКРИВАЄМО ШОРТ ПОЗИЦІЮ');
                } else if (parsedSignal.positionType === 'ALL') {
                    console.log('❌ ЗАКРИВАЄМО ВСІ ПОЗИЦІЇ');
                }
            }

            console.log('=====================================\n');
        }catch(err) {
            console.error('❌ Помилка обробки сигналу:', error.message);

            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: error.message
            }));
        }

    }

    // Функція для форматування лог-записів
    static formatLogEntry(req, additionalData = {}) {
        const timestamp = new Date().toISOString();

         const parsedSignal = this.parseSignalSpot(req.body)

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

