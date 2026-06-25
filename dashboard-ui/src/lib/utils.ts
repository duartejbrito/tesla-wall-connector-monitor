export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatPower(watts: number): string {
  if (watts < 1000) return `${watts.toFixed(0)} W`;
  return `${(watts / 1000).toFixed(1)} kW`;
}

export function formatEnergy(wh: number): string {
  if (wh < 1000) return `${wh.toFixed(0)} Wh`;
  if (wh < 1_000_000) return `${(wh / 1000).toFixed(1)} kWh`;
  return `${(wh / 1_000_000).toFixed(2)} MWh`;
}

export function estimateRange(energyWh: number, consumptionWhPerKm: number = 170): number {
  return energyWh / consumptionWhPerKm;
}

export function getTempColor(tempC: number): string {
  if (tempC < 40) return 'text-accent-green';
  if (tempC < 60) return 'text-accent-amber';
  return 'text-accent-red';
}

export function getTempBg(tempC: number): string {
  if (tempC < 40) return 'bg-accent-green/10 border-accent-green/20';
  if (tempC < 60) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-accent-red/10 border-accent-red/20';
}

export function getSignalStrength(rssi: number): { label: string; color: string; bars: number } {
  if (rssi >= -50) return { label: 'Excellent', color: 'text-accent-green', bars: 4 };
  if (rssi >= -60) return { label: 'Good', color: 'text-accent-green', bars: 3 };
  if (rssi >= -70) return { label: 'Fair', color: 'text-accent-amber', bars: 2 };
  return { label: 'Weak', color: 'text-accent-red', bars: 1 };
}

export function calculatePowerKw(vitals: {
  currentA_a: number;
  currentB_a: number;
  currentC_a: number;
  voltageA_v: number;
  voltageB_v: number;
  voltageC_v: number;
}): number {
  const watts =
    vitals.currentA_a * vitals.voltageA_v +
    vitals.currentB_a * vitals.voltageB_v +
    vitals.currentC_a * vitals.voltageC_v;
  return watts / 1000;
}
