// middleware/error.middleware.js

/**
 * Middleware для обробки помилок
 */
function errorHandler(err, req, res, next) {
    console.error('❌ Error:', err);

    // Логування стеку помилки
    if (err.stack) {
        console.error('Stack:', err.stack);
    }

    // Визначення статус коду
    const statusCode = err.statusCode || err.status || 500;

    // Формування відповіді
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            code: err.code,
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack
            })
        }
    });
}

/**
 * Middleware для обробки 404 (не знайдено)
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.method} ${req.url} not found`,
            code: 'NOT_FOUND'
        }
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};