import os
from collections import Counter, defaultdict
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import TransactionRequest
from database import supabase
from risk_engine import calculate_risk
from xai_explainer import generate_ai_explanation


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="Real-Time Payments Fraud Detection API",
    description="AI-powered real-time payment fraud detection system",
    version="1.0.0"
)


# ==================================================
# CORS
# ==================================================

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

        supabase.table(
            "transactions"
        ).select(
            "id"
        ).limit(
            1
        ).execute()

        supabase_online = True

    except Exception:

        supabase_online = False


    ai_online = bool(
        os.getenv("GROQ_API_KEY")
    )


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

    # ==================================================
    # CONVERT PYDANTIC OBJECT TO DICTIONARY
    # ==================================================

    transaction_data = transaction.dict()


    # ==================================================
    # RUN FRAUD DETECTION
    # ==================================================

    result = calculate_risk(
        transaction_data
    )


    # ==================================================
    # RUN SHAP + RAG + GROQ XAI
    # ==================================================

    print()
    print("Generating AI explanation...")


    try:

        xai_result = generate_ai_explanation(
            transaction_data,
            result
        )

    except Exception as e:

        print(
            "XAI Error:",
            e
        )

        # Keep transaction processing alive
        xai_result = {

            "explanation":
                "AI explanation unavailable.",

            "positive_shap_contributors":
                result.get(
                    "shap_explanations",
                    []
                ),

            "retrieved_knowledge":
                []
        }


    # ==================================================
    # SAVE TRANSACTION TO SUPABASE
    # ==================================================

    transaction_record = {

        # ==========================================
        # BASIC TRANSACTION INFORMATION
        # ==========================================

        "transaction_id":
            transaction_data["transaction_id"],

        "user_id":
            transaction_data["user_id"],

        "amount":
            transaction_data["amount"],

        "avg_user_amount":
            transaction_data["avg_user_amount"],

        "amount_ratio":
            transaction_data["amount_ratio"],


        # ==========================================
        # BEHAVIOURAL FEATURES
        # ==========================================

        "transactions_last_10min":
            transaction_data[
                "transactions_last_10min"
            ],

        "failed_attempts_10min":
            transaction_data[
                "failed_attempts_10min"
            ],


        # ==========================================
        # DEVICE / LOCATION
        # ==========================================

        "new_device":
            transaction_data["new_device"],

        "new_location":
            transaction_data["new_location"],

        "international":
            transaction_data["international"],

        "distance_from_home":
            transaction_data[
                "distance_from_home"
            ],


        # ==========================================
        # MERCHANT
        # ==========================================

        "merchant_risk":
            transaction_data["merchant_risk"],


        # ==========================================
        # ACCOUNT / DEVICE
        # ==========================================

        "account_age_days":
            transaction_data[
                "account_age_days"
            ],

        "device_age_days":
            transaction_data[
                "device_age_days"
            ],


        # ==========================================
        # TIME
        # ==========================================

        "hour":
            transaction_data["hour"],

        "day_of_week":
            transaction_data["day_of_week"],

        "is_weekend":
            transaction_data["is_weekend"],

        "unusual_hour":
            transaction_data["unusual_hour"],


        # ==========================================
        # FRAUD MODEL RESULTS
        # ==========================================

        "fraud_probability":
            result["fraud_probability"],

        "fraud_score":
            result["fraud_score"],

        "anomaly_score":
            result["anomaly_score"],

        "rule_score":
            result["rule_score"],

        "final_risk_score":
            result["final_risk_score"],

        "risk_level":
            result["risk_level"],

        "reasons":
            result["reasons"],


        # ==========================================
        # XAI DATA
        # ==========================================

        "ai_explanation":
            xai_result["explanation"],

        "shap_explanations":
            xai_result[
                "positive_shap_contributors"
            ],

        "rag_knowledge":
            xai_result[
                "retrieved_knowledge"
            ]
    }


    # ==================================================
    # SAVE TO SUPABASE
    # ==================================================

    try:

        response = supabase.table(
            "transactions"
        ).upsert(
            transaction_record,
            on_conflict="transaction_id"
        ).execute()


        print()
        print(
            "======================================"
        )

        print(
            "TRANSACTION SAVED TO SUPABASE"
        )

        print(
            "Transaction ID:",
            transaction_data["transaction_id"]
        )

        print(
            "Average Amount:",
            transaction_data["avg_user_amount"]
        )

        print(
            "Amount Ratio:",
            transaction_data["amount_ratio"]
        )

        print(
            "New Device:",
            transaction_data["new_device"]
        )

        print(
            "New Location:",
            transaction_data["new_location"]
        )

        print(
            "Merchant Risk:",
            transaction_data["merchant_risk"]
        )

        print(
            "======================================"
        )


    except Exception as e:

        print(
            "Supabase transaction insert error:",
            e
        )


    # ==================================================
    # CREATE ALERT FOR HIGH / CRITICAL
    # ==================================================

    if result["risk_level"] in [
        "HIGH",
        "CRITICAL"
    ]:

        alert_id = (
            f"ALERT-"
            f"{transaction_data['transaction_id']}"
        )


        alert_record = {

            "alert_id":
                alert_id,

            "transaction_id":
                transaction_data[
                    "transaction_id"
                ],

            "risk_score":
                result[
                    "final_risk_score"
                ],

            "severity":
                result["risk_level"],

            "status":
                "OPEN",

            "reasons":
                result["reasons"]
        }


        try:

            supabase.table(
                "alerts"
            ).upsert(
                alert_record,
                on_conflict="alert_id"
            ).execute()


            print(
                "🚨 ALERT CREATED:",
                alert_id
            )


        except Exception as e:

            print(
                "Supabase alert insert error:",
                e
            )


    # ==================================================
    # RETURN RESULT TO FRONTEND
    # ==================================================

    return {

        "transaction_id":
            transaction_data[
                "transaction_id"
            ],

        "user_id":
            transaction_data[
                "user_id"
            ],

        "amount":
            transaction_data[
                "amount"
            ],

        # Return original transaction data too
        "avg_user_amount":
            transaction_data[
                "avg_user_amount"
            ],

        "amount_ratio":
            transaction_data[
                "amount_ratio"
            ],

        "transactions_last_10min":
            transaction_data[
                "transactions_last_10min"
            ],

        "new_device":
            transaction_data[
                "new_device"
            ],

        "new_location":
            transaction_data[
                "new_location"
            ],

        "international":
            transaction_data[
                "international"
            ],

        "merchant_risk":
            transaction_data[
                "merchant_risk"
            ],

        "account_age_days":
            transaction_data[
                "account_age_days"
            ],

        "device_age_days":
            transaction_data[
                "device_age_days"
            ],

        "distance_from_home":
            transaction_data[
                "distance_from_home"
            ],

        "failed_attempts_10min":
            transaction_data[
                "failed_attempts_10min"
            ],

        "hour":
            transaction_data[
                "hour"
            ],

        "day_of_week":
            transaction_data[
                "day_of_week"
            ],

        "is_weekend":
            transaction_data[
                "is_weekend"
            ],

        "unusual_hour":
            transaction_data[
                "unusual_hour"
            ],

        **result,

        "ai_explanation":
            xai_result[
                "explanation"
            ],

        "shap_explanations":
            xai_result[
                "positive_shap_contributors"
            ],

        "rag_knowledge":
            xai_result[
                "retrieved_knowledge"
            ]
    }


