// ecosystem.config.js
const moment = require('moment'); // npm install moment якщо не встановлено

module.exports = {
  apps: [{
    name: 'myapp',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // Змінні середовища
    env: {
      NODE_ENV: 'development',
      PORT: 80
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    },

    // Логи з датою в назві файлу
    error_file: `./logs/PM2/error-${new Date().toISOString().split('T')[0]}.log`,
    out_file: `./logs/PM2/out-${new Date().toISOString().split('T')[0]}.log`,
    log_file: `./logs/PM2/combined-${new Date().toISOString().split('T')[0]}.log`,

    // Додавання timestamp до кожного рядка логу
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Об'єднання логів в один файл
    merge_logs: true,

    // Додаткові налаштування
    min_uptime: '10s',
    max_restarts: 10
  }]
};
