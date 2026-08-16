import { useCallback, useMemo, useState } from "react";
import { Search, ListFilter, ChevronLeft, ChevronRight } from "lucide-react";
import TransactionTable from "../components/TransactionTable";
import LiveStatus from "../components/LiveStatus";
import usePolling from "../hooks/usePolling";
import { getTransactions } from "../api/api";
import "./Transactions.css";

const RISK_LEVELS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "risk_desc", label: "Highest Risk" },
  { value: "amount_desc", label: "Highest Amount" },
];
const PAGE_SIZE = 12;

export default function Transactions() {
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const fetchAll = useCallback(async () => {
    const { data, error } = await getTransactions({ limit: 500 });
    setAll(data || []);
    setError(error);
    setLoading(false);
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchAll, 5000);

  const filtered = useMemo(() => {
    let rows = [...all];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((t) => (t.transaction_id || t.id || "").toLowerCase().includes(q));
    }

    if (riskFilter !== "ALL") {
      rows = rows.filter((t) => (t.risk_level || "").toUpperCase() === riskFilter);
    }

    if (minAmount) {
      rows = rows.filter((t) => Number(t.amount) >= Number(minAmount));
    }
    if (maxAmount) {
      rows = rows.filter((t) => Number(t.amount) <= Number(maxAmount));
    }

    switch (sortBy) {
      case "oldest":
        rows.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      case "risk_desc":
        rows.sort((a, b) => (b.final_risk_score || 0) - (a.final_risk_score || 0));
        break;
      case "amount_desc":
        rows.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;
      case "newest":
      default:
        rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return rows;
  }, [all, search, riskFilter, minAmount, maxAmount, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function updateFilter(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">
            <ListFilter size={12} /> Transaction Ledger
          </div>
          <h1>Transactions</h1>
          <p className="page-subtitle">Monitor and investigate payment activity</p>
        </div>
        <LiveStatus lastUpdated={lastUpdated} />
      </div>

      <div className="panel txn-filter-panel">
        <div className="txn-filters">
          <div className="txn-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by transaction ID…"
              value={search}
              onChange={updateFilter(setSearch)}
            />
          </div>

          <select value={riskFilter} onChange={updateFilter(setRiskFilter)} className="txn-select">
            {RISK_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl === "ALL" ? "All Risk Levels" : lvl}
              </option>
            ))}
          </select>

          <div className="txn-amount-range">
            <input
              type="number"
              placeholder="Min ₹"
              value={minAmount}
              onChange={updateFilter(setMinAmount)}
            />
            <span>–</span>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxAmount}
              onChange={updateFilter(setMaxAmount)}
            />
          </div>

          <select value={sortBy} onChange={updateFilter(setSortBy)} className="txn-select">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>

        <TransactionTable
          transactions={pageRows}
          loading={loading}
          error={error}
          onRetry={refresh}
          variant="full"
        />

        {!loading && !error && filtered.length > 0 && (
          <div className="txn-pagination">
            <span className="mono">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="txn-pagination-controls">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="mono">
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
