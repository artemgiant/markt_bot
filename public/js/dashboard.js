// public/js/dashboard.js
class WhiteBitTradingDashboard {
    constructor() {
        this.whitebitStatus = { running: false, connected: false };
        this.autoScrollLogs = true;
        this.orders = [];
        this.balance = {};

        this.initializeElements();
        this.attachEventListeners();
        this.startUpdateLoop();
        this.updateTime();
    }

    initializeElements() {
        this.whitebitCard = document.getElementById('whitebitCard');
        this.whitebitStatusIndicator = document.getElementById('whitebitStatus');
        this.connectionText = document.getElementById('connectionText');
        this.whitebitBalance = document.getElementById('whitebitBalance');
        this.whitebitOrders = document.getElementById('whitebitOrders');
        this.startWhitebitBtn = document.getElementById('startWhitebit');
        this.stopWhitebitBtn = document.getElementById('stopWhitebit');
        this.testConnectionBtn = document.getElementById('testConnection');
        this.logsContainer = document.getElementById('logsContainer');
        this.ordersTableBody = document.getElementById('ordersTableBody');
        this.balanceContainer = document.getElementById('balanceContainer');
        this.currentTime = document.getElementById('currentTime');
    }

    attachEventListeners() {
        this.startWhitebitBtn.addEventListener('click', () => this.startWhitebit());
        this.stopWhitebitBtn.addEventListener('click', () => this.stopWhitebit());
        this.testConnectionBtn.addEventListener('click', () => this.testApiConnection());
        document.getElementById('refreshAll').addEventListener('click', () => this.refreshAll());
        document.getElementById('emergencyStop').addEventListener('click', () => this.emergencyStop());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        document.getElementById('toggleAutoScroll').addEventListener('click', () => this.toggleAutoScroll());
    }

    async startWhitebit() {
        try {
            this.setWhitebitLoading(true);
            this.addLog('🚀 Запуск WhiteBit...', 'info');
            const response = await fetch('/api/exchanges/whitebit/start', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                this.whitebitStatus.running = true;
                this.whitebitStatus.connected = true;
                this.addLog('✅ WhiteBit запущено', 'success');
                this.showToast('WhiteBit запущено', 'success');
            } else {
                throw new Error(result.error || 'Невідома помилка');
            }
        } catch (error) {
            this.addLog(`⚠ Помилка запуску WhiteBit: ${error.message}`, 'error');
            this.showToast('Помилка запуску WhiteBit', 'error');
        } finally {
            this.setWhitebitLoading(false);
            this.updateWhitebitButtons();
        }
    }

    async testApiConnection() {
        try {
            this.addLog('🧪 Тестування API підключення...', 'info');
            const response = await fetch('/api/exchanges/test-connection');
            const result = await response.json();
            if (result.success) {
                this.addLog('✅ API тестування пройшло успішно', 'success');
                this.showToast('API працює коректно', 'success');
            } else {
                throw new Error(result.error || 'Тест не пройшов');
            }
        } catch (error) {
            this.addLog(`❌ Помилка тестування API: ${error.message}`, 'error');
            this.showToast('Помилка API тестування', 'error');
        }
    }

    async stopWhitebit() {
        try {
            this.setWhitebitLoading(true);
            this.addLog('🛑 Зупинка WhiteBit...', 'warning');
            const response = await fetch('/api/exchanges/whitebit/stop', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                this.whitebitStatus.running = false;
                this.whitebitStatus.connected = false;
                this.addLog('✅ WhiteBit зупинено', 'warning');
                this.showToast('WhiteBit зупинено', 'warning');
            } else {
                throw new Error(result.error || 'Невідома помилка');
            }
        } catch (error) {
            this.addLog(`⚠ Помилка зупинки WhiteBit: ${error.message}`, 'error');
            this.showToast('Помилка зупинки WhiteBit', 'error');
        } finally {
            this.setWhitebitLoading(false);
            this.updateWhitebitButtons();
        }
    }

