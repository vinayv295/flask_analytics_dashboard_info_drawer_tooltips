/*
 * ============================================================
 * tables.js
 * ============================================================
 *
 * Global DataTables handler for the Analytics Dashboard.
 *
 * Features:
 *
 *   - Search
 *   - Sorting
 *   - Pagination
 *   - Page length
 *   - Responsive tables
 *   - Automatic initialization
 *   - Dynamic Dashboard tables
 *   - Safe empty-table handling
 *   - Prevents incorrect column count errors
 *
 * ============================================================
 */

(function (window, document) {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const TABLE_SELECTOR = "table";


    const DEFAULT_OPTIONS = {

        paging: true,

        searching: true,

        ordering: true,

        info: true,

        responsive: true,

        autoWidth: false,

        scrollX: true,

        pageLength: 10,

        lengthMenu: [
            [10, 25, 50, 100, -1],
            [10, 25, 50, 100, "All"]
        ],

        language: {

            search: "",

            searchPlaceholder: "Search...",

            lengthMenu: "Show _MENU_ entries",

            info:
                "Showing _START_ to _END_ of _TOTAL_ entries",

            infoEmpty:
                "Showing 0 to 0 of 0 entries",

            infoFiltered:
                "(filtered from _MAX_ total entries)",

            zeroRecords:
                "No matching records found",

            emptyTable:
                "No data available",

            paginate: {

                first: "First",

                last: "Last",

                next: "Next",

                previous: "Previous"

            }

        }

    };


    /* ========================================================
       CHECK DATATABLES
    ======================================================== */

    function dataTablesAvailable() {

        return (
            typeof window.jQuery !== "undefined" &&
            typeof window.jQuery.fn !== "undefined" &&
            typeof window.jQuery.fn.DataTable === "function"
        );

    }


    /* ========================================================
       GET COLUMN COUNT
    ======================================================== */

    function getColumnCount(table) {

        if (!table) {
            return 0;
        }


        const thead =
            table.querySelector("thead");


        if (!thead) {
            return 0;
        }


        const headerRow =
            thead.querySelector("tr");


        if (!headerRow) {
            return 0;
        }


        const headers =
            headerRow.querySelectorAll(
                "th, td"
            );


        return headers.length;

    }


    /* ========================================================
       CHECK VALID TABLE
    ======================================================== */

    function isValidTable(table) {

        if (!table) {
            return false;
        }


        if (
            !table.tagName ||
            table.tagName.toLowerCase() !== "table"
        ) {
            return false;
        }


        const columnCount =
            getColumnCount(table);


        if (columnCount <= 0) {
            return false;
        }


        return true;

    }


    /* ========================================================
       CHECK DATATABLE STATUS
    ======================================================== */

    function isDataTable(table) {

        if (!dataTablesAvailable()) {
            return false;
        }


        return window.jQuery.fn.DataTable.isDataTable(
            table
        );

    }


    /* ========================================================
       REMOVE INVALID EMPTY ROWS
       -----------------------------------------------
       DataTables does NOT support a tbody row such as:

       <tr>
           <td colspan="4">
               No data
           </td>
       </tr>

       We remove such placeholder rows before
       DataTables initialization.

       DataTables will then display its own
       "No data available" message.
    ======================================================== */

    function removeInvalidEmptyRows(table) {

        if (!table) {
            return;
        }


        const tbody =
            table.querySelector("tbody");


        if (!tbody) {
            return;
        }


        const columnCount =
            getColumnCount(table);


        if (columnCount <= 0) {
            return;
        }


        const rows =
            Array.from(
                tbody.querySelectorAll(":scope > tr")
            );


        rows.forEach(

            function (row) {

                const cells =
                    Array.from(
                        row.children
                    );


                if (!cells.length) {
                    return;
                }


                /*
                 * Detect colspan.
                 */

                const hasColspan =
                    cells.some(

                        function (cell) {

                            return (
                                cell.hasAttribute(
                                    "colspan"
                                ) &&
                                parseInt(
                                    cell.getAttribute(
                                        "colspan"
                                    ),
                                    10
                                ) > 1
                            );

                        }

                    );


                /*
                 * If this row is an empty-state
                 * placeholder, remove it.
                 */

                if (
                    hasColspan &&
                    cells.length === 1
                ) {

                    row.remove();

                }

            }

        );

    }


    /* ========================================================
       CHECK ROW COLUMN COUNTS
    ======================================================== */

    function hasIncorrectColumnCount(table) {

        const columnCount =
            getColumnCount(table);


        if (columnCount <= 0) {
            return true;
        }


        const tbody =
            table.querySelector("tbody");


        if (!tbody) {
            return false;
        }


        const rows =
            tbody.querySelectorAll(
                ":scope > tr"
            );


        for (
            let i = 0;
            i < rows.length;
            i++
        ) {

            const row =
                rows[i];


            const cells =
                row.querySelectorAll(
                    ":scope > th, :scope > td"
                );


            /*
             * Every normal row must have
             * exactly the same number of cells
             * as the table header.
             */

            if (
                cells.length !==
                columnCount
            ) {

                return true;

            }

        }


        return false;

    }


    /* ========================================================
       FIX INCORRECT ROW
       ======================================================== */

    function fixIncorrectRows(table) {

        if (!table) {
            return;
        }


        const columnCount =
            getColumnCount(table);


        if (columnCount <= 0) {
            return;
        }


        const tbody =
            table.querySelector("tbody");


        if (!tbody) {
            return;
        }


        const rows =
            Array.from(
                tbody.querySelectorAll(
                    ":scope > tr"
                )
            );


        rows.forEach(

            function (row) {

                const cells =
                    Array.from(
                        row.children
                    );


                if (!cells.length) {
                    return;
                }


                /*
                 * A single colspan empty-state row
                 * should be removed.
                 */

                if (
                    cells.length === 1 &&
                    cells[0].hasAttribute(
                        "colspan"
                    )
                ) {

                    row.remove();

                    return;

                }


                /*
                 * If the row has too many cells,
                 * do not guess which data should
                 * be removed.
                 *
                 * Log the problem instead.
                 */

                if (
                    cells.length >
                    columnCount
                ) {

                    console.warn(
                        "DataTables: row contains more " +
                        "cells than the table header.",
                        table
                    );

                    return;

                }


                /*
                 * If the row has fewer cells,
                 * add empty cells so DataTables
                 * can safely process it.
                 */

                while (
                    row.children.length <
                    columnCount
                ) {

                    const emptyCell =
                        document.createElement(
                            "td"
                        );


                    emptyCell.textContent =
                        "";


                    row.appendChild(
                        emptyCell
                    );

                }

            }

        );

    }


    /* ========================================================
       PREPARE TABLE
    ======================================================== */

    function prepareTable(table) {

        if (!table) {
            return;
        }


        /*
         * First remove colspan placeholder rows.
         */

        removeInvalidEmptyRows(
            table
        );


        /*
         * Then repair normal rows with
         * missing cells.
         */

        if (
            hasIncorrectColumnCount(
                table
            )
        ) {

            fixIncorrectRows(
                table
            );

        }

    }


    /* ========================================================
       INITIALIZE ONE TABLE
    ======================================================== */

    function initializeTable(table) {

        if (!dataTablesAvailable()) {
            return;
        }


        if (!isValidTable(table)) {
            return;
        }


        /*
         * Never initialize twice.
         */

        if (isDataTable(table)) {
            return;
        }


        /*
         * Fix table structure before
         * giving it to DataTables.
         */

        prepareTable(table);


        /*
         * Re-check after preparation.
         */

        if (
            hasIncorrectColumnCount(
                table
            )
        ) {

            console.warn(
                "DataTables skipped table because " +
                "the column count is still incorrect.",
                table
            );

            return;

        }


        const $table =
            window.jQuery(table);


        /*
         * Add project class.
         */

        table.classList.add(
            "analytics-data-table"
        );


        try {

            $table.DataTable(

                Object.assign(

                    {},

                    DEFAULT_OPTIONS,

                    {

                        /*
                         * Default ordering:
                         * first column ascending.
                         */

                        order: [],


                        /*
                         * Keep empty cells safe.
                         */

                        columnDefs: [

                            {
                                targets: "_all",

                                defaultContent: ""

                            }

                        ]

                    }

                )

            );

        } catch (error) {

            console.error(
                "DataTables initialization failed:",
                error,
                table
            );

        }

    }


    /* ========================================================
       INITIALIZE ALL TABLES
    ======================================================== */

    function initializeAllTables(
        root
    ) {

        if (!dataTablesAvailable()) {

            console.warn(
                "DataTables is not loaded."
            );

            return;

        }


        const container =
            root || document;


        const tables =
            container.querySelectorAll(
                TABLE_SELECTOR
            );


        tables.forEach(

            function (table) {

                initializeTable(
                    table
                );

            }

        );

    }


    /* ========================================================
       REFRESH EXISTING DATATABLE
    ======================================================== */

    function refreshTable(table) {

        if (!dataTablesAvailable()) {
            return;
        }


        if (!table) {
            return;
        }


        if (!isDataTable(table)) {

            initializeTable(
                table
            );

            return;

        }


        try {

            const dataTable =
                window.jQuery(
                    table
                ).DataTable();


            dataTable
                .rows()
                .invalidate("dom")
                .draw(false);

        } catch (error) {

            console.error(
                "DataTables refresh failed:",
                error
            );

        }

    }


    /* ========================================================
       INITIALIZE TABLE AFTER DYNAMIC CONTENT
       ======================================================== */

    function initializeDynamicTable(
        table
    ) {

        if (!table) {
            return;
        }


        /*
         * If it already exists as a DataTable,
         * just refresh its DOM data.
         */

        if (isDataTable(table)) {

            refreshTable(
                table
            );

            return;

        }


        /*
         * Otherwise initialize it.
         */

        initializeTable(
            table
        );

    }


    /* ========================================================
       MUTATION OBSERVER
       ========================================================
       
       This is mainly for Dashboard tables.

       dashboard.js loads Top Products and Bottom
       Products dynamically through JavaScript.

       We wait until the rows exist, then initialize
       the table.

    ======================================================== */

    let observer = null;

    let observerTimer = null;


    function startObserver() {

        if (
            typeof MutationObserver ===
            "undefined"
        ) {

            return;

        }


        if (observer) {
            return;
        }


        observer =
            new MutationObserver(

                function (mutations) {

                    let shouldCheck =
                        false;


                    mutations.forEach(

                        function (mutation) {

                            if (
                                mutation.type !==
                                "childList"
                            ) {

                                return;

                            }


                            /*
                             * Check whether the
                             * changed element is
                             * a table/tbody.
                             */

                            if (
                                mutation.target &&
                                mutation.target.closest
                            ) {

                                const table =
                                    mutation
                                        .target
                                        .closest(
                                            "table"
                                        );


                                if (table) {

                                    shouldCheck =
                                        true;

                                }

                            }


                            /*
                             * Check newly added
                             * tables.
                             */

                            mutation.addedNodes.forEach(

                                function (node) {

                                    if (
                                        node &&
                                        node.nodeType === 1 &&
                                        (
                                            (
                                                node.matches &&
                                                node.matches(
                                                    "table"
                                                )
                                            ) ||
                                            (
                                                node.querySelector &&
                                                node.querySelector(
                                                    "table"
                                                )
                                            )
                                        )
                                    ) {

                                        shouldCheck =
                                            true;

                                    }

                                }

                            );

                        }

                    );


                    if (!shouldCheck) {
                        return;
                    }


                    /*
                     * Debounce the operation.
                     */

                    clearTimeout(
                        observerTimer
                    );


                    observerTimer =
                        setTimeout(

                            function () {

                                const tables =
                                    document.querySelectorAll(
                                        TABLE_SELECTOR
                                    );


                                tables.forEach(

                                    function (table) {

                                        /*
                                         * Only work on
                                         * tables that are
                                         * not initialized.
                                         */

                                        if (
                                            !isDataTable(
                                                table
                                            )
                                        ) {

                                            /*
                                             * If the table
                                             * has a tbody but
                                             * no rows yet,
                                             * wait for the
                                             * data to arrive.
                                             */

                                            const tbody =
                                                table.querySelector(
                                                    "tbody"
                                                );


                                            if (
                                                tbody &&
                                                tbody.children.length === 0
                                            ) {

                                                return;

                                            }


                                            initializeDynamicTable(
                                                table
                                            );

                                        }

                                    }

                                );

                            },

                            50

                        );

                }

            );


        observer.observe(

            document.body,

            {

                childList: true,

                subtree: true

            }

        );

    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    function initialize() {

        if (!dataTablesAvailable()) {

            console.warn(
                "DataTables is not available. " +
                "Make sure jQuery and DataTables " +
                "are loaded before tables.js."
            );


            return;

        }


        /*
         * Initialize all tables already
         * present on the page.
         */

        initializeAllTables();


        /*
         * Watch for dynamically loaded
         * tables.
         */

        startObserver();

    }


    /* ========================================================
       DOM READY
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }


    /* ========================================================
       PUBLIC API
    ======================================================== */

    window.AnalyticsTables = {

        init:
            initializeAllTables,

        initTable:
            initializeTable,

        refresh:
            refreshTable,

        prepare:
            prepareTable

    };


})(window, document);