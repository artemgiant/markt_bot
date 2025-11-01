#!/bin/bash

echo "🚀 Starting deployment for trading-bot..."

# Перейти в директорію проєкту
cd /var/www/trading-bot || exit

echo "📦 Git repository update..."

# Скинути локальні зміни
git reset --hard && git clean -df

# Завантажити зміни з Git
git pull origin master

echo "📦 Installing dependencies..."

# Встановити/оновити залежності
npm install

echo "🔄 Restarting PM2 process..."

# Перезапустити додаток через PM2
pm2 restart market_bot

echo "✅ Deployment completed successfully!"

# Показати статус
pm2 list

# Показати останні логи
echo "📋 Last logs:"
pm2 logs market_bot --lines 20 --nostream
