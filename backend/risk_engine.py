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
# ORIGINAL FEATURES
# ==================================================

BASE_FEATURES = [
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
# XGBOOST FEATURES
# ==================================================

ML_FEATURES = BASE_FEATURES + [

    "amount_velocity",

    "amount_merchant_risk",

    "velocity_merchant_risk",

    "combined_risk_signal",

    "amount_failed_attempts",

    "velocity_failed_attempts",

    "amount_distance",

    "merchant_distance"

]


# ==================================================
# CREATE ML FEATURES
# ==================================================

def create_ml_features(transaction):

    data = transaction.copy()


    # ----------------------------------------------
    # Amount + velocity
    # ----------------------------------------------

    data["amount_velocity"] = (
        data["amount_ratio"]
        * data["transactions_last_10min"]
    )


    # ----------------------------------------------
    # Amount + merchant risk
    # ----------------------------------------------

    data["amount_merchant_risk"] = (
        data["amount_ratio"]
        * data["merchant_risk"]
    )


    # ----------------------------------------------
    # Velocity + merchant risk
    # ----------------------------------------------

    data["velocity_merchant_risk"] = (
        data["transactions_last_10min"]
        * data["merchant_risk"]
    )


    # ----------------------------------------------
    # Amount + velocity + merchant
    # ----------------------------------------------

    data["combined_risk_signal"] = (
        data["amount_ratio"]
        * data["transactions_last_10min"]
        * data["merchant_risk"]
    )


    # ----------------------------------------------
    # Amount + failed attempts
    # ----------------------------------------------

    data["amount_failed_attempts"] = (
        data["amount_ratio"]
        * data["failed_attempts_10min"]
    )


    # ----------------------------------------------
    # Velocity + failed attempts
    # ----------------------------------------------

    data["velocity_failed_attempts"] = (
        data["transactions_last_10min"]
        * data["failed_attempts_10min"]
    )


    # ----------------------------------------------
    # Amount + distance
    # ----------------------------------------------

    data["amount_distance"] = (
        data["amount_ratio"]
        * data["distance_from_home"]
    )


    # ----------------------------------------------
    # Merchant + distance
    # ----------------------------------------------

    data["merchant_distance"] = (
        data["merchant_risk"]
        * data["distance_from_home"]
    )


    return data


# ==================================================
# CREATE DATAFRAME FOR XGBOOST
# ==================================================

def create_ml_dataframe(transaction):

    data = create_ml_features(
        transaction
    )

    X = pd.DataFrame(
        [
            [
                data[feature]
                for feature in ML_FEATURES
            ]
        ],
        columns=ML_FEATURES
    )

    return X


# ==================================================
# CREATE DATAFRAME FOR ANOMALY MODEL
# ==================================================

def create_anomaly_dataframe(transaction):

    X = pd.DataFrame(
        [
            [
                transaction[feature]
                for feature in BASE_FEATURES
            ]
        ],
        columns=BASE_FEATURES
    )

    return X


# ==================================================
# SHAP EXPLANATION
# ==================================================

def calculate_shap_explanation(transaction):

    X = create_ml_dataframe(
        transaction
    )


    shap_values = shap_explainer.shap_values(
        X
    )


    values = shap_values[0]


    contributions = []


    for feature, value in zip(
        ML_FEATURES,
        values
    ):

        contributions.append({

            "feature": feature,

            "shap_value": round(
                float(value),
                4
            )

        })


    contributions.sort(
        key=lambda x: abs(
            x["shap_value"]
        ),
        reverse=True
    )


    top_contributors = contributions[:5]


    return top_contributors


# ==================================================
# BUSINESS RULE ENGINE
# ==================================================

def calculate_rule_score(transaction):

    score = 0

    reasons = []


    # ==================================================
    # BASIC RISK SIGNALS
    # ==================================================

    # New device
    if transaction["new_device"] == 1:

        score += 3

        reasons.append(
            "Transaction from a new device"
        )


    # New location
    if transaction["new_location"] == 1:

        score += 3

        reasons.append(
            "Transaction from a new location"
        )


    # International transaction
    if transaction["international"] == 1:

        score += 3

        reasons.append(
            "International transaction"
        )


    # ==================================================
    # VELOCITY
    # ==================================================

    if transaction["transactions_last_10min"] >= 5:

        score += 3

        reasons.append(
            "High transaction velocity"
        )


    if transaction["transactions_last_10min"] >= 10:

        score += 5

        reasons.append(
            "Extremely high transaction velocity"
        )


    if transaction["transactions_last_10min"] >= 15:

        score += 4

        reasons.append(
            "Very high transaction velocity"
        )


    # ==================================================
    # FAILED ATTEMPTS
    # ==================================================

    if transaction["failed_attempts_10min"] >= 3:

        score += 3

        reasons.append(
            "Multiple failed attempts"
        )


    # ==================================================
    # AMOUNT
    # ==================================================

    if transaction["amount_ratio"] > 2:

        score += 3

        reasons.append(
            "Transaction amount is more than twice the user's normal amount"
        )


    if transaction["amount_ratio"] > 5:

        score += 4

        reasons.append(
            "Transaction amount significantly exceeds user's normal amount"
        )


    if transaction["amount_ratio"] > 10:

        score += 5

        reasons.append(
            "Transaction amount is extremely high compared with user's history"
        )


    # ==================================================
    # MERCHANT
    # ==================================================

    if transaction["merchant_risk"] >= 7:

        score += 3

        reasons.append(
            "High-risk merchant"
        )


    if transaction["merchant_risk"] >= 9:

        score += 2

        reasons.append(
            "Extremely high-risk merchant"
        )


    # ==================================================
    # DISTANCE
    # ==================================================

    if transaction["distance_from_home"] >= 50:

        score += 2

        reasons.append(
            "Transaction occurred far from user's normal location"
        )


    if transaction["distance_from_home"] >= 200:

        score += 3

        reasons.append(
            "Transaction occurred extremely far from user's normal location"
        )


    # ==================================================
    # UNUSUAL TIME
    # ==================================================

    if transaction["unusual_hour"] == 1:

        score += 2

        reasons.append(
            "Transaction occurred during unusual hours"
        )


    # ==================================================
    # BEHAVIORAL PATTERNS
    # ==================================================

    amount_ratio = transaction["amount_ratio"]

    velocity = transaction["transactions_last_10min"]

    merchant_risk = transaction["merchant_risk"]


    # --------------------------------------------------
    # PATTERN 1
    # High amount + high velocity
    # --------------------------------------------------

    if (
        amount_ratio > 2
        and
        velocity >= 5
    ):

        score += 5

        reasons.append(
            "Unusually high amount combined with high transaction velocity"
        )


    # --------------------------------------------------
    # PATTERN 2
    # High merchant + high velocity
    # --------------------------------------------------

    if (
        merchant_risk >= 7
        and
        velocity >= 5
    ):

        score += 3

        reasons.append(
            "High-risk merchant combined with high transaction velocity"
        )


    # --------------------------------------------------
    # PATTERN 3
    # High amount + high merchant
    # --------------------------------------------------

    if (
        amount_ratio > 2
        and
        merchant_risk >= 7
    ):

        score += 3

        reasons.append(
            "High transaction amount combined with a high-risk merchant"
        )


    # --------------------------------------------------
    # PATTERN 4
    # Three suspicious signals together
    # --------------------------------------------------

    if (
        amount_ratio > 2
        and
        velocity >= 5
        and
        merchant_risk >= 7
    ):

        score += 5

        reasons.append(
            "Multiple suspicious signals occurring together"
        )


    # ==================================================
    # STEALTH / LOW-AND-SLOW PATTERN
    # ==================================================

    if (
        amount_ratio >= 2
        and
        amount_ratio <= 5
        and
        velocity >= 5
        and
        merchant_risk >= 7
        and
        transaction["new_device"] == 0
        and
        transaction["new_location"] == 0
    ):

        reasons.append(
            "Potential low-and-slow fraud pattern: "
            "moderately unusual amount with repeated transactions "
            "and a high-risk merchant"
        )


    # ==================================================
    # RETURN
    # ==================================================

    return score, reasons


# ==================================================
# ANOMALY SCORE
# ==================================================

def calculate_anomaly_score(transaction):

    X = create_anomaly_dataframe(
        transaction
    )


    raw_score = float(
        anomaly_model.decision_function(X)[0]
    )


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


    # ==================================================
    # XGBOOST
    # ==================================================

    X = create_ml_dataframe(
        transaction
    )


    fraud_probability = float(
        fraud_model.predict_proba(X)[0][1]
    )


    fraud_score = (
        fraud_probability * 100
    )


    # ==================================================
    # ANOMALY
    # ==================================================

    anomaly_score = calculate_anomaly_score(
        transaction
    )


    # ==================================================
    # RULE ENGINE
    # ==================================================

    rule_score, reasons = calculate_rule_score(
        transaction
    )


    # ==================================================
    # SHAP
    # ==================================================

    shap_explanations = calculate_shap_explanation(
        transaction
    )


    # ==================================================
    # NORMALIZE RULE SCORE
    # ==================================================

    rule_score_normalized = min(
        rule_score / 60 * 100,
        100
    )


    # ==================================================
    # FINAL RISK SCORE
    # ==================================================

    final_score = (

        fraud_score * 0.45

        +

        anomaly_score * 0.30

        +

        rule_score_normalized * 0.25

    )

    final_score = round(
        min(
            final_score,
            100
        ),
        2
    )

    # ==================================================
    # BEHAVIORAL RISK ESCALATION
    # ==================================================

    if (
        anomaly_score >= 70
        and
        rule_score_normalized >= 40
        and
        final_score < 31
    ):

        final_score = 31


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
    # RETURN
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

        "amount": 7500,

        "avg_user_amount": 2000,

        "amount_ratio": 3.75,

        "transactions_last_10min": 12,

        "new_device": 0,

        "new_location": 0,

        "international": 0,

        "merchant_risk": 8,

        "account_age_days": 800,

        "device_age_days": 300,

        "distance_from_home": 80,

        "failed_attempts_10min": 0,

        "hour": 17,

        "day_of_week": 2,

        "is_weekend": 0,

        "unusual_hour": 0
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