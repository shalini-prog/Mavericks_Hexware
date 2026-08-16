import pandas as pd

from risk_engine import calculate_risk


# ============================================
# LOAD DATA
# ============================================

df = pd.read_csv(
    "data/fraud_transactions.csv"
)


# ============================================
# NORMAL TRANSACTION
# ============================================

normal_transaction = df[
    df["is_fraud"] == 0
].iloc[0].to_dict()


# ============================================
# SUSPICIOUS TRANSACTION
# ============================================

suspicious_transaction = df[
    df["is_fraud"] == 1
].sort_values(
    by="amount_ratio",
    ascending=False
).iloc[0].to_dict()


# ============================================
# TEST FUNCTION
# ============================================

def test_transaction(
    transaction,
    name
):

    result = calculate_risk(
        transaction
    )


    print("\n===================================")

    print(name)

    print("===================================")

    print(
        "Transaction ID:",
        transaction["transaction_id"]
    )

    print(
        "Amount:",
        transaction["amount"]
    )

    print(
        "Actual Fraud:",
        transaction["is_fraud"]
    )

    print(
        "\nFraud Probability:",
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
        "FINAL RISK SCORE:",
        result["final_risk_score"]
    )

    print(
        "RISK LEVEL:",
        result["risk_level"]
    )

    print(
        "\nReasons:"
    )

    for reason in result["reasons"]:

        print(
            " -",
            reason
        )


# ============================================
# RUN TESTS
# ============================================

test_transaction(
    normal_transaction,
    "NORMAL TRANSACTION"
)


test_transaction(
    suspicious_transaction,
    "SUSPICIOUS TRANSACTION"
)