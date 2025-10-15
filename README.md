# CryptoSpotBot - Рефакторинг

## 📁 Структура проекту

```
crypto-bot-refactor/
├── models/                      # Моделі для роботи з БД
│   ├── base.model.js           # Базова модель з загальними методами
│   ├── system-log.model.js     # Модель для системних логів
│   ├── trade-history.model.js  # Модель для історії угод
│   └── index.js                # Експорт всіх моделей
│
├── services/                    # Бізнес-логіка
│   ├── logging.service.js      # Сервіс логування
│   ├── trading.service.js      # Сервіс торгівлі
│   ├── exchange.service.js     # Сервіс роботи з біржами
│   └── index.js                # Експорт всіх сервісів
│
├── controllers/                 # Контролери (обробка HTTP)
│   ├── tradingview.controller.js
│   ├── exchange.controller.js
│   ├── trading.controller.js
│   ├── logs.controller.js
│   └── index.js
│
├── routes/                      # Маршрути API
│   ├── tradingview.routes.js
│   ├── exchange.routes.js
│   ├── trading.routes.js
│   ├── logs.routes.js
│   └── index.js
│
├── middleware/                  # Проміжне ПЗ
│   ├── cors.middleware.js
│   ├── ngrok.middleware.js
│   ├── error.middleware.js
│   ├── validation.middleware.js
│   └── index.js
│
├── utils/                       # Допоміжні функції
│   ├── date.utils.js
│   ├── currency.utils.js
│   ├── status-mapper.utils.js
│   └── index.js
│
├── app.js                       # Головний клас додатку
├── server.js                    # Запуск сервера
└── README.md                    # Ця документація
```

## 🎯 Принцип роботи

### 1️⃣ **Models** (Моделі)
**Відповідальність:** Робота з базою даних
- SQL запити
- CRUD операції
- Валідація даних перед збереженням

**Приклад:**
```javascript
const { initModels } = require('./models');
const models = initModels(db);

// Створення логу
await models.systemLog.create({
    level: 'info',
    category: 'trading',
    message: 'Order created',
    details: { orderId: 123 }
});

// Збереження угоди
await models.tradeHistory.create({
    signal: parsedSignal,
    order: orderData
});
```

---

### 2️⃣ **Services** (Сервіси)
**Відповідальність:** Бізнес-логіка
- Обробка даних
- Взаємодія з моделями
- Взаємодія з зовнішніми API

**Приклад:**
```javascript
const { initServices } = require('./services');
const services = initServices(models, exchanges);

// Обробка торгового сигналу
const result = await services.trading.processTradingViewSignal(rawSignal);

// Отримання балансів
const balances = await services.exchange.getBalances('whitebit');

// Логування
await services.logging.logInfo('category', 'message', details);
```

---

### 3️⃣ **Controllers** (Контролери)
**Відповідальність:** Обробка HTTP запитів/відповідей
- Отримання даних з `req`
- Валідація вхідних даних
- Виклик сервісів
- Формування `res`

**Приклад:**
```javascript
const { initControllers } = require('./controllers');
const controllers = initControllers(services);

// В роутах
router.post('/trading_view', controllers.tradingView.handleWebhook);
router.get('/balances', controllers.exchange.getBalances);
```

---

### 4️⃣ **Routes** (Маршрути)
**Відповідальність:** Визначення API endpoints
- Прив'язка URL до контролерів
- Middleware для валідації

**Приклад:**
```javascript
const setupRoutes = require('./routes');
setupRoutes(app, controllers);

// Доступні роути:
// POST /api/trading_view
// GET /api/exchanges/whitebit/balances
// POST /api/order
// GET /api/logs/recent
```

---

### 5️⃣ **Middleware** (Проміжне ПЗ)
**Відповідальність:** Обробка запитів до контролерів
- CORS
- Валідація
- Обробка помилок

---

### 6️⃣ **Utils** (Утиліти)
**Відповідальність:** Загальні допоміжні функції
- Форматування дат
- Валідація
- Конвертація даних

---

## 🚀 Запуск

```bash
# Встановлення залежностей
npm install

# Запуск
node server.js
```

## 📊 Потік даних

```
HTTP Request
    ↓
Middleware (cors, validation)
    ↓
Route (/api/trading_view)
    ↓
Controller (tradingview.controller.js)
    ↓
Service (trading.service.js)
    ↓
Model (trade-history.model.js) + Connector (whitebit.js)
    ↓
Database / Exchange API
    ↓
Response
```

## ✅ Переваги рефакторингу

1. **Розділення відповідальності** - кожен модуль має свою роль
2. **Легше тестувати** - можна тестувати кожен компонент окремо
3. **Легше розширювати** - додавання нових функцій не ламає існуючі
4. **Кращий код-рев'ю** - зрозуміліша структура
5. **Повторне використання** - сервіси та моделі можна використовувати в різних місцях

## 🔄 Міграція зі старого коду

Старий index.js було розділено на:
- `app.js` - головний клас CryptoSpotBot
- `server.js` - запуск додатку
- `models/` - SQL запити з index.js
- `services/` - бізнес-логіка з index.js
- `controllers/` - обробники роутів з index.js
- `routes/` - визначення endpoints з index.js
- `middleware/` - middleware з index.js
- `utils/` - допоміжні функції

## 📝 Приклади використання

### Додати новий endpoint

1. **Додати метод в сервіс:**
```javascript
// services/trading.service.js
async getOrderById(orderId) {
    return this.tradeHistoryModel.findByOrderId(orderId);
}
```

2. **Додати метод в контролер:**
```javascript
// controllers/trading.controller.js
async getOrder(req, res) {
    const order = await this.tradingService.getOrderById(req.params.id);
    res.json({ success: true, order });
}
```

3. **Додати роут:**
```javascript
// routes/trading.routes.js
router.get('/order/:id', trading.getOrder.bind(trading));
```

---

## 🐛 Debugging

Логи зберігаються в:
- **Файли:** `logs/` папка
- **БД:** `system_logs` таблиця
- **Консоль:** console.log виводи

---

## 📚 Документація API

Доступні endpoints дивись у файлах `routes/*.routes.js`