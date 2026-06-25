import path from 'path';
import fs from 'fs';
import express from 'express';
import pino from 'pino';
import { Database } from '../storage/db';
import { Poller } from '../poller/poller';

const logger = pino({ name: 'dashboard' });

interface PowerReading {
  timestamp: number;
  power_kw: number;
  host: string;
}

// Ring buffer storing last 60 power readings per device (~5 minutes at 5s intervals)
const MAX_POWER_HISTORY_PER_DEVICE = 60;
const powerHistory: Map<string, PowerReading[]> = new Map();

function recordPowerReading(host: string, powerKw: number): void {
  if (!powerHistory.has(host)) {
    powerHistory.set(host, []);
  }
  const history = powerHistory.get(host)!;
  history.push({ timestamp: Date.now(), power_kw: powerKw, host });
  if (history.length > MAX_POWER_HISTORY_PER_DEVICE) {
    history.shift();
  }
}

export function createDashboard(db: Database, poller: Poller, port: number = 3000): express.Application {
  const app = express();

  // Record power readings from poller on each tick
  const pollInterval = setInterval(() => {
    const devices = db.getDeviceStates();
    for (const d of devices) {
      if (d.vitals_json) {
        try {
          const vitals = JSON.parse(d.vitals_json);
          const powerKw =
            (vitals.currentA_a * vitals.voltageA_v +
              vitals.currentB_a * vitals.voltageB_v +
              vitals.currentC_a * vitals.voltageC_v) / 1000;
          recordPowerReading(d.host, powerKw);
        } catch {
          // Skip malformed vitals
        }
      }
    }
  }, 5000);

  // Cleanup interval on process exit
  process.on('beforeExit', () => clearInterval(pollInterval));

  // API endpoints
  app.get('/api/devices', (_req, res) => {
    res.json(db.getDeviceStates());
  });

  app.get('/api/alerts', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(db.getRecentAlerts(limit));
  });

  app.get('/api/stats', (req, res) => {
    const hours = parseInt(req.query.hours as string) || 24;
    res.json(db.getAlertStats(hours));
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/power-history', (req, res) => {
    const host = req.query.host as string | undefined;
    if (host && powerHistory.has(host)) {
      res.json(powerHistory.get(host));
    } else {
      // Return all readings from all devices
      const all: PowerReading[] = [];
      for (const readings of powerHistory.values()) {
        all.push(...readings);
      }
      all.sort((a, b) => a.timestamp - b.timestamp);
      res.json(all);
    }
  });

  // Serve React dashboard static files
  const distPath = path.resolve(__dirname, '../../dashboard-ui/dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA fallback: serve index.html for non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.type('html').send(`
        <html><body style="background:#09090B;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
          <div style="text-align:center;">
            <h1>⚡ TWC Monitor</h1>
            <p>Dashboard UI not built. Run <code>npm run build:ui</code> to build the frontend.</p>
            <p style="margin-top:1em;"><a href="/api/devices" style="color:#3B82F6;">API: /api/devices</a></p>
          </div>
        </body></html>
      `);
    });
  }

  app.listen(port, () => {
    logger.info({ port }, 'Dashboard running');
  });

  return app;
}
