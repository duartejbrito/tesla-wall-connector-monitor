interface PowerRingProps {
  currentKw: number;
  maxKw: number;
}

export default function PowerRing({ currentKw, maxKw }: PowerRingProps) {
  const percentage = Math.min((currentKw / maxKw) * 100, 100);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage > 80) return '#10B981';
    if (percentage > 40) return '#3B82F6';
    return '#6B7280';
  };

  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        {/* Background ring */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          style={{
            filter: percentage > 0 ? `drop-shadow(0 0 6px ${getColor()}80)` : 'none',
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="metric-value text-3xl sm:text-4xl text-white text-glow-green">
          {currentKw.toFixed(1)}
        </span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">kW</span>
      </div>
    </div>
  );
}