    async emergencyStop() {
        if (!confirm('⚠️ Ви впевнені? Це скасує всі ордери та відключить біржу!')) {
            return;
        }
        try {
            this.addLog('🚨 ЕКСТРЕНА ЗУПИНКА!', 'error');
            const response = await fetch('/api/emergency-stop', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                this.whitebitStatus.running = false;
                this.whitebitStatus.connected = false;
                this.addLog('✅ Екстрена зупинка завершена', 'warning');
                this.showToast('Екстрена зупинка завершена', 'warning');
            }
        } catch (error) {
            this.addLog(`⚠ Помилка екстреної зупинки: ${error.message}`, 'error');
            this.showToast('Помилка екстреної зупинки', 'error');
        }
        this.updateWhitebitButtons();
    }

    setWhitebitLoading(loading) {
        if (loading) {
            this.whitebitCard.classList.add('loading');
            this.startWhitebitBtn.classList.add('loading');
            this.stopWhitebitBtn.classList.add('loading');
            this.startWhitebitBtn.disabled = true;
            this.stopWhitebitBtn.disabled = true;
        } else {
            this.whitebitCard.classList.remove('loading');
            this.startWhitebitBtn.classList.remove('loading');
            this.stopWhitebitBtn.classList.remove('loading');
        }
    }

    updateWhitebitButtons() {
        if (this.whitebitStatus.running) {
            this.startWhitebitBtn.disabled = true;
            this.stopWhitebitBtn.disabled = false;
            this.whitebitStatusIndicator.className = 'status-indicator status-online';
            this.connectionText.textContent = 'Підключено';
            this.whitebitCard.classList.add('connected');
            this.whitebitCard.classList.remove('disconnected');
        } else {
            this.startWhitebitBtn.disabled = false;
            this.stopWhitebitBtn.disabled = true;
            this.whitebitStatusIndicator.className = 'status-indicator status-offline';
            this.connectionText.textContent = 'Відключено';
            this.whitebitCard.classList.add('disconnected');
            this.whitebitCard.classList.remove('connected');
        }
    }

