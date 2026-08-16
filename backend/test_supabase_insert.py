from database import supabase


print("Testing Supabase INSERT...")


data = {
    "transaction_id": "TEST-INSERT-001",
    "user_id": 9999,
    "amount": 500.00,
    "fraud_probability": 0.10,
    "fraud_score": 10.0,
    "anomaly_score": 5.0,
    "rule_score": 5.0,
    "final_risk_score": 7.0,
    "risk_level": "LOW",
    "reasons": ["Test insert"]
}


response = (
    supabase
    .table("transactions")
    .insert(data)
    .execute()
)


print("INSERT SUCCESSFUL!")
print(response.data)