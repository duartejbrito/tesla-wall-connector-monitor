// Tesla Wall Connector Gen 3 Local API response types

export interface TwcVitals {
  contactor_closed: boolean;
  vehicle_connected: boolean;
  session_s: number;
  grid_v: number;
  grid_hz: number;
  vehicle_current_a: number;
  currentA_a: number;
  currentB_a: number;
  currentC_a: number;
  currentN_a: number;
  voltageA_v: number;
  voltageB_v: number;
  voltageC_v: number;
  relay_coil_v: number;
  pcba_temp_c: number;
  handle_temp_c: number;
  mcu_temp_c: number;
  uptime_s: number;
  input_thermopile_uv: number;
  prox_v: number;
  pilot_high_v: number;
  pilot_low_v: number;
  session_energy_wh: number;
  config_status: number;
  evse_state: number;
  current_alerts: string[];
}

export interface TwcLifetime {
  contactor_cycles: number;
  contactor_cycles_loaded: number;
  alert_count: number;
  thermal_foldbacks: number;
  avg_startup_temp: number;
  charge_starts: number;
  energy_wh: number;
  connector_cycles: number;
  uptime_s: number;
  charging_time_s: number;
}

export interface TwcWifiStatus {
  wifi_ssid: string;
  wifi_signal_strength: number;
  wifi_rssi: number;
  wifi_snr: number;
  wifi_connected: boolean;
  wifi_infra_ip: string;
  internet: boolean;
  wifi_mac: string;
}

export interface TwcVersion {
  firmware_version: string;
  part_number: string;
  serial_number: string;
}

export enum EvseState {
  Booting = 0,
  Idle = 1,
  Connected = 2,
  ReadyToCharge = 3,
  Charging = 4,
  Fault = 5,
  Error = 6,
  Busy = 8,
  Unknown = 9,
  ChargingReduced = 11,
}

export interface TwcFullStatus {
  vitals: TwcVitals | null;
  lifetime: TwcLifetime | null;
  wifi: TwcWifiStatus | null;
  version: TwcVersion | null;
  online: boolean;
  lastSeen: Date | null;
  consecutiveMisses: number;
}
