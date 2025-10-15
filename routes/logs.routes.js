// routes/logs.routes.js
const express = require('express');
const router = express.Router();

/**
 * Налаштування роутів для логів
 */
function setupLogsRoutes(controllers) {
    const { logs } = controllers;

    // GET /api/logs/recent - Останні логи
    router.get('/recent', logs.getRecentLogs.bind(logs));

    // GET /api/logs/:id - Деталі логу за ID
    router.get('/:id', logs.getLogById.bind(logs));

    return router;
}

module.exports = setupLogsRoutes;