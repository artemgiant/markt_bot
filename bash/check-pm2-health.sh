#!/bin/bash
# bash/check-pm2-health.sh
# Скрипт для перевірки здоров'я PM2

PROJECT_DIR="$(dirname "$(dirname "$(realpath "$0")")")"
APP_NAME="myapp"
LOG_FILE="$PROJECT_DIR/logs/PM2/health-check.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Перевірка чи працює PM2
if ! pgrep -x "PM2" > /dev/null; then
    log_message "ПОПЕРЕДЖЕННЯ: PM2 процес не знайдено"

    # Спроба перезапуску
    cd "$PROJECT_DIR"
    pm2 resurrect
    log_message "Спроба відновлення PM2 процесів"
fi

# Перевірка статусу застосунку
STATUS=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status")

if [ "$STATUS" != "online" ]; then
    log_message "ПОПЕРЕДЖЕННЯ: Застосунок $APP_NAME не в статусі online: $STATUS"
    pm2 restart "$APP_NAME"
    log_message "Перезапущено застосунок $APP_NAME"
else
    log_message "Застосунок $APP_NAME працює нормально"
fi
