import pino from 'pino';
import { Alert, Severity, AlertType } from '../alerts/types';
import { AlertEngine } from '../alerts/engine';
import { AppConfig, NotificationGroupConfig } from '../config/loader';
import { TelegramNotifier } from './telegram';
import { WhatsAppNotifier } from './whatsapp';
import { Database } from '../storage/db';

const logger = pino({ name: 'notifier' });

export class NotificationDispatcher {
  private telegramNotifier: TelegramNotifier | null = null;
  private whatsappNotifier: WhatsAppNotifier | null = null;
  private config: AppConfig;
  private db: Database;

  constructor(config: AppConfig, db: Database) {
    this.config = config;
    this.db = db;
  }

  async initialize(): Promise<void> {
    if (this.config.telegram.enabled) {
      this.telegramNotifier = new TelegramNotifier();
      logger.info('Telegram notifier enabled');
    }

    if (this.config.whatsapp.enabled) {
      this.whatsappNotifier = new WhatsAppNotifier(this.config.whatsapp.auth_data_path);
      logger.info('Initializing WhatsApp notifier...');
      await this.whatsappNotifier.initialize();
    }
  }

  async dispatch(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      // Save to database
      this.db.insertAlert(alert);

      // Route to each notification group
      for (const group of this.config.notification_groups) {
        if (!this.shouldSendToGroup(alert, group)) continue;

        let success = false;

        if (group.channel === 'telegram' && this.telegramNotifier) {
          const token = group.bot_token || '';
          const chatId = group.chat_id || '';
          if (token && chatId) {
            success = await this.telegramNotifier.sendAlert(token, chatId, alert);
          } else {
            logger.warn({ group: group.name }, 'Telegram group missing bot_token or chat_id');
          }
        } else if (group.channel === 'whatsapp' && this.whatsappNotifier) {
          const groupId = group.group_id || '';
          if (groupId) {
            success = await this.whatsappNotifier.sendAlert(groupId, alert);
          } else {
            logger.warn({ group: group.name }, 'WhatsApp group missing group_id');
          }
        }

        // Log notification result
        this.db.insertNotificationLog(alert.id, group.name, group.channel, success);
      }
    }
  }

  private shouldSendToGroup(alert: Alert, group: NotificationGroupConfig): boolean {
    // Check alert type filter
    const alertsFilter = group.alerts;
    if (!alertsFilter.includes('all') && !alertsFilter.includes(alert.type)) {
      return false;
    }

    // Check severity filter
    const minSeverity = (group.severity_filter || 'info') as Severity;
    if (!AlertEngine.meetsSeverityFilter(alert.severity, minSeverity)) {
      return false;
    }

    return true;
  }

  async shutdown(): Promise<void> {
    if (this.telegramNotifier) {
      await this.telegramNotifier.shutdown();
    }
    if (this.whatsappNotifier) {
      await this.whatsappNotifier.shutdown();
    }
    logger.info('Notification dispatcher shut down');
  }
}
