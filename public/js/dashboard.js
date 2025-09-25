// public/js/dashboard.js
class Dashboard {
    constructor() {
        this.isConnected = false;
        this.positions = [];
        this.prices = {};

        this.initializeElements();
        this.attachEventListeners();
        this.startUpdating();
    }

    initializeElements() {
        // Кнопки управління
        this.startBtn = document.getElementById('startBot');
        this.stopBtn = document.getElementById('stopBot');
        this.clearLogsBtn = document.getElementById('clearLogs');

        // Елементи статусу
        this.botStatus = document.getElementById('botStatus');
        this.botStatusText = document.getElementById('botStatusText');
        this.binanceStatus = document.getElementById('binanceStatus');
        this.binanceStatusText = document.getElementById('binanceStatusText');
        this.mexcStatus = document.getElementById('mexcStatus');
        this.mexcStatusText = document.getElementById('mexcStatusText');

        // Статистика
        this.activePositionsEl = document.getElementById('activePositions');
        this.totalPnLEl = document.getElementById('totalPnL');
        this.dailyPnLEl = document.getElementById('dailyPnL');
        this.binanceBalanceEl = document.getElementById('binanceBalance');
        this.mexcBalanceEl = document.getElementById('mexcBalance');

        // Контейнери
        this.positionsTable = document.getElementById('positionsTable');
        this.logsContainer = document.getElementById('logsContainer');
        this.pricesContainer = document.getElementById('pricesContainer');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startBot());
        this.stopBtn.addEventListener('click', () => this.stopBot());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
    }

    async startBot() {
        try {
            this.startBtn.disabled = true;
            const response = await fetch('/api/start', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.addLog('✅ Бот запущено', 'success');
                await this.updateStatus();
            } else {
                this.addLog('❌ Помилка запуску бота', 'error');
            }
        } catch (error) {
            this.addLog(`❌ Помилка: ${error.message}`, 'error');
        } finally {
            this.startBtn.disabled = false;
        }
    }

    async stopBot() {
        try {
            this.stopBtn.disabled = true;
            const response = await fetch('/api/stop', { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.addLog('🛑 Бот зупинено', 'warning');
                await this.updateStatus();
            } else {
                this.addLog('❌ Помилка зупинки бота', 'error');
            }
        } catch (error) {
            this.addLog(`❌ Помилка: ${error.message}`, 'error');
        } finally {
            this.stopBot.disabled = false;
        }
    }

    async updateStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();

            // Оновлення статусу бота
            this.updateBotStatus(status.isRunning);

            // Оновлення статусу бірж
            this.updateExchangeStatus('binance', status.connectedExchanges.binance);
            this.updateExchangeStatus('mexc', status.connectedExchanges.mexc);

            // Оновлення позицій
            this.updatePositions(status.activePositions);

        } catch (error) {
            console.error('Помилка оновлення статусу:', error);
        }
    }

    async updateBalances() {
        try {
            const response = await fetch('/api/balances');
            const balances = await response.json();

            if (balances.binance) {
                this.binanceBalanceEl.textContent = `$${balances.binance.availableBalance.toFixed(2)}`;
            }

            if (balances.mexc) {
                this.mexcBalanceEl.textContent = `$${balances.mexc.availableBalance.toFixed(2)}`;
            }

        } catch (error) {
            console.error('Помилка оновлення балансів:', error);
        }
    }

    updateBotStatus(isRunning) {
        if (isRunning) {
            this.botStatus.className = 'status-indicator status-online';
            this.botStatusText.textContent = 'Активний';
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
        } else {
            this.botStatus.className = 'status-indicator status-offline';
            this.botStatusText.textContent = 'Не активний';
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }

    updateExchangeStatus(exchange, isConnected) {
        const statusEl = exchange === 'binance' ? this.binanceStatus : this.mexcStatus;
        const textEl = exchange === 'binance' ? this.binanceStatusText : this.mexcStatusText;

        if (isConnected) {
            statusEl.className = 'status-indicator status-online';
            textEl.textContent = 'Підключено';
        } else {
            statusEl.className = 'status-indicator status-offline';
            textEl.textContent = 'Не підключено';
        }
    }

    updatePositions(positions) {
        this.positions = positions;
        this.activePositionsEl.textContent = positions.length;

        if (positions.length === 0) {
            this.positionsTable.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">Немає активних позицій</td>
                </tr>
            `;
            return;
        }

        this.positionsTable.innerHTML = positions.map(pos => {
            const pnl = pos.unrealizedPnl || 0;
            const pnlClass = pnl >= 0 ? 'profit' : 'loss';
            const currentPrice = this.prices[pos.symbol] || pos.entryPrice;

            return `
                <tr>
                    <td><span class="badge bg-primary">${pos.exchange.toUpperCase()}</span></td>
                    <td>${pos.symbol}</td>
                    <td>
                        <span class="badge bg-${pos.side === 'LONG' ? 'success' : 'danger'}">
                            ${pos.side}
                        </span>
                    </td>
                    <td>${pos.size}</td>
                    <td>$${pos.entryPrice.toFixed(4)}</td>
                    <td>$${currentPrice.toFixed(4)}</td>
                    <td class="${pnlClass}">$${pnl.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="dashboard.closePosition('${pos.exchange}', '${pos.symbol}')">
                            Закрити
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async closePosition(exchange, symbol) {
        try {
            const response = await fetch('/api/close-position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exchange, symbol })
            });

            const result = await response.json();

            if (result.success) {
                this.addLog(`🔒 Позиція закрита: ${exchange} ${symbol}`, 'success');
            } else {
                this.addLog(`❌ Помилка закриття позиції: ${result.error}`, 'error');
            }
        } catch (error) {
            this.addLog(`❌ Помилка: ${error.message}`, 'error');
        }
    }

    updatePrices() {
        // Симуляція оновлення цін (в реальному проекті використовувати WebSocket)
        const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];

        this.pricesContainer.innerHTML = symbols.map(symbol => {
            const price = this.prices[symbol] || (Math.random() * 50000 + 20000);
            const change = (Math.random() - 0.5) * 10;
            const changeClass = change >= 0 ? 'profit' : 'loss';

            this.prices[symbol] = price;

            return `
                <div class="col-md-4 mb-3">
                    <div class="card">
                        <div class="card-body text-center">
                            <h5>${symbol}</h5>
                            <h3>$${price.toFixed(2)}</h3>
                            <span class="${changeClass}">
                                ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logClass = {
            'success': 'text-success',
            'error': 'text-danger',
            'warning': 'text-warning',
            'info': 'text-info'
        }[type] || 'text-muted';

        const logEntry = document.createElement('div');
        logEntry.className = logClass;
        logEntry.innerHTML = `[${timestamp}] ${message}`;

        this.logsContainer.appendChild(logEntry);
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;

        // Обмеження кількості логів
        const logs = this.logsContainer.children;
        if (logs.length > 100) {
            this.logsContainer.removeChild(logs[0]);
        }
    }

    clearLogs() {
        this.logsContainer.innerHTML = '<div class="text-muted">Логи очищено...</div>';
    }

    startUpdating() {
        // Оновлення кожні 5 секунд
        setInterval(() => {
            this.updateStatus();
            this.updateBalances();
            this.updatePrices();
        }, 5000);

        // Початкове оновлення
        this.updateStatus();
        this.updateBalances();
        this.updatePrices();
    }
}

// Ініціалізація дашборду
const dashboard = new Dashboard();
