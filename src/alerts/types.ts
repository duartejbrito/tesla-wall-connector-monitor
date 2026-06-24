export enum AlertType {
  DeviceOffline = 'device_offline',
  ChargingFault = 'charging_fault',
  OverTemperature = 'over_temperature',
  HighPower = 'high_power',
  ChargingStarted = 'charging_started',
  ChargingCompleted = 'charging_completed',
  SessionEnergy = 'session_energy',
  GridAnomaly = 'grid_anomaly',
  FirmwareMismatch = 'firmware_mismatch',
}

export enum Severity {
  Info = 'info',
  Warning = 'warning',
  Critical = 'critical',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: Severity;
  deviceName: string;
  deviceHost: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface AlertRule {
  type: AlertType;
  severity: Severity;
  evaluate: (
    deviceName: string,
    deviceHost: string,
    current: import('../types/twc').TwcFullStatus,
    previous: import('../types/twc').TwcFullStatus | null,
    config: import('../config/loader').AlertsConfig,
  ) => Alert | null;
}
