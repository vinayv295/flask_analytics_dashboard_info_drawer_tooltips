import pandas as pd


def read_data_file(file_path, file_type):
    if file_type == "csv":
        encodings = [
            "utf-8",
            "utf-8-sig",
            "cp1252",
            "latin-1"
        ]

        last_error = None

        for encoding in encodings:
            try:
                return pd.read_csv(
                    file_path,
                    encoding=encoding
                )
            except UnicodeDecodeError as error:
                last_error = error

        raise ValueError(
            "Could not read CSV file because its text encoding "
            "is not supported."
        ) from last_error

    elif file_type in ["xlsx", "xls"]:
        return pd.read_excel(file_path)

    else:
        raise ValueError(
            f"Unsupported file type: {file_type}"
        )


def get_data_summary(df):
    return {
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": list(df.columns),
        "data_types": {
            column: str(df[column].dtype)
            for column in df.columns
        },
        "missing_values": {
            column: int(df[column].isna().sum())
            for column in df.columns
        },
        "duplicate_rows": int(df.duplicated().sum())
    }


def clean_column_names(df):
    df = df.copy()

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_", regex=False)
        .str.replace("-", "_", regex=False)
    )

    return df


def remove_duplicates(df):
    df = df.copy()

    before = len(df)

    df = df.drop_duplicates()

    removed = before - len(df)

    return df, removed


def convert_date_columns(df):
    df = df.copy()

    date_columns = [
        "order_date",
        "ship_date"
    ]

    for column in date_columns:
        if column in df.columns:
            df[column] = pd.to_datetime(
                df[column],
                errors="coerce"
            )

    return df


def convert_numeric_columns(df):
    df = df.copy()

    numeric_columns = [
        "sales",
        "quantity",
        "discount",
        "profit"
    ]

    for column in numeric_columns:
        if column in df.columns:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )

    return df


def clean_dataset(df):
    cleaning_report = {}

    original_rows = len(df)

    df = clean_column_names(df)

    df, duplicates_removed = remove_duplicates(df)

    df = convert_date_columns(df)

    df = convert_numeric_columns(df)

    cleaning_report["original_rows"] = original_rows

    cleaning_report["final_rows"] = len(df)

    cleaning_report["duplicates_removed"] = duplicates_removed

    cleaning_report["missing_values"] = {
        column: int(df[column].isna().sum())
        for column in df.columns
    }

    return df, cleaning_report


def store_sales_data(df, dataset_id):
    from app import db
    from app.models.sales import SalesData

    records = []

    for _, row in df.iterrows():

        record = SalesData(
            dataset_id=dataset_id,

            order_id=(
                str(row.get("order_id"))
                if pd.notna(row.get("order_id"))
                else None
            ),

            order_date=(
                row.get("order_date")
                if pd.notna(row.get("order_date"))
                else None
            ),

            customer_name=(
                str(row.get("customer_name"))
                if pd.notna(row.get("customer_name"))
                else None
            ),

            segment=(
                str(row.get("segment"))
                if pd.notna(row.get("segment"))
                else None
            ),

            country=(
                str(row.get("country"))
                if pd.notna(row.get("country"))
                else None
            ),

            city=(
                str(row.get("city"))
                if pd.notna(row.get("city"))
                else None
            ),

            state=(
                str(row.get("state"))
                if pd.notna(row.get("state"))
                else None
            ),

            region=(
                str(row.get("region"))
                if pd.notna(row.get("region"))
                else None
            ),

            category=(
                str(row.get("category"))
                if pd.notna(row.get("category"))
                else None
            ),

            sub_category=(
                str(row.get("sub_category"))
                if pd.notna(row.get("sub_category"))
                else None
            ),

            product_name=(
                str(row.get("product_name"))
                if pd.notna(row.get("product_name"))
                else None
            ),

            sales=(
                float(row.get("sales"))
                if pd.notna(row.get("sales"))
                else None
            ),

            quantity=(
                int(row.get("quantity"))
                if pd.notna(row.get("quantity"))
                else None
            ),

            discount=(
                float(row.get("discount"))
                if pd.notna(row.get("discount"))
                else None
            ),

            profit=(
                float(row.get("profit"))
                if pd.notna(row.get("profit"))
                else None
            )
        )

        records.append(record)

    if records:
        db.session.bulk_save_objects(records)
        db.session.commit()

    return len(records)