from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing GET / ...")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print("  -> OK:", res.json())

    print("\nTesting GET /health ...")
    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print("  -> OK:", res.json())

    print("\nTesting GET /api/system/status ...")
    res = client.get("/api/system/status")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    print("  -> OK:", res.json())

    print("\nTesting GET /api/dashboard/stats ...")
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "total_transactions" in data
    assert "risk_distribution" in data
    assert "risk_trend" in data
    print(f"  -> OK: total={data['total_transactions']}, open_alerts={data['open_alerts']}, dist_len={len(data['risk_distribution'])}, trend_len={len(data['risk_trend'])}")

    print("\nTesting GET /api/dashboard/recent-transactions ...")
    res = client.get("/api/dashboard/recent-transactions?limit=5")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    txns = res.json()
    assert isinstance(txns, list)
    print(f"  -> OK: retrieved {len(txns)} transactions")

    print("\nTesting GET /api/transactions ...")
    res = client.get("/api/transactions?limit=10")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    txns = res.json()
    assert isinstance(txns, list)
    print(f"  -> OK: retrieved {len(txns)} transactions")
    
    sample_txn_id = txns[0]["transaction_id"] if txns else None

    if sample_txn_id:
        print(f"\nTesting GET /api/transactions/{sample_txn_id} ...")
        res = client.get(f"/api/transactions/{sample_txn_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        detail = res.json()
        assert "transaction_id" in detail
        assert "final_risk_score" in detail
        print(f"  -> OK: score={detail.get('final_risk_score')}, alert={bool(detail.get('alert'))}")

    print("\nTesting GET /api/alerts ...")
    res = client.get("/api/alerts?limit=5")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    alerts = res.json()
    assert isinstance(alerts, list)
    print(f"  -> OK: retrieved {len(alerts)} alerts")

    if alerts:
        sample_alert_id = alerts[0]["alert_id"]
        print(f"\nTesting GET /api/alerts/{sample_alert_id} ...")
        res = client.get(f"/api/alerts/{sample_alert_id}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print(f"  -> OK: alert={res.json().get('alert_id')}, status={res.json().get('status')}")

        print(f"\nTesting PATCH /api/alerts/{sample_alert_id}/acknowledge ...")
        res = client.patch(f"/api/alerts/{sample_alert_id}/acknowledge")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json().get("status") == "ACKNOWLEDGED"
        print(f"  -> OK: status acknowledged={res.json().get('status')}")

        print(f"\nTesting PATCH /api/alerts/{sample_alert_id}/resolve ...")
        res = client.patch(f"/api/alerts/{sample_alert_id}/resolve")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert res.json().get("status") == "RESOLVED"
        print(f"  -> OK: status resolved={res.json().get('status')}")

        # Reset back to OPEN
        from database import supabase
        supabase.table("alerts").update({"status": "OPEN"}).eq("alert_id", sample_alert_id).execute()

    print("\nTesting GET /api/analytics ...")
    res = client.get("/api/analytics")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    analytics = res.json()
    assert "total_transactions" in analytics
    assert "fraud_rate" in analytics
    assert "risk_distribution" in analytics
    assert "fraud_probability_distribution" in analytics
    assert "top_fraud_indicators" in analytics
    assert "top_shap_features" in analytics
    print(f"  -> OK: total={analytics['total_transactions']}, fraud_rate={analytics['fraud_rate']}, top_indicators={len(analytics['top_fraud_indicators'])}, top_shap={len(analytics['top_shap_features'])}")

    print("\nTesting POST /transactions/analyze (original endpoint) ...")
    test_payload = {
        "transaction_id": "TEST-INT-001",
        "user_id": 1234,
        "amount": 2500.0,
        "avg_user_amount": 1000.0,
        "amount_ratio": 2.5,
        "transactions_last_10min": 1,
        "new_device": 0,
        "new_location": 0,
        "international": 0,
        "merchant_risk": 2,
        "account_age_days": 100,
        "device_age_days": 50,
        "distance_from_home": 5.0,
        "failed_attempts_10min": 0,
        "hour": 14,
        "day_of_week": 2,
        "is_weekend": 0,
        "unusual_hour": 0
    }
    res = client.post("/transactions/analyze", json=test_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    analysis = res.json()
    assert "final_risk_score" in analysis
    assert "risk_level" in analysis
    print(f"  -> OK: risk_score={analysis['final_risk_score']}, risk_level={analysis['risk_level']}")

    print("\nALL API ENDPOINT TESTS PASSED SUCCESSFULLY! ALL DATA WIRED CORRECTLY!")

if __name__ == "__main__":
    test_endpoints()
