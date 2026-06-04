// hooks/useSignals.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useSignals(filtros = {}) {
  const [signals, setSignals] = useState([]);
  const [macro, setMacro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [sinaisRes, macroRes] = await Promise.all([
        api.getSignals(filtros),
        api.getMacro().catch(() => null),
      ]);
      setSignals(sinaisRes.signals || []);
      setMacro(macroRes);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filtros)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerScan = async () => {
    setScanning(true);
    try {
      await api.triggerScan();
      // Aguarda 3s e recarrega
      setTimeout(() => {
        fetchData();
        setScanning(false);
      }, 3000);
    } catch {
      setScanning(false);
    }
  };

  const ignoreSignal = async (id) => {
    await api.ignoreSignal(id);
    setSignals(prev => prev.filter(s => s.id !== id));
  };

  return { signals, macro, loading, scanning, error, lastUpdate, triggerScan, ignoreSignal, refetch: fetchData };
}
