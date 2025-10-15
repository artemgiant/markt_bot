// database/models/base.model.js
class BaseModel {
    constructor(db) {
        this.db = db;
    }

    async query(sql, params = []) {
        try {
            return await this.db.query(sql, params);
        } catch (error) {
            console.error(`❌ Database query error:`, error);
            throw error;
        }
    }
}

module.exports = BaseModel;