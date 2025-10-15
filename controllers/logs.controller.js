// controllers/logs.controller.js

class LogsController {
    constructor(services) {
        this.loggingService = services.logging;
    }

    /**
     * Отримання останніх логів
     */
    async getRecentLogs(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const type = req.query.type;

            const logs = await this.loggingService.getRecentLogs(limit, type);

            res.json({
                success: true,
                count: logs.length,
                logs
            });
        } catch (error) {
            console.error('❌ Помилка отримання логів:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Отримання деталей логу за ID
     */
    async getLogById(req, res) {
        try {
            const { id } = req.params;
            const log = await this.loggingService.getLogById(id);

            if (!log) {
                return res.status(404).json({
                    success: false,
                    error: 'Log not found'
                });
            }

            res.json({
                success: true,
                log
            });
        } catch (error) {
            console.error('❌ Помилка отримання логу:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = LogsController;
