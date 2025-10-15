// middleware/index.js
const express = require('express');
const path = require('path');
const setupCors = require('./cors.middleware');
const ngrokSkipWarning = require('./ngrok.middleware');
const { errorHandler, notFoundHandler } = require('./error.middleware');
const validation = require('./validation.middleware');

/**
 * Налаштування всіх middleware для Express додатку
 */
function setupMiddleware(app, monitoring) {
    // CORS
    app.use(setupCors());

    // Body parsers
    app.use(express.json());
    app.use('/api/trading_view', express.text({ type: 'text/plain' }));

    // Monitoring middleware
    if (monitoring && monitoring.middleware) {
        app.use(monitoring.middleware());
    }

    // Ngrok warning bypass
    app.use(ngrokSkipWarning);

    // Статичні файли
    app.use('/monitoring/assets', express.static(path.join(process.cwd(), 'public/monitoring')));
    app.use('/settings/assets', express.static(path.join(process.cwd(), 'public/settings')));
    app.use(express.static('public'));
}

module.exports = {
    setupMiddleware,
    setupCors,
    ngrokSkipWarning,
    errorHandler,
    notFoundHandler,
    validation
};