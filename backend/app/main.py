import os
from collections import Counter, defaultdict
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import TransactionRequest
from database import supabase
from risk_engine import calculate_risk

app = FastAPI(
    title="Real-Time Payments Fraud Detection API",
    description="AI-powered real-time payment fraud detection system",
    version="1.0.0"
)

# Enable CORS for the frontend application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# HEALTH & STATUS ENDPOINTS
# ==================================================

@app.get("/")
def home():
    return {
        "message": "Fraud Detection API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.get("/api/system/status")
def get_system_status():
    supabase_online = False
    try:
        supabase.table("transactions").select("id").limit(1).execute()
        supabase_online = True
    except Exception:
        supabase_online = False

    ai_online = bool(os.getenv("GROQ_API_KEY"))

    return {
        "kafka": True,
        "risk_engine": True,
        "ai_xai": ai_online,
        "supabase": supabase_online
    }


# ==================================================
# REAL-TIME TRANSACTION ANALYSIS
# ==================================================

@app.post("/transactions/analyze")
def analyze_transaction(
    transaction: TransactionRequest
):
    # Convert Pydantic object to dictionary
    transaction_data = transaction.dict()

    # Run fraud detection
    result = calculate_risk(
        transaction_data
    )

    # -----------------------------------------
    # SAVE TRANSACTION TO SUPABASE
    # -----------------------------------------
    transaction_record = {
        "transaction_id": transaction.transaction_id,
        "user_id": transaction.user_id,
        "amount": transaction.amount,
        "fraud_probability": result["fraud_probability"],
        "fraud_score": result["fraud_score"],
        "anomaly_score": result["anomaly_score"],
        "rule_score": result["rule_score"],
        "final_risk_score": result["final_risk_score"],
        "risk_level": result["risk_level"],
        "reasons": result["reasons"],
        "shap_explanations": result.get("shap_explanations"),
    }

    try:
        supabase.table(
            "transactions"
        ).upsert(
            transaction_record,
            on_conflict="transaction_id"
        ).execute()
    except Exception as e:
        print(f"Supabase transaction insert error: {e}")

    # -----------------------------------------
    # CREATE ALERT FOR HIGH / CRITICAL
    # -----------------------------------------
    if result["risk_level"] in [
        "HIGH",
        "CRITICAL"
    ]:
        alert_id = (
            f"ALERT-{transaction.transaction_id}"
        )

        alert_record = {
            "alert_id": alert_id,
            "transaction_id": transaction.transaction_id,
            "risk_score": result["final_risk_score"],
            "severity": result["risk_level"],
            "status": "OPEN",
            "reasons": result["reasons"]
        }

        try:
            supabase.table(
                "alerts"
            ).upsert(
                alert_record,
                on_conflict="alert_id"
            ).execute()
        except Exception as e:
            print(f"Supabase alert insert error: {e}")

    # -----------------------------------------
    # RETURN RESULT TO CLIENT
    # -----------------------------------------
    return {
        "transaction_id": transaction.transaction_id,
        "user_id": transaction.user_id,
        "amount": transaction.amount,
        **result
    }


@app.post("/api/transactions/analyze")
def api_analyze_transaction(transaction: TransactionRequest):
    return analyze_transaction(transaction)


# ==================================================
# DASHBOARD API ENDPOINTS
# ==================================================

@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    try:
        # Fetch counts by risk level
        total = supabase.table("transactions").select("id", count="exact").limit(1).execute().count or 0
        low = supabase.table("transactions").select("id", count="exact").eq("risk_level", "LOW").limit(1).execute().count or 0
        med = supabase.table("transactions").select("id", count="exact").eq("risk_level", "MEDIUM").limit(1).execute().count or 0
        high = supabase.table("transactions").select("id", count="exact").eq("risk_level", "HIGH").limit(1).execute().count or 0
        crit = supabase.table("transactions").select("id", count="exact").eq("risk_level", "CRITICAL").limit(1).execute().count or 0
        open_alerts = supabase.table("alerts").select("id", count="exact").eq("status", "OPEN").limit(1).execute().count or 0

        # Fetch recent transactions for trend chart
        trend_res = supabase.table("transactions").select("created_at, final_risk_score").order("created_at", desc=True).limit(20).execute()
        trend_rows = list(reversed(trend_res.data or []))

        risk_trend = []
        for r in trend_rows:
            created = r.get("created_at")
            time_label = ""
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    time_label = dt.strftime("%H:%M:%S")
                except Exception:
                    time_label = str(created)[11:19]
            score = float(r.get("final_risk_score") or 0.0)
            risk_trend.append({
                "time": time_label,
                "risk_score": score,
                "score": score
            })

        return {
            "total_transactions": total,
            "low_risk": low,
            "medium_risk": med,
            "high_risk": high,
            "critical_risk": crit,
            "open_alerts": open_alerts,
            "risk_distribution": [
                {"name": "Low", "value": low},
                {"name": "Medium", "value": med},
                {"name": "High", "value": high},
                {"name": "Critical", "value": crit},
            ],
            "risk_trend": risk_trend
        }
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/dashboard/recent-transactions")
def get_recent_transactions(limit: int = Query(8, ge=1, le=100)):
    try:
        res = supabase.table("transactions").select("*").order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching recent transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# TRANSACTIONS API ENDPOINTS
# ==================================================

@app.get("/api/transactions")
def get_transactions(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
):
    try:
        query = supabase.table("transactions").select("*").order("created_at", desc=True)
        if risk_level and risk_level.upper() != "ALL":
            query = query.eq("risk_level", risk_level.upper())
        if search:
            query = query.ilike("transaction_id", f"%{search}%")
        query = query.range(offset, offset + limit - 1)
        res = query.execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/transactions/{transaction_id}")
def get_transaction_by_id(transaction_id: str):
    try:
        res = supabase.table("transactions").select("*").eq("transaction_id", transaction_id).limit(1).execute()
        if not res.data and transaction_id.isdigit():
            res = supabase.table("transactions").select("*").eq("id", int(transaction_id)).limit(1).execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Transaction not found")

        txn = res.data[0]

        # Check for associated alert
        alert_res = supabase.table("alerts").select("*").eq("transaction_id", txn.get("transaction_id")).limit(1).execute()
        alert = alert_res.data[0] if alert_res.data else None

        # Build timeline
        created_at = txn.get("created_at")
        timeline = {
            "received_at": created_at,
            "fraud_model_at": created_at,
            "anomaly_at": created_at,
            "rules_at": created_at,
            "shap_at": created_at if txn.get("shap_explanations") else None,
            "rag_at": created_at if txn.get("rag_knowledge") else None,
            "ai_explanation_at": created_at if txn.get("ai_explanation") else None,
            "alert_at": alert.get("created_at") if alert else None
        }

        txn["alert"] = alert
        txn["timeline"] = timeline
        return txn
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching transaction {transaction_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# ALERTS API ENDPOINTS
# ==================================================

@app.get("/api/alerts")
def get_alerts(
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    severity: Optional[str] = None
):
    try:
        query = supabase.table("alerts").select("*").order("created_at", desc=True)
        if status and status.upper() != "ALL":
            query = query.eq("status", status.upper())
        if severity and severity.upper() != "ALL":
            query = query.eq("severity", severity.upper())
        query = query.limit(limit)
        res = query.execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts/{alert_id}")
def get_alert_by_id(alert_id: str):
    try:
        res = supabase.table("alerts").select("*").eq("alert_id", alert_id).limit(1).execute()
        if not res.data and alert_id.isdigit():
            res = supabase.table("alerts").select("*").eq("id", int(alert_id)).limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: str):
    try:
        res = supabase.table("alerts").update({"status": "ACKNOWLEDGED"}).eq("alert_id", alert_id).execute()
        if not res.data and alert_id.isdigit():
            res = supabase.table("alerts").update({"status": "ACKNOWLEDGED"}).eq("id", int(alert_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error acknowledging alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    try:
        res = supabase.table("alerts").update({"status": "RESOLVED"}).eq("alert_id", alert_id).execute()
        if not res.data and alert_id.isdigit():
            res = supabase.table("alerts").update({"status": "RESOLVED"}).eq("id", int(alert_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resolving alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================================================
# ANALYTICS API ENDPOINT
# ==================================================

@app.get("/api/analytics")
def get_analytics():
    try:
        res = supabase.table("transactions").select(
            "amount, fraud_probability, final_risk_score, risk_level, reasons, shap_explanations, created_at"
        ).order("created_at", desc=True).limit(500).execute()
        rows = res.data or []
        total_cnt = len(rows)

        if total_cnt == 0:
            return {
                "total_transactions": 0,
                "fraud_rate": 0.0,
                "critical_count": 0,
                "avg_risk_score": 0.0,
                "avg_amount": 0.0,
                "risk_distribution": [
                    {"name": "Low", "value": 0},
                    {"name": "Medium", "value": 0},
                    {"name": "High", "value": 0},
                    {"name": "Critical", "value": 0},
                ],
                "fraud_probability_distribution": [
                    {"bucket": "0-20%", "count": 0},
                    {"bucket": "20-40%", "count": 0},
                    {"bucket": "40-60%", "count": 0},
                    {"bucket": "60-80%", "count": 0},
                    {"bucket": "80-100%", "count": 0},
                ],
                "transaction_volume": [],
                "risk_score_over_time": [],
                "top_fraud_indicators": [],
                "top_shap_features": []
            }

        avg_score = round(sum(float(r.get("final_risk_score") or 0) for r in rows) / total_cnt, 2)
        avg_amt = round(sum(float(r.get("amount") or 0) for r in rows) / total_cnt, 2)
        high_crit_cnt = sum(1 for r in rows if r.get("risk_level") in ["HIGH", "CRITICAL"])
        fraud_rate = round(high_crit_cnt / total_cnt, 4)
        crit_cnt = sum(1 for r in rows if r.get("risk_level") == "CRITICAL")

        counts = Counter(r.get("risk_level") for r in rows)
        risk_dist = [
            {"name": "Low", "value": counts.get("LOW", 0)},
            {"name": "Medium", "value": counts.get("MEDIUM", 0)},
            {"name": "High", "value": counts.get("HIGH", 0)},
            {"name": "Critical", "value": counts.get("CRITICAL", 0)},
        ]

        buckets = {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0}
        for r in rows:
            p = float(r.get("fraud_probability") or 0) * 100
            if p < 20:
                buckets["0-20%"] += 1
            elif p < 40:
                buckets["20-40%"] += 1
            elif p < 60:
                buckets["40-60%"] += 1
            elif p < 80:
                buckets["60-80%"] += 1
            else:
                buckets["80-100%"] += 1
        prob_dist = [{"bucket": k, "count": v} for k, v in buckets.items()]

        # Volume and risk trend
        sample_rows = list(reversed(rows[:20]))
        vol_map = defaultdict(int)
        risk_trend = []
        for r in sample_rows:
            created = r.get("created_at")
            time_label = ""
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    time_label = dt.strftime("%H:%M")
                except Exception:
                    time_label = str(created)[11:16]
            vol_map[time_label] += 1
            risk_trend.append({
                "time": time_label,
                "risk_score": float(r.get("final_risk_score") or 0)
            })

        txn_volume = [{"time": k, "count": v} for k, v in vol_map.items()]

        # Top reasons
        reason_counter = Counter()
        for r in rows:
            for reason in (r.get("reasons") or []):
                reason_counter[reason] += 1
        top_indicators = [{"reason": k, "count": v} for k, v in reason_counter.most_common(6)]

        # Top SHAP features
        shap_sums = defaultdict(float)
        shap_counts = defaultdict(int)
        for r in rows:
            for s in (r.get("shap_explanations") or []):
                f = s.get("feature")
                val = abs(float(s.get("shap_value") or 0))
                shap_sums[f] += val
                shap_counts[f] += 1
        top_shap = [
            {"feature": f, "avg_abs_shap": round(shap_sums[f] / shap_counts[f], 4)}
            for f in shap_sums if shap_counts[f] > 0
        ]
        top_shap.sort(key=lambda x: x["avg_abs_shap"], reverse=True)
        top_shap = top_shap[:6]

        exact_total = supabase.table("transactions").select("id", count="exact").limit(1).execute().count or total_cnt

        return {
            "total_transactions": exact_total,
            "fraud_rate": fraud_rate,
            "critical_count": crit_cnt,
            "avg_risk_score": avg_score,
            "avg_amount": avg_amt,
            "risk_distribution": risk_dist,
            "fraud_probability_distribution": prob_dist,
            "transaction_volume": txn_volume,
            "risk_score_over_time": risk_trend,
            "top_fraud_indicators": top_indicators,
            "top_shap_features": top_shap
        }
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))