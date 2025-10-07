-- ============================================
-- WhiteBit Trading Bot - Database Schema
-- PostgreSQL 12+
-- ============================================

-- Видалення існуючих таблиць (якщо потрібно)
DROP TABLE IF EXISTS trade_history CASCADE;
DROP TABLE IF EXISTS balance_history CASCADE;
DROP TABLE IF EXISTS trading_pairs CASCADE;
DROP TABLE IF EXISTS bot_settings CASCADE;
DROP TABLE IF EXISTS api_credentials CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;

-- ============================================
-- 1. API Credentials - Облікові дані API
-- ============================================
CREATE TABLE api_credentials (
                                 id SERIAL PRIMARY KEY,
                                 exchange VARCHAR(50) NOT NULL DEFAULT 'whitebit',
                                 api_key VARCHAR(255) NOT NULL,
                                 api_secret TEXT NOT NULL,
                                 is_active BOOLEAN DEFAULT true,
                                 is_testnet BOOLEAN DEFAULT false,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 last_used_at TIMESTAMP,

                                 CONSTRAINT unique_exchange_key UNIQUE(exchange, api_key)
);

-- ============================================
-- 2. Bot Settings - Налаштування бота та позиції
-- ============================================
CREATE TABLE bot_settings (
                              id SERIAL PRIMARY KEY,
                              bot_name VARCHAR(100) NOT NULL DEFAULT 'WhiteBit Bot',
                              bot_status VARCHAR(20) DEFAULT 'stopped', -- running, stopped, paused

    -- API
                              api_key_id INTEGER REFERENCES api_credentials(id),

    -- Режим та торгові пари
                              trading_mode VARCHAR(20) NOT NULL DEFAULT 'spot', -- spot, futures, margin
                              trading_pair VARCHAR(20) NOT NULL, -- Основна торгова пара (одна активна)
                              additional_pairs TEXT[], -- Додаткові пари для моніторингу

    -- Стратегія
                              strategy_name VARCHAR(100) DEFAULT 'dca', -- dca, grid, scalping, swing, custom
                              webhook_url TEXT, -- URL для webhook сповіщень

    -- Розмір позиції
                              position_size DECIMAL(20, 8) DEFAULT 100.00, -- Розмір позиції
                              max_position_percent DECIMAL(5, 2) DEFAULT 10.00, -- Максимальний % від балансу

    -- Ф'ючерси (якщо trading_mode = 'futures')
                              leverage INTEGER DEFAULT 1, -- Плече (1-125x)
                              futures_position_size DECIMAL(20, 8), -- Розмір ф'ючерсної позиції
                              margin_type VARCHAR(20) DEFAULT 'isolated', -- isolated, cross

    -- Ризик-менеджмент
                              stop_loss DECIMAL(10, 4) DEFAULT 1.00, -- Стоп-лосс у %
                              take_profit DECIMAL(10, 4) DEFAULT 2.00, -- Тейк-профіт у %

    -- Trailing Stop
                              trailing_stop BOOLEAN DEFAULT false, -- Чи використовувати trailing stop
                              trailing_activation DECIMAL(10, 4) DEFAULT 3.00, -- % активації trailing stop
                              trailing_callback DECIMAL(10, 4) DEFAULT 0.50, -- % відкату для trailing stop
                              trailing_type VARCHAR(20) DEFAULT 'percent', -- percent, fixed

    -- Обмеження торгівлі
                              max_daily_trades INTEGER DEFAULT 10, -- Максимум угод на день
                              weekend_trading BOOLEAN DEFAULT false, -- Торгівля на вихідних

    -- Автоматизація
                              auto_trading BOOLEAN DEFAULT false, -- Автоматична торгівля
                              auto_restart BOOLEAN DEFAULT true, -- Автоматичний перезапуск при помилці

    -- Telegram сповіщення
                              telegram_notifications BOOLEAN DEFAULT false,
                              telegram_token VARCHAR(255),
                              telegram_chat_id VARCHAR(100),

    -- Логування
                              log_level VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error

    -- Метадані
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                              CONSTRAINT check_leverage CHECK (leverage >= 1 AND leverage <= 125),
                              CONSTRAINT check_max_position_percent CHECK (max_position_percent > 0 AND max_position_percent <= 100),
                              CONSTRAINT check_stop_loss CHECK (stop_loss >= 0),
                              CONSTRAINT check_take_profit CHECK (take_profit >= 0),
                              CONSTRAINT check_bot_status CHECK (bot_status IN ('running', 'stopped', 'paused'))
);

