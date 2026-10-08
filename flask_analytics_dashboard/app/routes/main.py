import os

import pandas as pd
from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    jsonify,
    current_app,
)
from werkzeug.utils import secure_filename

from app import db
from app.models.dataset import Dataset
from app.models.sales import SalesData
from app.models.upload_log import UploadLog

from app.services.data_service import (
    read_data_file,
    clean_dataset,
    get_data_summary,
    store_sales_data,
)

from app.services.analytics_service import (
    get_kpis,
    get_filter_options,
    get_category_analysis,
    get_region_analysis,
    get_monthly_analysis,
    get_top_products,
    get_bottom_products,
    get_automatic_insights,
)


main = Blueprint("main", __name__)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def allowed_file(filename):
    """Check whether uploaded file has an allowed extension."""
    if not filename:
        return False

    allowed_extensions = {"csv", "xlsx", "xls"}

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in allowed_extensions
    )


def get_dataset_or_404(dataset_id):
    """
    Safely get a dataset.

    db.session.get() is preferred over the older Query.get()
    method.
    """
    dataset = db.session.get(Dataset, dataset_id)

    if dataset is None:
        return None

    return dataset


def get_filters():
    """Read dashboard filter values from the URL."""
    return {
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "category": request.args.get("category"),
        "region": request.args.get("region"),
    }


def serialize_preview_row(row):
    """
    Convert a SalesData database row into a normal dictionary
    that can safely be sent to the template.
    """

    return {
        "id": row.id,
        "order_id": row.order_id,
        "order_date": (
            row.order_date.strftime("%Y-%m-%d")
            if row.order_date
            else ""
        ),
        "customer_name": row.customer_name,
        "segment": row.segment,
        "country": row.country,
        "city": row.city,
        "state": row.state,
        "region": row.region,
        "category": row.category,
        "sub_category": row.sub_category,
        "product_name": row.product_name,
        "sales": row.sales,
        "quantity": row.quantity,
        "discount": row.discount,
        "profit": row.profit,
    }


# ============================================================
# HOME / DASHBOARD
# ============================================================

@main.route("/")
def dashboard():
    datasets = (
        Dataset.query
        .filter(Dataset.status == "processed")
        .order_by(Dataset.uploaded_at.desc())
        .all()
    )

    return render_template(
        "dashboard.html",
        datasets=datasets
    )


# ============================================================
# DATABASE TEST
# ============================================================

@main.route("/db-test")
def db_test():
    try:
        db.session.execute(db.text("SELECT 1"))

        return """
        <h2>Database connection successful</h2>
        <p>MySQL connection is working correctly.</p>
        """

    except Exception as error:
        db.session.rollback()

        return f"""
        <h2>Database connection failed</h2>
        <p>{error}</p>
        """, 500


# ============================================================
# UPLOAD
# ============================================================

