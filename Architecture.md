# 🏗️ Архітектура Проекту

> **Згенеровано автоматично:** 15.10.2025, 18:38:08

---

## 📊 Загальна Інформація

| Параметр | Значення |
|----------|----------|
| **Назва проекту** | whitebit-trading-bot |
| **Версія** | 1.0.0 |
| **Всього файлів** | 65 |
| **Всього папок** | 23 |
| **Загальний розмір** | 357.67 KB |
| **Опис** | Торговий бот для WhiteBit біржі |

---

## 📁 Структура Проекту

```
📁 **MarketBod**
├── 📁 **bash**
  ├── 📄 **check-pm2-health.sh** — *Файл*
  └── 📄 **log-rotate-daily.sh** — *Файл*
├── 📁 **config** — *Конфігураційні файли*
  └── 📄 **database.js** — *Код*
├── 📁 **connectors**
  ├── 📄 **monitoring.js** — *Код*
  ├── 📄 **trading_view.js** — *Код*
  └── 📄 **whitebit.js** — *Код*
├── 📁 **controllers** — *Контролери*
  ├── 📄 **exchange.controller.js** — *Код*
  ├── 📄 **index.js** — *Код*
  ├── 📄 **logs.controller.js** — *Код*
  ├── 📄 **trading.controller.js** — *Код*
  └── 📄 **tradingview.controller.js** — *Код*
├── 📁 **database**
  ├── 📁 **migrations**
    └── 📁 **trade_history**
  ├── 📁 **models** — *Моделі даних*
    ├── 📄 **base.model.js** — *Код*
    ├── 📄 **index.js** — *Код*
    └── 📄 **trade-history.model.js** — *Код*
  └── 💾 **schema.sql** — *Дані*
├── 📁 **engine**
  └── 📄 **risk.js** — *Код*
├── 📁 **middleware**
  ├── 📄 **cors.middleware.js** — *Код*
  ├── 📄 **error.middleware.js** — *Код*
  ├── 📄 **index.js** — *Код*
  ├── 📄 **ngrok.middleware.js** — *Код*
  └── 📄 **validation.middleware.js** — *Код*
├── 📁 **pine_scripts**
  ├── 📄 **future_tester.pine** — *Файл*
  ├── 📄 **spot_tester.pine** — *Файл*
  └── 📄 **whitebit_spot_strategy.pine** — *Файл*
├── 📁 **public** — *Публічні статичні файли*
  ├── 📁 **js**
    └── 📄 **dashboard.js** — *Код*
  ├── 📁 **monitoring**
    ├── 📁 **css**
      └── 🎨 **monitoring.css** — *Стилі*
    ├── 📁 **js**
      └── 📄 **monitoring.js** — *Код*
    └── 🌐 **dashboard.html** — *Розмітка*
  ├── 📁 **settings**
    ├── 📁 **css**
      └── 🎨 **settings.css** — *Стилі*
    ├── 📁 **js**
      └── 📄 **settings.js** — *Код*
    └── 🌐 **settings.html** — *Розмітка*
  ├── 🖼️ **favicon.ico** — *Зображення*
  └── 🌐 **index.html** — *Розмітка*
├── 📁 **routes** — *Маршрути*
  ├── 📄 **exchange.routes.js** — *Код*
  ├── 📄 **index.js** — *Код*
  ├── 📄 **logs.routes.js** — *Код*
  ├── 📄 **monitoring.js** — *Код*
  ├── 📄 **settings.js** — *Код*
  ├── 📄 **trading.routes.js** — *Код*
  └── 📄 **tradingview.routes.js** — *Код*
├── 📁 **services** — *Сервіси та бізнес-логіка*
  ├── 📄 **exchange.service.js** — *Код*
  ├── 📄 **index.js** — *Код*
  ├── 📄 **logging.service.js** — *Код*
  └── 📄 **trading.service.js** — *Код*
├── 📁 **utils** — *Допоміжні утиліти та функції*
  ├── 📄 **currency.utils.js** — *Код*
  ├── 📄 **date.utils.js** — *Код*
  ├── 📄 **index.js** — *Код*
  └── 📄 **status-mapper.utils.js** — *Код*
├── 📁 **websocket**
  └── 📄 **manager.js** — *Код*
├── 🔐 **.env** — *Змінні оточення*
├── 📄 **.env.example** — *Файл*
├── 🚫 **.gitignore** — *Git ignore правила*
├── 📄 **app.js** — *Код*
├── ⚙️ **ecosystem.config.js** — *Конфігураційний файл*
├── 📄 **makefile** — *Файл*
├── ⚙️ **nodemon.json** — *Конфігураційний файл*
├── 📦 **package.json** — *NPM конфігурація та залежності*
├── 📄 **project-architecture.js** — *Код*
├── 📖 **README.md** — *Головна документація проекту*
├── 📄 **server.js** — *Код*
├── 📄 **test-postgres.js** — *Код*
├── 📄 **TEST.js** — *Код*
├── ⚙️ **test.json** — *Конфігураційний файл*
├── 💾 **test.sql** — *Дані*
└── 📝 **test.txt** — *Документація*
```

---

## 📈 Статистика Файлів

### Розподіл за типами

| Тип файлу | Кількість | Відсоток |
|-----------|-----------|----------|
| `.js` | 43 | 66.2% |
| `без розширення` | 3 | 4.6% |
| `.json` | 3 | 4.6% |
| `.pine` | 3 | 4.6% |
| `.html` | 3 | 4.6% |
| `.sh` | 2 | 3.1% |
| `.sql` | 2 | 3.1% |
| `.css` | 2 | 3.1% |
| `.example` | 1 | 1.5% |
| `.md` | 1 | 1.5% |

---

## 📦 Основні Залежності

Всього: **7**

| Пакет |
|-------|
| `axios` |
| `cors` |
| `dotenv` |
| `express` |
| `express-validator` |
| `pg` |
| `ws` |

---

## 🛠️ Dev Залежності

Всього: **1**

| Пакет |
|-------|
| `nodemon` |

---

## 📝 Легенда

| Іконка | Тип | Опис |
|--------|-----|------|
| 📁 | Папка | Директорія з файлами |
| 📄 | Код | JavaScript/TypeScript файли |
| ⚙️ | Конфіг | Конфігураційні файли |
| 🎨 | Стилі | CSS/SCSS файли |
| 📝 | Документація | Markdown та текстові файли |
| 🧪 | Тести | Тестові файли |
| 🖼️ | Медіа | Зображення та медіа файли |
| 📦 | Пакет | package.json та подібні |

---

*Цей файл згенеровано автоматично. Для оновлення запустіть:*

```bash
node generate-architecture.js
```
