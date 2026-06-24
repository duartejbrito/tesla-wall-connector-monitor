import express from 'express';
import pino from 'pino';
import { Database } from '../storage/db';
import { Poller } from '../poller/poller';
import { EvseState } from '../types/twc';

const logger = pino({ name: 'dashboard' });

function evseStateLabel(state: number | null): string {
  switch (state) {
    case EvseState.Booting: return '🔄 Booting';
    case EvseState.Idle: return '⚪ Idle';
    case EvseState.Connected: return '🔌 Connected';
    case EvseState.ReadyToCharge: return '🟡 Ready';
    case EvseState.Charging: return '🟢 Charging';
    case EvseState.Fault: return '🔴 Fault';
    case EvseState.Error: return '🔴 Error';
    case EvseState.Busy: return '🟠 Busy';
    case EvseState.ChargingReduced: return '🟡 Charging (Reduced)';
    default: return '❓ Unknown';
  }
}

export function createDashboard(db: Database, poller: Poller, port: number = 3000): express.Application {
  const app = express();

  app.get('/', (_req, res) => {
    const devices = db.getDeviceStates();
    const recentAlerts = db.getRecentAlerts(20);
    const stats = db.getAlertStats(24);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TWC Monitor Dashboard</title>
  <meta http-equiv="refresh" content="30">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    h1 { color: #38bdf8; margin-bottom: 20px; }
    h2 { color: #94a3b8; margin: 20px 0 10px; font-size: 1.1em; text-transform: uppercase; letter-spacing: 0.05em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .card.online { border-left: 4px solid #22c55e; }
    .card.offline { border-left: 4px solid #ef4444; }
    .card h3 { color: #f1f5f9; margin-bottom: 8px; }
    .card .status { font-size: 0.9em; margin-bottom: 4px; }
    .card .detail { color: #94a3b8; font-size: 0.85em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-size: 0.85em; text-transform: uppercase; }
    td { font-size: 0.9em; }
    .severity-critical { color: #ef4444; font-weight: bold; }
    .severity-warning { color: #eab308; }
    .severity-info { color: #38bdf8; }
    .footer { margin-top: 30px; color: #475569; font-size: 0.8em; text-align: center; }
  </style>
</head>
<body>
  <h1>⚡ Tesla Wall Connector Monitor</h1>

  <h2>Fleet Status (${devices.length} devices)</h2>
  <div class="grid">
    ${devices.map((d: any) => {
      const vitals = d.vitals_json ? JSON.parse(d.vitals_json) : null;
      const version = d.version_json ? JSON.parse(d.version_json) : null;
      return `
    <div class="card ${d.online ? 'online' : 'offline'}">
      <h3>${d.name}</h3>
      <div class="status">${d.online ? '🟢 Online' : '🔴 Offline'} — ${evseStateLabel(d.evse_state)}</div>
      ${vitals ? `
      <div class="detail">Power: ${((vitals.currentA_a * vitals.voltageA_v + vitals.currentB_a * vitals.voltageB_v + vitals.currentC_a * vitals.voltageC_v) / 1000).toFixed(2)} kW</div>
      <div class="detail">Session: ${(vitals.session_energy_wh / 1000).toFixed(2)} kWh</div>
      <div class="detail">Temp: PCB ${vitals.pcba_temp_c.toFixed(1)}°C / Handle ${vitals.handle_temp_c.toFixed(1)}°C</div>
      <div class="detail">Grid: ${vitals.grid_v.toFixed(1)}V @ ${vitals.grid_hz.toFixed(2)}Hz</div>
      ` : '<div class="detail">No data available</div>'}
      ${version ? `<div class="detail">FW: ${version.firmware_version} | SN: ${version.serial_number}</div>` : ''}
      <div class="detail">Host: ${d.host} | Last seen: ${d.last_seen || 'Never'}</div>
    </div>`;
    }).join('')}
  </div>

  <h2>Recent Alerts</h2>
  <table>
    <thead>
      <tr><th>Time</th><th>Severity</th><th>Type</th><th>Device</th><th>Message</th></tr>
    </thead>
    <tbody>
      ${recentAlerts.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#475569;">No alerts yet</td></tr>' : ''}
      ${recentAlerts.map((a: any) => `
      <tr>
        <td>${new Date(a.created_at).toLocaleString()}</td>
        <td class="severity-${a.severity}">${a.severity.toUpperCase()}</td>
        <td>${a.type.replace(/_/g, ' ')}</td>
        <td>${a.device_name}</td>
        <td>${a.message}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${stats.length > 0 ? `
  <h2>Alert Summary (24h)</h2>
  <table>
    <thead><tr><th>Type</th><th>Severity</th><th>Count</th></tr></thead>
    <tbody>
      ${stats.map((s: any) => `
      <tr>
        <td>${s.type.replace(/_/g, ' ')}</td>
        <td class="severity-${s.severity}">${s.severity.toUpperCase()}</td>
        <td>${s.count}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">TWC Monitor — Auto-refreshes every 30s</div>
</body>
</html>`;
    res.type('html').send(html);
  });

  // API endpoints for programmatic access
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

  app.listen(port, () => {
    logger.info({ port }, 'Dashboard running');
  });

  return app;
}
