import pino from 'pino';
import { loadConfig } from './config/loader';
import { Database } from './storage/db';
import { Poller } from './poller/poller';
import { NotificationDispatcher } from './notifications/notifier';
import { createDashboard } from './dashboard/server';
import { Alert } from './alerts/types';

const logger = pino({
  name: 'twc-monitor',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

async function main() {
  logger.info('Starting Tesla Wall Connector Monitor...');

  // Load config
  const config = loadConfig();

  // Initialize database
  const db = new Database(config.dashboard.enabled ? './data/twc-monitor.db' : './data/twc-monitor.db');

  // Initialize notification dispatcher
  const dispatcher = new NotificationDispatcher(config, db);
  await dispatcher.initialize();

  // Alert handler — called by poller when alerts fire
  const handleAlerts = async (alerts: Alert[]) => {
    logger.info({ count: alerts.length }, 'Processing alerts');

    // Update device states in DB
    const poller = pollerInstance;
    if (poller) {
      for (const [host, state] of poller.getDeviceStates()) {
        const deviceConfig = poller.getDeviceConfig().find(d => d.host === host);
        if (deviceConfig) {
          db.updateDeviceState(host, deviceConfig.name, state.online, state);
        }
      }
    }

    // Dispatch notifications
    await dispatcher.dispatch(alerts);
  };

  // Initialize and start poller
  const pollerInstance = new Poller(config, handleAlerts);
  pollerInstance.start();

  // Also update device states on every poll (even without alerts)
  const originalPollAll = pollerInstance.pollAll.bind(pollerInstance);
  pollerInstance.pollAll = async () => {
    await originalPollAll();
    // Update device states in DB after every poll
    for (const [host, state] of pollerInstance.getDeviceStates()) {
      const deviceConfig = pollerInstance.getDeviceConfig().find(d => d.host === host);
      if (deviceConfig) {
        db.updateDeviceState(host, deviceConfig.name, state.online, state);
      }
    }
  };

  // Start dashboard
  if (config.dashboard.enabled) {
    const port = config.dashboard.port || parseInt(process.env.DASHBOARD_PORT || '3000');
    createDashboard(db, pollerInstance, port);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    pollerInstance.stop();
    await dispatcher.shutdown();
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('Tesla Wall Connector Monitor is running!');
}

main().catch(err => {
  logger.fatal({ err }, 'Fatal error');
  process.exit(1);
});
