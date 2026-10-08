from app import db


class SalesData(db.Model):

    __tablename__ = "sales_data"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    dataset_id = db.Column(
        db.Integer,
        db.ForeignKey("datasets.id"),
        nullable=False
    )

    order_id = db.Column(
        db.String(100)
    )

    order_date = db.Column(
        db.Date
    )

    customer_name = db.Column(
        db.String(255)
    )

    segment = db.Column(
        db.String(100)
    )

    country = db.Column(
        db.String(100)
    )

    city = db.Column(
        db.String(100)
    )

    state = db.Column(
        db.String(100)
    )

    region = db.Column(
        db.String(100)
    )

    category = db.Column(
        db.String(100)
    )

    sub_category = db.Column(
        db.String(100)
    )

    product_name = db.Column(
        db.String(500)
    )

    sales = db.Column(
        db.Float
    )

    quantity = db.Column(
        db.Integer
    )

    discount = db.Column(
        db.Float
    )

    profit = db.Column(
        db.Float
    )