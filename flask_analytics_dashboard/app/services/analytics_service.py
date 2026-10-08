from datetime import datetime

from sqlalchemy import func, distinct

from app import db
from app.models.sales import SalesData


# ============================================================
# FILTER HELPERS
# ============================================================

def _get_filter_value(filters, key):
    """
    Safely get a scalar filter value.

    The previous implementation was allowing a dictionary to
    reach SQLAlchemy/PyMySQL. This helper guarantees that the
    value used in a SQL condition is a simple scalar.
    """

    if not filters:
        return None

    if not isinstance(filters, dict):
        return None

    value = filters.get(key)

    if isinstance(value, dict):
        # Defensive support if something like
        # {"value": "..."} is accidentally supplied.
        value = value.get("value")

    if value in ("", None, "all", "All", "ALL"):
        return None

    return value


def _parse_date(value):
    """
    Convert YYYY-MM-DD text to a Python date.
    """
    if not value:
        return None

    if hasattr(value, "year"):
        return value

    try:
        return datetime.strptime(
            str(value),
            "%Y-%m-%d"
        ).date()
    except (ValueError, TypeError):
        return None


def build_filters(dataset_id, filters=None):
    """
    Build SQLAlchemy filter expressions.

    IMPORTANT:
    This returns a LIST of SQLAlchemy expressions.
    It never passes the filters dictionary itself to MySQL.
    """

    conditions = [
        SalesData.dataset_id == int(dataset_id)
    ]

    start_date = _parse_date(
        _get_filter_value(filters, "start_date")
    )

    end_date = _parse_date(
        _get_filter_value(filters, "end_date")
    )

    category = _get_filter_value(
        filters,
        "category"
    )

    region = _get_filter_value(
        filters,
        "region"
    )

    if start_date:
        conditions.append(
            SalesData.order_date >= start_date
        )

    if end_date:
        conditions.append(
            SalesData.order_date <= end_date
        )

    if category:
        conditions.append(
            SalesData.category == str(category)
        )

    if region:
        conditions.append(
            SalesData.region == str(region)
        )

    return conditions


def _filtered_query(dataset_id, filters=None):
    """
    Return a SalesData query with safe filters applied.
    """

    conditions = build_filters(
        dataset_id,
        filters
    )

    return SalesData.query.filter(*conditions)


# ============================================================
# KPI ANALYTICS
# ============================================================

def get_kpis(dataset_id, filters=None):

    query = _filtered_query(
        dataset_id,
        filters
    )

    result = query.with_entities(
        func.coalesce(
            func.sum(SalesData.sales),
            0
        ).label("total_sales"),

        func.coalesce(
            func.sum(SalesData.profit),
            0
        ).label("total_profit"),

        func.count(
            distinct(SalesData.order_id)
        ).label("total_orders"),

        func.coalesce(
            func.sum(SalesData.quantity),
            0
        ).label("units_sold"),

        func.coalesce(
            func.avg(SalesData.discount),
            0
        ).label("average_discount")
    ).first()

    total_sales = float(
        result.total_sales or 0
    )

    total_profit = float(
        result.total_profit or 0
    )

    total_orders = int(
        result.total_orders or 0
    )

    units_sold = int(
        result.units_sold or 0
    )

    average_discount = float(
        result.average_discount or 0
    )

    if total_sales:
        profit_margin = (
            total_profit /
            total_sales
        ) * 100
    else:
        profit_margin = 0

    if total_orders:
        average_order_value = (
            total_sales /
            total_orders
        )
    else:
        average_order_value = 0

    return {
        "total_sales": round(
            total_sales,
            2
        ),

        "total_profit": round(
            total_profit,
            2
        ),

        "total_orders": total_orders,

        "units_sold": units_sold,

        "profit_margin": round(
            profit_margin,
            2
        ),

        "average_order_value": round(
            average_order_value,
            2
        ),

        "average_discount": round(
            average_discount,
            4
        )
    }


