import pino from 'pino';
import * as cron from 'node-cron';
import { TwcClient } from './twc-client';
import { TwcFullStatus } from '../types/twc';
import { AlertEngine } from '../alerts/engine';
import { Alert } from '../alerts/types';
import { AppConfig, WallConnectorConfig } from '../config/loader';

const logger = pino({ name: 'poller' });

export class Poller {
  private clients: Map<string, TwcClient> = new Map();
  private previousStates: Map<string, TwcFullStatus> = new Map();
  private currentStates: Map<string, TwcFullStatus> = new Map();
  private alertEngine: AlertEngine;
  private config: AppConfig;
  private onAlerts: (alerts: Alert[]) => void;
  private task: cron.ScheduledTask | null = null;

  constructor(config: AppConfig, onAlerts: (alerts: Alert[]) => void) {
    this.config = config;
    this.onAlerts = onAlerts;
    this.alertEngine = new AlertEngine(config.alerts.cooldown_minutes);

    for (const wc of config.wall_connectors.filter(w => w.enabled)) {
      this.clients.set(wc.host, new TwcClient(wc.name, wc.host, config.polling.timeout_ms));
    }

    logger.info({ deviceCount: this.clients.size }, 'Poller initialized');
  }

  async pollAll(): Promise<void> {
    const devices = this.config.wall_connectors.filter(w => w.enabled);
    const allAlerts: Alert[] = [];

    const results = await Promise.allSettled(
      devices.map(wc => this.pollDevice(wc)),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allAlerts.push(...result.value);
      }
    }

    if (allAlerts.length > 0) {
      this.onAlerts(allAlerts);
    }
  }

  private async pollDevice(wc: WallConnectorConfig): Promise<Alert[]> {
    const client = this.clients.get(wc.host);
    if (!client) return [];

    const previous = this.currentStates.get(wc.host) || null;
    const pollResult = await client.pollAll();

    const current: TwcFullStatus = {
      vitals: pollResult.vitals,
      lifetime: pollResult.lifetime,
      wifi: pollResult.wifi,
      version: pollResult.version,
      online: pollResult.online,
      lastSeen: pollResult.online ? new Date() : (previous?.lastSeen || null),
      consecutiveMisses: pollResult.online ? 0 : (previous?.consecutiveMisses || 0) + 1,
    };

    this.previousStates.set(wc.host, previous || current);
    this.currentStates.set(wc.host, current);

    return this.alertEngine.evaluate(
      wc.name,
      wc.host,
      current,
      previous,
      this.config.alerts,
    );
  }

  start(): void {
    const intervalSec = this.config.polling.interval_seconds;
    // node-cron doesn't support arbitrary seconds, so we use setInterval for sub-minute
    if (intervalSec < 60) {
      logger.info({ intervalSec }, 'Starting poller with setInterval');
      // Do an initial poll immediately
      this.pollAll().catch(err => logger.error({ err }, 'Initial poll failed'));

      const interval = setInterval(() => {
        this.pollAll().catch(err => logger.error({ err }, 'Poll cycle failed'));
      }, intervalSec * 1000);

      // Store cleanup reference
      (this as any)._interval = interval;
    } else {
      const cronExpr = `*/${Math.floor(intervalSec / 60)} * * * *`;
      logger.info({ cronExpr, intervalSec }, 'Starting poller with cron');

      this.pollAll().catch(err => logger.error({ err }, 'Initial poll failed'));

      this.task = cron.schedule(cronExpr, () => {
        this.pollAll().catch(err => logger.error({ err }, 'Poll cycle failed'));
      });
    }
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    if ((this as any)._interval) {
      clearInterval((this as any)._interval);
      (this as any)._interval = null;
    }
    logger.info('Poller stopped');
  }

  getDeviceStates(): Map<string, TwcFullStatus> {
    return new Map(this.currentStates);
  }

  getDeviceConfig(): WallConnectorConfig[] {
    return this.config.wall_connectors.filter(w => w.enabled);
  }
}
