// Settings Management for WhiteBit Trading Bot

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
    const stopLoss = parseFloat(document.getElementById('stopLoss').value);
    const leverageInput = document.getElementById('leverage');
    const leverage = leverageInput ? parseInt(leverageInput.value) : 1;
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

// Збереження налаштувань
document.getElementById('saveSettings').addEventListener('click', async function() {
    const settings = {
        tradingMode: document.querySelector('.mode-card.active').dataset.mode,
        apiKey: document.getElementById('apiKey').value,
        apiSecret: document.getElementById('apiSecret').value,
        tradingPair: document.getElementById('tradingPair').value,
        additionalPairs: document.getElementById('additionalPairs').value,
        strategyName: document.getElementById('strategyName').value,
        webhookUrl: document.getElementById('webhookUrl').value,
        stopLoss: document.getElementById('stopLoss').value,
        takeProfit: document.getElementById('takeProfit').value,
        maxDailyTrades: document.getElementById('maxDailyTrades').value,
        autoTrading: document.getElementById('autoTrading').checked,
        telegramNotifications: document.getElementById('telegramNotifications').checked,
        weekendTrading: document.getElementById('weekendTrading').checked,
        trailingStop: document.getElementById('trailingStop').checked
    };

    if (settings.tradingMode === 'spot') {
        settings.positionSize = document.getElementById('positionSize').value;
        settings.maxPositionPercent = document.getElementById('maxPositionPercent').value;
    } else {
        settings.leverage = document.getElementById('leverage').value;
        settings.futuresPositionSize = document.getElementById('futuresPositionSize').value;
        settings.marginType = document.getElementById('marginType').value;
    }

    if (settings.telegramNotifications) {
        settings.telegramToken = document.getElementById('telegramToken').value;
        settings.telegramChatId = document.getElementById('telegramChatId').value;
    }

    if (settings.trailingStop) {
        settings.trailingActivation = document.getElementById('trailingActivation').value;
        settings.trailingCallback = document.getElementById('trailingCallback').value;
        settings.trailingType = document.getElementById('trailingType').value;
    }

    // Валідація
    if (!settings.apiKey || !settings.apiSecret) {
        alert('⚠️ Будь ласка, введіть API ключі!');
        return;
    }

    try {
        // Відправка на backend
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            console.log('Збереження налаштувань:', settings);
            alert('✅ Налаштування успішно збережено!');

            // Зберігаємо локально (для демо)
            localStorage.setItem('botSettings', JSON.stringify(settings));
        } else {
            throw new Error('Помилка збереження налаштувань');
        }
    } catch (error) {
        console.error('Помилка:', error);
        alert('❌ Помилка збереження налаштувань. Перевірте підключення до сервера.');
    }
});

// Скидання налаштувань
document.getElementById('resetSettings').addEventListener('click', function() {
    if (confirm('Ви впевнені, що хочете скинути всі налаштування до стандартних?')) {
        // Очищення localStorage
        localStorage.removeItem('botSettings');

        // Перезавантаження сторінки
        location.reload();
    }
});

// Завантаження збережених налаштувань при старті
function loadSavedSettings() {
    const savedSettings = localStorage.getItem('botSettings');

    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);

            // Застосування налаштувань
            if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;
            if (settings.tradingPair) document.getElementById('tradingPair').value = settings.tradingPair;
            if (settings.additionalPairs) document.getElementById('additionalPairs').value = settings.additionalPairs;
            if (settings.strategyName) document.getElementById('strategyName').value = settings.strategyName;
            if (settings.webhookUrl) document.getElementById('webhookUrl').value = settings.webhookUrl;
            if (settings.stopLoss) document.getElementById('stopLoss').value = settings.stopLoss;
            if (settings.takeProfit) document.getElementById('takeProfit').value = settings.takeProfit;
            if (settings.maxDailyTrades) document.getElementById('maxDailyTrades').value = settings.maxDailyTrades;

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

                if (settings.leverage) document.getElementById('leverage').value = settings.leverage;
                if (settings.futuresPositionSize) document.getElementById('futuresPositionSize').value = settings.futuresPositionSize;
                if (settings.marginType) document.getElementById('marginType').value = settings.marginType;
            } else {
                if (settings.positionSize) document.getElementById('positionSize').value = settings.positionSize;
                if (settings.maxPositionPercent) document.getElementById('maxPositionPercent').value = settings.maxPositionPercent;
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
                if (settings.trailingActivation) document.getElementById('trailingActivation').value = settings.trailingActivation;
                if (settings.trailingCallback) document.getElementById('trailingCallback').value = settings.trailingCallback;
                if (settings.trailingType) document.getElementById('trailingType').value = settings.trailingType;
            }

            console.log('Налаштування завантажено:', settings);
        } catch (error) {
            console.error('Помилка завантаження налаштувань:', error);
        }
    }
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    updateRiskIndicator();
    loadSavedSettings();

    // Відстеження змін для оновлення ризику
    ['stopLoss', 'takeProfit', 'positionSize', 'maxPositionPercent'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateRiskIndicator);
        }
    });
});

// Експорт налаштувань у JSON файл
function exportSettings() {
    const settings = JSON.parse(localStorage.getItem('botSettings') || '{}');
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `whitebit_bot_settings_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Імпорт налаштувань з JSON файлу
function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const settings = JSON.parse(e.target.result);
            localStorage.setItem('botSettings', JSON.stringify(settings));
            alert('✅ Налаштування успішно імпортовано!');
            location.reload();
        } catch (error) {
            alert('❌ Помилка імпорту налаштувань. Перевірте файл.');
            console.error('Помилка імпорту:', error);
        }
    };
    reader.readAsText(file);
}