import { EvseState } from '../types/twc';
import { VitalsOverrides } from './fake-data';

export enum ScenarioType {
  Idle = 'idle',
  VehicleConnected = 'vehicle_connected',
  Charging = 'charging',
  ChargingReduced = 'charging_reduced',
  OverTemperature = 'over_temperature',
  GridAnomaly = 'grid_anomaly',
  Fault = 'fault',
  Offline = 'offline',
}

export interface Scenario {
  type: ScenarioType;
  evseState: EvseState;
  online: boolean;
  getOverrides: (elapsedS: number) => VitalsOverrides;
}

const scenarios: Record<ScenarioType, Scenario> = {
  [ScenarioType.Idle]: {
    type: ScenarioType.Idle,
    evseState: EvseState.Idle,
    online: true,
    getOverrides: () => ({ evse_state: EvseState.Idle }),
  },
  [ScenarioType.VehicleConnected]: {
    type: ScenarioType.VehicleConnected,
    evseState: EvseState.Connected,
    online: true,
    getOverrides: () => ({
      evse_state: EvseState.Connected,
      vehicle_connected: true,
      vehicle_current_a: 0,
    }),
  },
  [ScenarioType.Charging]: {
    type: ScenarioType.Charging,
    evseState: EvseState.Charging,
    online: true,
    getOverrides: (elapsedS) => {
      // Ramp up current over first 60s, then hold
      const rampFactor = Math.min(1, elapsedS / 60);
      const targetCurrent = 32;
      const current = targetCurrent * rampFactor;
      return {
        evse_state: EvseState.Charging,
        vehicle_connected: true,
        contactor_closed: true,
        vehicle_current_a: current,
        session_energy_wh: current * 230 * (elapsedS / 3600),
        session_s: elapsedS,
        pcba_temp_c: 30 + rampFactor * 25,
        handle_temp_c: 22 + rampFactor * 15,
      };
    },
  },
  [ScenarioType.ChargingReduced]: {
    type: ScenarioType.ChargingReduced,
    evseState: EvseState.ChargingReduced,
    online: true,
    getOverrides: (elapsedS) => ({
      evse_state: EvseState.ChargingReduced,
      vehicle_connected: true,
      contactor_closed: true,
      vehicle_current_a: 16,
      session_energy_wh: 16 * 230 * (elapsedS / 3600),
      session_s: elapsedS,
      pcba_temp_c: 55 + Math.random() * 5,
    }),
  },
  [ScenarioType.OverTemperature]: {
    type: ScenarioType.OverTemperature,
    evseState: EvseState.Charging,
    online: true,
    getOverrides: (elapsedS) => ({
      evse_state: EvseState.Charging,
      vehicle_connected: true,
      contactor_closed: true,
      vehicle_current_a: 28,
      pcba_temp_c: 72 + Math.min(elapsedS / 10, 15),
      handle_temp_c: 55 + Math.min(elapsedS / 15, 10),
      session_s: elapsedS,
    }),
  },
  [ScenarioType.GridAnomaly]: {
    type: ScenarioType.GridAnomaly,
    evseState: EvseState.Charging,
    online: true,
    getOverrides: () => ({
      evse_state: EvseState.Charging,
      vehicle_connected: true,
      grid_v: 195 + Math.random() * 10,
      grid_hz: 48.5 + Math.random() * 0.8,
    }),
  },
  [ScenarioType.Fault]: {
    type: ScenarioType.Fault,
    evseState: EvseState.Fault,
    online: true,
    getOverrides: () => ({
      evse_state: EvseState.Fault,
      vehicle_current_a: 0,
      contactor_closed: false,
    }),
  },
  [ScenarioType.Offline]: {
    type: ScenarioType.Offline,
    evseState: EvseState.Unknown,
    online: false,
    getOverrides: () => ({}),
  },
};

export function getScenario(type: ScenarioType): Scenario {
  return scenarios[type];
}

/** Weighted random scenario selection */
export interface TransitionWeights {
  idle: number;
  vehicle_connected: number;
  charging: number;
  charging_reduced: number;
  over_temperature: number;
  grid_anomaly: number;
  fault: number;
  offline: number;
}

const defaultWeights: TransitionWeights = {
  idle: 30,
  vehicle_connected: 15,
  charging: 30,
  charging_reduced: 5,
  over_temperature: 5,
  grid_anomaly: 5,
  fault: 5,
  offline: 5,
};

export function pickNextScenario(faultProbability: number = 0.15): ScenarioType {
  const weights = { ...defaultWeights };

  // Scale fault-related scenarios by probability
  const faultScale = faultProbability / 0.15;
  weights.over_temperature *= faultScale;
  weights.grid_anomaly *= faultScale;
  weights.fault *= faultScale;
  weights.offline *= faultScale;

  const entries = Object.entries(weights) as [ScenarioType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;

  for (const [type, weight] of entries) {
    r -= weight;
    if (r <= 0) return type;
  }

  return ScenarioType.Idle;
}
