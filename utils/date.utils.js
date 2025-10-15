


// utils/date.utils.js

/**
 * Форматування дати для файлів логів
 */
function getLogFileName(prefix = 'log') {
    const today = new Date().toISOString().split('T')[0];
    return `${prefix}_${today}.json`;
}

/**
 * Конвертація Unix timestamp в Date
 */
function unixToDate(timestamp) {
    return new Date(timestamp * 1000);
}

/**
 * Отримати поточну дату в ISO форматі
 */
function getCurrentISODate() {
    return new Date().toISOString();
}

/**
 * Форматування дати для БД
 */
function formatDateForDB(date) {
    return new Date(date).toISOString();
}

module.exports = {
    getLogFileName,
    unixToDate,
    getCurrentISODate,
    formatDateForDB
};