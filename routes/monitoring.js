// routes/monitoring.js
const express = require('express');
const router = express.Router();
const monitoring = require('../connectors/monitoring');
const path = require('path');

// Головна сторінка моніторингу
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'monitoring', 'dashboard.html'));
});

// API для системної інформації
router.get('/api/system', async (req, res) => {
    try {
        const systemInfo = await monitoring.getSystemInfo();
        res.json(systemInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для PM2 статусу
router.get('/api/pm2', async (req, res) => {
    try {
        const pm2Status = await monitoring.getPM2Status();
        res.json(pm2Status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для статистики застосунку
router.get('/api/app-stats', (req, res) => {
    try {
        const appStats = monitoring.getAppStats();
        res.json(appStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для логів
router.get('/api/logs/:date?', async (req, res) => {
    try {
        const { date } = req.params;
        const logs = await monitoring.getLogFiles(date);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API для реальних логів через SSE
router.get('/api/logs-stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    const { spawn } = require('child_process');
    const logProcess = spawn('pm2', ['logs', '--lines', '50', '--raw']);

    logProcess.stdout.on('data', (data) => {
        res.write(`data: ${JSON.stringify({
            type: 'info',
            message: data.toString(),
            timestamp: new Date().toISOString()
        })}\n\n`);
    });

    logProcess.stderr.on('data', (data) => {
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: data.toString(),
            timestamp: new Date().toISOString()
        })}\n\n`);
    });

    req.on('close', () => {
        logProcess.kill();
    });
});

module.exports = router;