-- ============================================
-- 3. Trading Pairs - Торгові пари
-- ============================================
CREATE TABLE trading_pairs (
                               id SERIAL PRIMARY KEY,
                               symbol VARCHAR(20) NOT NULL UNIQUE, -- BTC_USDT, ETH_USDT
                               base_currency VARCHAR(10) NOT NULL, -- BTC, ETH
                               quote_currency VARCHAR(10) NOT NULL, -- USDT, USD
                               is_active BOOLEAN DEFAULT true,
                               min_amount DECIMAL(20, 8),
                               max_amount DECIMAL(20, 8),
                               min_price DECIMAL(20, 8),
                               max_price DECIMAL(20, 8),
                               price_precision INTEGER DEFAULT 8,
                               amount_precision INTEGER DEFAULT 8,
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. Balance History - Історія балансу (об'єднана)
-- ============================================
CREATE TABLE balance_history (
                                 id SERIAL PRIMARY KEY,
                                 exchange VARCHAR(50) NOT NULL DEFAULT 'whitebit',

    -- Основна валюта (для швидкого доступу)
                                 currency VARCHAR(10) NOT NULL,
                                 available DECIMAL(20, 8) DEFAULT 0,
                                 locked DECIMAL(20, 8) DEFAULT 0,
                                 total DECIMAL(20, 8) GENERATED ALWAYS AS (available + locked) STORED,
                                 usd_value DECIMAL(20, 2),

    -- Повний snapshot всіх балансів
                                 balances_snapshot JSONB, -- {'BTC': {'available': 0.5, 'locked': 0.1, 'usdt_rate': 45000}, 'ETH': {...}}
                                 total_portfolio_usdt DECIMAL(20, 2), -- Загальна вартість портфеля в USDT

    -- Аналітика змін
                                 change_amount DECIMAL(20, 8), -- Зміна з попереднього запису
                                 change_percent DECIMAL(10, 4), -- Зміна у відсотках
                                 portfolio_change_usdt DECIMAL(20, 2), -- Зміна портфеля в USDT

    -- Тип запису
                                 snapshot_type VARCHAR(50) DEFAULT 'auto', -- auto, manual, daily, trade, order
                                 is_latest BOOLEAN DEFAULT true, -- Чи це останній запис для валюти

    -- Додаткова інформація
                                 notes TEXT,
                                 order_id VARCHAR(100), -- Посилання на ордер, якщо snapshot_type = 'order'

                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Constraint для унікального is_latest
CREATE UNIQUE INDEX unique_latest_balance
    ON balance_history(exchange, currency)
    WHERE is_latest = true;

-- Індекси для швидкої вибірки
CREATE INDEX idx_balance_history_currency ON balance_history(currency);
CREATE INDEX idx_balance_history_created_at ON balance_history(created_at DESC);
CREATE INDEX idx_balance_history_snapshot_type ON balance_history(snapshot_type);
CREATE INDEX idx_balance_history_is_latest ON balance_history(is_latest) WHERE is_latest = true;
CREATE INDEX idx_balance_history_order_id ON balance_history(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_balance_history_balances_snapshot ON balance_history USING GIN (balances_snapshot);

-- Коментарі
COMMENT ON COLUMN balance_history.balances_snapshot IS 'JSON snapshot всіх монет з курсами до USDT: {"BTC": {"available": 0.5, "locked": 0.1, "usdt_rate": 45000, "usdt_value": 22500}}';
COMMENT ON COLUMN balance_history.is_latest IS 'Позначає останній актуальний баланс для кожної валюти';
COMMENT ON COLUMN balance_history.total_portfolio_usdt IS 'Загальна вартість всього портфеля в USDT на момент snapshot';
COMMENT ON COLUMN balance_history.order_id IS 'ID ордера, після якого був зроблений snapshot';

-- ============================================
-- 5. Trade History - Розширена історія торгівлі
-- ============================================
CREATE TABLE trade_history (
                               id SERIAL PRIMARY KEY,
                               bot_id INTEGER REFERENCES bot_settings(id) ON DELETE SET NULL,
                               exchange VARCHAR(50) NOT NULL DEFAULT 'whitebit',

    -- Ідентифікатори
                               trade_id VARCHAR(100), -- ID угоди від біржі (може бути NULL для внутрішніх записів)
                               order_id VARCHAR(100) NOT NULL, -- ID ордера (наш або від біржі)
                               client_order_id VARCHAR(100), -- Наш внутрішній ID

    -- Торгова пара
                               symbol VARCHAR(20) NOT NULL,
                               base_currency VARCHAR(10) NOT NULL, -- BTC, ETH
                               quote_currency VARCHAR(10) NOT NULL, -- USDT, USD

    -- Тип операції
                               side VARCHAR(10) NOT NULL, -- buy, sell
                               order_type VARCHAR(20) NOT NULL, -- limit, market, stop-limit, stop-market

    -- Статус
                               status VARCHAR(20) NOT NULL DEFAULT 'new', -- new, partially_filled, filled, cancelled, expired

    -- Ціни та обсяги
                               price DECIMAL(20, 8) NOT NULL, -- Ціна виконання
                               amount DECIMAL(20, 8) NOT NULL, -- Кількість базової валюти
                               filled_amount DECIMAL(20, 8) DEFAULT 0, -- Виконано
                               remaining_amount DECIMAL(20, 8), -- Залишок
                               total_value DECIMAL(20, 8) NOT NULL, -- Загальна вартість (price * amount)

    -- Комісії
                               fee DECIMAL(20, 8) DEFAULT 0,
                               fee_currency VARCHAR(10),
                               fee_percent DECIMAL(10, 4), -- Відсоток комісії

    -- P&L (Profit & Loss)
                               profit_loss DECIMAL(20, 8), -- Прибуток/збиток
                               profit_loss_percent DECIMAL(10, 4), -- P&L у відсотках
                               entry_price DECIMAL(20, 8), -- Ціна входу (для розрахунку P&L)
                               exit_price DECIMAL(20, 8), -- Ціна виходу

    -- Ризик-менеджмент (значення на момент ордера)
                               stop_loss_price DECIMAL(20, 8), -- Встановлений стоп-лосс
                               take_profit_price DECIMAL(20, 8), -- Встановлений тейк-профіт
                               trailing_activated BOOLEAN DEFAULT false, -- Чи активовано trailing stop

    -- Додаткова інформація
                               strategy_name VARCHAR(100), -- Стратегія, що використовувалась
                               position_size DECIMAL(20, 8), -- Розмір позиції
                               leverage INTEGER DEFAULT 1, -- Використане плече
                               margin_type VARCHAR(20), -- isolated, cross

    -- Причина закриття
                               close_reason VARCHAR(50), -- manual, stop_loss, take_profit, trailing_stop, market, timeout

    -- Timestamps
                               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Коли створено запис
                               executed_at TIMESTAMP, -- Коли виконано на біржі
                               closed_at TIMESTAMP, -- Коли закрито

    -- Додаткові дані
                               notes TEXT, -- Примітки
                               metadata JSONB, -- Додаткова інформація у форматі JSON

                               CONSTRAINT check_status CHECK (status IN ('new', 'partially_filled', 'filled', 'cancelled', 'expired')),
                               CONSTRAINT check_side CHECK (side IN ('buy', 'sell')),
                               CONSTRAINT check_amounts CHECK (amount > 0 AND filled_amount >= 0)
);

-- Індекси для швидкого пошуку
CREATE INDEX idx_trade_history_bot_id ON trade_history(bot_id);
CREATE INDEX idx_trade_history_order_id ON trade_history(order_id);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX idx_trade_history_status ON trade_history(status);
CREATE INDEX idx_trade_history_side ON trade_history(side);
CREATE INDEX idx_trade_history_created_at ON trade_history(created_at DESC);
CREATE INDEX idx_trade_history_executed_at ON trade_history(executed_at DESC) WHERE executed_at IS NOT NULL;
CREATE INDEX idx_trade_history_trade_id ON trade_history(trade_id) WHERE trade_id IS NOT NULL;
CREATE INDEX idx_trade_history_strategy ON trade_history(strategy_name) WHERE strategy_name IS NOT NULL;
CREATE INDEX idx_trade_history_metadata ON trade_history USING GIN (metadata);

-- Унікальність trade_id від біржі (якщо є)
CREATE UNIQUE INDEX idx_trade_history_unique_trade ON trade_history(exchange, trade_id) WHERE trade_id IS NOT NULL;

-- Коментарі
COMMENT ON TABLE trade_history IS 'Розширена історія всіх торгових операцій з повною інформацією про ордери та угоди';
COMMENT ON COLUMN trade_history.bot_id IS 'Посилання на бота, який створив цю угоду';
COMMENT ON COLUMN trade_history.trade_id IS 'ID угоди від біржі (може бути NULL для ордерів, що очікують)';
COMMENT ON COLUMN trade_history.order_id IS 'ID ордера - основний ідентифікатор операції';
COMMENT ON COLUMN trade_history.status IS 'new - створено, partially_filled - частково, filled - виконано, cancelled - скасовано';
COMMENT ON COLUMN trade_history.close_reason IS 'Причина закриття: manual, stop_loss, take_profit, trailing_stop, market, timeout';
COMMENT ON COLUMN trade_history.metadata IS 'JSON з додатковою інформацією: {"original_balance": 1000, "market_conditions": {...}}';
COMMENT ON COLUMN trade_history.entry_price IS 'Ціна входу в позицію для розрахунку P&L';
COMMENT ON COLUMN trade_history.exit_price IS 'Ціна виходу з позиції';

-- ============================================
-- 6. System Logs - Системні логи
-- ============================================
CREATE TABLE system_logs (
                             id SERIAL PRIMARY KEY,
                             level VARCHAR(20) NOT NULL, -- info, warning, error, debug
                             category VARCHAR(50), -- api, trading, system, database
                             message TEXT NOT NULL,
                             details JSONB,
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Індекс для швидкого пошуку логів
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_category ON system_logs(category);

-- ============================================
-- Тригери для автоматичного оновлення updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS '
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
' LANGUAGE plpgsql;

CREATE TRIGGER update_api_credentials_updated_at
    BEFORE UPDATE ON api_credentials
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_settings_updated_at
    BEFORE UPDATE ON bot_settings
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_pairs_updated_at
    BEFORE UPDATE ON trading_pairs
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Функція для автоматичного логування змін балансу
-- ============================================

CREATE OR REPLACE FUNCTION log_balance_change()
    RETURNS TRIGGER AS $$
DECLARE
    previous_record RECORD;
prev_total DECIMAL(20, 8);
prev_portfolio DECIMAL(20, 2);
BEGIN
    -- Спочатку позначаємо всі попередні записи як неактуальні
UPDATE balance_history
SET is_latest = false
WHERE currency = NEW.currency
  AND exchange = NEW.exchange
  AND is_latest = true;

-- Отримуємо попереднє значення
SELECT total, total_portfolio_usdt INTO prev_total, prev_portfolio
FROM balance_history
WHERE currency = NEW.currency
  AND exchange = NEW.exchange
ORDER BY created_at DESC
LIMIT 1;

-- Обчислюємо зміни
IF prev_total IS NOT NULL THEN
        NEW.change_amount := NEW.total - prev_total;
NEW.change_percent := CASE 
            WHEN prev_total > 0 THEN ((NEW.total - prev_total) / prev_total * 100)
            ELSE 0
END;
ELSE
        NEW.change_amount := 0;
NEW.change_percent := 0;
END IF;

IF prev_portfolio IS NOT NULL AND NEW.total_portfolio_usdt IS NOT NULL THEN
        NEW.portfolio_change_usdt := NEW.total_portfolio_usdt - prev_portfolio;
END IF;

-- Встановлюємо як останній запис
NEW.is_latest := true;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Тригер для автоматичного логування змін балансу
CREATE TRIGGER trigger_log_balance_change
    BEFORE INSERT ON balance_history
    FOR EACH ROW
EXECUTE FUNCTION log_balance_change();

-- ============================================
-- Функція для створення snapshot балансу при ордері
-- ============================================

CREATE OR REPLACE FUNCTION create_order_balance_snapshot(
    p_order_id VARCHAR(100),
    p_balances_json JSONB,
    p_total_usdt DECIMAL(20, 2)
)
    RETURNS VOID AS $$
DECLARE
    currency_key TEXT;
currency_data JSONB;
BEGIN
    -- Проходимо по всіх валютах у JSON
FOR currency_key, currency_data IN SELECT * FROM jsonb_each(p_balances_json)
    LOOP
INSERT INTO balance_history (
    exchange,
    currency,
    available,
    locked,
    usd_value,
    balances_snapshot,
    total_portfolio_usdt,
    snapshot_type,
    order_id
) VALUES (
             'whitebit',
             currency_key,
             (currency_data->>'available')::DECIMAL(20, 8),
             (currency_data->>'locked')::DECIMAL(20, 8),
             (currency_data->>'usdt_value')::DECIMAL(20, 2),
             p_balances_json,
             p_total_usdt,
             'order',
             p_order_id
         );
END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Початкові дані (приклади)
-- ============================================

-- Популярні торгові пари
INSERT INTO trading_pairs (symbol, base_currency, quote_currency, is_active, price_precision, amount_precision) VALUES
                                                                                                                    ('BTC_USDT', 'BTC', 'USDT', true, 2, 6),
                                                                                                                    ('ETH_USDT', 'ETH', 'USDT', true, 2, 5),
                                                                                                                    ('BNB_USDT', 'BNB', 'USDT', true, 2, 4),
                                                                                                                    ('XRP_USDT', 'XRP', 'USDT', true, 4, 2),
                                                                                                                    ('SOL_USDT', 'SOL', 'USDT', true, 2, 4),
                                                                                                                    ('ADA_USDT', 'ADA', 'USDT', true, 4, 2),
                                                                                                                    ('DOGE_USDT', 'DOGE', 'USDT', true, 5, 1);

-- Початкові налаштування бота (один запис - одна активна конфігурація)
INSERT INTO bot_settings (
    bot_name,
    bot_status,
    trading_mode,
    trading_pair,
    additional_pairs,
    strategy_name,
    position_size,
    max_position_percent,
    leverage,
    margin_type,
    stop_loss,
    take_profit,
    max_daily_trades,
    auto_trading,
    trailing_stop,
    trailing_activation,
    trailing_callback,
    trailing_type,
    weekend_trading,
    telegram_notifications,
    auto_restart,
    log_level
) VALUES (
             'WhiteBit Bot',
             'stopped',
             'spot',
             'BTC_USDT',
             ARRAY['ETH_USDT', 'BNB_USDT'],
             'dca',
             100.00,
             10.00,
             1,
             'isolated',
             2.00,
             5.00,
             10,
             false,
             true,
             3.00,
             0.50,
             'percent',
             false,
             false,
             true,
             'info'
         );

-- ============================================
-- Корисні views для аналітики
-- ============================================

-- View для активних ордерів (статус new або partially_filled)
CREATE OR REPLACE VIEW active_trades_view AS
SELECT
    th.id,
    th.bot_id,
    bs.bot_name,
    th.order_id,
    th.symbol,
    th.side,
    th.order_type,
    th.status,
    th.price,
    th.amount,
    th.filled_amount,
    th.remaining_amount,
    th.total_value,
    th.fee,
    th.stop_loss_price,
    th.take_profit_price,
    th.strategy_name,
    th.created_at,
    tp.base_currency,
    tp.quote_currency
FROM trade_history th
         LEFT JOIN trading_pairs tp ON th.symbol = tp.symbol
         LEFT JOIN bot_settings bs ON th.bot_id = bs.id
WHERE th.status IN ('new', 'partially_filled')
ORDER BY th.created_at DESC;

-- View для денної статистики з розширеною інформацією
CREATE OR REPLACE VIEW daily_stats_view AS
SELECT
    DATE(executed_at) as trade_date,
    bot_id,
    symbol,
    strategy_name,
    COUNT(*) as total_trades,
    SUM(CASE WHEN side = 'buy' THEN 1 ELSE 0 END) as buy_trades,
    SUM(CASE WHEN side = 'sell' THEN 1 ELSE 0 END) as sell_trades,
    SUM(total_value) as total_volume,
    SUM(fee) as total_fees,
    SUM(profit_loss) as total_profit_loss,
    AVG(profit_loss_percent) as avg_profit_percent,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(price) as avg_price,
    COUNT(CASE WHEN close_reason = 'stop_loss' THEN 1 END) as stop_loss_count,
    COUNT(CASE WHEN close_reason = 'take_profit' THEN 1 END) as take_profit_count
FROM trade_history
WHERE status = 'filled' AND executed_at IS NOT NULL
GROUP BY DATE(executed_at), bot_id, symbol, strategy_name
ORDER BY trade_date DESC, symbol;

-- View для загального балансу (останні записи)
CREATE OR REPLACE VIEW current_balance_view AS
SELECT
    currency,
    available,
    locked,
    total,
    usd_value,
    balances_snapshot,
    total_portfolio_usdt,
    created_at as last_updated
FROM balance_history
WHERE is_latest = true
ORDER BY usd_value DESC NULLS LAST;

-- View для історії балансу за період
CREATE OR REPLACE VIEW balance_changes_daily_view AS
SELECT
    DATE(created_at) as date,
    currency,
    MIN(total) as min_balance,
    MAX(total) as max_balance,
    FIRST_VALUE(total) OVER (PARTITION BY DATE(created_at), currency ORDER BY created_at ASC) as opening_balance,
    FIRST_VALUE(total) OVER (PARTITION BY DATE(created_at), currency ORDER BY created_at DESC) as closing_balance,
    SUM(change_amount) as total_change,
    AVG(usd_value) as avg_usd_value
FROM balance_history
GROUP BY DATE(created_at), currency, created_at, total, usd_value
ORDER BY date DESC, currency;

-- View для поточного стану бота з торговою статистикою
CREATE OR REPLACE VIEW bot_status_view AS
SELECT
    bs.id,
    bs.bot_name,
    bs.bot_status,
    bs.trading_mode,
    bs.trading_pair,
    bs.strategy_name,
    bs.position_size,
    bs.auto_trading,
    bs.stop_loss,
    bs.take_profit,
    bs.trailing_stop,
    COUNT(DISTINCT th.id) FILTER (WHERE th.status IN ('new', 'partially_filled')) as active_trades_count,
    SUM(th.total_value) FILTER (WHERE th.status IN ('new', 'partially_filled')) as total_active_value,
    COUNT(DISTINCT th.id) FILTER (WHERE th.status = 'filled' AND DATE(th.executed_at) = CURRENT_DATE) as today_trades_count,
    SUM(th.profit_loss) FILTER (WHERE th.status = 'filled' AND DATE(th.executed_at) = CURRENT_DATE) as today_profit,
    bh.available as available_balance,
    bh.total as total_balance,
    bh.total_portfolio_usdt,
    tp.base_currency,
    tp.quote_currency
FROM bot_settings bs
         LEFT JOIN trade_history th ON th.bot_id = bs.id
         LEFT JOIN trading_pairs tp ON tp.symbol = bs.trading_pair
         LEFT JOIN balance_history bh ON bh.currency = tp.quote_currency AND bh.is_latest = true
GROUP BY bs.id, bs.bot_name, bs.bot_status, bs.trading_mode, bs.trading_pair,
         bs.strategy_name, bs.position_size, bs.auto_trading, bs.stop_loss,
         bs.take_profit, bs.trailing_stop, bh.available, bh.total,
         bh.total_portfolio_usdt, tp.base_currency, tp.quote_currency;

-- View для статистики по стратегіях
CREATE OR REPLACE VIEW strategy_performance_view AS
SELECT
    bot_id,
    strategy_name,
    symbol,
    COUNT(*) as total_trades,
    SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as winning_trades,
    SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losing_trades,
    ROUND(SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
    SUM(profit_loss) as total_profit,
    AVG(profit_loss) as avg_profit,
    MAX(profit_loss) as max_profit,
    MIN(profit_loss) as max_loss,
    SUM(fee) as total_fees
FROM trade_history
WHERE status = 'filled' AND strategy_name IS NOT NULL
GROUP BY bot_id, strategy_name, symbol
ORDER BY total_profit DESC;

-- View для останніх виконаних угод
CREATE OR REPLACE VIEW recent_trades_view AS
SELECT
    th.id,
    th.bot_id,
    bs.bot_name,
    th.order_id,
    th.symbol,
    th.side,
    th.order_type,
    th.price,
    th.amount,
    th.total_value,
    th.fee,
    th.profit_loss,
    th.profit_loss_percent,
    th.close_reason,
    th.executed_at,
    th.strategy_name
FROM trade_history th
         LEFT JOIN bot_settings bs ON th.bot_id = bs.id
WHERE th.status = 'filled' AND th.executed_at IS NOT NULL
ORDER BY th.executed_at DESC
LIMIT 100;

-- ============================================
-- Функція для очищення старих логів
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
    RETURNS INTEGER AS '
    DECLARE
        deleted_count INTEGER;
    BEGIN
        DELETE FROM system_logs
        WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || '' days'')::INTERVAL;

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
    END;
' LANGUAGE plpgsql;



-- Функція для розрахунку P&L між двома угодами
CREATE OR REPLACE FUNCTION calculate_pnl(
    p_entry_trade_id INTEGER,
    p_exit_trade_id INTEGER
)
    RETURNS TABLE (
                      profit_loss DECIMAL(20, 8),
                      profit_loss_percent DECIMAL(10, 4)
                  ) AS $$
DECLARE
    entry_record RECORD;
exit_record RECORD;
BEGIN
    -- Отримуємо запис входу
SELECT price, amount INTO entry_record
FROM trade_history WHERE id = p_entry_trade_id;

-- Отримуємо запис виходу
SELECT price, amount INTO exit_record
FROM trade_history WHERE id = p_exit_trade_id;

-- Розраховуємо P&L
RETURN QUERY
SELECT
    (exit_record.price - entry_record.price) * exit_record.amount AS profit_loss,
    ((exit_record.price - entry_record.price) / entry_record.price * 100) AS profit_loss_percent;
END;
$$ LANGUAGE plpgsql;

-- Функція для отримання статистики торгівлі за період
CREATE OR REPLACE FUNCTION get_trading_stats(
    p_bot_id INTEGER DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
    RETURNS TABLE (
                      total_trades BIGINT,
                      winning_trades BIGINT,
                      losing_trades BIGINT,
                      win_rate NUMERIC,
                      total_profit NUMERIC,
                      total_fees NUMERIC,
                      avg_profit_per_trade NUMERIC,
                      best_trade NUMERIC,
                      worst_trade NUMERIC
                  ) AS $$
BEGIN
RETURN QUERY
SELECT
    COUNT(*)::BIGINT as total_trades,
    SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END)::BIGINT as winning_trades,
    SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END)::BIGINT as losing_trades,
    ROUND(SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
    ROUND(SUM(profit_loss), 2) as total_profit,
    ROUND(SUM(fee), 2) as total_fees,
    ROUND(AVG(profit_loss), 2) as avg_profit_per_trade,
    ROUND(MAX(profit_loss), 2) as best_trade,
    ROUND(MIN(profit_loss), 2) as worst_trade
FROM trade_history
WHERE status = 'filled'
  AND executed_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  AND (p_bot_id IS NULL OR bot_id = p_bot_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Коментарі до таблиць
-- ============================================

COMMENT ON TABLE api_credentials IS 'Облікові дані API для підключення до біржі';
COMMENT ON TABLE bot_settings IS 'Налаштування торгового бота - одна активна конфігурація';
COMMENT ON TABLE trading_pairs IS 'Конфігурація торгових пар';
COMMENT ON TABLE balance_history IS 'Об''єднана таблиця балансів та історії з JSON snapshot всіх монет та курсів';
COMMENT ON TABLE trade_history IS 'Розширена історія всіх торгових операцій - замінює orders та trade_history';
COMMENT ON TABLE system_logs IS 'Системні логи та події';

-- Коментарі до важливих полів bot_settings
COMMENT ON COLUMN bot_settings.bot_status IS 'Статус бота: running, stopped, paused';
COMMENT ON COLUMN bot_settings.trading_mode IS 'Режим торгівлі: spot, futures, margin';
COMMENT ON COLUMN bot_settings.trading_pair IS 'Єдина активна торгова пара для бота';
COMMENT ON COLUMN bot_settings.additional_pairs IS 'Масив додаткових пар для моніторингу';
COMMENT ON COLUMN bot_settings.leverage IS 'Плече для ф''ючерсів (1-125x)';
COMMENT ON COLUMN bot_settings.margin_type IS 'Тип маржі: isolated або cross';
COMMENT ON COLUMN bot_settings.trailing_stop IS 'Використання trailing stop loss';
COMMENT ON COLUMN bot_settings.trailing_activation IS 'Відсоток активації trailing stop';
COMMENT ON COLUMN bot_settings.trailing_callback IS 'Відсоток відкату для trailing stop';
COMMENT ON COLUMN bot_settings.max_daily_trades IS 'Максимальна кількість угод на день';
COMMENT ON COLUMN bot_settings.weekend_trading IS 'Дозволити торгівлю на вихідних';

-- ============================================
-- Завершення створення схеми
-- ============================================

SELECT 'Database schema created successfully!' as status,
       'Tables: 6' as tables_count,
       'Views: 7' as views_count,
       'Functions: 6' as functions_count;