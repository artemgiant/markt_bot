// connectors/monitoring.js
const os = require('os');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const path = require('path');

class MonitoringConnector {
    constructor() {
        this.startTime = Date.now();
        this.metrics = {
            requests: 0,
            errors: 0,
            responses: {},
            activeConnections: 0
        };
    }

    // Системна інформація
    getSystemInfo() {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            hostname: os.hostname(),
            platform: `${os.platform()} ${os.arch()}`,
            nodeVersion: process.version,
            uptime: process.uptime(),
            systemUptime: os.uptime(),
            loadavg: os.loadavg(),
            cpu: {
                model: cpus[0].model,
                cores: cpus.length,
                usage: this.getCPUUsage()
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                percentage: ((usedMem / totalMem) * 100).toFixed(2),
                process: process.memoryUsage()
            },
            network: this.getNetworkInfo(),
            disk: await this.getDiskUsage()
        };
    }

    // Використання CPU
    getCPUUsage() {
        const cpus = os.cpus();
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;

        for (let cpu of cpus) {
            user += cpu.times.user;
            nice += cpu.times.nice;
            sys += cpu.times.sys;
            idle += cpu.times.idle;
            irq += cpu.times.irq;
        }

        const total = user + nice + sys + idle + irq;
        const usage = 100 - ((idle / total) * 100);

        return {
            usage: usage.toFixed(2),
            user: ((user / total) * 100).toFixed(2),
            system: ((sys / total) * 100).toFixed(2),
            idle: ((idle / total) * 100).toFixed(2)
        };
    }

    // Мережева інформація
    getNetworkInfo() {
        const interfaces = os.networkInterfaces();
        const networks = [];

        for (let name in interfaces) {
            for (let interface of interfaces[name]) {
                if (interface.family === 'IPv4' && !interface.internal) {
                    networks.push({
                        name: name,
                        address: interface.address,
                        netmask: interface.netmask,
                        mac: interface.mac
                    });
                }
            }
        }

        return networks;
    }

    // Використання диска
    async getDiskUsage() {
        return new Promise((resolve) => {
            exec('df -h /', (error, stdout) => {
                if (error) {
                    resolve({ error: 'Unable to get disk usage' });
                    return;
                }

                const lines = stdout.trim().split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    resolve({
                        total: parts[1],
                        used: parts[2],
                        available: parts[3],
                        percentage: parts[4]
                    });
                } else {
                    resolve({ error: 'Unable to parse disk usage' });
                }
            });
        });
    }

    // PM2 статус
    async getPM2Status() {
        return new Promise((resolve, reject) => {
            const pm2Process = spawn('pm2', ['jlist']);
            let data = '';

            pm2Process.stdout.on('data', (chunk) => {
                data += chunk;
            });

            pm2Process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const pm2Data = JSON.parse(data);
                        resolve(pm2Data.map(proc => ({
                            name: proc.name,
                            pid: proc.pid,
                            status: proc.pm2_env.status,
                            uptime: proc.pm2_env.pm_uptime,
                            restarts: proc.pm2_env.restart_time,
                            memory: proc.monit.memory,
                            cpu: proc.monit.cpu,
                            version: proc.pm2_env.version,
                            mode: proc.pm2_env.exec_mode,
                            instances: proc.pm2_env.instances || 1
                        })));
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error('PM2 command failed'));
                }
            });
        });
    }

    // Статистика застосунку
    getAppStats() {
        return {
            startTime: this.startTime,
            uptime: Date.now() - this.startTime,
            requests: this.metrics.requests,
            errors: this.metrics.errors,
            responses: this.metrics.responses,
            activeConnections: this.metrics.activeConnections,
            eventLoopLag: this.getEventLoopLag()
        };
    }

    // Затримка Event Loop
    getEventLoopLag() {
        const start = process.hrtime();
        setImmediate(() => {
            const delta = process.hrtime(start);
            return (delta[0] * 1000 + delta[1] * 1e-6).toFixed(2);
        });
    }

    // Middleware для підрахунку запитів
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();

            // Збільшуємо лічильник запитів
            this.metrics.requests++;
            this.metrics.activeConnections++;

            // Відстеження відповіді
            const originalSend = res.send;
            res.send = function(data) {
                const responseTime = Date.now() - startTime;

                // Записуємо статус відповіді
                const status = res.statusCode;
                if (!monitoring.metrics.responses[status]) {
                    monitoring.metrics.responses[status] = 0;
                }
                monitoring.metrics.responses[status]++;

                // Записуємо помилки
                if (status >= 400) {
                    monitoring.metrics.errors++;
                }

                monitoring.metrics.activeConnections--;

                // Логуємо запит
                console.log(`${req.method} ${req.url} - ${status} (${responseTime}ms)`);

                return originalSend.call(this, data);
            };

            next();
        };
    }

    // Отримання логів
    async getLogFiles(date = null) {
        const logsDir = path.join(__dirname, '..', 'logs', 'PM2');

        if (date) {
            const dateDir = path.join(logsDir, date);
            if (!fs.existsSync(dateDir)) {
                return {};
            }

            const logs = {};
            const files = ['error.log', 'out.log', 'combined.log'];

            files.forEach(file => {
                const filePath = path.join(dateDir, file);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    logs[file] = content.split('\n').filter(line => line.trim()).slice(-200);
                }
            });

            return logs;
        } else {
            // Отримати список дат
            if (!fs.existsSync(logsDir)) {
                return [];
            }

            return fs.readdirSync(logsDir)
                .filter(item => {
                    const itemPath = path.join(logsDir, item);
                    return fs.statSync(itemPath).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(item);
                })
                .sort()
                .reverse();
        }
    }
}

// Експорт синглтону
const monitoring = new MonitoringConnector();
module.exports = monitoring;