# ============================================================
# FILTER OPTIONS
# ============================================================

def get_filter_options(dataset_id):

    categories = (
        SalesData.query
        .with_entities(
            SalesData.category
        )
        .filter(
            SalesData.dataset_id == int(dataset_id),
            SalesData.category.isnot(None),
            SalesData.category != ""
        )
        .distinct()
        .order_by(
            SalesData.category
        )
        .all()
    )

    regions = (
        SalesData.query
        .with_entities(
            SalesData.region
        )
        .filter(
            SalesData.dataset_id == int(dataset_id),
            SalesData.region.isnot(None),
            SalesData.region != ""
        )
        .distinct()
        .order_by(
            SalesData.region
        )
        .all()
    )

    return {
        "categories": [
            row[0]
            for row in categories
        ],
        "regions": [
            row[0]
            for row in regions
        ]
    }


# ============================================================
# CATEGORY ANALYSIS
# ============================================================

def get_category_analysis(
    dataset_id,
    filters=None
):

    query = _filtered_query(
        dataset_id,
        filters
    )

    rows = (
        query
        .with_entities(
            SalesData.category.label(
                "category"
            ),

            func.coalesce(
                func.sum(
                    SalesData.sales
                ),
                0
            ).label("sales"),

            func.coalesce(
                func.sum(
                    SalesData.profit
                ),
                0
            ).label("profit")
        )
        .filter(
            SalesData.category.isnot(None),
            SalesData.category != ""
        )
        .group_by(
            SalesData.category
        )
        .order_by(
            func.sum(
                SalesData.sales
            ).desc()
        )
        .all()
    )

    return [
        {
            "category": row.category,
            "sales": round(
                float(row.sales or 0),
                2
            ),
            "profit": round(
                float(row.profit or 0),
                2
            )
        }
        for row in rows
    ]


# ============================================================
# REGION ANALYSIS
# ============================================================

def get_region_analysis(
    dataset_id,
    filters=None
):

    query = _filtered_query(
        dataset_id,
        filters
    )

    rows = (
        query
        .with_entities(
            SalesData.region.label(
                "region"
            ),

            func.coalesce(
                func.sum(
                    SalesData.sales
                ),
                0
            ).label("sales"),

            func.coalesce(
                func.sum(
                    SalesData.profit
                ),
                0
            ).label("profit")
        )
        .filter(
            SalesData.region.isnot(None),
            SalesData.region != ""
        )
        .group_by(
            SalesData.region
        )
        .order_by(
            func.sum(
                SalesData.sales
            ).desc()
        )
        .all()
    )

    return [
        {
            "region": row.region,
            "sales": round(
                float(row.sales or 0),
                2
            ),
            "profit": round(
                float(row.profit or 0),
                2
            )
        }
        for row in rows
    ]


# ============================================================
# MONTHLY ANALYSIS
# ============================================================

def get_monthly_analysis(
    dataset_id,
    filters=None
):

    query = _filtered_query(
        dataset_id,
        filters
    )

    month_expression = func.date_format(
        SalesData.order_date,
        "%Y-%m"
    )

    rows = (
        query
        .with_entities(
            month_expression.label(
                "month"
            ),

            func.coalesce(
                func.sum(
                    SalesData.sales
                ),
                0
            ).label("sales"),

            func.coalesce(
                func.sum(
                    SalesData.profit
                ),
                0
            ).label("profit")
        )
        .filter(
            SalesData.order_date.isnot(None)
        )
        .group_by(
            month_expression
        )
        .order_by(
            month_expression
        )
        .all()
    )

    return [
        {
            "month": row.month,
            "sales": round(
                float(row.sales or 0),
                2
            ),
            "profit": round(
                float(row.profit or 0),
                2
            )
        }
        for row in rows
    ]


# ============================================================
# PRODUCT ANALYSIS
# ============================================================

