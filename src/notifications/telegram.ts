import { Telegraf } from 'telegraf';
import pino from 'pino';
import { Alert } from '../alerts/types';

const logger = pino({ name: 'telegram' });

export class TelegramNotifier {
  private bots: Map<string, Telegraf> = new Map();

  getOrCreateBot(token: string): Telegraf {
    if (!this.bots.has(token)) {
      const bot = new Telegraf(token);
      this.bots.set(token, bot);
      logger.info('Telegram bot instance created');
    }
    return this.bots.get(token)!;
  }

  async sendAlert(botToken: string, chatId: string, alert: Alert): Promise<boolean> {
    try {
      const bot = this.getOrCreateBot(botToken);
      const message = this.formatAlert(alert);
      await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
      logger.info({ chatId, alertType: alert.type, device: alert.deviceName }, 'Telegram alert sent');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ chatId, alertType: alert.type, error: message }, 'Failed to send Telegram alert');
      return false;
    }
  }

  private formatAlert(alert: Alert): string {
    const lines = [
      `<b>⚡ TWC Monitor Alert</b>`,
      ``,
      `<b>Type:</b> ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
      `<b>Severity:</b> ${alert.severity.toUpperCase()}`,
      `<b>Device:</b> ${alert.deviceName} (${alert.deviceHost})`,
      ``,
      alert.message,
      ``,
      `<i>${alert.timestamp.toISOString()}</i>`,
    ];

    if (Object.keys(alert.details).length > 0) {
      lines.push('', '<b>Details:</b>');
      for (const [key, value] of Object.entries(alert.details)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }

  async shutdown(): Promise<void> {
    for (const [token, bot] of this.bots) {
      try {
        bot.stop();
      } catch {
        // ignore
      }
    }
    this.bots.clear();
    logger.info('Telegram notifier shut down');
  }
}
