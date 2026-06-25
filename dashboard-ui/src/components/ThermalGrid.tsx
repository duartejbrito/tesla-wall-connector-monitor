import { Thermometer, Cpu, Grip, Gauge } from 'lucide-react';
import type { Vitals } from '../lib/types';
import { getTempColor, getTempBg } from '../lib/utils';

interface ThermalGridProps {
  vitals: Vitals | null;
}

interface ThermalCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  unit: string;
  getColor: (v: number) => string;
  getBg: (v: number) => string;
}

function ThermalCard({ icon, label, value, unit, getColor, getBg }: ThermalCardProps) {
  const colorClass = value !== null ? getColor(value) : 'text-gray-500';
  const bgClass = value !== null ? getBg(value) : 'bg-surface-700/30 border-surface-600/30';

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${bgClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={colorClass}>{icon}</span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`metric-value text-2xl ${colorClass}`}>
          {value !== null ? value.toFixed(1) : '--'}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

export default function ThermalGrid({ vitals }: ThermalGridProps) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Thermometer className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Thermal & Health
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ThermalCard
          icon={<Grip className="w-4 h-4" />}
          label="Handle"
          value={vitals?.handle_temp_c ?? null}
          unit="°C"
          getColor={getTempColor}
          getBg={getTempBg}
        />
        <ThermalCard
          icon={<Cpu className="w-4 h-4" />}
          label="MCU"
          value={vitals?.mcu_temp_c ?? null}
          unit="°C"
          getColor={getTempColor}
          getBg={getTempBg}
        />
        <ThermalCard
          icon={<Cpu className="w-4 h-4" />}
          label="PCBA"
          value={vitals?.pcba_temp_c ?? null}
          unit="°C"
          getColor={getTempColor}
          getBg={getTempBg}
        />
        <ThermalCard
          icon={<Gauge className="w-4 h-4" />}
          label="Input"
          value={vitals?.grid_v ?? null}
          unit="V"
          getColor={(v) => (v > 210 && v < 250 ? 'text-accent-green' : 'text-accent-amber')}
          getBg={(v) =>
            v > 210 && v < 250
              ? 'bg-accent-green/10 border-accent-green/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }
        />
      </div>
    </div>
  );
}
