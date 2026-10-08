import os


class Config:

    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "analytics-dashboard-secret-key"
    )

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:vinayvsnv@localhost:3306/flask_analytics"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # -----------------------------------------------------
    # Upload configuration
    # -----------------------------------------------------

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024