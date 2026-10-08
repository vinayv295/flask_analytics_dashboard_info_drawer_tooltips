from flask import (
    Flask,
    render_template
)

from flask_sqlalchemy import SQLAlchemy

from config import Config


db = SQLAlchemy()


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)


    # =====================================================
    # DATABASE
    # =====================================================

    db.init_app(app)


    # =====================================================
    # IMPORT MODELS
    #
    # SQLAlchemy needs these models imported before
    # creating the database tables.
    # =====================================================

    from app.models import (
        Dataset,
        SalesData,
        UploadLog
    )


    # =====================================================
    # IMPORT EXISTING MAIN ROUTES
    #
    # DO NOT CHANGE THE EXISTING MAIN ROUTES.
    # =====================================================

    from app.routes.main import main


    # =====================================================
    # IMPORT DATASET DELETE ROUTES
    #
    # This is the only new route module.
    # =====================================================

    from app.routes.dataset_delete import (
        dataset_delete
    )


    # =====================================================
    # REGISTER EXISTING BLUEPRINT
    # =====================================================

    app.register_blueprint(
        main
    )


    # =====================================================
    # REGISTER DATASET DELETE BLUEPRINT
    # =====================================================

    app.register_blueprint(
        dataset_delete
    )


    # =====================================================
    # CREATE DATABASE TABLES
    # =====================================================

    with app.app_context():

        db.create_all()


    # =====================================================
    # 404 ERROR
    # =====================================================

    @app.errorhandler(404)
    def page_not_found(error):

        return (
            render_template(
                "404.html"
            ),
            404
        )


    # =====================================================
    # 413 ERROR
    # =====================================================

    @app.errorhandler(413)
    def request_entity_too_large(error):

        return (
            render_template(
                "413.html"
            ),
            413
        )


    # =====================================================
    # 500 ERROR
    # =====================================================

    @app.errorhandler(500)
    def internal_server_error(error):

        db.session.rollback()

        return (
            render_template(
                "500.html"
            ),
            500
        )


    return app