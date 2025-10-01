// public/monitoring/js/monitoring.js
class MarketBotMonitoring {
    constructor() {
        this.initializeTabs();
        this.initializeCharts();
        this.startDataRefresh();
        this.setupLogStream();
    }

    initializeTabs() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.showTab(tabName);
            });
        });
    }

    showTab(tabName) {
        // Приховати всі вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Показати обрану вкладку
        document.getElementById(tabName).classList.add('active');

        // Оновити активну кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    async loadSystemData() {
        try {
            const response = await fetch('/monitoring/api/system');
            const data = await response.json();
            this.updateSystemInfo(data);
        } catch (error) {
            console.error('Error loading system data:', error);
        }
    }

    updateSystemInfo(data) {
        // Основна інформація
        document.getElementById('hostname').textContent = data.hostname;
        document.getElementById('platform').textContent = data.platform;
        document.getElementById('nodeVersion').textContent = data.nodeVersion;
        document.getElementById('systemUptime').textContent = this.formatUptime(data.systemUptime);

        // CPU
        const cpuUsage = parseFloat(data.cpu.usage);
        document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
        document.getElementById('cpuProgress').style.width = `${cpuUsage}%`;

        // Memory
        const memoryPercentage = parseFloat(data.memory.percentage);
        document.getElementById('memoryUsage').textContent = `${memoryPercentage}%`;
        document.getElementById('memoryProgress').style.width = `${memoryPercentage}%`;
        document.getElementById('memoryUsed').textContent = this.formatBytes(data.memory.used);
        document.getElementById('memoryTotal').textContent = this.formatBytes(data.memory.total);

        // Disk
        if (data.disk && !data.disk.error) {
            const diskPercentage = parseInt(data.disk.percentage);
            document.getElementById('diskUsage').textContent = data.disk.percentage;
            document.getElementById('diskProgress').style.width = `${diskPercentage}%`;
            document.getElementById('diskUsed').textContent = data.disk.used;
            document.getElementById('diskFree').textContent = data.disk.available;
        }

        // Оновити час
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}д ${hours}г`;
        } else if (hours > 0) {
            return `${hours}г ${minutes}хв`;
        } else {
            return `${minutes}хв`;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    startDataRefresh() {
        // Оновлювати дані кожні 5 секунд
        this.loadSystemData();
        setInterval(() => {
            this.loadSystemData();
        }, 5000);
    }
}

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    new MarketBotMonitoring();
});
