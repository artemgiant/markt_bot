# Архітектура CryptoSpotBot після рефакторингу

## 📊 Загальна архітектура (MVC + Services pattern)

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│                    (HTTP Requests)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   CORS   │  │  ngrok   │  │  Error   │  │Validation│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        ROUTES                                │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  TradingView  │  │   Exchange   │  │    Trading     │  │
│  │    Routes     │  │    Routes    │  │    Routes      │  │
│  └───────────────┘  └──────────────┘  └────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONTROLLERS                              │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  TradingView  │  │   Exchange   │  │    Trading     │  │
│  │  Controller   │  │  Controller  │  │  Controller    │  │
│  └───────┬───────┘  └──────┬───────┘  └────────┬───────┘  │
│          │                  │                    │           │
│          └──────────────────┼────────────────────┘           │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       SERVICES                               │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Logging     │  │   Trading    │  │   Exchange     │  │
│  │   Service     │  │   Service    │  │   Service      │  │
│  └───────┬───────┘  └──────┬───────┘  └────────┬───────┘  │
│          │                  │                    │           │
│          └──────────────────┼────────────────────┘           │
└──────────────────────────────┼──────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
│     MODELS       │  │  CONNECTORS  │  │      ENGINE      │
│                  │  │              │  │                  │
│ ┌──────────────┐ │  │ ┌──────────┐ │  │ ┌──────────────┐ │
│ │ SystemLog    │ │  │ │ WhiteBit │ │  │ │ RiskManager  │ │
│ │    Model     │ │  │ │Connector │ │  │ └──────────────┘ │
│ └──────────────┘ │  │ └──────────┘ │  │                  │
│                  │  │              │  │ ┌──────────────┐ │
│ ┌──────────────┐ │  │ ┌──────────┐ │  │ │  WebSocket   │ │
│ │TradeHistory  │ │  │ │TradingVw │ │  │ │   Manager    │ │
│ │    Model     │ │  │ │Connector │ │  │ └──────────────┘ │
│ └──────────────┘ │  │ └──────────┘ │  │                  │
└────────┬─────────┘  └──────┬───────┘  └──────────────────┘
         │                   │
         ▼                   ▼
┌──────────────┐    ┌───────────────┐
│  PostgreSQL  │    │ Exchange API  │
│   Database   │    │  (WhiteBit)   │
└──────────────┘    └───────────────┘
```

---

## 🔄 Потік даних для TradingView вебхука

```
1. TradingView Signal
         │
         ▼
2. POST /api/trading_view
         │
         ▼
3. Middleware (CORS, Body Parser)
         │
         ▼
4. Route: tradingview.routes.js
         │
         ▼
5. Controller: TradingViewController.handleWebhook()
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
6a. LoggingService      6b. TradingService
    .logToFile()            .processTradingViewSignal()
         │                     │
         │                     ├──────────────────┐
         │                     │                  │
         │                     ▼                  ▼
         │              7a. Parse Signal   7b. WhiteBit API
         │                  (Utils)            .createOrder()
         │                     │                  │
         │                     ▼                  │
         │              8. TradeHistoryModel     │
         │                  .create()             │
         │                     │                  │
         │                     ▼                  │
         │              9. PostgreSQL ◄───────────┘
         │                     │
         ▼                     ▼
10. Log to File         11. Log to DB
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
12. Response to TradingView
    {
      success: true,
      order: {...},
      logged: { file: true, database: true }
    }
```

---

## 📦 Потік даних для створення ордера

```
1. Client Request: POST /api/order
         │
         ▼
2. Validation Middleware
    - validateOrderCreation()
         │
         ▼
3. Route: trading.routes.js
         │
         ▼
4. Controller: TradingController.createOrder()
         │
         ▼
5. Service: TradingService.createOrder()
         │
         ├────────────────────┐
         │                    │
         ▼                    ▼
6a. ExchangeConnector   6b. RiskManager
    (WhiteBit)              .calculatePositionSize()
         │                    │
         ▼                    │
7. Exchange API ◄─────────────┘
    .createMarketOrder()
         │
         ▼
8. TradeHistoryModel.create()
         │
         ▼
9. PostgreSQL
         │
         ▼
10. Response to Client
```

---

## 🗂️ Файлова структура з прив'язкою до архітектури

```
crypto-bot-refactor/
│
├── 🌐 Entry Points
│   ├── server.js              → Запуск всього додатку
│   └── app.js                 → Головний клас CryptoSpotBot
│
├── 🛣️ HTTP Layer
│   ├── middleware/            → Обробка запитів
│   │   ├── cors.middleware.js
│   │   ├── validation.middleware.js
│   │   └── error.middleware.js
│   │
│   └── routes/                → Маршрутизація
│       ├── tradingview.routes.js
│       ├── exchange.routes.js
│       └── trading.routes.js
│
├── 🎮 Business Logic Layer
│   ├── controllers/           → HTTP обробники
│   │   ├── tradingview.controller.js
│   │   ├── exchange.controller.js
│   │   └── trading.controller.js
│   │
│   └── services/              → Бізнес-логіка
│       ├── logging.service.js
│       ├── trading.service.js
│       └── exchange.service.js
│
├── 💾 Data Layer
│   └── models/                → Робота з БД
│       ├── system-log.model.js
│       └── trade-history.model.js
│
├── 🔧 Integration Layer
│   ├── connectors/            → Зовнішні API
│   │   ├── whitebit.js
│   │   └── trading_view.js
│   │
│   └── engine/                → Торгова логіка
│       └── risk.js
│
└── 🛠️ Utilities
    └── utils/                 → Допоміжні функції
        ├── date.utils.js
        ├── currency.utils.js
        └── status-mapper.utils.js
```

---

## 🔐 Принципи архітектури

### 1️⃣ Separation of Concerns (Розділення відповідальності)
- Кожен модуль має одну чітку відповідальність
- Models → тільки БД
- Services → тільки бізнес-логіка
- Controllers → тільки HTTP

### 2️⃣ Dependency Injection
```javascript
// Сервіси отримують залежності через конструктор
class TradingService {
    constructor(models, exchanges, loggingService) {
        this.tradeHistoryModel = models.tradeHistory;
        this.exchanges = exchanges;
        this.loggingService = loggingService;
    }
}
```

### 3️⃣ Single Responsibility Principle
- Кожен клас/функція робить одну річ
- LoggingService → тільки логування
- TradingService → тільки торгівля

### 4️⃣ DRY (Don't Repeat Yourself)
- Utils для повторюваних операцій
- BaseModel для загальних методів БД

---

## 📊 Порівняння архітектури

### ❌ Старий підхід (Monolith)
```
index.js (700 рядків)
├── Middleware
├── Routes
├── Controllers
├── SQL queries
├── Business logic
├── Utils
└── Everything mixed together
```

### ✅ Новий підхід (Layered Architecture)
```
app.js (200 рядків) → Оркестрація
├── models/ (SQL)
├── services/ (Logic)
├── controllers/ (HTTP)
├── routes/ (Endpoints)
├── middleware/ (Pre-processing)
└── utils/ (Helpers)
```

---

## 🎯 Переваги нової архітектури

1. **Testability** - Легко тестувати кожен шар окремо
2. **Maintainability** - Легко знайти та виправити баги
3. **Scalability** - Легко додавати нові функції
4. **Readability** - Зрозуміла структура коду
5. **Reusability** - Сервіси можна використовувати повторно
6. **Team Collaboration** - Різні розробники можуть працювати над різними шарами