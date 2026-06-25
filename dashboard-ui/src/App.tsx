import { usePolling } from './hooks/usePolling';
import { EvseState } from './lib/types';
import type { Vitals, Lifetime, DeviceState } from './lib/types';
import Header from './components/Header';
import DeviceSelector from './components/DeviceSelector';
import HeroMetrics from './components/HeroMetrics';
import ThermalGrid from './components/ThermalGrid';
import SessionStats from './components/SessionStats';
import PowerChart from './components/PowerChart';
import AlertsTable from './components/AlertsTable';
import AlertSummary from './components/AlertSummary';
import { Loader2 } from 'lucide-react';

function getDeviceData(device: DeviceState | null) {
  const vitals: Vitals | null = device?.vitals_json ? JSON.parse(device.vitals_json) : null;
  const lifetime: Lifetime | null = device?.lifetime_json ? JSON.parse(device.lifetime_json) : null;
  const evseState = device?.evse_state ?? null;
  const isCharging = evseState === EvseState.Charging || evseState === EvseState.ChargingReduced;
  return { vitals, lifetime, evseState, isCharging };
}

export default function App() {
  const { devices, powerHistory, alerts, health, loading, error, selectedHost, setSelectedHost } = usePolling(5000);

  // Resolve selected device (default to first if selection is invalid)
  const activeDevice = devices.find((d) => d.host === selectedHost) ?? devices[0] ?? null;
  const { vitals, lifetime, isCharging } = getDeviceData(activeDevice);
  const uptime = vitals?.uptime_s ?? health?.uptime ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
          <span className="text-sm text-gray-400">Connecting to TWC Monitor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Connection error banner */}
      {error && (
        <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-3 text-sm text-accent-red animate-fade-in">
          ⚠ Connection issue: {error}
        </div>
      )}

      {/* Header */}
      <Header device={activeDevice} uptime={uptime} />

      {/* Device Selector (shown when multiple connectors exist) */}
      {devices.length > 1 && (
        <DeviceSelector
          devices={devices}
          selectedHost={activeDevice?.host ?? null}
          onSelect={setSelectedHost}
        />
      )}

      {/* Hero Metrics + Power Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <HeroMetrics vitals={vitals} isCharging={isCharging} />
        <PowerChart data={powerHistory} />
      </div>

      {/* Thermal Grid */}
      <ThermalGrid vitals={vitals} />

      {/* Session Stats */}
      <SessionStats vitals={vitals} lifetime={lifetime} />

      {/* Alerts Table */}
      <AlertsTable alerts={alerts} />

      {/* Alert Summary (24h) */}
      <AlertSummary />

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600 pb-4">
        TWC Monitor — {devices.length} connector{devices.length !== 1 ? 's' : ''} — Auto-refreshes every 5s
      </footer>
    </div>
  );
}
