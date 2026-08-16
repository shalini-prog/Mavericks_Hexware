from fastapi import FastAPI

from app.schemas import TransactionRequest
from risk_engine import calculate_risk
from fastapi import FastAPI
from database import supabase

app = FastAPI(
    title="Real-Time Payments Fraud Detection API",
    description="AI-powered real-time payment fraud detection system",
    version="1.0.0"
)


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
            result["reasons"]
    }

    supabase.table(
        "transactions"
    ).insert(
        transaction_record
    ).execute()


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

            "alert_id":
                alert_id,

            "transaction_id":
                transaction.transaction_id,

            "risk_score":
                result["final_risk_score"],

            "severity":
                result["risk_level"],

            "status":
                "OPEN",

            "reasons":
                result["reasons"]
        }

        supabase.table(
            "alerts"
        ).insert(
            alert_record
        ).execute()


    # -----------------------------------------
    # RETURN RESULT TO CLIENT
    # -----------------------------------------

    return {

        "transaction_id":
            transaction.transaction_id,

        "user_id":
            transaction.user_id,

        "amount":
            transaction.amount,

        **result
    }