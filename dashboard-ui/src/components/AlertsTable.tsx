import { AlertTriangle } from 'lucide-react';
import type { Alert } from '../lib/types';

interface AlertsTableProps {
  alerts: Alert[];
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

export default function AlertsTable({ alerts }: AlertsTableProps) {
  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Recent Alerts
        </h2>
        {alerts.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{alerts.length} alerts</span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No alerts — all systems normal
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-600/50">
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Time</th>
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Severity</th>
                <th className="text-left py-2 text-xs text-gray-500 font-medium hidden sm:table-cell">Type</th>
                <th className="text-left py-2 text-xs text-gray-500 font-medium hidden md:table-cell">Device</th>
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-surface-600/20 hover:bg-surface-700/30 transition-colors">
                  <td className="py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${severityBadgeBg(alert.severity)} ${severityClass(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-gray-300 hidden sm:table-cell">
                    {alert.type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 text-xs text-gray-400 hidden md:table-cell">
                    {alert.device_name}
                  </td>
                  <td className="py-2.5 text-xs text-gray-300 max-w-[200px] truncate">
                    {alert.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
