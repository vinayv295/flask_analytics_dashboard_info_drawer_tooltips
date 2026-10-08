import pandas as pd

from app.services.data_service import clean_dataset


data = {
    "Order ID": [1001, 1002, 1002],
    "Order Date": [
        "2025-01-01",
        "2025-01-02",
        "2025-01-02"
    ],
    "Sales": [
        "1000",
        "500",
        "500"
    ],
    "Quantity": [
        "2",
        "3",
        "3"
    ],
    "Profit": [
        "200",
        "50",
        "50"
    ]
}


df = pd.DataFrame(data)

print("BEFORE CLEANING")
print(df)
print()


cleaned_df, report = clean_dataset(df)


print("AFTER CLEANING")
print(cleaned_df)
print()


print("CLEANING REPORT")
print(report)