    async updateStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            if (status.connectedExchanges && status.connectedExchanges.whitebit !== undefined) {
                this.whitebitStatus.connected = status.connectedExchanges.whitebit;
                this.whitebitStatus.running = status.connectedExchanges.whitebit;
            }
            this.updateWhitebitButtons();
        } catch (error) {
            console.error('Помилка оновлення статусу:', error);
        }
    }

    async updateBalance() {
        try {
            const response = await fetch('/api/balances');

            const resp = await response.json();

            if (resp.success) {
             const balances = await resp.balances;

                this.balance = balances.whitebit;

                if (!balances.whitebit.error) {
                    let totalBalance = 0;

                    if (Array.isArray(balances.whitebit)) {
                        balances.whitebit.forEach(asset => {
                            totalBalance += parseFloat(asset.available || 0);
                        });
                    }
                    this.whitebitBalance.textContent = `${totalBalance.toFixed(2)}`;
                    this.updateBalanceTab();
                } else {
                    this.whitebitBalance.textContent = 'Помилка';
                }
            }
        } catch (error) {
            console.error('Помилка оновлення балансу:', error);
            this.whitebitBalance.textContent = 'Помилка';
        }
    }

    async updateActiveOrders() {
        try {
            const response = await fetch('/api/active-orders');
            const result = await response.json();
            if (result.success && result.orders) {
                this.orders = result.orders.records || [];
                this.whitebitOrders.textContent = this.orders.length;
                this.updateOrdersTable();
            }
        } catch (error) {
            console.error('Помилка оновлення ордерів:', error);
        }
    }

    updateOrdersTable() {
        if (this.orders.length === 0) {
            this.ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-info-circle"></i> Немає активних ордерів
                    </td>
                </tr>
            `;
            return;
        }
        this.ordersTableBody.innerHTML = this.orders.map(order => `
            <tr>
                <td>${order.id}</td>
                <td><strong>${order.market}</strong></td>
                <td>
                    <span class="badge bg-${order.side === 'buy' ? 'success' : 'danger'}">
                        ${order.side.toUpperCase()}
                    </span>
                </td>
                <td>${order.amount}</td>
                <td>${parseFloat(order.price).toFixed(4)}</td>
                <td>
                    <span class="badge bg-warning">${order.status}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger"
                            onclick="dashboard.cancelOrder('${order.market}', '${order.id}')">
                        <i class="fas fa-times"></i> Скасувати
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateBalanceTab() {
        if (this.balance.error) {
            this.balanceContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        Помилка завантаження балансу: ${this.balance.error}
                    </div>
                </div>
            `;
            return;
        }
        if (Array.isArray(this.balance)) {
            this.balanceContainer.innerHTML = this.balance
                .map(function (asset) {
                    console.log(asset);
                    return `
                    <div class="col-md-4 mb-3">
                        <div class="card border-success">
                            <div class="card-header bg-success text-white">
                                <h6 class="mb-0">${asset.ticker}</h6>
                            </div>
                            <div class="card-body">
                                <div class="text-center">
                                    <small class="text-muted">Основний</small>
                                    <div class="h5 text-success">
                                        ${parseFloat(asset.available).toFixed(8)}
                                    </div>
                                </div>
                                <div class="text-center mt-2">
                                    <small class="text-muted">Заморожено</small>
                                    <div class="h6">
                                        ${parseFloat(asset.freeze).toFixed(8)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                })
                .join('');
        }
    }

    async cancelOrder(market, orderId) {
        if (!confirm(`Скасувати ордер ${orderId}?`)) return;
        try {
            const response = await fetch('/api/cancel-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ market, orderId })
            });
            const result = await response.json();
            if (result.success) {
                this.addLog(`✅ Ордер скасовано: ${orderId}`, 'success');
                this.showToast('Ордер скасовано', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.addLog(`⚠ Помилка скасування ордера: ${error.message}`, 'error');
            this.showToast('Помилка скасування ордера', 'error');
        }
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logColors = {
            success: '#00ff00',
            error: '#ff4444',
            warning: '#ffaa00',
            info: '#00aaff'
        };
        const logEntry = document.createElement('div');
        logEntry.style.color = logColors[type] || '#00ff00';
        logEntry.innerHTML = `<span style="color: #888;">[${timestamp}]</span> ${message}`;
        this.logsContainer.appendChild(logEntry);
        if (this.autoScrollLogs) {
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        }
        const logs = this.logsContainer.children;
        if (logs.length > 200) {
            this.logsContainer.removeChild(logs[0]);
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        const bgColor = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        }[type] || 'bg-info';
        const toastHtml = `
            <div class="toast ${bgColor} text-white" id="${toastId}" role="alert">
                <div class="toast-header ${bgColor} text-white border-0">
                    <i class="fas fa-robot me-2"></i>
                    <strong class="me-auto">WhiteBit Бот</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    clearLogs() {
        this.logsContainer.innerHTML = `
            <div class="text-muted">
                <i class="fas fa-info-circle"></i> Логи очищено...
            </div>
        `;
    }

    toggleAutoScroll() {
        this.autoScrollLogs = !this.autoScrollLogs;
        const btn = document.getElementById('toggleAutoScroll');
        if (this.autoScrollLogs) {
            btn.innerHTML = '<i class="fas fa-arrow-down"></i> Авто-скрол';
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
        } else {
            btn.innerHTML = '<i class="fas fa-pause"></i> Скрол вимк';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        }
    }

    updateTime() {
        setInterval(() => {
            this.currentTime.textContent = new Date().toLocaleString('uk-UA');
        }, 1000);
    }

    async refreshAll() {
        this.addLog('🔄 Оновлення всіх даних...', 'info');
        await Promise.all([
            this.updateStatus(),
            this.updateBalance(),
            this.updateActiveOrders(),
        ]);
        this.addLog('✅ Дані оновлено', 'success');
    }

    startUpdateLoop() {
        setInterval(async () => {
            // await this.updateStatus();
            await this.updateBalance();
            // await this.updateActiveOrders();
        }, 5000);
        this.refreshAll();
    }
}

// Ініціалізація панелі
const dashboard = new WhiteBitTradingDashboard();