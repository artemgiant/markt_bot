// public/settings/js/settings.js

// Перемикання режиму торгівлі
document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        const mode = this.dataset.mode;
        if (mode === 'spot') {
            document.getElementById('spotSettings').style.display = 'block';
            document.getElementById('futuresSettings').style.display = 'none';
        } else {
            document.getElementById('spotSettings').style.display = 'none';
            document.getElementById('futuresSettings').style.display = 'block';
        }

        updateRiskIndicator();
    });
});

// Попередження про кредитне плече
const leverageInput = document.getElementById('leverage');
if (leverageInput) {
    leverageInput.addEventListener('input', function() {
        const warning = document.getElementById('leverageWarning');
        if (parseInt(this.value) > 10) {
            warning.classList.add('show');
        } else {
            warning.classList.remove('show');
        }
        updateRiskIndicator();
    });
}

// Показ налаштувань Telegram
document.getElementById('telegramNotifications').addEventListener('change', function() {
    document.getElementById('telegramSettings').style.display =
        this.checked ? 'flex' : 'none';
});

// Показ налаштувань Trailing Stop
document.getElementById('trailingStop').addEventListener('change', function() {
    document.getElementById('trailingStopSettings').style.display =
        this.checked ? 'flex' : 'none';
});

// Розрахунок рівня ризику
function updateRiskIndicator() {
    const stopLossValue = document.getElementById('stopLoss').value;
    const stopLoss = parseFloat(stopLossValue.replace(',', '.')) || 0;

    const leverageInput = document.getElementById('leverage');
    const leverageValue = leverageInput ? leverageInput.value : '1';
    const leverage = parseInt(leverageValue) || 1;

    const mode = document.querySelector('.mode-card.active').dataset.mode;

    let riskScore = 0;

    if (mode === 'futures') {
        riskScore += leverage > 10 ? 40 : leverage > 5 ? 25 : 10;
    }

    riskScore += stopLoss < 1 ? 30 : stopLoss < 2 ? 20 : 10;

    const indicator = document.getElementById('riskIndicator');
    const label = document.getElementById('riskLabel');

    indicator.classList.remove('risk-low', 'risk-medium', 'risk-high');

    if (riskScore < 30) {
        indicator.classList.add('risk-low');
        label.textContent = 'Низький';
        label.style.color = 'var(--success-color)';
    } else if (riskScore < 50) {
        indicator.classList.add('risk-medium');
        label.textContent = 'Середній';
        label.style.color = 'var(--warning-color)';
    } else {
        indicator.classList.add('risk-high');
        label.textContent = 'Високий';
        label.style.color = 'var(--danger-color)';
    }
}

// ✅ НОВА ФУНКЦІЯ: Завантаження налаштувань з БД
async function loadSettingsFromAPI() {
    try {
        console.log('🔥 Завантаження налаштувань з сервера...');

        const response = await fetch('/settings/api', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Помилка завантаження налаштувань');
        }

        const result = await response.json();

        if (result.success && result.data) {
            const settings = result.data;
            console.log('✅ Налаштування завантажено з БД:', settings);

            // Заповнюємо форму даними з БД
            applySettingsToForm(settings);

            return settings;
        } else {
            console.warn('⚠️ Налаштування не знайдено, використовуємо стандартні');
            return null;
        }

    } catch (error) {
        console.error('❌ Помилка завантаження налаштувань:', error);
        showNotification('Помилка завантаження налаштувань', 'error');
        return null;
    }
}

// Застосування налаштувань до форми
function applySettingsToForm(settings) {
    // API налаштування (не показуємо з міркувань безпеки)
    // if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;

    // Торгові пари
    if (settings.tradingPair) document.getElementById('tradingPair').value = settings.tradingPair;
    if (settings.additionalPairs) document.getElementById('additionalPairs').value = settings.additionalPairs;

    // Стратегія
    if (settings.strategyName) document.getElementById('strategyName').value = settings.strategyName;
    if (settings.webhookUrl) document.getElementById('webhookUrl').value = settings.webhookUrl;

    // Параметри ризику
    if (settings.stopLoss) document.getElementById('stopLoss').value = parseFloat(settings.stopLoss);
    if (settings.takeProfit) document.getElementById('takeProfit').value = parseFloat(settings.takeProfit);
    if (settings.maxDailyTrades) document.getElementById('maxDailyTrades').value = parseInt(settings.maxDailyTrades);

    // Перемикачі
    document.getElementById('autoTrading').checked = settings.autoTrading !== false;
    document.getElementById('telegramNotifications').checked = settings.telegramNotifications || false;
    document.getElementById('weekendTrading').checked = settings.weekendTrading !== false;
    document.getElementById('trailingStop').checked = settings.trailingStop || false;

    // Режим торгівлі
    if (settings.tradingMode === 'futures') {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-mode="futures"]').classList.add('active');
        document.getElementById('spotSettings').style.display = 'none';
        document.getElementById('futuresSettings').style.display = 'block';

        if (settings.leverage) document.getElementById('leverage').value = parseInt(settings.leverage);
        if (settings.futuresPositionSize) document.getElementById('futuresPositionSize').value = parseFloat(settings.futuresPositionSize);
        if (settings.marginType) document.getElementById('marginType').value = settings.marginType;
    } else {
        if (settings.positionSize) document.getElementById('positionSize').value = parseFloat(settings.positionSize);
        if (settings.maxPositionPercent) document.getElementById('maxPositionPercent').value = parseFloat(settings.maxPositionPercent);
    }

    // Telegram налаштування
    if (settings.telegramNotifications) {
        document.getElementById('telegramSettings').style.display = 'flex';
        if (settings.telegramToken) document.getElementById('telegramToken').value = settings.telegramToken;
        if (settings.telegramChatId) document.getElementById('telegramChatId').value = settings.telegramChatId;
    }

    // Trailing Stop налаштування
    if (settings.trailingStop) {
        document.getElementById('trailingStopSettings').style.display = 'flex';
        if (settings.trailingActivation) document.getElementById('trailingActivation').value = parseFloat(settings.trailingActivation);
        if (settings.trailingCallback) document.getElementById('trailingCallback').value = parseFloat(settings.trailingCallback);
        if (settings.trailingType) document.getElementById('trailingType').value = settings.trailingType;
    }

    // Оновлюємо індикатор ризику
    updateRiskIndicator();
}

