# FraudGuard AI — Investigator Frontend

A React + Vite frontend for the existing Real-Time Payments Fraud Detection
Platform (Kafka -> XGBoost -> Isolation Forest -> Business Rules -> SHAP -> RAG ->
Groq -> Supabase). This project is **frontend only** — it does not touch, wrap,
or reimplement any backend logic. It consumes your existing FastAPI backend
over HTTP.

## Stack

React 19 - Vite - JavaScript (no TypeScript) - React Router - Axios -
Recharts - Lucide React - Plain CSS (no Tailwind/MUI/Bootstrap/templates).

## Getting started

```bash
cd frontend
npm install
cp .env.example .env      # then edit VITE_API_URL if your backend isn't on :8000
npm run dev
```

The app runs at `http://localhost:5173` by default and expects the FastAPI
backend at `http://127.0.0.1:8000` unless `VITE_API_URL` is set otherwise.

```bash
npm run build     # production build -> dist/
npm run preview   # preview the production build locally
```

## Project structure

```
src/
├── api/api.js                 # centralized Axios client + all backend calls
├── components/                # Sidebar, Navbar, StatCard, RiskBadge,
│                               # TransactionTable, RiskGauge, ShapChart,
│                               # RagKnowledgeCard, AIExplanation, AlertCard,
│                               # ReasonBadges, InvestigationTimeline,
│                               # RiskDistributionChart, RiskTrendChart,
│                               # LoadingSkeleton, StateBlock, LiveStatus
├── hooks/usePolling.js         # 5s polling hook used for "live" data
├── pages/                      # Dashboard, Transactions, TransactionDetails,
│                               # Alerts, Analytics
├── styles/global.css           # design tokens, resets, shared classes
├── utils/format.js             # currency/percent/score/date formatting
├── App.jsx                     # routes
└── main.jsx                    # app bootstrap
```

## Routes

| Path                              | Page                         |
|-----------------------------------|-------------------------------|
| `/`                                | Dashboard                    |
| `/transactions`                    | Transaction listing          |
| `/transactions/:transactionId`     | Transaction Investigation     |
| `/alerts`                          | Alerts / investigation queue |
| `/analytics`                       | Analytics                    |

## Backend endpoints this frontend expects

The frontend was built against the response shape you provided for
`GET /api/transactions/:transactionId`. The functions in `src/api/api.js` map
to these routes — **confirm/adjust the exact paths to match your FastAPI
router**:

| Function                | Method & path                              | Status |
|--------------------------|---------------------------------------------|--------|
| `getDashboardStats()`     | `GET /api/dashboard/stats`                  | Assumed — confirm route name |
| `getRecentTransactions()` | `GET /api/dashboard/recent-transactions`    | Assumed — confirm route name |
| `getTransactions()`       | `GET /api/transactions`                     | Assumed |
| `getTransactionById(id)`  | `GET /api/transactions/:id`                 | Matches the shape you gave |
| `getAlerts()`             | `GET /api/alerts`                           | Assumed |
| `getAlertById(id)`        | `GET /api/alerts/:id`                       | Assumed |
| `acknowledgeAlert(id)`    | `PATCH /api/alerts/:id/acknowledge`         | **Not implemented yet** — button disabled with "coming soon" |
| `resolveAlert(id)`        | `PATCH /api/alerts/:id/resolve`             | **Not implemented yet** — button disabled with "coming soon" |
| `getAnalytics()`          | `GET /api/analytics`                        | Assumed — likely needs to be split into multiple endpoints on your side |
| `getSystemStatus()`       | `GET /api/system/status`                    | **Not implemented yet** — sidebar shows all systems as "Online" until this exists |

If a route path differs on your backend, only `src/api/api.js` needs editing —
no component or page references URLs directly.

### Expected shapes

- `getDashboardStats()` -> `{ total_transactions, low_risk, medium_risk, high_risk, critical_risk, open_alerts, risk_distribution: [{name, value}], risk_trend: [{time, risk_score}] }`
- `getTransactions()` / `getRecentTransactions()` -> array of transaction objects (same shape as the detail endpoint, minus the explainability fields)
- `getTransactionById(id)` -> matches the JSON shape you supplied, plus optional `alert` (object) and `timeline` (object of ISO timestamps keyed by stage, e.g. `received_at`, `fraud_model_at`, ...) — both are rendered only if present, never fabricated
- `getAlerts()` -> array of `{ alert_id, transaction_id, severity, risk_score, status, created_at }`
- `getAnalytics()` -> `{ total_transactions, fraud_rate, critical_count, avg_risk_score, avg_amount, risk_distribution, fraud_probability_distribution: [{bucket, count}], transaction_volume: [{time, count}], risk_score_over_time: [{time, risk_score}], top_fraud_indicators: [{reason, count}], top_shap_features: [{feature, avg_abs_shap}] }`

## Mock data policy

Per the project rules, the frontend **never fabricates fraud data in
production**. In `src/api/api.js`, if an endpoint is unreachable (404 or
network error) **and** the app is running in dev mode (`npm run dev`), a
clearly-labeled mock payload is returned with `_isMock: true` on every record,
and the transaction table renders a visible `MOCK` tag next to the ID. In a
production build this fallback never fires — the UI shows the error/empty
state instead so nothing is silently faked.

## Loading / error / empty states

Every data-fetching page shows skeleton loaders while fetching, a
"Backend connection unavailable" panel with a retry button on request
failure, and an explicit empty-state message ("No transactions found",
"No active alerts", etc.) when the backend returns zero records.

## Real-time updates

The frontend polls the backend every 5 seconds (`src/hooks/usePolling.js`) and
shows a "Live" indicator with "Last updated Ns ago" on Dashboard,
Transactions, Alerts, and Analytics. No WebSocket usage — matches the
current Kafka-backed polling model. Swap in WebSockets later without
touching page components if the backend adds that support.

## What was intentionally left out

- No hardcoded fraud probabilities, risk scores, SHAP values, RAG similarity
  scores, or AI explanations — everything renders directly from whatever the
  backend returns.
- No backend, Kafka, XGBoost, Isolation Forest, SHAP, RAG, Groq, or Supabase
  code was touched or reimplemented.