@main.route("/upload", methods=["GET", "POST"])
def upload():

    if request.method == "GET":
        return render_template("upload.html")

    uploaded_file = request.files.get("file")

    if uploaded_file is None:
        flash("Please select a file.", "error")
        return redirect(url_for("main.upload"))

    if uploaded_file.filename == "":
        flash("Please select a file.", "error")
        return redirect(url_for("main.upload"))

    if not allowed_file(uploaded_file.filename):
        flash(
            "Only CSV, XLSX and XLS files are supported.",
            "error"
        )
        return redirect(url_for("main.upload"))

    original_filename = secure_filename(
        uploaded_file.filename
    )

    file_extension = (
        original_filename.rsplit(".", 1)[1].lower()
    )

    upload_folder = os.path.join(
        current_app.root_path,
        "..",
        "uploads"
    )

    upload_folder = os.path.abspath(upload_folder)

    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(
        upload_folder,
        original_filename
    )

    try:
        # ----------------------------------------------------
        # Save uploaded file
        # ----------------------------------------------------

        uploaded_file.save(file_path)

        # ----------------------------------------------------
        # Create dataset record
        # ----------------------------------------------------

        dataset = Dataset(
            file_name=original_filename,
            file_type=file_extension,
            row_count=0,
            status="processing",
        )

        db.session.add(dataset)
        db.session.commit()

        # ----------------------------------------------------
        # Upload log
        # ----------------------------------------------------

        db.session.add(
            UploadLog(
                dataset_id=dataset.id,
                stage="upload",
                message="File uploaded successfully."
            )
        )

        db.session.commit()

        # ----------------------------------------------------
        # Read file
        # ----------------------------------------------------

        df = read_data_file(
            file_path,
            file_extension
        )

        # ----------------------------------------------------
        # Cleaning
        # ----------------------------------------------------

        cleaned_df, cleaning_report = clean_dataset(df)

        # ----------------------------------------------------
        # Store data
        # ----------------------------------------------------

        inserted_rows = store_sales_data(
            cleaned_df,
            dataset.id
        )

        # ----------------------------------------------------
        # Update dataset
        # ----------------------------------------------------

        dataset.row_count = inserted_rows
        dataset.status = "processed"

        db.session.add(
            UploadLog(
                dataset_id=dataset.id,
                stage="cleaning",
                message=(
                    f"Original rows: "
                    f"{cleaning_report['original_rows']}; "
                    f"Final rows: "
                    f"{cleaning_report['final_rows']}; "
                    f"Duplicates removed: "
                    f"{cleaning_report['duplicates_removed']}"
                )
            )
        )

        db.session.add(
            UploadLog(
                dataset_id=dataset.id,
                stage="storage",
                message=(
                    f"{inserted_rows} rows stored in MySQL."
                )
            )
        )

        db.session.commit()

        flash(
            "File uploaded and processed successfully.",
            "success"
        )

        return redirect(
            url_for(
                "main.preview_dataset",
                dataset_id=dataset.id
            )
        )

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Upload failed"
        )

        # If dataset was created before the error,
        # mark it as failed.
        try:
            if "dataset" in locals() and dataset.id:

                failed_dataset = db.session.get(
                    Dataset,
                    dataset.id
                )

                if failed_dataset:
                    failed_dataset.status = "failed"

                    db.session.add(
                        UploadLog(
                            dataset_id=failed_dataset.id,
                            stage="error",
                            message=str(error)
                        )
                    )

                    db.session.commit()

        except Exception:
            db.session.rollback()

        flash(
            f"Upload failed: {error}",
            "error"
        )

        return redirect(
            url_for("main.upload")
        )


# ============================================================
# DATASETS
# ============================================================

@main.route("/datasets")
def datasets():

    datasets_list = (
        Dataset.query
        .order_by(Dataset.uploaded_at.desc())
        .all()
    )

    return render_template(
        "datasets.html",
        datasets=datasets_list
    )


# ============================================================
# DATASET PREVIEW
# ============================================================

