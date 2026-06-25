import { Zap } from 'lucide-react';
import type { Vitals } from '../lib/types';
import { calculatePowerKw } from '../lib/utils';
import PowerRing from './PowerRing';

interface HeroMetricsProps {
  vitals: Vitals | null;
  isCharging: boolean;
}

export default function HeroMetrics({ vitals, isCharging }: HeroMetricsProps) {
  const powerKw = vitals ? calculatePowerKw(vitals) : 0;
  const maxKw = 11.5; // Typical TWC Gen3 max

  const phases = vitals
    ? [
        { label: 'L1', voltage: vitals.voltageA_v, current: vitals.currentA_a },
        { label: 'L2', voltage: vitals.voltageB_v, current: vitals.currentB_a },
        { label: 'L3', voltage: vitals.voltageC_v, current: vitals.currentC_a },
      ]
    : [];

  const hasThreePhase = phases.some((p) => p.voltage > 10 && p !== phases[0]);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Zap className={`w-4 h-4 ${isCharging ? 'text-accent-green' : 'text-gray-500'}`} />
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Power Delivery
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Power Ring */}
        <PowerRing currentKw={powerKw} maxKw={maxKw} />

        {/* Phase Details */}
        <div className="flex-1 w-full">
          {!vitals ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No data available</p>
              <p className="text-xs mt-1">Waiting for connection...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(hasThreePhase ? phases : [phases[0]!]).map((phase) => (
                <div
                  key={phase.label}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-600/30"
                >
                  <span className="text-xs font-medium text-gray-500 w-8">{phase.label}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="metric-value text-sm text-white">
                        {phase.voltage.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">V</span>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <span className="metric-value text-sm text-accent-green">
                        {phase.current.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">A</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Grid frequency */}
              <div className="flex items-center justify-between px-3 pt-2">
                <span className="text-xs text-gray-500">Grid</span>
                <span className="font-mono text-xs text-gray-400">
                  {vitals.grid_v.toFixed(1)}V @ {vitals.grid_hz.toFixed(2)}Hz
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
