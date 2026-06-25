export interface DeviceState {
  host: string;
  name: string;
  online: number;
  last_seen: string | null;
  evse_state: number | null;
  vitals_json: string | null;
  lifetime_json: string | null;
  version_json: string | null;
  wifi_json: string | null;
  updated_at: string;
}

export interface Vitals {
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

export interface Lifetime {
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

export interface WifiStatus {
  wifi_ssid: string;
  wifi_signal_strength: number;
  wifi_rssi: number;
  wifi_snr: number;
  wifi_connected: boolean;
  wifi_infra_ip: string;
  internet: boolean;
  wifi_mac: string;
}

export interface VersionInfo {
  firmware_version: string;
  part_number: string;
  serial_number: string;
}

export interface PowerReading {
  timestamp: number;
  power_kw: number;
  host: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: string;
  device_name: string;
  device_host: string;
  message: string;
  created_at: string;
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

export function getEvseStateLabel(state: number | null): string {
  switch (state) {
    case EvseState.Booting: return 'BOOTING';
    case EvseState.Idle: return 'IDLE';
    case EvseState.Connected: return 'CONNECTED';
    case EvseState.ReadyToCharge: return 'READY';
    case EvseState.Charging: return 'CHARGING';
    case EvseState.Fault: return 'FAULT';
    case EvseState.Error: return 'ERROR';
    case EvseState.Busy: return 'BUSY';
    case EvseState.ChargingReduced: return 'REDUCED';
    default: return 'UNKNOWN';
  }
}

export function getEvseStateColor(state: number | null): string {
  switch (state) {
    case EvseState.Charging:
    case EvseState.ChargingReduced:
      return 'text-accent-green';
    case EvseState.Connected:
    case EvseState.ReadyToCharge:
      return 'text-accent-blue';
    case EvseState.Fault:
    case EvseState.Error:
      return 'text-accent-red';
    case EvseState.Idle:
    case EvseState.Booting:
    default:
      return 'text-gray-400';
  }
}
