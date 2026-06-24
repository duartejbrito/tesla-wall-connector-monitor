import pino from 'pino';
import { Alert } from '../alerts/types';

const logger = pino({ name: 'whatsapp' });

// Dynamic import types for whatsapp-web.js
let WAWebJS: any = null;

async function getWhatsAppModule() {
  if (!WAWebJS) {
    WAWebJS = await import('whatsapp-web.js');
  }
  return WAWebJS;
}

export class WhatsAppNotifier {
  private client: any = null;
  private ready: boolean = false;
  private authDataPath: string;
  private initPromise: Promise<void> | null = null;

  constructor(authDataPath: string = './data/whatsapp-auth') {
    this.authDataPath = authDataPath;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      const { Client, LocalAuth } = await getWhatsAppModule();
      const qrcode = await import('qrcode-terminal');

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'twc-monitor',
          dataPath: this.authDataPath,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        },
      });

      this.client.on('qr', (qr: string) => {
        logger.info('WhatsApp QR code received — scan with your phone:');
        qrcode.generate(qr, { small: true });
      });

      this.client.on('authenticated', () => {
        logger.info('WhatsApp authenticated successfully');
      });

      this.client.on('auth_failure', (msg: string) => {
        logger.error({ msg }, 'WhatsApp authentication failed');
        this.ready = false;
      });

      this.client.on('ready', () => {
        logger.info('WhatsApp client is ready');
        this.ready = true;
      });

      this.client.on('disconnected', (reason: string) => {
        logger.warn({ reason }, 'WhatsApp client disconnected');
        this.ready = false;
      });

      await this.client.initialize();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ error: message }, 'Failed to initialize WhatsApp client');
      this.ready = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async sendAlert(groupId: string, alert: Alert): Promise<boolean> {
    if (!this.ready || !this.client) {
      logger.warn({ groupId, alertType: alert.type }, 'WhatsApp not ready, cannot send alert');
      return false;
    }

    try {
      const message = this.formatAlert(alert);
      await this.client.sendMessage(groupId, message);
      logger.info({ groupId, alertType: alert.type, device: alert.deviceName }, 'WhatsApp alert sent');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ groupId, alertType: alert.type, error: message }, 'Failed to send WhatsApp alert');
      return false;
    }
  }

  private formatAlert(alert: Alert): string {
    const lines = [
      `⚡ *TWC Monitor Alert*`,
      ``,
      `*Type:* ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
      `*Severity:* ${alert.severity.toUpperCase()}`,
      `*Device:* ${alert.deviceName} (${alert.deviceHost})`,
      ``,
      alert.message,
      ``,
      `_${alert.timestamp.toISOString()}_`,
    ];

    if (Object.keys(alert.details).length > 0) {
      lines.push('', '*Details:*');
      for (const [key, value] of Object.entries(alert.details)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // ignore
      }
    }
    this.ready = false;
    logger.info('WhatsApp notifier shut down');
  }
}