// ✅ ОНОВЛЕНА ФУНКЦІЯ: Збереження налаштувань в БД
document.getElementById('saveSettings').addEventListener('click', async function() {
    const settings = {
        botName: 'WhiteBit Bot',
        tradingMode: document.querySelector('.mode-card.active').dataset.mode,
        apiKey: document.getElementById('apiKey').value,
        apiSecret: document.getElementById('apiSecret').value,
        tradingPair: document.getElementById('tradingPair').value,
        additionalPairs: document.getElementById('additionalPairs').value,
        strategyName: document.getElementById('strategyName').value,
        webhookUrl: document.getElementById('webhookUrl').value,
        stopLoss: parseFloat(document.getElementById('stopLoss').value),
        takeProfit: parseFloat(document.getElementById('takeProfit').value),
        maxDailyTrades: parseInt(document.getElementById('maxDailyTrades').value),
        autoTrading: document.getElementById('autoTrading').checked,
        telegramNotifications: document.getElementById('telegramNotifications').checked,
        weekendTrading: document.getElementById('weekendTrading').checked,
        trailingStop: document.getElementById('trailingStop').checked
    };

    // Додаємо параметри залежно від режиму
    if (settings.tradingMode === 'spot') {
        settings.positionSize = parseFloat(document.getElementById('positionSize').value);
        settings.maxPositionPercent = parseFloat(document.getElementById('maxPositionPercent').value);
    } else {
        settings.leverage = parseInt(document.getElementById('leverage').value);
        settings.futuresPositionSize = parseFloat(document.getElementById('futuresPositionSize').value);
        settings.marginType = document.getElementById('marginType').value;
    }

    // Telegram налаштування
    if (settings.telegramNotifications) {
        settings.telegramToken = document.getElementById('telegramToken').value;
        settings.telegramChatId = document.getElementById('telegramChatId').value;
    }

    // Trailing Stop налаштування
    if (settings.trailingStop) {
        settings.trailingActivation = parseFloat(document.getElementById('trailingActivation').value);
        settings.trailingCallback = parseFloat(document.getElementById('trailingCallback').value);
        settings.trailingType = document.getElementById('trailingType').value;
    }

    // Валідація
    if (!settings.tradingPair) {
        showNotification('⚠️ Будь ласка, оберіть торгову пару!', 'warning');
        return;
    }

    try {
        console.log('💾 Збереження налаштувань в БД...');

        // ✅ ЗМІНЕНО: Відправка на /settings/api замість /api/settings
        const response = await fetch('/settings/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Налаштування збережено в БД:', result.data);
            showNotification('✅ Налаштування успішно збережено!', 'success');
        } else {
            throw new Error(result.message || 'Помилка збереження');
        }

    } catch (error) {
        console.error('❌ Помилка збереження:', error);
        showNotification('❌ Помилка збереження налаштувань. Перевірте підключення до сервера.', 'error');
    }
});

// ✅ ОНОВЛЕНА ФУНКЦІЯ: Скидання налаштувань
document.getElementById('resetSettings').addEventListener('click', async function() {
    if (!confirm('Ви впевнені, що хочете скинути всі налаштування до стандартних?')) {
        return;
    }

    try {
        const response = await fetch('/settings/api', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Налаштування скинуто');
            showNotification('✅ Налаштування скинуто до стандартних', 'success');

            // Перезавантажуємо сторінку
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            throw new Error(result.message || 'Помилка скидання');
        }

    } catch (error) {
        console.error('❌ Помилка скидання:', error);
        showNotification('❌ Помилка скидання налаштувань', 'error');
    }
});

// ✅ НОВА ФУНКЦІЯ: Показ повідомлень
function showNotification(message, type = 'info') {
    // Створюємо елемент повідомлення
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} notification-popup`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.animation = 'slideIn 0.3s ease-out';
    notification.textContent = message;

    document.body.appendChild(notification);

    // Автоматично видаляємо через 3 секунди
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Експорт налаштувань у JSON файл
function exportSettings() {
    window.location.href = '/settings/export';
}

// Імпорт налаштувань з JSON файлу
function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const settings = JSON.parse(e.target.result);

            // Відправляємо на сервер
            const response = await fetch('/settings/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                showNotification('✅ Налаштування успішно імпортовано!', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                throw new Error('Помилка імпорту');
            }

        } catch (error) {
            showNotification('❌ Помилка імпорту налаштувань. Перевірте файл.', 'error');
            console.error('Помилка імпорту:', error);
        }
    };
    reader.readAsText(file);
}

// ✅ ОНОВЛЕНА ФУНКЦІЯ: Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Ініціалізація сторінки налаштувань...');

    // ✅ ЗМІНЕНО: Завантажуємо налаштування з БД замість localStorage
    await loadSettingsFromAPI();

    // Оновлюємо індикатор ризику
    updateRiskIndicator();

    // Відстежуємо зміни для оновлення ризику
    ['stopLoss', 'takeProfit', 'positionSize', 'maxPositionPercent'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateRiskIndicator);
        }
    });

    console.log('✅ Сторінка налаштувань готова до роботи');
});

// Додаємо CSS анімації для повідомлень
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);