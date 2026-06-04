// services/api.js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  // Sinais
  getSignals: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/signals${qs ? '?' + qs : ''}`);
  },
  getSignal: (id) => apiFetch(`/signals/${id}`),
  ignoreSignal: (id) => apiFetch(`/signals/${id}/ignore`, { method: 'PUT' }),
  triggerScan: () => apiFetch('/signals/scan', { method: 'POST' }),

  // Macro
  getMacro: () => apiFetch('/macro'),

  // Config
  getConfig: () => apiFetch('/config'),
  updateConfig: (data) => apiFetch('/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Health
  health: () => apiFetch('/health'),
};
