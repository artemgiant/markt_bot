// database/models/system-log.model.js
const BaseModel = require('./base.model');

class SystemLogModel extends BaseModel {
    /**
     * Створення запису лога
     */
    async create({ level, type, category, message, details }) {
        const query = `
            INSERT INTO system_logs (level, type, category, message, details)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `;

        const values = [
            level || 'info',
            type || 'info',
            category || 'system',
            message,
            details ? JSON.stringify(details) : null
        ];

        const result = await this.query(query, values);
        return result.rows[0];
    }

    /**
     * Отримати останні логи
     */
    async getRecent(limit = 100, filters = {}) {
        let query = `
            SELECT *
            FROM system_logs
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (filters.level) {
            query += ` AND level = $${paramIndex}`;
            params.push(filters.level);
            paramIndex++;
        }

        if (filters.type) {
            query += ` AND type = $${paramIndex}`;
            params.push(filters.type);
            paramIndex++;
        }

        if (filters.category) {
            query += ` AND category = $${paramIndex}`;
            params.push(filters.category);
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

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await this.query(query, params);
        return result.rows;
    }

    /**
     * Отримати лог за ID
     */
    async getById(id) {
        const query = `
            SELECT * FROM system_logs
            WHERE id = $1
        `;

        const result = await this.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Отримати логи за типом
     */
    async getByType(type, limit = 100) {
        const query = `
            SELECT * FROM system_logs
            WHERE type = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await this.query(query, [type, limit]);
        return result.rows;
    }

    /**
     * Отримати логи за категорією
     */
    async getByCategory(category, limit = 100) {
        const query = `
            SELECT * FROM system_logs
            WHERE category = $1
            ORDER BY created_at DESC
                LIMIT $2
        `;

        const result = await this.query(query, [category, limit]);
        return result.rows;
    }

    /**
     * Отримати логи за рівнем (level)
     */
    async getByLevel(level, limit = 100) {
        const query = `
            SELECT * FROM system_logs
            WHERE level = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await this.query(query, [level, limit]);
        return result.rows;
    }

    /**
     * Отримати статистику логів
     */
    async getStats(filters = {}) {
        let query = `
            SELECT 
                level,
                type,
                category,
                COUNT(*) as count
            FROM system_logs
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

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

        query += ` GROUP BY level, type, category ORDER BY count DESC`;

        const result = await this.query(query, params);
        return result.rows;
    }

    /**
     * Видалити старі логи
     */
    async deleteOld(daysToKeep = 30) {
        const query = `
            DELETE FROM system_logs
            WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
            RETURNING id
        `;

        const result = await this.query(query);
        return result.rows.length;
    }

    /**
     * Пошук логів за текстом
     */
    async search(searchText, limit = 100) {
        const query = `
            SELECT * FROM system_logs
            WHERE message ILIKE $1
               OR details::text ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await this.query(query, [`%${searchText}%`, limit]);
        return result.rows;
    }

    /**
     * Отримати кількість логів за рівнем
     */
    async getCountByLevel() {
        const query = `
            SELECT 
                level,
                COUNT(*) as count
            FROM system_logs
            GROUP BY level
            ORDER BY count DESC
        `;

        const result = await this.query(query);
        return result.rows;
    }

    /**
     * Очистити всі логи
     */
    async truncate() {
        const query = `TRUNCATE TABLE system_logs RESTART IDENTITY`;
        await this.query(query);
        return true;
    }
}

module.exports = SystemLogModel;