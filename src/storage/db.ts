import BetterSqlite3 from 'better-sqlite3';
import pino from 'pino';
import { Alert } from '../alerts/types';

const logger = pino({ name: 'database' });

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string = './data/twc-monitor.db') {
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
    logger.info({ dbPath }, 'Database initialized');
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        device_name TEXT NOT NULL,
        device_host TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notification_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id TEXT NOT NULL,
        group_name TEXT NOT NULL,
        channel TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (alert_id) REFERENCES alerts(id)
      );

      CREATE TABLE IF NOT EXISTS device_state (
        host TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        online INTEGER NOT NULL DEFAULT 0,
        last_seen TEXT,
        evse_state INTEGER,
        vitals_json TEXT,
        lifetime_json TEXT,
        version_json TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
      CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(device_host);
      CREATE INDEX IF NOT EXISTS idx_notification_log_alert ON notification_log(alert_id);
    `);
    logger.debug('Database migration complete');
  }

  insertAlert(alert: Alert): void {
    const stmt = this.db.prepare(`
      INSERT INTO alerts (id, type, severity, device_name, device_host, message, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      alert.id,
      alert.type,
      alert.severity,
      alert.deviceName,
      alert.deviceHost,
      alert.message,
      JSON.stringify(alert.details),
      alert.timestamp.toISOString(),
    );
  }

  insertNotificationLog(alertId: string, groupName: string, channel: string, success: boolean): void {
    const stmt = this.db.prepare(`
      INSERT INTO notification_log (alert_id, group_name, channel, success)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(alertId, groupName, channel, success ? 1 : 0);
  }

  updateDeviceState(host: string, name: string, online: boolean, state: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO device_state (host, name, online, last_seen, evse_state, vitals_json, lifetime_json, version_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(host) DO UPDATE SET
        name = excluded.name,
        online = excluded.online,
        last_seen = CASE WHEN excluded.online THEN datetime('now') ELSE device_state.last_seen END,
        evse_state = excluded.evse_state,
        vitals_json = excluded.vitals_json,
        lifetime_json = excluded.lifetime_json,
        version_json = excluded.version_json,
        updated_at = datetime('now')
    `);
    stmt.run(
      host,
      name,
      online ? 1 : 0,
      online ? new Date().toISOString() : null,
      state.vitals?.evse_state ?? null,
      state.vitals ? JSON.stringify(state.vitals) : null,
      state.lifetime ? JSON.stringify(state.lifetime) : null,
      state.version ? JSON.stringify(state.version) : null,
    );
  }

  getRecentAlerts(limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(limit);
  }

  getDeviceStates(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM device_state ORDER BY name`);
    return stmt.all();
  }

  getAlertStats(hours: number = 24): any {
    const stmt = this.db.prepare(`
      SELECT type, severity, COUNT(*) as count
      FROM alerts
      WHERE created_at > datetime('now', ? || ' hours')
      GROUP BY type, severity
      ORDER BY count DESC
    `);
    return stmt.all(`-${hours}`);
  }

  close(): void {
    this.db.close();
    logger.info('Database closed');
  }
}
