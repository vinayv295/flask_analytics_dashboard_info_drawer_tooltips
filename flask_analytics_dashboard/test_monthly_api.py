from app import create_app


app = create_app()


with app.test_client() as client:

    response = client.get(
        "/api/datasets/2/monthly-analysis"
    )

    print("STATUS CODE:")
    print(response.status_code)

    print("\nRESPONSE:")
    print(response.get_json())