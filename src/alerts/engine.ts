import pino from 'pino';
import { Alert, AlertType, Severity } from './types';
import { alertRules } from './rules';
import { TwcFullStatus } from '../types/twc';
import { AlertsConfig } from '../config/loader';

const logger = pino({ name: 'alert-engine' });

interface CooldownEntry {
  alertType: AlertType;
  deviceHost: string;
  lastFiredAt: Date;
}

export class AlertEngine {
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private cooldownMinutes: number;

  constructor(cooldownMinutes: number = 15) {
    this.cooldownMinutes = cooldownMinutes;
  }

  private cooldownKey(alertType: AlertType, deviceHost: string): string {
    return `${alertType}:${deviceHost}`;
  }

  private isInCooldown(alertType: AlertType, deviceHost: string): boolean {
    const key = this.cooldownKey(alertType, deviceHost);
    const entry = this.cooldowns.get(key);
    if (!entry) return false;

    const elapsed = (Date.now() - entry.lastFiredAt.getTime()) / 1000 / 60;
    if (elapsed >= this.cooldownMinutes) {
      this.cooldowns.delete(key);
      return false;
    }
    return true;
  }

  private setCooldown(alertType: AlertType, deviceHost: string): void {
    const key = this.cooldownKey(alertType, deviceHost);
    this.cooldowns.set(key, { alertType, deviceHost, lastFiredAt: new Date() });
  }

  evaluate(
    deviceName: string,
    deviceHost: string,
    current: TwcFullStatus,
    previous: TwcFullStatus | null,
    alertsConfig: AlertsConfig,
  ): Alert[] {
    const fired: Alert[] = [];

    for (const rule of alertRules) {
      try {
        const alert = rule.evaluate(deviceName, deviceHost, current, previous, alertsConfig);
        if (alert) {
          if (this.isInCooldown(alert.type, deviceHost)) {
            logger.debug({ alertType: alert.type, device: deviceName }, 'Alert suppressed (cooldown)');
            continue;
          }
          this.setCooldown(alert.type, deviceHost);
          fired.push(alert);
          logger.info({ alertType: alert.type, severity: alert.severity, device: deviceName }, alert.message);
        }
      } catch (err) {
        logger.error({ rule: rule.type, device: deviceName, err }, 'Rule evaluation failed');
      }
    }

    return fired;
  }

  /** Check if a severity meets the minimum filter */
  static meetsSeverityFilter(alertSeverity: Severity, minSeverity: Severity): boolean {
    const order: Record<Severity, number> = {
      [Severity.Info]: 0,
      [Severity.Warning]: 1,
      [Severity.Critical]: 2,
    };
    return order[alertSeverity] >= order[minSeverity];
  }
}
