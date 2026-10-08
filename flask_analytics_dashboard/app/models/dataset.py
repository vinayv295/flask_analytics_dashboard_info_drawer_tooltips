from datetime import datetime

from app import db


class Dataset(db.Model):

    __tablename__ = "datasets"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    file_name = db.Column(
        db.String(255),
        nullable=False
    )

    file_type = db.Column(
        db.String(20),
        nullable=False
    )

    row_count = db.Column(
        db.Integer,
        default=0
    )

    status = db.Column(
        db.String(50),
        default="uploaded"
    )

    uploaded_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )