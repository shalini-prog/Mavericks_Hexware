import numpy as np
import pandas as pd

# Reproducible results
np.random.seed(42)

# Number of transactions
N = 50000

# --------------------------------------------------
# BASIC TRANSACTION INFORMATION
# --------------------------------------------------

transaction_id = [f"TXN{100000 + i}" for i in range(N)]

user_id = np.random.randint(1000, 11000, N)

# Transaction amount
amount = np.round(np.random.lognormal(mean=6.0, sigma=1.0, size=N), 2)

# Keep amounts realistic
amount = np.clip(amount, 50, 250000)

# User's normal transaction amount
avg_user_amount = np.round(
    np.random.lognormal(mean=5.5, sigma=0.6, size=N),
    2
)

avg_user_amount = np.clip(avg_user_amount, 100, 50000)

# How unusual is this transaction?
amount_ratio = amount / avg_user_amount

# --------------------------------------------------
# TRANSACTION BEHAVIOR
# --------------------------------------------------

# Number of transactions made by this user
# within the last 10 minutes
transactions_last_10min = np.random.poisson(
    lam=2,
    size=N
)

transactions_last_10min = np.clip(
    transactions_last_10min,
    0,
    20
)

# New device?
new_device = np.random.binomial(
    1,
    0.08,
    N
)

# New location?
new_location = np.random.binomial(
    1,
    0.07,
    N
)

# International transaction?
international = np.random.binomial(
    1,
    0.12,
    N
)

# --------------------------------------------------
# MERCHANT
# --------------------------------------------------

# Merchant risk score from 0-10
merchant_risk = np.random.randint(
    0,
    11,
    N
)

# --------------------------------------------------
# ACCOUNT INFORMATION
# --------------------------------------------------

account_age_days = np.random.randint(
    10,
    3000,
    N
)

# Device age
device_age_days = np.random.randint(
    1,
    1500,
    N
)

# Distance from user's normal location
distance_from_home = np.random.exponential(
    scale=20,
    size=N
)

distance_from_home = np.clip(
    distance_from_home,
    0,
    5000
)

# Failed transactions in recent period
failed_attempts_10min = np.random.poisson(
    lam=0.5,
    size=N
)

failed_attempts_10min = np.clip(
    failed_attempts_10min,
    0,
    10
)

# --------------------------------------------------
# TIME INFORMATION
# --------------------------------------------------

hour = np.random.randint(
    0,
    24,
    N
)

day_of_week = np.random.randint(
    0,
    7,
    N
)

is_weekend = (day_of_week >= 5).astype(int)

# Transactions during unusual hours
unusual_hour = (
    (hour <= 5) |
    (hour >= 23)
).astype(int)

# --------------------------------------------------
# CREATE A FRAUD RISK SIGNAL
# --------------------------------------------------

risk = np.zeros(N)

# Large amount compared with user's normal behavior
risk += np.where(amount_ratio > 5, 2.5, 0)
risk += np.where(amount_ratio > 10, 2.0, 0)

# High transaction velocity
risk += np.where(
    transactions_last_10min >= 5,
    2.0,
    0
)

risk += np.where(
    transactions_last_10min >= 10,
    2.0,
    0
)

# New device
risk += new_device * 1.8

# New location
risk += new_location * 1.8

# International transaction
risk += international * 1.2

# Merchant risk
risk += merchant_risk * 0.25

# Very large distance
risk += np.where(
    distance_from_home > 500,
    1.5,
    0
)

# Failed attempts
risk += failed_attempts_10min * 0.7

# Unusual transaction time
risk += unusual_hour * 0.8

# New account + suspicious transaction
risk += np.where(
    (account_age_days < 60) &
    (amount_ratio > 5),
    2.0,
    0
)

# --------------------------------------------------
# ADD RANDOMNESS
# --------------------------------------------------

risk += np.random.normal(
    0,
    1.5,
    N
)

# Convert risk to probability
fraud_probability = 1 / (
    1 + np.exp(-(
        risk - 7
    ))
)

# Generate final fraud label
is_fraud = np.random.binomial(
    1,
    fraud_probability
)

# --------------------------------------------------
# CREATE DATAFRAME
# --------------------------------------------------

df = pd.DataFrame({

    "transaction_id": transaction_id,

    "user_id": user_id,

    "amount": amount,

    "avg_user_amount": avg_user_amount,

    "amount_ratio": amount_ratio,

    "transactions_last_10min": transactions_last_10min,

    "new_device": new_device,

    "new_location": new_location,

    "international": international,

    "merchant_risk": merchant_risk,

    "account_age_days": account_age_days,

    "device_age_days": device_age_days,

    "distance_from_home": np.round(
        distance_from_home,
        2
    ),

    "failed_attempts_10min": failed_attempts_10min,

    "hour": hour,

    "day_of_week": day_of_week,

    "is_weekend": is_weekend,

    "unusual_hour": unusual_hour,

    "is_fraud": is_fraud
})

# --------------------------------------------------
# SAVE DATASET
# --------------------------------------------------

output_path = "data/fraud_transactions.csv"

df.to_csv(
    output_path,
    index=False
)

# --------------------------------------------------
# DISPLAY INFORMATION
# --------------------------------------------------

print("\n========================================")
print("Fraud Dataset Generated Successfully!")
print("========================================")

print(f"\nTotal transactions: {len(df)}")

print(
    f"Fraud transactions: "
    f"{df['is_fraud'].sum()}"
)

print(
    f"Legitimate transactions: "
    f"{(df['is_fraud'] == 0).sum()}"
)

print(
    f"Fraud percentage: "
    f"{df['is_fraud'].mean() * 100:.2f}%"
)

print("\nDataset columns:")
print(df.columns.tolist())

print("\nFirst 5 transactions:")
print(df.head())

print(
    f"\nDataset saved to: {output_path}"
)
