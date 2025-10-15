

// utils/status-mapper.utils.js

/**
 * Конвертація статусу з WhiteBIT формату в формат БД
 */
function mapWhiteBitStatus(status) {
    const statusMap = {
        'PARTIALLY_FILLED': 'partially_filled',
        'FILLED': 'filled',
        'NEW': 'new',
        'CANCELLED': 'cancelled'
    };

    return statusMap[status] || status.toLowerCase();
}

/**
 * Конвертація статусу з БД формату в WhiteBIT формат
 */
function mapStatusToWhiteBit(status) {
    const statusMap = {
        'partially_filled': 'PARTIALLY_FILLED',
        'filled': 'FILLED',
        'new': 'NEW',
        'cancelled': 'CANCELLED'
    };

    return statusMap[status] || status.toUpperCase();
}

module.exports = {
    mapWhiteBitStatus,
    mapStatusToWhiteBit
};