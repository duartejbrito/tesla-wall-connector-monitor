interface StatusBadgeProps {
  label: string;
  colorClass: string;
  isCharging: boolean;
}

export default function StatusBadge({ label, colorClass, isCharging }: StatusBadgeProps) {
  return (
    <div
      className={`
        px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
        border transition-all duration-300
        ${isCharging
          ? 'border-accent-green/50 bg-accent-green/10 text-accent-green animate-pulse-glow'
          : colorClass.includes('red')
            ? 'border-accent-red/50 bg-accent-red/10 text-accent-red'
            : colorClass.includes('blue')
              ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue'
              : 'border-surface-600 bg-surface-700 text-gray-400'
        }
      `}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isCharging
              ? 'bg-accent-green animate-pulse'
              : colorClass.includes('red')
                ? 'bg-accent-red'
                : colorClass.includes('blue')
                  ? 'bg-accent-blue'
                  : 'bg-gray-500'
          }`}
        />
        {label}
      </span>
    </div>
  );
}
