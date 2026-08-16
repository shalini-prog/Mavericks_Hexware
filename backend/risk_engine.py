import joblib
import pandas as pd
import shap


# ==================================================
# LOAD MODELS
# ==================================================

FRAUD_MODEL_PATH = "models/fraud_model.joblib"
ANOMALY_MODEL_PATH = "models/anomaly_model.joblib"


fraud_model = joblib.load(
    FRAUD_MODEL_PATH
)

anomaly_model = joblib.load(
    ANOMALY_MODEL_PATH
)


# ==================================================
# SHAP EXPLAINER
# ==================================================

shap_explainer = shap.TreeExplainer(
    fraud_model
)


print("Fraud model loaded!")
print("Anomaly model loaded!")


# ==================================================
# FEATURES
# ==================================================

FEATURES = [
    "amount",
    "avg_user_amount",
    "amount_ratio",
    "transactions_last_10min",
    "new_device",
    "new_location",
    "international",
    "merchant_risk",
    "account_age_days",
    "device_age_days",
    "distance_from_home",
    "failed_attempts_10min",
    "hour",
    "day_of_week",
    "is_weekend",
    "unusual_hour"
]


# ==================================================
# SHAP EXPLANATION
# ==================================================

def calculate_shap_explanation(transaction):

    X = pd.DataFrame(
        [[transaction[feature] for feature in FEATURES]],
        columns=FEATURES
    )

    # Calculate SHAP values
    shap_values = shap_explainer.shap_values(X)

    # Get values for this transaction
    values = shap_values[0]

    # Pair feature names with SHAP values
    contributions = []

    for feature, value in zip(
        FEATURES,
        values
    ):

        contributions.append({
            "feature": feature,
            "shap_value": round(
                float(value),
                4
            )
        })

    # Sort by absolute contribution
    contributions.sort(
        key=lambda x: abs(x["shap_value"]),
        reverse=True
    )

    # Keep top 5 contributors
    top_contributors = contributions[:5]

    return top_contributors


# ==================================================
# BUSINESS RULE ENGINE
# ==================================================

def calculate_rule_score(transaction):

    score = 0

    reasons = []


    # ------------------------------------------------
    # New device
    # ------------------------------------------------

    if transaction["new_device"] == 1:

        score += 2

        reasons.append(
            "Transaction from a new device"
        )


    # ------------------------------------------------
    # New location
    # ------------------------------------------------

    if transaction["new_location"] == 1:

        score += 2

        reasons.append(
            "Transaction from a new location"
        )


    # ------------------------------------------------
    # International
    # ------------------------------------------------

    if transaction["international"] == 1:

        score += 2

        reasons.append(
            "International transaction"
        )


    # ------------------------------------------------
    # High transaction velocity
    # ------------------------------------------------

    if transaction["transactions_last_10min"] >= 5:

        score += 3

        reasons.append(
            "High transaction velocity"
        )


    # ------------------------------------------------
    # Extremely high transaction velocity
    # ------------------------------------------------

    if transaction["transactions_last_10min"] >= 10:

        score += 5

        reasons.append(
            "Extremely high transaction velocity"
        )


    # ------------------------------------------------
    # Failed attempts
    # ------------------------------------------------

    if transaction["failed_attempts_10min"] >= 3:

        score += 3

        reasons.append(
            "Multiple failed attempts"
        )


    # ------------------------------------------------
    # Amount anomaly
    # ------------------------------------------------

    if transaction["amount_ratio"] > 5:

        score += 4

        reasons.append(
            "Transaction amount significantly exceeds user's normal amount"
        )


    # ------------------------------------------------
    # Extremely high amount anomaly
    # ------------------------------------------------

    if transaction["amount_ratio"] > 10:

        score += 5

        reasons.append(
            "Transaction amount is extremely high compared with user's history"
        )


    # ------------------------------------------------
    # Merchant risk
    # ------------------------------------------------

    if transaction["merchant_risk"] >= 7:

        score += 3

        reasons.append(
            "High-risk merchant"
        )


    # ------------------------------------------------
    # Unusual hour
    # ------------------------------------------------

    if transaction["unusual_hour"] == 1:

        score += 2

        reasons.append(
            "Transaction occurred during unusual hours"
        )


    return score, reasons


# ==================================================
# ANOMALY SCORE
# ==================================================

