#!/bin/bash
# bash/log-rotate-daily.sh
# Скрипт для щоденного перезапуску PM2 з новими логами

# Встановлення змінних
PROJECT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"
APP_NAME="myapp"
DATE=$(date +%Y-%m-%d)
LOG_DIR="$PROJECT_DIR/logs/PM2"
TODAY_LOG_DIR="$LOG_DIR/$DATE"

# Логування виконання скрипта
SCRIPT_LOG="$LOG_DIR/rotate-script.log"

# Функція логування
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$SCRIPT_LOG"
}

log_message "=== Початок ротації логів PM2 ==="
log_message "Проект: $PROJECT_DIR"
log_message "Дата: $DATE"

# Створення папки для логів поточного дня
if [ ! -d "$TODAY_LOG_DIR" ]; then
    mkdir -p "$TODAY_LOG_DIR"
    log_message "Створено директорію: $TODAY_LOG_DIR"
else
    log_message "Директорія вже існує: $TODAY_LOG_DIR"
fi

# Перехід до директорії проекту
cd "$PROJECT_DIR" || {
    log_message "ПОМИЛКА: Не вдалося перейти до $PROJECT_DIR"
    exit 1
}

# Перевірка чи працює PM2
if ! command -v pm2 &> /dev/null; then
    log_message "ПОМИЛКА: PM2 не встановлено"
    exit 1
fi

# Перевірка чи працює застосунок
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    log_message "Застосунок $APP_NAME знайдено в PM2"

    # Зупинка застосунку
    log_message "Зупинка застосунку $APP_NAME"
    pm2 stop "$APP_NAME"

    # Видалення з PM2
    log_message "Видалення $APP_NAME з PM2"
    pm2 delete "$APP_NAME"
else
    log_message "Застосунок $APP_NAME не знайдено в PM2"
fi



# Запуск застосунку з новою конфігурацією
log_message "Запуск застосунку з новою конфігурацією"
pm2 start ecosystem.config.js --env development

# Збереження конфігурації PM2
log_message "Збереження конфігурації PM2"
pm2 save

# Перевірка статусу
log_message "Статус застосунку після перезапуску:"
pm2 list | tee -a "$SCRIPT_LOG"

# Очищення старих логів (старше 30 днів)
log_message "Очищення старих логів (старше 30 днів)"
find "$LOG_DIR" -name "*.log*" -type f -mtime +30 -exec rm -f {} \; 2>/dev/null || true
find "$LOG_DIR" -type d -empty -delete 2>/dev/null || true

# Архівація логів попереднього дня (якщо існують)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
YESTERDAY_DIR="$LOG_DIR/$YESTERDAY"
if [ -d "$YESTERDAY_DIR" ]; then
    log_message "Архівація логів за $YESTERDAY"
    tar -czf "$LOG_DIR/archived-$YESTERDAY.tar.gz" -C "$LOG_DIR" "$YESTERDAY" && rm -rf "$YESTERDAY_DIR"
fi

log_message "=== Ротація логів завершена успішно ==="

# Відправка інформації про статус (опціонально)
# Розкоментувати якщо потрібно отримувати email сповіщення
# echo "PM2 log rotation completed at $(date)" | mail -s "PM2 Log Rotation" admin@example.com

exit 0
