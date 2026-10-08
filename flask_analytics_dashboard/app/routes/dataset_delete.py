import os

from flask import (
    Blueprint,
    redirect,
    url_for,
    flash,
    current_app,
)

from app import db

from app.models.dataset import Dataset
from app.models.sales import SalesData
from app.models.upload_log import UploadLog


dataset_delete = Blueprint(
    "dataset_delete",
    __name__
)


# ============================================================
# DELETE DATASET
# ============================================================

@dataset_delete.route(
    "/datasets/<int:dataset_id>/delete",
    methods=["POST"]
)
def delete_dataset(dataset_id):

    # --------------------------------------------------------
    # Find dataset
    # --------------------------------------------------------

    dataset = db.session.get(
        Dataset,
        dataset_id
    )


    if dataset is None:

        flash(
            "Dataset not found.",
            "error"
        )

        return redirect(
            url_for("main.datasets")
        )


    # Save filename before deleting
    # the database record.

    file_name = dataset.file_name


    try:

        # ====================================================
        # DELETE SALES DATA
        # ====================================================

        SalesData.query.filter(
            SalesData.dataset_id == dataset.id
        ).delete(
            synchronize_session=False
        )


        # ====================================================
        # DELETE UPLOAD LOGS
        # ====================================================

        UploadLog.query.filter(
            UploadLog.dataset_id == dataset.id
        ).delete(
            synchronize_session=False
        )


        # ====================================================
        # DELETE DATASET
        # ====================================================

        db.session.delete(
            dataset
        )

        db.session.commit()


        # ====================================================
        # DELETE PHYSICAL FILE
        #
        # IMPORTANT:
        #
        # If another dataset has the same filename,
        # keep the physical file.
        #
        # This is important because you uploaded the
        # same file multiple times.
        # ====================================================

        remaining_dataset = (
            Dataset.query
            .filter(
                Dataset.file_name == file_name
            )
            .first()
        )


        if remaining_dataset is None:

            upload_folder = os.path.join(
                current_app.root_path,
                "..",
                "uploads"
            )


            upload_folder = os.path.abspath(
                upload_folder
            )


            file_path = os.path.join(
                upload_folder,
                file_name
            )


            if os.path.isfile(file_path):

                try:

                    os.remove(
                        file_path
                    )

                except OSError as file_error:

                    current_app.logger.warning(
                        "Could not delete uploaded file "
                        "%s: %s",
                        file_path,
                        file_error
                    )


        # ====================================================
        # SUCCESS MESSAGE
        # ====================================================

        flash(
            f'Dataset "{file_name}" deleted successfully.',
            "success"
        )


    except Exception as error:

        # ----------------------------------------------------
        # Rollback everything if anything fails.
        # ----------------------------------------------------

        db.session.rollback()


        current_app.logger.exception(
            "Dataset deletion failed"
        )


        flash(
            f"Could not delete dataset: {error}",
            "error"
        )


    # --------------------------------------------------------
    # Return to datasets page
    # --------------------------------------------------------

    return redirect(
        url_for("main.datasets")
    )