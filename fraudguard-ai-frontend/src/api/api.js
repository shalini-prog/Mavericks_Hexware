import axios from "axios";

// ---------------------------------------------------------------------------
// Centralized API client.
// The backend URL is configurable via VITE_API_URL and defaults to the local
// FastAPI dev server. Never hardcode the backend URL anywhere else in the app.
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Mock fallback layer.
//
// Some endpoints below may not exist on the backend yet. Per project rules we
// never silently fabricate production data. Instead:
//   1. The real request is always attempted first.
//   2. Only if the backend is unreachable AND `allowMock` is true do we return
//      clearly-labeled mock data, and only in development mode.
//   3. Every mock payload includes `_isMock: true` so the UI can render a
//      visible "Mock data" badge instead of pretending it's live.
// ---------------------------------------------------------------------------
const isDev = import.meta.env.DEV;

function markMock(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({ ...item, _isMock: true }));
  }
  return { ...payload, _isMock: true };
}

async function requestWithFallback(request, mockFactory) {
  try {
    const response = await request();
    return { data: response.data, isMock: false, error: null };
  } catch (error) {
    const status = error?.response?.status;
    const isMissingEndpoint = status === 404 || !error?.response;

    if (isDev && isMissingEndpoint && mockFactory) {
      // eslint-disable-next-line no-console
      console.warn(
        `[api] Falling back to mock data (dev only) — endpoint unavailable: ${error?.config?.url}`
      );
      return { data: markMock(mockFactory()), isMock: true, error: null };
    }
    return { data: null, isMock: false, error };
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

// GET /api/dashboard/stats
// TODO(backend): confirm exact response shape for aggregate stats.
export function getDashboardStats() {
  return requestWithFallback(
    () => apiClient.get("/api/dashboard/stats"),
    () => ({
      total_transactions: 0,
      low_risk: 0,
      medium_risk: 0,
      high_risk: 0,
      critical_risk: 0,
      open_alerts: 0,
      risk_distribution: [],
      risk_trend: [],
    })
  );
}

// GET /api/dashboard/recent-transactions?limit=10
// TODO(backend): confirm route name — may live under /api/transactions/recent.
export function getRecentTransactions(limit = 8) {
  return requestWithFallback(
    () => apiClient.get("/api/dashboard/recent-transactions", { params: { limit } }),
    () => []
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

// GET /api/transactions
export function getTransactions(params = {}) {
  return requestWithFallback(
    () => apiClient.get("/api/transactions", { params }),
    () => []
  );
}

// GET /api/transactions/:transactionId
export function getTransactionById(transactionId) {
  return requestWithFallback(
    () => apiClient.get(`/api/transactions/${transactionId}`),
    () => null
  );
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

// GET /api/alerts
export function getAlerts(params = {}) {
  return requestWithFallback(
    () => apiClient.get("/api/alerts", { params }),
    () => []
  );
}

// GET /api/alerts/:alertId
export function getAlertById(alertId) {
  return requestWithFallback(
    () => apiClient.get(`/api/alerts/${alertId}`),
    () => null
  );
}

// PATCH /api/alerts/:alertId/acknowledge
// TODO(backend): endpoint does not exist yet — button is disabled until it ships.
export function acknowledgeAlert(alertId) {
  return requestWithFallback(
    () => apiClient.patch(`/api/alerts/${alertId}/acknowledge`),
    null
  );
}

// PATCH /api/alerts/:alertId/resolve
// TODO(backend): endpoint does not exist yet — button is disabled until it ships.
export function resolveAlert(alertId) {
  return requestWithFallback(
    () => apiClient.patch(`/api/alerts/${alertId}/resolve`),
    null
  );
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

// GET /api/analytics
// TODO(backend): confirm exact route — may be split across multiple endpoints.
export function getAnalytics(params = {}) {
  return requestWithFallback(
    () => apiClient.get("/api/analytics", { params }),
    () => null
  );
}

// ---------------------------------------------------------------------------
// System status
// ---------------------------------------------------------------------------

// GET /api/system/status
// TODO(backend): endpoint does not exist yet — sidebar shows "Unknown" until it ships.
export function getSystemStatus() {
  return requestWithFallback(
    () => apiClient.get("/api/system/status"),
    () => null
  );
}
