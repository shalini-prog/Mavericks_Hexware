import pandas as pd
import joblib

from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score
)


# ---------------------------------------------
# 1. LOAD DATA
# ---------------------------------------------

DATA_PATH = "data/fraud_transactions.csv"

df = pd.read_csv(DATA_PATH)

print("Dataset loaded!")
print("Shape:", df.shape)


# ---------------------------------------------
# 2. REMOVE NON-ML COLUMNS
# ---------------------------------------------

# transaction_id and user_id are identifiers.
# They should not be used as predictive features.

X = df.drop(
    columns=[
        "transaction_id",
        "user_id",
        "is_fraud"
    ]
)

y = df["is_fraud"]


print("\nFeatures used by model:")
print(X.columns.tolist())


# ---------------------------------------------
# 3. TRAIN / TEST SPLIT
# ---------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ---------------------------------------------
# 4. CREATE XGBOOST MODEL
# ---------------------------------------------

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    scale_pos_weight=10,
    random_state=42,
    n_jobs=-1
)


# ---------------------------------------------
# 5. TRAIN
# ---------------------------------------------

print("\nTraining XGBoost model...")

model.fit(
    X_train,
    y_train
)

print("Training completed!")


# ---------------------------------------------
# 6. PREDICTIONS
# ---------------------------------------------

y_probability = model.predict_proba(X_test)[:, 1]

y_prediction = (
    y_probability >= 0.5
).astype(int)


# ---------------------------------------------
# 7. EVALUATION
# ---------------------------------------------

print("\n========================================")
print("MODEL EVALUATION")
print("========================================")

print(
    "\nROC-AUC:",
    round(
        roc_auc_score(
            y_test,
            y_probability
        ),
        4
    )
)

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_prediction
    )
)

print("\nConfusion Matrix:")

print(
    confusion_matrix(
        y_test,
        y_prediction
    )
)


# ---------------------------------------------
# 8. SAVE MODEL
# ---------------------------------------------

MODEL_PATH = "models/fraud_model.joblib"

joblib.dump(
    model,
    MODEL_PATH
)

print("\n========================================")
print("Model saved successfully!")
print("========================================")
print("Location:", MODEL_PATH)