# ==================================================
# ALTERNATIVE API ENDPOINT
# ==================================================

@app.post(
    "/api/transactions/analyze"
)
def api_analyze_transaction(
    transaction: TransactionRequest
):

    return analyze_transaction(
        transaction
    )


# ==================================================
# DASHBOARD API
# ==================================================

@app.get(
    "/api/dashboard/stats"
)
def get_dashboard_stats():

    try:

        # ==========================================
        # COUNTS
        # ==========================================

        total = (
            supabase.table(
                "transactions"
            )
            .select(
                "id",
                count="exact"
            )
            .limit(1)
            .execute()
            .count
            or 0
        )


        low = (
            supabase.table(
                "transactions"
            )
            .select(
                "id",
                count="exact"
            )
            .eq(
                "risk_level",
                "LOW"
            )
            .limit(1)
            .execute()
            .count
            or 0
        )


        med = (
            supabase.table(
                "transactions"
            )
            .select(
                "id",
                count="exact"
            )
            .eq(
                "risk_level",
                "MEDIUM"
            )
            .limit(1)
            .execute()
            .count
            or 0
        )


        high = (
            supabase.table(
                "transactions"
            )
            .select(
                "id",
                count="exact"
            )
            .eq(
                "risk_level",
                "HIGH"
            )
            .limit(1)
            .execute()
            .count
            or 0
        )


        crit = (
            supabase.table(
                "transactions"
            )
            .select(
                "id",
                count="exact"
            )
            .eq(
                "risk_level",
                "CRITICAL"
            )
            .limit(1)
            .execute()
            .count
            or 0
        )


        open_alerts = (
            supabase.table(
                "alerts"
            )
            .select(
                "id",
                count="exact"
            )
            .eq(
                "status",
                "OPEN"
            )
            .limit(1)
            .execute()
            .count
            or 0
        )


        # ==========================================
        # RISK TREND
        # ==========================================

        trend_res = (
            supabase.table(
                "transactions"
            )
            .select(
                "created_at, final_risk_score"
            )
            .order(
                "created_at",
                desc=True
            )
            .limit(20)
            .execute()
        )


        trend_rows = list(
            reversed(
                trend_res.data or []
            )
        )


        risk_trend = []


        for r in trend_rows:

            created = r.get(
                "created_at"
            )

            time_label = ""


            if created:

                try:

                    dt = datetime.fromisoformat(
                        created.replace(
                            "Z",
                            "+00:00"
                        )
                    )

                    time_label = dt.strftime(
                        "%H:%M:%S"
                    )

                except Exception:

                    time_label = str(
                        created
                    )[11:19]


            score = float(
                r.get(
                    "final_risk_score"
                )
                or 0.0
            )


            risk_trend.append({

                "time":
                    time_label,

                "risk_score":
                    score,

                "score":
                    score
            })


        return {

            "total_transactions":
                total,

            "low_risk":
                low,

            "medium_risk":
                med,

            "high_risk":
                high,

            "critical_risk":
                crit,

            "open_alerts":
                open_alerts,

            "risk_distribution": [

                {
                    "name":
                        "Low",
                    "value":
                        low
                },

                {
                    "name":
                        "Medium",
                    "value":
                        med
                },

                {
                    "name":
                        "High",
                    "value":
                        high
                },

                {
                    "name":
                        "Critical",
                    "value":
                        crit
                }
            ],

            "risk_trend":
                risk_trend
        }


    except Exception as e:

        print(
            f"Error fetching dashboard stats: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# ATTACH ALERTS TO TRANSACTIONS
# ==================================================

def attach_alerts_to_transactions(
    txns
):

    if not txns:

        return txns


    txn_ids = [

        t.get(
            "transaction_id"
        )

        for t in txns

        if t.get(
            "transaction_id"
        )
    ]


    alert_map = {}


    if txn_ids:

        try:

            alert_res = (
                supabase.table(
                    "alerts"
                )
                .select("*")
                .in_(
                    "transaction_id",
                    txn_ids
                )
                .execute()
            )


            for a in (
                alert_res.data or []
            ):

                if a.get(
                    "transaction_id"
                ):

                    alert_map[
                        a["transaction_id"]
                    ] = a


        except Exception as e:

            print(
                f"Error fetching alerts mapping: {e}"
            )


    for t in txns:

        tid = t.get(
            "transaction_id"
        )


        if tid and tid in alert_map:

            a = alert_map[tid]


            t["alert_id"] = (
                a.get(
                    "alert_id"
                )
                or (
                    f"ALERT-{a.get('id')}"
                    if a.get("id")
                    else None
                )
            )


            t["alert_status"] = a.get(
                "status",
                "OPEN"
            )


        elif t.get(
            "risk_level"
        ) in [
            "HIGH",
            "CRITICAL"
        ]:

            t["alert_id"] = (
                f"ALERT-{tid}"
            )

            t["alert_status"] = "OPEN"


        else:

            t["alert_id"] = None

            t["alert_status"] = None


    return txns


# ==================================================
# RECENT TRANSACTIONS
# ==================================================

@app.get(
    "/api/dashboard/recent-transactions"
)
def get_recent_transactions(
    limit: int = Query(
        8,
        ge=1,
        le=100
    )
):

    try:

        res = (
            supabase.table(
                "transactions"
            )
            .select("*")
            .order(
                "created_at",
                desc=True
            )
            .limit(
                limit
            )
            .execute()
        )


        txns = res.data or []


        return attach_alerts_to_transactions(
            txns
        )


    except Exception as e:

        print(
            f"Error fetching recent transactions: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# TRANSACTIONS API
# ==================================================

@app.get(
    "/api/transactions"
)
def get_transactions(

    limit: int = Query(
        100,
        ge=1,
        le=1000
    ),

    offset: int = Query(
        0,
        ge=0
    ),

    risk_level: Optional[str] = None,

    search: Optional[str] = None
):

    try:

        query = (
            supabase.table(
                "transactions"
            )
            .select("*")
            .order(
                "created_at",
                desc=True
            )
        )


        if (
            risk_level
            and risk_level.upper() != "ALL"
        ):

            query = query.eq(
                "risk_level",
                risk_level.upper()
            )


        if search:

            query = query.ilike(
                "transaction_id",
                f"%{search}%"
            )


        query = query.range(
            offset,
            offset + limit - 1
        )


        res = query.execute()


        txns = res.data or []


        return attach_alerts_to_transactions(
            txns
        )


    except Exception as e:

        print(
            f"Error fetching transactions: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# SINGLE TRANSACTION
# ==================================================

@app.get(
    "/api/transactions/{transaction_id}"
)
def get_transaction_by_id(
    transaction_id: str
):

    try:

        res = (
            supabase.table(
                "transactions"
            )
            .select("*")
            .eq(
                "transaction_id",
                transaction_id
            )
            .limit(1)
            .execute()
        )


        if (
            not res.data
            and transaction_id.isdigit()
        ):

            res = (
                supabase.table(
                    "transactions"
                )
                .select("*")
                .eq(
                    "id",
                    int(transaction_id)
                )
                .limit(1)
                .execute()
            )


        if not res.data:

            raise HTTPException(
                status_code=404,
                detail="Transaction not found"
            )


        txn = res.data[0]


        # ==========================================
        # ALERT
        # ==========================================

        alert_res = (
            supabase.table(
                "alerts"
            )
            .select("*")
            .eq(
                "transaction_id",
                txn.get(
                    "transaction_id"
                )
            )
            .limit(1)
            .execute()
        )


        alert = (
            alert_res.data[0]
            if alert_res.data
            else None
        )


        if alert:

            txn["alert_id"] = (
                alert.get(
                    "alert_id"
                )
                or (
                    f"ALERT-{alert.get('id')}"
                    if alert.get("id")
                    else None
                )
            )


            txn["alert_status"] = (
                alert.get(
                    "status",
                    "OPEN"
                )
            )


        elif txn.get(
            "risk_level"
        ) in [
            "HIGH",
            "CRITICAL"
        ]:

            txn["alert_id"] = (
                f"ALERT-"
                f"{txn.get('transaction_id')}"
            )

            txn["alert_status"] = "OPEN"


        # ==========================================
        # INVESTIGATION TIMELINE
        # ==========================================

        created_at = txn.get(
            "created_at"
        )


        timeline = {

            "received_at":
                created_at,

            "fraud_model_at":
                created_at,

            "anomaly_at":
                created_at,

            "rules_at":
                created_at,

            "shap_at":
                (
                    created_at
                    if txn.get(
                        "shap_explanations"
                    )
                    else None
                ),

            "rag_at":
                (
                    created_at
                    if txn.get(
                        "rag_knowledge"
                    )
                    else None
                ),

            "ai_explanation_at":
                (
                    created_at
                    if txn.get(
                        "ai_explanation"
                    )
                    else None
                ),

            "alert_at":
                (
                    alert.get(
                        "created_at"
                    )
                    if alert
                    else (
                        created_at
                        if txn.get(
                            "alert_id"
                        )
                        else None
                    )
                )
        }


        txn["alert"] = alert

        txn["timeline"] = timeline


        return txn


    except HTTPException:

        raise


    except Exception as e:

        print(
            f"Error fetching transaction "
            f"{transaction_id}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# ALERTS API
# ==================================================

@app.get(
    "/api/alerts"
)
def get_alerts(

    limit: int = Query(
        100,
        ge=1,
        le=1000
    ),

    status: Optional[str] = None,

    severity: Optional[str] = None
):

    try:

        query = (
            supabase.table(
                "alerts"
            )
            .select("*")
            .order(
                "created_at",
                desc=True
            )
        )


        if (
            status
            and status.upper() != "ALL"
        ):

            query = query.eq(
                "status",
                status.upper()
            )


        if (
            severity
            and severity.upper() != "ALL"
        ):

            query = query.eq(
                "severity",
                severity.upper()
            )


        query = query.limit(
            limit
        )


        res = query.execute()


        return res.data or []


    except Exception as e:

        print(
            f"Error fetching alerts: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# SINGLE ALERT
# ==================================================

@app.get(
    "/api/alerts/{alert_id}"
)
def get_alert_by_id(
    alert_id: str
):

    try:

        res = (
            supabase.table(
                "alerts"
            )
            .select("*")
            .eq(
                "alert_id",
                alert_id
            )
            .limit(1)
            .execute()
        )


        if (
            not res.data
            and alert_id.isdigit()
        ):

            res = (
                supabase.table(
                    "alerts"
                )
                .select("*")
                .eq(
                    "id",
                    int(alert_id)
                )
                .limit(1)
                .execute()
            )


        if not res.data:

            raise HTTPException(
                status_code=404,
                detail="Alert not found"
            )


        return res.data[0]


    except HTTPException:

        raise


    except Exception as e:

        print(
            f"Error fetching alert "
            f"{alert_id}: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# ACKNOWLEDGE ALERT
# ==================================================

@app.patch(
    "/api/alerts/{alert_id}/acknowledge"
)
def acknowledge_alert(
    alert_id: str
):

    try:

        res = (
            supabase.table(
                "alerts"
            )
            .update({
                "status":
                    "ACKNOWLEDGED"
            })
            .eq(
                "alert_id",
                alert_id
            )
            .execute()
        )


        if (
            not res.data
            and alert_id.isdigit()
        ):

            res = (
                supabase.table(
                    "alerts"
                )
                .update({
                    "status":
                        "ACKNOWLEDGED"
                })
                .eq(
                    "id",
                    int(alert_id)
                )
                .execute()
            )


        if not res.data:

            raise HTTPException(
                status_code=404,
                detail="Alert not found"
            )


        return res.data[0]


    except HTTPException:

        raise


    except Exception as e:

        print(
            f"Error acknowledging alert: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# RESOLVE ALERT
# ==================================================

@app.patch(
    "/api/alerts/{alert_id}/resolve"
)
def resolve_alert(
    alert_id: str
):

    try:

        res = (
            supabase.table(
                "alerts"
            )
            .update({
                "status":
                    "RESOLVED"
            })
            .eq(
                "alert_id",
                alert_id
            )
            .execute()
        )


        if (
            not res.data
            and alert_id.isdigit()
        ):

            res = (
                supabase.table(
                    "alerts"
                )
                .update({
                    "status":
                        "RESOLVED"
                })
                .eq(
                    "id",
                    int(alert_id)
                )
                .execute()
            )


        if not res.data:

            raise HTTPException(
                status_code=404,
                detail="Alert not found"
            )


        return res.data[0]


    except HTTPException:

        raise


    except Exception as e:

        print(
            f"Error resolving alert: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==================================================
# ANALYTICS API
# ==================================================

@app.get(
    "/api/analytics"
)
def get_analytics():

    try:

        res = (
            supabase.table(
                "transactions"
            )
            .select(
                """
                amount,
                fraud_probability,
                final_risk_score,
                risk_level,
                reasons,
                shap_explanations,
                created_at
                """
            )
            .order(
                "created_at",
                desc=True
            )
            .limit(
                500
            )
            .execute()
        )


        rows = res.data or []


        total_cnt = len(
            rows
        )


        if total_cnt == 0:

            return {

                "total_transactions":
                    0,

                "fraud_rate":
                    0.0,

                "critical_count":
                    0,

                "avg_risk_score":
                    0.0,

                "avg_amount":
                    0.0,

                "risk_distribution": [

                    {
                        "name":
                            "Low",
                        "value":
                            0
                    },

                    {
                        "name":
                            "Medium",
                        "value":
                            0
                    },

                    {
                        "name":
                            "High",
                        "value":
                            0
                    },

                    {
                        "name":
                            "Critical",
                        "value":
                            0
                    }
                ],

                "fraud_probability_distribution": [

                    {
                        "bucket":
                            "0-20%",
                        "count":
                            0
                    },

                    {
                        "bucket":
                            "20-40%",
                        "count":
                            0
                    },

                    {
                        "bucket":
                            "40-60%",
                        "count":
                            0
                    },

                    {
                        "bucket":
                            "60-80%",
                        "count":
                            0
                    },

                    {
                        "bucket":
                            "80-100%",
                        "count":
                            0
                    }
                ],

                "transaction_volume":
                    [],

                "risk_score_over_time":
                    [],

                "top_fraud_indicators":
                    [],

                "top_shap_features":
                    []
            }


        # ==========================================
        # BASIC STATISTICS
        # ==========================================

        avg_score = round(

            sum(
                float(
                    r.get(
                        "final_risk_score"
                    )
                    or 0
                )

                for r in rows
            )
            / total_cnt,

            2
        )


        avg_amt = round(

            sum(
                float(
                    r.get(
                        "amount"
                    )
                    or 0
                )

                for r in rows
            )
            / total_cnt,

            2
        )


        high_crit_cnt = sum(

            1

            for r in rows

            if r.get(
                "risk_level"
            ) in [
                "HIGH",
                "CRITICAL"
            ]
        )


        fraud_rate = round(

            high_crit_cnt
            / total_cnt,

            4
        )


        crit_cnt = sum(

            1

            for r in rows

            if r.get(
                "risk_level"
            ) == "CRITICAL"
        )


        # ==========================================
        # RISK DISTRIBUTION
        # ==========================================

        counts = Counter(

            r.get(
                "risk_level"
            )

            for r in rows
        )


        risk_dist = [

            {
                "name":
                    "Low",

                "value":
                    counts.get(
                        "LOW",
                        0
                    )
            },

            {
                "name":
                    "Medium",

                "value":
                    counts.get(
                        "MEDIUM",
                        0
                    )
            },

            {
                "name":
                    "High",

                "value":
                    counts.get(
                        "HIGH",
                        0
                    )
            },

            {
                "name":
                    "Critical",

                "value":
                    counts.get(
                        "CRITICAL",
                        0
                    )
            }
        ]


        # ==========================================
        # FRAUD PROBABILITY DISTRIBUTION
        # ==========================================

        buckets = {

            "0-20%":
                0,

            "20-40%":
                0,

            "40-60%":
                0,

            "60-80%":
                0,

            "80-100%":
                0
        }


        for r in rows:

            p = (

                float(
                    r.get(
                        "fraud_probability"
                    )
                    or 0
                )
                * 100
            )


            if p < 20:

                buckets[
                    "0-20%"
                ] += 1


            elif p < 40:

                buckets[
                    "20-40%"
                ] += 1


            elif p < 60:

                buckets[
                    "40-60%"
                ] += 1


            elif p < 80:

                buckets[
                    "60-80%"
                ] += 1


            else:

                buckets[
                    "80-100%"
                ] += 1


        prob_dist = [

            {
                "bucket":
                    k,

                "count":
                    v
            }

            for k, v
            in buckets.items()
        ]


        # ==========================================
        # VOLUME AND RISK TREND
        # ==========================================

        sample_rows = list(
            reversed(
                rows[:20]
            )
        )


        vol_map = defaultdict(
            int
        )

        risk_trend = []


        for r in sample_rows:

            created = r.get(
                "created_at"
            )


            time_label = ""


            if created:

                try:

                    dt = datetime.fromisoformat(
                        created.replace(
                            "Z",
                            "+00:00"
                        )
                    )


                    time_label = dt.strftime(
                        "%H:%M"
                    )


                except Exception:

                    time_label = str(
                        created
                    )[11:16]


            vol_map[
                time_label
            ] += 1


            risk_trend.append({

                "time":
                    time_label,

                "risk_score":
                    float(
                        r.get(
                            "final_risk_score"
                        )
                        or 0
                    )
            })


        txn_volume = [

            {
                "time":
                    k,

                "count":
                    v
            }

            for k, v
            in vol_map.items()
        ]


        # ==========================================
        # TOP FRAUD REASONS
        # ==========================================

        reason_counter = Counter()


        for r in rows:

            for reason in (
                r.get(
                    "reasons"
                )
                or []
            ):

                reason_counter[
                    reason
                ] += 1


        top_indicators = [

            {
                "reason":
                    k,

                "count":
                    v
            }

            for k, v
            in reason_counter.most_common(
                6
            )
        ]


        # ==========================================
        # TOP SHAP FEATURES
        # ==========================================

        shap_sums = defaultdict(
            float
        )

        shap_counts = defaultdict(
            int
        )


        for r in rows:

            for s in (
                r.get(
                    "shap_explanations"
                )
                or []
            ):

                f = s.get(
                    "feature"
                )


                val = abs(
                    float(
                        s.get(
                            "shap_value"
                        )
                        or 0
                    )
                )


                if f:

                    shap_sums[
                        f
                    ] += val

                    shap_counts[
                        f
                    ] += 1


        top_shap = [

            {
                "feature":
                    f,

                "avg_abs_shap":
                    round(
                        shap_sums[f]
                        /
                        shap_counts[f],

                        4
                    )
            }

            for f in shap_sums

            if shap_counts[f] > 0
        ]


        top_shap.sort(

            key=lambda x:
                x["avg_abs_shap"],

            reverse=True
        )


        top_shap = top_shap[
            :6
        ]


        # ==========================================
        # EXACT TOTAL
        # ==========================================

        exact_total = (

            supabase.table(
                "transactions"
            )
            .select(
                "id",
                count="exact"
            )
            .limit(1)
            .execute()
            .count

            or total_cnt
        )


        # ==========================================
        # RETURN ANALYTICS
        # ==========================================

        return {

            "total_transactions":
                exact_total,

            "fraud_rate":
                fraud_rate,

            "critical_count":
                crit_cnt,

            "avg_risk_score":
                avg_score,

            "avg_amount":
                avg_amt,

            "risk_distribution":
                risk_dist,

            "fraud_probability_distribution":
                prob_dist,

            "transaction_volume":
                txn_volume,

            "risk_score_over_time":
                risk_trend,

            "top_fraud_indicators":
                top_indicators,

            "top_shap_features":
                top_shap
        }


    except Exception as e:

        print(
            f"Error fetching analytics: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )