# Торговий бот з селективним запуском бірж
# Версія: 1.0.0

NODE := node
NPM := npm
PM2 := pm2






# Кольори
GREEN := \033[0;32m
BLUE := \033[0;34m
YELLOW := \033[1;33m
RED := \033[0;31m
PURPLE := \033[0;35m
NC := \033[0m

.DEFAULT_GOAL := help

make-ssh:
	ssh root@164.92.139.111 && cd /var/www/trading-bot/ && kill -9 $(lsof -i:80 -t)

node-kill-process:
	killall node
kill-process-in-port:
	kill -9 $(lsof -i:80 -t)

.PHONY: help
help:
	@echo "$(BLUE)🤖 Торговий бот - Селективний запуск$(NC)"
	@echo ""
	@echo "$(PURPLE)🏭 ОСНОВНІ КОМАНДИ:$(NC)"
	@echo "$(GREEN)make setup$(NC)          - Налаштування проекту"
	@echo "$(GREEN)make dev$(NC)            - Всі біржі (розробка)"
	@echo "$(GREEN)make start$(NC)          - Всі біржі (продакшн)"
	@echo ""
	@echo "$(PURPLE)🎯 ВИБІР БІРЖ:$(NC)"
	@echo "$(GREEN)make binance$(NC)        - Тільки Binance"
	@echo "$(GREEN)make mexc$(NC)           - Тільки MEXC"
	@echo "$(GREEN)make whitebit$(NC)       - Тільки WhiteBit"
	@echo "$(GREEN)make futures$(NC)        - Binance + MEXC (фючерси)"
	@echo "$(GREEN)make spot$(NC)           - Тільки WhiteBit (спот)"
	@echo ""
	@echo "$(PURPLE)🔧 РОЗШИРЕНІ:$(NC)"
	@echo "$(GREEN)make custom EX=bin,mexc$(NC) - Кастомний набір"
	@echo "$(GREEN)make test-conn$(NC)      - Тест підключень"
	@echo "$(GREEN)make status$(NC)         - Статус процесів"
	@echo "$(GREEN)make stop$(NC)           - Зупинити все"

# ===== ОСНОВНІ КОМАНДИ =====

.PHONY: setup
setup:
	@echo "$(BLUE)📦 Встановлення пакетів...$(NC)"
	$(NPM) install
	@echo "$(BLUE)⚙️ Створення конфігурації...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@mkdir -p logs
	@echo "$(GREEN)✅ Готово!$(NC)"

.PHONY: dev
dev:
	@echo "$(BLUE)🚀 Розробка (всі біржі)...$(NC)"
	$(NPM) run dev

.PHONY: start
start:
	@echo "$(BLUE)🚀 Продакшн (всі біржі)...$(NC)"
	$(NODE) index.js

# ===== ОКРЕМІ БІРЖІ =====

.PHONY: binance
binance:
	@echo "$(YELLOW)🔸 Запуск тільки Binance...$(NC)"
	$(NODE) index.js --exchanges binance

.PHONY: mexc
mexc:
	@echo "$(YELLOW)🔸 Запуск тільки MEXC...$(NC)"
	$(NODE) index.js --exchanges mexc

.PHONY: whitebit
whitebit:
	@echo "$(YELLOW)🔸 Запуск тільки WhiteBit...$(NC)"
	$(NODE) index.js --exchanges whitebit

# ===== КОМБІНАЦІЇ БІРЖ =====

.PHONY: futures
futures:
	@echo "$(PURPLE)⚡ Фючерсні біржі (Binance + MEXC)...$(NC)"
	$(NODE) index.js --exchanges binance,mexc

.PHONY: spot
spot:
	@echo "$(PURPLE)💰 Спотова біржа (WhiteBit)...$(NC)"
	$(NODE) index.js --exchanges whitebit

.PHONY: custom
custom:
	@echo "$(PURPLE)🎯 Кастомний набір: $(EX)...$(NC)"
	@if [ -z "$(EX)" ]; then \
		echo "$(RED)❌ Використовуйте: make custom EX=binance,mexc$(NC)"; \
	else \
		$(NODE) index.js --exchanges $(EX); \
	fi

# ===== PM2 ЗАПУСК =====

.PHONY: pm2-binance
pm2-binance:
	@echo "$(BLUE)🚀 PM2 Binance...$(NC)"
	$(PM2) start index.js --name "bot-binance" -- --exchanges binance

.PHONY: pm2-mexc
pm2-mexc:
	@echo "$(BLUE)🚀 PM2 MEXC...$(NC)"
	$(PM2) start index.js --name "bot-mexc" -- --exchanges mexc

.PHONY: pm2-whitebit
pm2-whitebit:
	@echo "$(BLUE)🚀 PM2 WhiteBit...$(NC)"
	$(PM2) start index.js --name "bot-whitebit" -- --exchanges whitebit

.PHONY: pm2-futures
pm2-futures:
	@echo "$(BLUE)🚀 PM2 Futures...$(NC)"
	$(PM2) start index.js --name "bot-futures" -- --exchanges binance,mexc

.PHONY: pm2-all
pm2-all: pm2-binance pm2-mexc pm2-whitebit
	@echo "$(GREEN)✅ Всі боти запущено через PM2$(NC)"

# ===== ТЕСТУВАННЯ =====

.PHONY: test-conn
test-conn:
	@echo "$(BLUE)🔍 Тест підключень...$(NC)"
	@$(NODE) -e "
	require('dotenv').config();
	const BinanceConnector = require('./connectors/binance');
	const MEXCConnector = require('./connectors/mexc');
	const WhiteBitConnector = require('./connectors/whitebit');

	async function testAll() {
		const tests = [
			{ name: 'Binance', conn: new BinanceConnector({apiKey: process.env.BINANCE_API_KEY, secretKey: process.env.BINANCE_SECRET_KEY}) },
			{ name: 'MEXC', conn: new MEXCConnector({apiKey: process.env.MEXC_API_KEY, secretKey: process.env.MEXC_SECRET_KEY}) },
			{ name: 'WhiteBit', conn: new WhiteBitConnector({apiKey: process.env.WHITEBIT_API_KEY, secretKey: process.env.WHITEBIT_SECRET_KEY}) }
		];

		for (const test of tests) {
			try {
				await test.conn.testConnection();
				console.log('✅', test.name, 'OK');
			} catch (error) {
				console.log('❌', test.name, 'FAIL:', error.message);
			}
		}
	}
	testAll();
	"

# ===== УПРАВЛІННЯ =====

.PHONY: status
status:
	@echo "$(BLUE)📊 Статус процесів...$(NC)"
	$(PM2) status

.PHONY: logs
logs:
	@echo "$(BLUE)📋 Логи...$(NC)"
	$(PM2) logs --lines 20

.PHONY: stop
stop:
	@echo "$(BLUE)🛑 Зупинка всіх ботів...$(NC)"
	$(PM2) stop all || true
	pkill -f "node.*index.js" || true

.PHONY: restart
restart:
	@echo "$(BLUE)🔄 Перезапуск...$(NC)"
	$(PM2) restart all

.PHONY: clean
clean:
	@echo "$(BLUE)🧹 Очищення...$(NC)"
	rm -rf logs/*.old node_modules/.cache
	$(PM2) delete all || true

# ===== РОЗРОБКА ОКРЕМИХ БІРЖ =====

.PHONY: dev-binance
dev-binance:
	@echo "$(YELLOW)🛠️ Розробка Binance...$(NC)"
	nodemon index.js -- --exchanges binance

.PHONY: dev-mexc
dev-mexc:
	@echo "$(YELLOW)🛠️ Розробка MEXC...$(NC)"
	nodemon index.js -- --exchanges mexc

.PHONY: dev-whitebit
dev-whitebit:
	@echo "$(YELLOW)🛠️ Розробка WhiteBit...$(NC)"
	nodemon index.js -- --exchanges whitebit



# Змінні для підключення до сервера
SERVER_USER := root
SERVER_HOST := 164.92.139.111
SERVER_PATH := /var/www/crm-developer.pro
SSH_KEY := ~/.ssh/id_rsa
DEPLOY_SCRIPT := deploy.sh

deploy:
	@echo "Запуск деплою на сервері..."
	@ssh -i $(SSH_KEY) $(SERVER_USER)@$(SERVER_HOST) \
		'cd $(SERVER_PATH) && bash $(DEPLOY_SCRIPT)'
	@echo "Деплой завершено!"


# Скопіювати локальний deploy.sh на сервер і запустити
deploy-local:
	@echo "Копіювання deploy.sh на сервер..."
	@scp -i $(SSH_KEY) $(DEPLOY_SCRIPT) $(SERVER_USER)@$(SERVER_HOST):$(SERVER_PATH)/
	@echo "Надання прав на виконання..."
	@ssh -i $(SSH_KEY) $(SERVER_USER)@$(SERVER_HOST) \
		'chmod +x $(SERVER_PATH)/$(DEPLOY_SCRIPT)'
	@echo "Запуск деплою..."
	@ssh -i $(SSH_KEY) $(SERVER_USER)@$(SERVER_HOST) \
		'cd $(SERVER_PATH) && ./$(DEPLOY_SCRIPT)'
	@echo "Деплой завершено!"
