import { Wifi, WifiOff, Clock, Zap } from 'lucide-react';
import type { DeviceState, WifiStatus } from '../lib/types';
import { getEvseStateLabel, getEvseStateColor, EvseState } from '../lib/types';
import { formatDuration, getSignalStrength } from '../lib/utils';
import StatusBadge from './StatusBadge';

interface HeaderProps {
  device: DeviceState | null;
  uptime: number | null;
}

export default function Header({ device, uptime }: HeaderProps) {
  const wifi: WifiStatus | null = device?.wifi_json ? JSON.parse(device.wifi_json) : null;
  const evseState = device?.evse_state ?? null;
  const isOnline = device ? device.online === 1 : false;
  const signal = wifi ? getSignalStrength(wifi.wifi_rssi) : null;

  return (
    <header className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-blue" />
          <h1 className="text-lg font-semibold text-white">TWC Monitor</h1>
        </div>
        {device && (
          <span className="text-sm text-gray-400 hidden sm:inline">
            {device.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* WiFi Status */}
        <div className="flex items-center gap-2 text-sm">
          {isOnline && wifi ? (
            <>
              <Wifi className={`w-4 h-4 ${signal?.color ?? 'text-gray-400'}`} />
              <span className="text-gray-300 hidden sm:inline">{wifi.wifi_infra_ip}</span>
              <span className={`${signal?.color ?? 'text-gray-400'} text-xs`}>
                {wifi.wifi_rssi}dBm
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-xs">Disconnected</span>
            </>
          )}
        </div>

        {/* Uptime */}
        {uptime !== null && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{formatDuration(uptime)}</span>
          </div>
        )}

        {/* State Badge */}
        <StatusBadge
          label={getEvseStateLabel(evseState)}
          colorClass={getEvseStateColor(evseState)}
          isCharging={evseState === EvseState.Charging || evseState === EvseState.ChargingReduced}
        />
      </div>
    </header>
  );
}
