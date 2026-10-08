import pytest

from app import create_app


@pytest.fixture
def app():

    app = create_app()

    app.config.update(
        TESTING=True
    )

    return app


@pytest.fixture
def client(app):

    return app.test_client()


# =========================================================
# Dashboard Test
# =========================================================

def test_dashboard(client):

    response = client.get("/")

    assert response.status_code == 200


# =========================================================
# Database Test
# =========================================================

def test_database_connection(client):

    response = client.get(
        "/db-test"
    )

    assert response.status_code == 200

    assert (
        b"Database connection successful"
        in response.data
    )


# =========================================================
# Reports Page Test
# =========================================================

def test_reports_page(client):

    response = client.get(
        "/reports"
    )

    assert response.status_code == 200


# =========================================================
# Upload Page Test
# =========================================================

def test_upload_page(client):

    response = client.get(
        "/upload"
    )

    assert response.status_code == 200


# =========================================================
# Datasets Page Test
# =========================================================

def test_datasets_page(client):

    response = client.get(
        "/datasets"
    )

    assert response.status_code == 200


# =========================================================
# 404 Test
# =========================================================

def test_404_page(client):

    response = client.get(
        "/this-page-does-not-exist"
    )

    assert response.status_code == 404

    assert (
        b"Page Not Found"
        in response.data
    )


# =========================================================
# Invalid Dataset Test
# =========================================================

def test_invalid_dataset(client):

    response = client.get(
        "/reports/999999"
    )

    assert response.status_code == 404


# =========================================================
# Invalid Preview Test
# =========================================================

def test_invalid_preview(client):

    response = client.get(
        "/datasets/999999/preview"
    )

    assert response.status_code == 404


# =========================================================
# Invalid KPI Dataset Test
# =========================================================

def test_invalid_kpi_dataset(client):

    response = client.get(
        "/api/datasets/999999/kpis"
    )

    assert response.status_code == 404


# =========================================================
# Invalid Insights Dataset Test
# =========================================================

def test_invalid_insights_dataset(client):

    response = client.get(
        "/api/datasets/999999/insights"
    )

    assert response.status_code == 404