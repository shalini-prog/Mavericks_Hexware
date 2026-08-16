from pydantic import BaseModel


class TransactionRequest(BaseModel):

    transaction_id: str

    user_id: int

    amount: float

    avg_user_amount: float

    amount_ratio: float

    transactions_last_10min: int

    new_device: int

    new_location: int

    international: int

    merchant_risk: int

    account_age_days: int

    device_age_days: int

    distance_from_home: float

    failed_attempts_10min: int

    hour: int

    day_of_week: int

    is_weekend: int

    unusual_hour: int