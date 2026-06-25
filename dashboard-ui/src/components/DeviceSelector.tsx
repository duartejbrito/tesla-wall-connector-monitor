import { Plug } from 'lucide-react';
import type { DeviceState, Vitals } from '../lib/types';
import { getEvseStateLabel, getEvseStateColor, EvseState } from '../lib/types';
import { calculatePowerKw } from '../lib/utils';

interface DeviceSelectorProps {
  devices: DeviceState[];
  selectedHost: string | null;
  onSelect: (host: string) => void;
}

export default function DeviceSelector({ devices, selectedHost, onSelect }: DeviceSelectorProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Plug className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Fleet ({devices.length} connectors)
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {devices.map((device) => {
          const isSelected = device.host === selectedHost;
          const isOnline = device.online === 1;
          const evseState = device.evse_state;
          const stateLabel = getEvseStateLabel(evseState);
          const stateColor = getEvseStateColor(evseState);
          const isCharging = evseState === EvseState.Charging || evseState === EvseState.ChargingReduced;

          const vitals: Vitals | null = device.vitals_json ? JSON.parse(device.vitals_json) : null;
          const powerKw = vitals ? calculatePowerKw(vitals) : 0;

          return (
            <button
              key={device.host}
              onClick={() => onSelect(device.host)}
              className={`
                p-4 rounded-xl border text-left transition-all duration-200
                ${isSelected
                  ? 'border-accent-blue/60 bg-accent-blue/10 ring-1 ring-accent-blue/30'
                  : 'border-surface-600/50 bg-surface-700/30 hover:border-surface-600 hover:bg-surface-700/50'
                }
                ${isCharging && isSelected ? 'animate-pulse-glow' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white truncate">{device.name}</span>
                <span className={`status-dot ${isOnline ? 'status-dot-online' : 'status-dot-offline'}`} />
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${stateColor}`}>{stateLabel}</span>
                {isCharging && (
                  <span className="text-xs font-mono text-accent-green">
                    {powerKw.toFixed(1)} kW
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-gray-500 truncate">{device.host}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
