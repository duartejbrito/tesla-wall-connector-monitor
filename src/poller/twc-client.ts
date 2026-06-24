import axios, { AxiosInstance } from 'axios';
import pino from 'pino';
import { TwcVitals, TwcLifetime, TwcWifiStatus, TwcVersion } from '../types/twc';

const logger = pino({ name: 'twc-client' });

export class TwcClient {
  private client: AxiosInstance;
  private host: string;
  private name: string;

  constructor(name: string, host: string, timeoutMs: number = 5000) {
    this.name = name;
    this.host = host;
    this.client = axios.create({
      baseURL: `http://${host}`,
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async getVitals(): Promise<TwcVitals> {
    const { data } = await this.client.get<TwcVitals>('/api/1/vitals');
    return data;
  }

  async getLifetime(): Promise<TwcLifetime> {
    const { data } = await this.client.get<TwcLifetime>('/api/1/lifetime');
    return data;
  }

  async getWifiStatus(): Promise<TwcWifiStatus> {
    const { data } = await this.client.get<TwcWifiStatus>('/api/1/wifi_status');
    return data;
  }

  async getVersion(): Promise<TwcVersion> {
    const { data } = await this.client.get<TwcVersion>('/api/1/version');
    return data;
  }

  async pollAll(): Promise<{
    vitals: TwcVitals | null;
    lifetime: TwcLifetime | null;
    wifi: TwcWifiStatus | null;
    version: TwcVersion | null;
    online: boolean;
    error?: string;
  }> {
    try {
      const [vitals, lifetime, wifi, version] = await Promise.all([
        this.getVitals().catch(() => null),
        this.getLifetime().catch(() => null),
        this.getWifiStatus().catch(() => null),
        this.getVersion().catch(() => null),
      ]);

      // Consider online if at least vitals responds
      const online = vitals !== null;

      if (online) {
        logger.debug({ device: this.name, host: this.host }, 'Poll successful');
      } else {
        logger.warn({ device: this.name, host: this.host }, 'All endpoints failed');
      }

      return { vitals, lifetime, wifi, version, online };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ device: this.name, host: this.host, error: message }, 'Poll failed');
      return { vitals: null, lifetime: null, wifi: null, version: null, online: false, error: message };
    }
  }
}
