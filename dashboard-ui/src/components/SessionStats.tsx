import { Battery, Route, Timer, TrendingUp } from 'lucide-react';
import type { Vitals, Lifetime } from '../lib/types';
import { formatDuration, formatEnergy, estimateRange } from '../lib/utils';

interface SessionStatsProps {
  vitals: Vitals | null;
  lifetime: Lifetime | null;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={accent ? 'text-accent-green' : 'text-gray-500'}>{icon}</span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <span className={`metric-value text-xl ${accent ? 'text-accent-green' : 'text-white'}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

export default function SessionStats({ vitals, lifetime }: SessionStatsProps) {
  const sessionEnergyWh = vitals?.session_energy_wh ?? 0;
  const sessionSeconds = vitals?.session_s ?? 0;
  const lifetimeEnergyWh = lifetime?.energy_wh ?? 0;
  const rangeKm = estimateRange(sessionEnergyWh);

  // Determine if there's an active or recent session
  const hasSession = sessionEnergyWh > 0 || sessionSeconds > 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Session & Lifetime
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Battery className="w-4 h-4" />}
          label="Session Energy"
          value={hasSession ? formatEnergy(sessionEnergyWh) : '0 Wh'}
          sub={!hasSession ? 'No active session' : undefined}
          accent={sessionEnergyWh > 0}
        />
        <StatCard
          icon={<Route className="w-4 h-4" />}
          label="Est. Range Added"
          value={rangeKm > 0 ? `${rangeKm.toFixed(0)} km` : '0 km'}
          sub="~170 Wh/km"
        />
        <StatCard
          icon={<Timer className="w-4 h-4" />}
          label="Session Duration"
          value={sessionSeconds > 0 ? formatDuration(sessionSeconds) : '0s'}
          sub={!hasSession ? 'No active session' : undefined}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Lifetime Energy"
          value={lifetime ? formatEnergy(lifetimeEnergyWh) : 'N/A'}
          sub={lifetime ? `${lifetime.charge_starts} sessions` : 'Data unavailable'}
        />
      </div>
    </div>
  );
}