def get_top_products(
    dataset_id,
    filters=None,
    limit=10
):

    query = _filtered_query(
        dataset_id,
        filters
    )

    rows = (
        query
        .with_entities(
            SalesData.product_name.label(
                "product_name"
            ),

            func.coalesce(
                func.sum(
                    SalesData.sales
                ),
                0
            ).label("sales"),

            func.coalesce(
                func.sum(
                    SalesData.profit
                ),
                0
            ).label("profit")
        )
        .filter(
            SalesData.product_name.isnot(None),
            SalesData.product_name != ""
        )
        .group_by(
            SalesData.product_name
        )
        .order_by(
            func.sum(
                SalesData.sales
            ).desc()
        )
        .limit(int(limit))
        .all()
    )

    return [
        {
            "product_name": row.product_name,
            "sales": round(
                float(row.sales or 0),
                2
            ),
            "profit": round(
                float(row.profit or 0),
                2
            )
        }
        for row in rows
    ]


def get_bottom_products(
    dataset_id,
    filters=None,
    limit=10
):

    query = _filtered_query(
        dataset_id,
        filters
    )

    rows = (
        query
        .with_entities(
            SalesData.product_name.label(
                "product_name"
            ),

            func.coalesce(
                func.sum(
                    SalesData.sales
                ),
                0
            ).label("sales"),

            func.coalesce(
                func.sum(
                    SalesData.profit
                ),
                0
            ).label("profit")
        )
        .filter(
            SalesData.product_name.isnot(None),
            SalesData.product_name != ""
        )
        .group_by(
            SalesData.product_name
        )
        .order_by(
            func.sum(
                SalesData.sales
            ).asc()
        )
        .limit(int(limit))
        .all()
    )

    return [
        {
            "product_name": row.product_name,
            "sales": round(
                float(row.sales or 0),
                2
            ),
            "profit": round(
                float(row.profit or 0),
                2
            )
        }
        for row in rows
    ]


# ============================================================
# AUTOMATIC INSIGHTS
# ============================================================

def get_automatic_insights(
    dataset_id,
    filters=None
):

    kpis = get_kpis(
        dataset_id,
        filters
    )

    categories = get_category_analysis(
        dataset_id,
        filters
    )

    monthly = get_monthly_analysis(
        dataset_id,
        filters
    )

    insights = []

    total_sales = kpis["total_sales"]
    total_profit = kpis["total_profit"]
    profit_margin = kpis["profit_margin"]
    total_orders = kpis["total_orders"]
    units_sold = kpis["units_sold"]
    average_order_value = kpis[
        "average_order_value"
    ]

    if total_sales > 0:
        insights.append(
            f"Total sales are "
            f"₹{total_sales:,.2f}."
        )

    if total_profit >= 0:
        insights.append(
            f"The business generated "
            f"₹{total_profit:,.2f} in profit."
        )
    else:
        insights.append(
            f"The business recorded a loss "
            f"of ₹{abs(total_profit):,.2f}."
        )

    if total_sales > 0:
        insights.append(
            f"Profit margin is "
            f"{profit_margin:.2f}%."
        )

    if total_orders > 0:
        insights.append(
            f"There are "
            f"{total_orders:,} unique orders "
            f"with an average order value of "
            f"₹{average_order_value:,.2f}."
        )

    if units_sold > 0:
        insights.append(
            f"Total units sold: "
            f"{units_sold:,}."
        )

    if categories:
        top_category = categories[0]

        insights.append(
            f"The strongest category by sales "
            f"is {top_category['category']} "
            f"with ₹{top_category['sales']:,.2f}."
        )

    if monthly:
        best_month = max(
            monthly,
            key=lambda item: item["sales"]
        )

        insights.append(
            f"The best sales month is "
            f"{best_month['month']} with "
            f"₹{best_month['sales']:,.2f}."
        )

    return insights