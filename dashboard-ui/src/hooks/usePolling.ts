import { useState, useEffect, useCallback, useRef } from 'react';
import type { DeviceState, PowerReading, Alert } from '../lib/types';

interface DashboardData {
  devices: DeviceState[];
  powerHistory: PowerReading[];
  alerts: Alert[];
  health: { status: string; uptime: number } | null;
  loading: boolean;
  error: string | null;
  selectedHost: string | null;
  setSelectedHost: (host: string | null) => void;
}

export function usePolling(intervalMs: number = 5000): DashboardData {
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [powerHistory, setPowerHistory] = useState<PowerReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [health, setHealth] = useState<{ status: string; uptime: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const selectedHostRef = useRef(selectedHost);
  selectedHostRef.current = selectedHost;

  const fetchData = useCallback(async () => {
    try {
      const histUrl = selectedHostRef.current
        ? `/api/power-history?host=${encodeURIComponent(selectedHostRef.current)}`
        : '/api/power-history';

      const [devRes, histRes, alertRes, healthRes] = await Promise.allSettled([
        fetch('/api/devices'),
        fetch(histUrl),
        fetch('/api/alerts?limit=20'),
        fetch('/api/health'),
      ]);

      if (devRes.status === 'fulfilled' && devRes.value.ok) {
        setDevices(await devRes.value.json());
      }
      if (histRes.status === 'fulfilled' && histRes.value.ok) {
        setPowerHistory(await histRes.value.json());
      }
      if (alertRes.status === 'fulfilled' && alertRes.value.ok) {
        setAlerts(await alertRes.value.json());
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        setHealth(await healthRes.value.json());
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => clearInterval(id);
  }, [fetchData, intervalMs]);

  return { devices, powerHistory, alerts, health, loading, error, selectedHost, setSelectedHost };
}
