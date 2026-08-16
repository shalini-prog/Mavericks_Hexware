import pandas as pd
import joblib


# ---------------------------------------------
# LOAD MODEL
# ---------------------------------------------

MODEL_PATH = "models/anomaly_model.joblib"

model = joblib.load(MODEL_PATH)

print("Anomaly model loaded successfully!")


# ---------------------------------------------
# LOAD DATA
# ---------------------------------------------

df = pd.read_csv(
    "data/fraud_transactions.csv"
)


# ---------------------------------------------
# FEATURES
# ---------------------------------------------

features = [
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


# ---------------------------------------------
# PICK ONE NORMAL TRANSACTION
# ---------------------------------------------

normal_transaction = df[
    df["is_fraud"] == 0
].iloc[0]


# ---------------------------------------------
# PICK ONE FRAUD TRANSACTION
# ---------------------------------------------

fraud_transactions = df[
    df["is_fraud"] == 1
]

fraud_transaction = fraud_transactions.sort_values(
    by="amount_ratio",
    ascending=False
).iloc[0]


# ---------------------------------------------
# FUNCTION TO TEST TRANSACTION
# ---------------------------------------------

def test_transaction(transaction, name):

    X = transaction[features].to_frame().T

    prediction = model.predict(X)[0]

    raw_score = model.decision_function(X)[0]

    print("\n================================")
    print(name)
    print("================================")

    print(
        "Transaction ID:",
        transaction["transaction_id"]
    )

    print(
        "Amount:",
        transaction["amount"]
    )

    print(
        "Actual fraud:",
        transaction["is_fraud"]
    )

    print(
        "Prediction:",
        prediction
    )

    print(
        "Raw anomaly score:",
        round(raw_score, 4)
    )

    if prediction == -1:
        print("🚨 ANOMALY DETECTED")
    else:
        print("✅ NORMAL BEHAVIOR")


# ---------------------------------------------
# TEST
# ---------------------------------------------

test_transaction(
    normal_transaction,
    "NORMAL TRANSACTION"
)

test_transaction(
    fraud_transaction,
    "FRAUD TRANSACTION"
)