def calculate_anomaly_score(transaction):

    X = pd.DataFrame(
        [[transaction[feature] for feature in FEATURES]],
        columns=FEATURES
    )


    raw_score = float(
        anomaly_model.decision_function(X)[0]
    )


    # ------------------------------------------------
    # Convert Isolation Forest score
    # into approximately 0-100 risk score.
    #
    # More negative = more anomalous.
    # ------------------------------------------------

    anomaly_score = 50 - (
        raw_score * 250
    )


    anomaly_score = float(
        max(
            0,
            min(
                100,
                anomaly_score
            )
        )
    )


    return anomaly_score


# ==================================================
# MAIN RISK ENGINE
# ==================================================

def calculate_risk(transaction):

    X = pd.DataFrame(
        [[transaction[feature] for feature in FEATURES]],
        columns=FEATURES
    )


    # ==================================================
    # XGBOOST FRAUD PROBABILITY
    # ==================================================

    fraud_probability = float(
        fraud_model.predict_proba(X)[0][1]
    )


    fraud_score = float(
        fraud_probability * 100
    )


    # ==================================================
    # ANOMALY SCORE
    # ==================================================

    anomaly_score = calculate_anomaly_score(
        transaction
    )


    # ==================================================
    # BUSINESS RULE SCORE
    # ==================================================

    rule_score, reasons = calculate_rule_score(
        transaction
    )


    # ==================================================
    # SHAP EXPLANATION
    # ==================================================

    shap_explanations = calculate_shap_explanation(
        transaction
    )


    # ==================================================
    # CONVERT RULE SCORE TO 0-100
    # ==================================================

    rule_score_normalized = min(
        rule_score / 31 * 100,
        100
    )


    # ==================================================
    # FINAL RISK SCORE
    # ==================================================

    final_score = (

        fraud_score * 0.60

        +

        anomaly_score * 0.25

        +

        rule_score_normalized * 0.15

    )


    final_score = round(
        min(
            final_score,
            100
        ),
        2
    )


    # ==================================================
    # RISK LEVEL
    # ==================================================

    if final_score >= 81:

        risk_level = "CRITICAL"

    elif final_score >= 61:

        risk_level = "HIGH"

    elif final_score >= 31:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"


    # ==================================================
    # RETURN RESULT
    # ==================================================

    return {

        "fraud_probability": float(
            round(
                fraud_probability,
                4
            )
        ),

        "fraud_score": float(
            round(
                fraud_score,
                2
            )
        ),

        "anomaly_score": float(
            round(
                anomaly_score,
                2
            )
        ),

        "rule_score": float(
            round(
                rule_score_normalized,
                2
            )
        ),

        "final_risk_score": float(
            round(
                final_score,
                2
            )
        ),

        "risk_level": risk_level,

        "reasons": reasons,

        "shap_explanations": shap_explanations

    }


# ==================================================
# DIRECT TEST
# ==================================================

if __name__ == "__main__":

    test_transaction = {

        "amount": 50000,

        "avg_user_amount": 2000,

        "amount_ratio": 25,

        "transactions_last_10min": 10,

        "new_device": 1,

        "new_location": 1,

        "international": 1,

        "merchant_risk": 9,

        "account_age_days": 30,

        "device_age_days": 5,

        "distance_from_home": 1500,

        "failed_attempts_10min": 5,

        "hour": 2,

        "day_of_week": 6,

        "is_weekend": 1,

        "unusual_hour": 1
    }


    result = calculate_risk(
        test_transaction
    )


    print()
    print("======================================")
    print("RISK ENGINE TEST")
    print("======================================")

    print(
        "Fraud Probability:",
        result["fraud_probability"]
    )

    print(
        "Fraud Score:",
        result["fraud_score"]
    )

    print(
        "Anomaly Score:",
        result["anomaly_score"]
    )

    print(
        "Rule Score:",
        result["rule_score"]
    )

    print(
        "Final Risk Score:",
        result["final_risk_score"]
    )

    print(
        "Risk Level:",
        result["risk_level"]
    )

    print()

    print("Business Rule Reasons:")

    for reason in result["reasons"]:

        print(
            "-",
            reason
        )

    print()

    print("SHAP Explanations:")

    for item in result["shap_explanations"]:

        print(
            item["feature"],
            "→",
            item["shap_value"]
        )