import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AlertStat {
  type: string;
  severity: string;
  count: number;
}

function severityClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-accent-red';
    case 'warning': return 'text-accent-amber';
    case 'info': return 'text-accent-blue';
    default: return 'text-gray-400';
  }
}

function severityBadgeBg(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-accent-red/10 border-accent-red/30';
    case 'warning': return 'bg-amber-500/10 border-amber-500/30';
    case 'info': return 'bg-accent-blue/10 border-accent-blue/30';
    default: return 'bg-surface-700 border-surface-600';
  }
}

export default function AlertSummary() {
  const [stats, setStats] = useState<AlertStat[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats?hours=24');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {
        // Silently fail — not critical
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  if (stats.length === 0) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Alert Summary (24h)
          </h2>
        </div>
        <div className="text-center py-6 text-gray-500 text-sm">
          No alerts in the last 24 hours — all systems normal
        </div>
      </div>
    );
  }

  const totalAlerts = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Alert Summary (24h)
        </h2>
        <span className="ml-auto text-xs text-gray-500">{totalAlerts} total</span>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-600/50">
              <th className="text-left py-2 text-xs text-gray-500 font-medium">Type</th>
              <th className="text-left py-2 text-xs text-gray-500 font-medium">Severity</th>
              <th className="text-right py-2 text-xs text-gray-500 font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} className="border-b border-surface-600/20">
                <td className="py-2.5 text-xs text-gray-300">
                  {s.type.replace(/_/g, ' ')}
                </td>
                <td className="py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${severityBadgeBg(s.severity)} ${severityClass(s.severity)}`}>
                    {s.severity.toUpperCase()}
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono text-xs text-white">
                  {s.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
