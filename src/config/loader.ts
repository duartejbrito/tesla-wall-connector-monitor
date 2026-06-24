import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'config' });

const WallConnectorSchema = z.object({
  name: z.string(),
  host: z.string(),
  enabled: z.boolean().default(true),
});

const AlertsSchema = z.object({
  temperature_warning_c: z.number().default(70),
  temperature_critical_c: z.number().default(85),
  max_power_kw: z.number().default(11.5),
  max_session_energy_kwh: z.number().default(100),
  grid_voltage_range: z.tuple([z.number(), z.number()]).default([210, 250]),
  grid_frequency_range: z.tuple([z.number(), z.number()]).default([49.5, 50.5]),
  offline_after_misses: z.number().int().default(3),
  cooldown_minutes: z.number().default(15),
});

const NotificationGroupSchema = z.object({
  name: z.string(),
  channel: z.enum(['telegram', 'whatsapp']),
  bot_token: z.string().optional(),
  chat_id: z.string().optional(),
  group_id: z.string().optional(),
  alerts: z.array(z.string()).default(['all']),
  severity_filter: z.enum(['info', 'warning', 'critical']).default('info'),
});

const WhatsAppConfigSchema = z.object({
  enabled: z.boolean().default(false),
  auth_data_path: z.string().default('./data/whatsapp-auth'),
});

const TelegramConfigSchema = z.object({
  enabled: z.boolean().default(false),
});

const DashboardConfigSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().default(3000),
});

const PollingConfigSchema = z.object({
  interval_seconds: z.number().default(30),
  timeout_ms: z.number().default(5000),
});

const AppConfigSchema = z.object({
  polling: PollingConfigSchema.default({}),
  wall_connectors: z.array(WallConnectorSchema).min(1),
  alerts: AlertsSchema.default({}),
  notification_groups: z.array(NotificationGroupSchema).default([]),
  whatsapp: WhatsAppConfigSchema.default({}),
  telegram: TelegramConfigSchema.default({}),
  dashboard: DashboardConfigSchema.default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type WallConnectorConfig = z.infer<typeof WallConnectorSchema>;
export type AlertsConfig = z.infer<typeof AlertsSchema>;
export type NotificationGroupConfig = z.infer<typeof NotificationGroupSchema>;

function interpolateEnvVars(text: string): string {
  return text.replace(/\$\{(\w+)\}/g, (_, varName) => {
    return process.env[varName] || '';
  });
}

export function loadConfig(configPath?: string): AppConfig {
  const path = configPath || process.env.CONFIG_PATH || './config/config.yaml';
  logger.info({ path }, 'Loading configuration');

  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    logger.error({ path, err }, 'Failed to read config file');
    throw new Error(`Cannot read config file: ${path}`);
  }

  raw = interpolateEnvVars(raw);
  const parsed = parse(raw);
  const result = AppConfigSchema.safeParse(parsed);

  if (!result.success) {
    logger.error({ errors: result.error.issues }, 'Invalid configuration');
    throw new Error(`Invalid config: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
  }

  const config = result.data;
  const enabledConnectors = config.wall_connectors.filter(wc => wc.enabled);
  logger.info(
    { total: config.wall_connectors.length, enabled: enabledConnectors.length },
    'Configuration loaded',
  );

  return config;
}
