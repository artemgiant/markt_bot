// database/models/trade-history.model.js
const BaseModel = require('./base.model');

class TradeHistoryModel extends BaseModel {
    /**
     * Створення запису про угоду
     */
    async create({ signal, order }) {
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

        const query = `
            INSERT INTO public.trade_history (
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
            ) RETURNING id, created_at
        `;

        const values = [
            signal.exchange,
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
            signal.action,
            signal.botName,
            signal.timeframe,
            signal.hash,
            signal.originalSignal,
            executedAt
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    /**
     * Отримати історію угод
     */
    async getHistory(limit = 100, filters = {}) {
        let query = `
            SELECT *
            FROM trade_history
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (filters.exchange) {
            query += ` AND exchange = $${paramIndex}`;
            params.push(filters.exchange);
            paramIndex++;
        }

        if (filters.symbol) {
            query += ` AND symbol = $${paramIndex}`;
            params.push(filters.symbol);
            paramIndex++;
        }

        if (filters.side) {
            query += ` AND side = $${paramIndex}`;
            params.push(filters.side);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await this.query(query, params);
        return result.rows;
    }

    /**
     * Отримати угоду за ID
     */
    async findById(id) {
        const result = await this.query(
            'SELECT * FROM trade_history WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    /**
     * Отримати угоду за order_id
     */
    async findByOrderId(orderId) {
        const result = await this.query(
            'SELECT * FROM trade_history WHERE order_id = $1',
            [orderId.toString()]
        );
        return result.rows[0];
    }

    /**
     * Отримати статистику угод
     */
    async getStats(filters = {}) {
        let query = `
            SELECT 
                COUNT(*) as total_trades,
                SUM(CASE WHEN side = 'buy' THEN 1 ELSE 0 END) as buy_count,
                SUM(CASE WHEN side = 'sell' THEN 1 ELSE 0 END) as sell_count,
                SUM(deal_money) as total_volume,
                SUM(deal_fee) as total_fees
            FROM trade_history
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (filters.exchange) {
            query += ` AND exchange = $${paramIndex}`;
            params.push(filters.exchange);
            paramIndex++;
        }

        if (filters.dateFrom) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }

        if (filters.dateTo) {
            query += ` AND created_at <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }

        const result = await this.query(query, params);
        return result.rows[0];
    }
}

module.exports = TradeHistoryModel;