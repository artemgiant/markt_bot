// middleware/ngrok.middleware.js

/**
 * Middleware для обходу ngrok warning page
 */
function ngrokSkipWarning(req, res, next) {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
}

module.exports = ngrokSkipWarning;