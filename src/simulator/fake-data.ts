import { TwcVitals, TwcLifetime, TwcWifiStatus, TwcVersion, EvseState } from '../types/twc';

/** Random float in [min, max] */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random int in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export interface VitalsOverrides {
  evse_state?: number;
  vehicle_connected?: boolean;
  contactor_closed?: boolean;
  vehicle_current_a?: number;
  session_energy_wh?: number;
  session_s?: number;
  pcba_temp_c?: number;
  handle_temp_c?: number;
  grid_v?: number;
  grid_hz?: number;
}

export function generateVitals(overrides: VitalsOverrides = {}): TwcVitals {
  const evseState = overrides.evse_state ?? EvseState.Idle;
  const isCharging = evseState === EvseState.Charging || evseState === EvseState.ChargingReduced;
  const vehicleConnected = overrides.vehicle_connected ?? (evseState >= EvseState.Connected);
  const contactorClosed = overrides.contactor_closed ?? isCharging;

  const vehicleCurrent = overrides.vehicle_current_a ?? (isCharging ? rand(8, 32) : 0);
  const gridV = overrides.grid_v ?? rand(228, 232);
  const gridHz = overrides.grid_hz ?? rand(49.9, 50.1);

  const phaseCurrentA = isCharging ? vehicleCurrent : 0;
  const phaseCurrentB = isCharging ? vehicleCurrent * rand(0.95, 1.05) : 0;
  const phaseCurrentC = isCharging ? vehicleCurrent * rand(0.95, 1.05) : 0;

  const pcbaTemp = overrides.pcba_temp_c ?? (isCharging ? rand(35, 55) : rand(20, 30));
  const handleTemp = overrides.handle_temp_c ?? (isCharging ? rand(25, 40) : rand(18, 25));

  return {
    contactor_closed: contactorClosed,
    vehicle_connected: vehicleConnected,
    session_s: overrides.session_s ?? (isCharging ? randInt(60, 14400) : 0),
    grid_v: gridV,
    grid_hz: gridHz,
    vehicle_current_a: vehicleCurrent,
    currentA_a: phaseCurrentA,
    currentB_a: phaseCurrentB,
    currentC_a: phaseCurrentC,
    currentN_a: rand(0, 0.5),
    voltageA_v: gridV + rand(-2, 2),
    voltageB_v: gridV + rand(-2, 2),
    voltageC_v: gridV + rand(-2, 2),
    relay_coil_v: rand(11.5, 12.5),
    pcba_temp_c: pcbaTemp,
    handle_temp_c: handleTemp,
    mcu_temp_c: pcbaTemp + rand(-5, 5),
    uptime_s: randInt(3600, 864000),
    input_thermopile_uv: randInt(-100, 100),
    prox_v: vehicleConnected ? rand(1.5, 2.5) : rand(3.5, 4.5),
    pilot_high_v: vehicleConnected ? rand(6, 9) : rand(11.5, 12.0),
    pilot_low_v: rand(-12.5, -11.5),
    session_energy_wh: overrides.session_energy_wh ?? (isCharging ? rand(500, 30000) : 0),
    config_status: 5,
    evse_state: evseState,
    current_alerts: [],
  };
}

export function generateLifetime(chargingSessions: number = randInt(50, 5000)): TwcLifetime {
  return {
    contactor_cycles: chargingSessions + randInt(10, 100),
    contactor_cycles_loaded: chargingSessions,
    alert_count: randInt(0, 20),
    thermal_foldbacks: randInt(0, 5),
    avg_startup_temp: rand(18, 25),
    charge_starts: chargingSessions,
    energy_wh: chargingSessions * rand(5000, 50000),
    connector_cycles: chargingSessions + randInt(5, 50),
    uptime_s: randInt(86400, 31536000),
    charging_time_s: chargingSessions * randInt(1800, 7200),
  };
}

export function generateWifiStatus(connectorIndex: number = 0): TwcWifiStatus {
  return {
    wifi_ssid: 'TWC-Network',
    wifi_signal_strength: randInt(70, 100),
    wifi_rssi: randInt(-60, -30),
    wifi_snr: randInt(20, 45),
    wifi_connected: true,
    wifi_infra_ip: `192.168.1.${100 + connectorIndex}`,
    internet: true,
    wifi_mac: `AA:BB:CC:DD:EE:${(connectorIndex + 1).toString(16).padStart(2, '0').toUpperCase()}`,
  };
}

export function generateVersion(connectorIndex: number = 0): TwcVersion {
  return {
    firmware_version: '23.44.0+g535cc29e47eb95',
    part_number: '1529455-00-D',
    serial_number: `TWC3-SIM-${(connectorIndex + 1).toString().padStart(4, '0')}`,
  };
}
