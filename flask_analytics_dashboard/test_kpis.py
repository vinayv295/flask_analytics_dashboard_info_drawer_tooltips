from app import create_app
from app.services.analytics_service import get_kpis


app = create_app()


with app.app_context():

    dataset_id = 2

    kpis = get_kpis(dataset_id)

    print("\nKPI RESULTS")
    print("-" * 30)

    for name, value in kpis.items():
        print(f"{name}: {value}")