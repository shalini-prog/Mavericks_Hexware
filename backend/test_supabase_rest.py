import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

endpoint = f"{url}/rest/v1/transactions"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

data = {
    "transaction_id": "REST-TEST-001",
    "user_id": 9999,
    "amount": 500.0,
    "fraud_probability": 0.10,
    "fraud_score": 10.0,
    "anomaly_score": 5.0,
    "rule_score": 5.0,
    "final_risk_score": 7.0,
    "risk_level": "LOW",
    "reasons": ["REST connection test"]
}

response = requests.post(
    endpoint,
    headers=headers,
    json=data,
    timeout=20
)

print("Status:", response.status_code)
print("Response:", response.text)