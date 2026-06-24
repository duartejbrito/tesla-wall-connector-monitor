import { AlertRule, AlertType, Severity, Alert } from './types';
import { TwcFullStatus, EvseState } from '../types/twc';
import { AlertsConfig } from '../config/loader';

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function createAlert(
  type: AlertType,
  severity: Severity,
  deviceName: string,
  deviceHost: string,
  message: string,
  details: Record<string, unknown> = {},
): Alert {
  return { id: makeId(), type, severity, deviceName, deviceHost, message, details, timestamp: new Date() };
}

export const alertRules: AlertRule[] = [
  // Device Offline
  {
    type: AlertType.DeviceOffline,
    severity: Severity.Critical,
    evaluate(deviceName, deviceHost, current, previous, config) {
      if (!current.online && current.consecutiveMisses >= config.offline_after_misses) {
        return createAlert(
          AlertType.DeviceOffline,
          Severity.Critical,
          deviceName,
          deviceHost,
          `🔴 ${deviceName} is OFFLINE (${current.consecutiveMisses} consecutive failures)`,
          { consecutiveMisses: current.consecutiveMisses },
        );
      }
      return null;
    },
  },

  // Charging Fault
  {
    type: AlertType.ChargingFault,
    severity: Severity.Critical,
    evaluate(deviceName, deviceHost, current) {
      if (!current.vitals) return null;
      if (current.vitals.evse_state === EvseState.Error || current.vitals.evse_state === EvseState.Fault) {
        return createAlert(
          AlertType.ChargingFault,
          Severity.Critical,
          deviceName,
          deviceHost,
          `🔴 ${deviceName} has a charging FAULT (state: ${current.vitals.evse_state})`,
          { evseState: current.vitals.evse_state, alerts: current.vitals.current_alerts },
        );
      }
      return null;
    },
  },

  // Over Temperature
  {
    type: AlertType.OverTemperature,
    severity: Severity.Warning,
    evaluate(deviceName, deviceHost, current, _previous, config) {
      if (!current.vitals) return null;
      const temps = {
        pcba: current.vitals.pcba_temp_c,
        handle: current.vitals.handle_temp_c,
        mcu: current.vitals.mcu_temp_c,
      };
      const maxTemp = Math.max(temps.pcba, temps.handle, temps.mcu);
      const severity = maxTemp >= config.temperature_critical_c ? Severity.Critical : Severity.Warning;

      if (maxTemp >= config.temperature_warning_c) {
        return createAlert(
          AlertType.OverTemperature,
          severity,
          deviceName,
          deviceHost,
          `${severity === Severity.Critical ? '🔴' : '🟡'} ${deviceName} temperature HIGH: ${maxTemp.toFixed(1)}°C`,
          temps,
        );
      }
      return null;
    },
  },

  // High Power Draw
  {
    type: AlertType.HighPower,
    severity: Severity.Warning,
    evaluate(deviceName, deviceHost, current, _previous, config) {
      if (!current.vitals) return null;
      const powerKw =
        (current.vitals.currentA_a * current.vitals.voltageA_v +
          current.vitals.currentB_a * current.vitals.voltageB_v +
          current.vitals.currentC_a * current.vitals.voltageC_v) /
        1000;

      if (powerKw > config.max_power_kw) {
        return createAlert(
          AlertType.HighPower,
          Severity.Warning,
          deviceName,
          deviceHost,
          `🟡 ${deviceName} power draw HIGH: ${powerKw.toFixed(2)} kW (limit: ${config.max_power_kw} kW)`,
          { powerKw, limit: config.max_power_kw },
        );
      }
      return null;
    },
  },

  // Charging Started
  {
    type: AlertType.ChargingStarted,
    severity: Severity.Info,
    evaluate(deviceName, deviceHost, current, previous) {
      if (!current.vitals || !previous?.vitals) return null;
      const isNowCharging =
        current.vitals.evse_state === EvseState.Charging ||
        current.vitals.evse_state === EvseState.ChargingReduced;
      const wasNotCharging =
        previous.vitals.evse_state !== EvseState.Charging &&
        previous.vitals.evse_state !== EvseState.ChargingReduced;

      if (isNowCharging && wasNotCharging) {
        return createAlert(
          AlertType.ChargingStarted,
          Severity.Info,
          deviceName,
          deviceHost,
          `🟢 ${deviceName} charging STARTED`,
          { evseState: current.vitals.evse_state },
        );
      }
      return null;
    },
  },

  // Charging Completed
  {
    type: AlertType.ChargingCompleted,
    severity: Severity.Info,
    evaluate(deviceName, deviceHost, current, previous) {
      if (!current.vitals || !previous?.vitals) return null;
      const wasCharging =
        previous.vitals.evse_state === EvseState.Charging ||
        previous.vitals.evse_state === EvseState.ChargingReduced;
      const isNowIdle =
        current.vitals.evse_state === EvseState.Idle ||
        current.vitals.evse_state === EvseState.Connected;

      if (wasCharging && isNowIdle) {
        const sessionKwh = (previous.vitals.session_energy_wh / 1000).toFixed(2);
        return createAlert(
          AlertType.ChargingCompleted,
          Severity.Info,
          deviceName,
          deviceHost,
          `🟢 ${deviceName} charging COMPLETED (${sessionKwh} kWh delivered)`,
          { sessionEnergyKwh: sessionKwh, evseState: current.vitals.evse_state },
        );
      }
      return null;
    },
  },

  // Session Energy Exceeded
  {
    type: AlertType.SessionEnergy,
    severity: Severity.Warning,
    evaluate(deviceName, deviceHost, current, _previous, config) {
      if (!current.vitals) return null;
      const sessionKwh = current.vitals.session_energy_wh / 1000;

      if (sessionKwh > config.max_session_energy_kwh) {
        return createAlert(
          AlertType.SessionEnergy,
          Severity.Warning,
          deviceName,
          deviceHost,
          `🟡 ${deviceName} session energy HIGH: ${sessionKwh.toFixed(2)} kWh (limit: ${config.max_session_energy_kwh} kWh)`,
          { sessionKwh, limit: config.max_session_energy_kwh },
        );
      }
      return null;
    },
  },

  // Grid Anomaly
  {
    type: AlertType.GridAnomaly,
    severity: Severity.Warning,
    evaluate(deviceName, deviceHost, current, _previous, config) {
      if (!current.vitals) return null;
      const [minV, maxV] = config.grid_voltage_range;
      const [minHz, maxHz] = config.grid_frequency_range;
      const v = current.vitals.grid_v;
      const hz = current.vitals.grid_hz;

      const anomalies: string[] = [];
      if (v < minV || v > maxV) anomalies.push(`voltage ${v.toFixed(1)}V`);
      if (hz < minHz || hz > maxHz) anomalies.push(`frequency ${hz.toFixed(2)}Hz`);

      if (anomalies.length > 0) {
        return createAlert(
          AlertType.GridAnomaly,
          Severity.Warning,
          deviceName,
          deviceHost,
          `🟡 ${deviceName} grid anomaly: ${anomalies.join(', ')}`,
          { gridV: v, gridHz: hz, normalV: config.grid_voltage_range, normalHz: config.grid_frequency_range },
        );
      }
      return null;
    },
  },
];