@main.route("/datasets/<int:dataset_id>/preview")
def preview_dataset(dataset_id):

    # --------------------------------------------------------
    # 1. Get dataset
    # --------------------------------------------------------

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return render_template(
            "404.html"
        ), 404

    # --------------------------------------------------------
    # 2. Get preview rows
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # We query SalesData directly using dataset_id.
    #
    # We do NOT use:
    # dataset.sales_data
    #
    # because Dataset currently does not define a SQLAlchemy
    # relationship called sales_data.
    #
    # --------------------------------------------------------

    preview_records = (
        SalesData.query
        .filter(
            SalesData.dataset_id == dataset.id
        )
        .order_by(
            SalesData.id.asc()
        )
        .limit(20)
        .all()
    )

    # --------------------------------------------------------
    # 3. Convert database rows into dictionaries
    # --------------------------------------------------------

    preview_rows = [
        serialize_preview_row(row)
        for row in preview_records
    ]

    # --------------------------------------------------------
    # 4. Calculate preview statistics
    # --------------------------------------------------------

    total_rows = (
        SalesData.query
        .filter(
            SalesData.dataset_id == dataset.id
        )
        .count()
    )

    total_sales = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(SalesData.sales),
                0
            )
        )
        .filter(
            SalesData.dataset_id == dataset.id
        )
        .scalar()
    )

    total_profit = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(SalesData.profit),
                0
            )
        )
        .filter(
            SalesData.dataset_id == dataset.id
        )
        .scalar()
    )

    # --------------------------------------------------------
    # 5. Preview summary
    # --------------------------------------------------------

    summary = {
        "row_count": total_rows,
        "column_count": 15,
        "total_sales": float(total_sales or 0),
        "total_profit": float(total_profit or 0),
    }

    # --------------------------------------------------------
    # 6. Render preview page
    # --------------------------------------------------------

    return render_template(
        "preview.html",
        dataset=dataset,
        preview_rows=preview_rows,
        rows=preview_rows,
        summary=summary,
    )


# ============================================================
# KPI API
# ============================================================

@main.route("/api/datasets/<int:dataset_id>/kpis")
def api_kpis(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_kpis(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "KPI API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# FILTER OPTIONS API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/filter-options"
)
def api_filter_options(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        data = get_filter_options(
            dataset_id
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Filter options API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# CATEGORY API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/category-analysis"
)
def api_category_analysis(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_category_analysis(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Category analysis API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# REGION API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/region-analysis"
)
def api_region_analysis(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_region_analysis(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Region analysis API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# MONTHLY API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/monthly-analysis"
)
def api_monthly_analysis(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_monthly_analysis(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Monthly analysis API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# TOP PRODUCTS API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/top-products"
)
def api_top_products(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_top_products(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Top products API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# BOTTOM PRODUCTS API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/bottom-products"
)
def api_bottom_products(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_bottom_products(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Bottom products API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# AUTOMATIC INSIGHTS API
# ============================================================

@main.route(
    "/api/datasets/<int:dataset_id>/insights"
)
def api_insights(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return jsonify({
            "error": "Dataset not found"
        }), 404

    try:

        filters = get_filters()

        data = get_automatic_insights(
            dataset_id,
            filters
        )

        return jsonify({
            "data": data
        })

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Insights API error"
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# REPORTS
# ============================================================

@main.route("/reports")
def reports():

    datasets = (
        Dataset.query
        .filter(Dataset.status == "processed")
        .order_by(Dataset.uploaded_at.desc())
        .all()
    )

    return render_template(
        "reports.html",
        datasets=datasets
    )


# ============================================================
# SINGLE REPORT
# ============================================================

@main.route("/reports/<int:dataset_id>")
def report(dataset_id):

    dataset = get_dataset_or_404(dataset_id)

    if dataset is None:
        return render_template(
            "404.html"
        ), 404

    filters = get_filters()

    try:

        kpis = get_kpis(
            dataset_id,
            filters
        )

        category_data = get_category_analysis(
            dataset_id,
            filters
        )

        region_data = get_region_analysis(
            dataset_id,
            filters
        )

        monthly_data = get_monthly_analysis(
            dataset_id,
            filters
        )

        top_products = get_top_products(
            dataset_id,
            filters
        )

        bottom_products = get_bottom_products(
            dataset_id,
            filters
        )

        insights = get_automatic_insights(
            dataset_id,
            filters
        )

        return render_template(
            "report.html",
            dataset=dataset,
            filters=filters,
            kpis=kpis,
            category_data=category_data,
            region_data=region_data,
            monthly_data=monthly_data,
            top_products=top_products,
            bottom_products=bottom_products,
            insights=insights,
        )

    except Exception as error:

        db.session.rollback()

        current_app.logger.exception(
            "Report error"
        )

        flash(
            f"Could not generate report: {error}",
            "error"
        )

        return redirect(
            url_for("main.reports")
        )