# Торговий бот з Binance, MEXC та WhiteBit
.PHONY: help
help:
	@echo "🤖 Торговий бот (Binance Futures + MEXC Futures + WhiteBit Spot)"
	@echo ""
	@echo "make setup       - Налаштування проекту"
	@echo "make dev         - Розробка"
	@echo "make test-wb     - Тест WhiteBit підключення"
	@echo "make markets-wb  - Показати WhiteBit ринки"
	@echo "make balance-wb  - Баланс WhiteBit"

.PHONY: test-wb
test-wb:
	@echo "🔍 Тестування WhiteBit підключення..."
	@node -e "
	require('dotenv').config();
	const WhiteBit = require('./connectors/whitebit');
	const wb = new WhiteBit({
		apiKey: process.env.WHITEBIT_API_KEY,
		secretKey: process.env.WHITEBIT_SECRET_KEY
	});
	wb.testConnection().then(() => console.log('✅ WhiteBit OK')).catch(console.error);
	"

.PHONY: markets-wb
markets-wb:
	@echo "📊 WhiteBit торгові пари..."
	@node -e "
	const WhiteBit = require('./connectors/whitebit');
	const wb = new WhiteBit({});
	wb.getTradingPairs().then(data => console.log(Object.keys(data).slice(0, 10))).catch(console.error);
	"
