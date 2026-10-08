document.addEventListener(
    "DOMContentLoaded",
    () => {

        const datasetSelect =
            document.getElementById(
                "datasetSelect"
            );

        const startDate =
            document.getElementById(
                "startDate"
            );

        const endDate =
            document.getElementById(
                "endDate"
            );

        const categoryFilter =
            document.getElementById(
                "categoryFilter"
            );

        const regionFilter =
            document.getElementById(
                "regionFilter"
            );

        const applyFilters =
            document.getElementById(
                "applyFilters"
            );

        const resetFilters =
            document.getElementById(
                "resetFilters"
            );

        const loading =
            document.getElementById(
                "loading"
            );

        const errorBox =
            document.getElementById(
                "errorBox"
            );

        const errorMessage =
            document.getElementById(
                "errorMessage"
            );


        let monthlyChart = null;
        let categoryChart = null;
        let regionChart = null;


        // =====================================================
        // HELPERS
        // =====================================================

        function escapeHtml(value) {

            return String(
                value ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );
        }


        function formatCurrency(value) {

            const number =
                Number(value || 0);

            return "₹" +
                number.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );
        }


        function formatNumber(value) {

            return Number(
                value || 0
            ).toLocaleString(
                "en-IN"
            );
        }


        function showLoading() {

            loading.classList.remove(
                "hidden"
            );

            errorBox.classList.add(
                "hidden"
            );
        }


        function hideLoading() {

            loading.classList.add(
                "hidden"
            );
        }


        function showError(message) {

            hideLoading();

            errorMessage.textContent =
                message;

            errorBox.classList.remove(
                "hidden"
            );
        }


        function hideError() {

            errorBox.classList.add(
                "hidden"
            );
        }


        // =====================================================
        // API
        // =====================================================

        async function apiRequest(
            url
        ) {

            const response =
                await fetch(url);

            let payload = null;

            try {
                payload =
                    await response.json();
            } catch (error) {
                throw new Error(
                    `Invalid JSON response from ${url}`
                );
            }


            if (!response.ok) {

                const message =
                    payload?.message ||
                    payload?.error ||
                    `API error ${response.status}: ${url}`;

                throw new Error(
                    message
                );
            }


            return payload.data;
        }


        function buildQueryString() {

            const params =
                new URLSearchParams();


            const start =
                startDate.value;

            const end =
                endDate.value;

            const category =
                categoryFilter.value;

            const region =
                regionFilter.value;


            if (start) {
                params.set(
                    "start_date",
                    start
                );
            }

            if (end) {
                params.set(
                    "end_date",
                    end
                );
            }

            if (category) {
                params.set(
                    "category",
                    category
                );
            }

            if (region) {
                params.set(
                    "region",
                    region
                );
            }


            const query =
                params.toString();

            return query
                ? `?${query}`
                : "";
        }


        // =====================================================
        // FILTER OPTIONS
        // =====================================================

        async function loadFilterOptions() {

            const datasetId =
                datasetSelect.value;

            if (!datasetId) {
                return;
            }


            const data =
                await apiRequest(
                    `/api/datasets/${datasetId}/filter-options`
                );


            categoryFilter.innerHTML =
                `<option value="">
                    All Categories
                </option>`;


            regionFilter.innerHTML =
                `<option value="">
                    All Regions
                </option>`;


            (data.categories || [])
                .forEach(
                    category => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            category;

                        option.textContent =
                            category;

                        categoryFilter.appendChild(
                            option
                        );
                    }
                );


            (data.regions || [])
                .forEach(
                    region => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            region;

                        option.textContent =
                            region;

                        regionFilter.appendChild(
                            option
                        );
                    }
                );
        }


        // =====================================================
        // CHART HELPERS
        // =====================================================

        function destroyCharts() {

            if (monthlyChart) {
                monthlyChart.destroy();
                monthlyChart = null;
            }

            if (categoryChart) {
                categoryChart.destroy();
                categoryChart = null;
            }

            if (regionChart) {
                regionChart.destroy();
                regionChart = null;
            }
        }


        function chartOptions(
            horizontal = false
        ) {

            return {

                responsive: true,

                maintainAspectRatio: false,

                animation: {
                    duration: 500
                },

                plugins: {

                    legend: {
                        display: true,
                        position: "top"
                    },

                    tooltip: {
                        mode: "index",
                        intersect: false
                    }
                },

                scales: {

                    x: {

                        beginAtZero: true,

                        grid: {
                            display: false
                        }
                    },

                    y: {

                        beginAtZero: true,

                        grid: {
                            color:
                                "rgba(15, 23, 42, 0.08)"
                        },

                        ticks: {
                            maxTicksLimit: 7
                        }
                    }
                }
            };
        }


        // =====================================================
        // MONTHLY CHART
        // =====================================================

        function renderMonthlyChart(
            data
        ) {

            const canvas =
                document.getElementById(
                    "monthlyChart"
                );

            if (!canvas) {
                return;
            }


            monthlyChart =
                new Chart(
                    canvas,
                    {
                        type: "line",

                        data: {

                            labels:
                                data.map(
                                    item =>
                                        item.month
                                ),

                            datasets: [

                                {
                                    label:
                                        "Sales",

                                    data:
                                        data.map(
                                            item =>
                                                Number(
                                                    item.sales
                                                )
                                        ),

                                    borderWidth: 3,

                                    tension: 0.35,

                                    fill: true,

                                    backgroundColor:
                                        "rgba(79, 70, 229, 0.10)",

                                    borderColor:
                                        "#4f46e5",

                                    pointRadius: 4,

                                    pointHoverRadius: 6
                                },

                                {
                                    label:
                                        "Profit",

                                    data:
                                        data.map(
                                            item =>
                                                Number(
                                                    item.profit
                                                )
                                        ),

                                    borderWidth: 3,

                                    tension: 0.35,

                                    fill: false,

                                    borderColor:
                                        "#10b981",

                                    pointRadius: 4,

                                    pointHoverRadius: 6
                                }

                            ]
                        },

                        options:
                            chartOptions()
                    }
                );
        }


        // =====================================================
        // CATEGORY CHART
        // =====================================================

        function renderCategoryChart(
            data
        ) {

            const canvas =
                document.getElementById(
                    "categoryChart"
                );

            if (!canvas) {
                return;
            }


            categoryChart =
                new Chart(
                    canvas,
                    {
                        type: "bar",

                        data: {

                            labels:
                                data.map(
                                    item =>
                                        item.category
                                ),

                            datasets: [

                                {
                                    label:
                                        "Sales",

                                    data:
                                        data.map(
                                            item =>
                                                Number(
                                                    item.sales
                                                )
                                        ),

                                    borderRadius: 8,

                                    backgroundColor:
                                        "#4f46e5"
                                },

                                {
                                    label:
                                        "Profit",

                                    data:
                                        data.map(
                                            item =>
                                                Number(
                                                    item.profit
                                                )
                                        ),

                                    borderRadius: 8,

                                    backgroundColor:
                                        "#10b981"
                                }

                            ]
                        },

                        options:
                            chartOptions()
                    }
                );
        }


        // =====================================================
        // REGION CHART
        // =====================================================

        function renderRegionChart(
            data
        ) {

            const canvas =
                document.getElementById(
                    "regionChart"
                );

            const noRegion =
                document.getElementById(
                    "noRegion"
                );


            if (!canvas) {
                return;
            }


            if (!data.length) {

                noRegion.classList.remove(
                    "hidden"
                );

                canvas.style.display =
                    "none";

                return;
            }


            noRegion.classList.add(
                "hidden"
            );

            canvas.style.display =
                "block";


            regionChart =
                new Chart(
                    canvas,
                    {
                        type: "bar",

                        data: {

                            labels:
                                data.map(
                                    item =>
                                        item.region
                                ),

                            datasets: [

                                {
                                    label:
                                        "Sales",

                                    data:
                                        data.map(
                                            item =>
                                                Number(
                                                    item.sales
                                                )
                                        ),

                                    borderRadius: 8,

                                    backgroundColor:
                                        "#0f766e"
                                },

                                {
                                    label:
                                        "Profit",

                                    data:
                                        data.map(
                                            item =>
                                                Number(
                                                    item.profit
                                                )
                                        ),

                                    borderRadius: 8,

                                    backgroundColor:
                                        "#f59e0b"
                                }

                            ]
                        },

                        options:
                            chartOptions()
                    }
                );
        }


        // =====================================================
        // KPI RENDER
        // =====================================================

        function renderKpis(data) {

            document.getElementById(
                "totalSales"
            ).textContent =
                formatCurrency(
                    data.total_sales
                );


            document.getElementById(
                "totalProfit"
            ).textContent =
                formatCurrency(
                    data.total_profit
                );


            document.getElementById(
                "totalOrders"
            ).textContent =
                formatNumber(
                    data.total_orders
                );


            document.getElementById(
                "unitsSold"
            ).textContent =
                formatNumber(
                    data.units_sold
                );


            document.getElementById(
                "profitMargin"
            ).textContent =
                `${Number(
                    data.profit_margin || 0
                ).toFixed(2)}%`;


            document.getElementById(
                "averageOrderValue"
            ).textContent =
                formatCurrency(
                    data.average_order_value
                );


            document.getElementById(
                "averageDiscount"
            ).textContent =
                `${Number(
                    data.average_discount || 0
                ).toFixed(2)}`;
        }


        // =====================================================
        // PRODUCT TABLES
        // =====================================================

        function renderProductTable(
            elementId,
            products
        ) {

            const tbody =
                document.getElementById(
                    elementId
                );


            if (!products.length) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="3"
                            class="empty-table"
                        >
                            No product data available.
                        </td>
                    </tr>
                `;

                return;
            }


            tbody.innerHTML =
                products.map(
                    product => `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    product.product_name
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    product.sales
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    product.profit
                                )}
                            </td>

                        </tr>
                    `
                ).join("");
        }


        // =====================================================
        // INSIGHTS
        // =====================================================

        function renderInsights(
            insights
        ) {

            const container =
                document.getElementById(
                    "insights"
                );


            if (!insights.length) {

                container.innerHTML = `
                    <div class="empty-state">
                        No automatic insights are available.
                    </div>
                `;

                return;
            }


            container.innerHTML =
                insights.map(
                    insight => `
                        <div class="insight-item">

                            <div class="insight-number">
                                ✓
                            </div>

                            <div>
                                ${escapeHtml(
                                    insight
                                )}
                            </div>

                        </div>
                    `
                ).join("");
        }


        // =====================================================
        // LOAD DASHBOARD
        // =====================================================

        async function loadDashboard() {

            const datasetId =
                datasetSelect.value;


            if (!datasetId) {
                return;
            }


            showLoading();
            hideError();

            destroyCharts();


            const query =
                buildQueryString();


            try {

                const [
                    kpis,
                    monthly,
                    categories,
                    regions,
                    topProducts,
                    bottomProducts,
                    insights
                ] = await Promise.all([

                    apiRequest(
                        `/api/datasets/${datasetId}/kpis${query}`
                    ),

                    apiRequest(
                        `/api/datasets/${datasetId}/monthly-analysis${query}`
                    ),

                    apiRequest(
                        `/api/datasets/${datasetId}/category-analysis${query}`
                    ),

                    apiRequest(
                        `/api/datasets/${datasetId}/region-analysis${query}`
                    ),

                    apiRequest(
                        `/api/datasets/${datasetId}/top-products${query}`
                    ),

                    apiRequest(
                        `/api/datasets/${datasetId}/bottom-products${query}`
                    ),

                    apiRequest(
                        `/api/datasets/${datasetId}/insights${query}`
                    )

                ]);


                renderKpis(
                    kpis
                );

                renderMonthlyChart(
                    monthly || []
                );

                renderCategoryChart(
                    categories || []
                );

                renderRegionChart(
                    regions || []
                );

                renderProductTable(
                    "topProducts",
                    topProducts || []
                );

                renderProductTable(
                    "bottomProducts",
                    bottomProducts || []
                );

                renderInsights(
                    insights || []
                );


            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                );

                showError(
                    error.message ||
                    "Could not load dashboard data."
                );

            } finally {

                hideLoading();
            }
        }


        // =====================================================
        // INFO DRAWER
        // =====================================================

        const dashboardInfoButton =
            document.getElementById(
                "dashboardInfoButton"
            );

        const infoDrawer =
            document.getElementById(
                "infoDrawer"
            );

        const infoDrawerBody =
            document.getElementById(
                "infoDrawerBody"
            );

        const closeInfoDrawer =
            document.getElementById(
                "closeInfoDrawer"
            );

        const infoDrawerBackdrop =
            document.getElementById(
                "infoDrawerBackdrop"
            );


        const infoContent = {

            controls: {
                title: "Dashboard Controls",
                description: "These controls determine which dataset and records are used for the dashboard calculations.",
                formula: "The selected filters are applied to dataset records before calculating KPIs, charts and tables.",
                columns: "Dataset ID, Order Date, Category, Region",
                cleaning: "Column names are normalized, duplicate rows are removed, date fields are converted to dates, numeric fields are converted to numeric values, and missing values are detected."
            },

            kpis: {
                title: "Key Performance Indicators",
                description: "KPIs summarize the overall performance of the selected dataset.",
                formula: "Sales = SUM(Sales). Profit = SUM(Profit). Orders = COUNT(DISTINCT Order ID). Units = SUM(Quantity).",
                columns: "Sales, Profit, Order ID, Quantity, Discount",
                cleaning: "Sales, Quantity, Discount and Profit are converted to numeric values. Duplicate rows are removed before storage."
            },

            total_sales: {
                title: "Total Sales",
                description: "Total revenue generated by all selected records.",
                formula: "Total Sales = SUM(Sales)",
                columns: "Sales",
                cleaning: "Sales values are converted to numeric values. Invalid numeric values become missing values and are not treated as valid sales."
            },

            total_profit: {
                title: "Total Profit",
                description: "Total profit generated by the selected records.",
                formula: "Total Profit = SUM(Profit)",
                columns: "Profit",
                cleaning: "Profit is converted to numeric values during dataset cleaning."
            },

            total_orders: {
                title: "Total Orders",
                description: "Number of unique orders in the selected data.",
                formula: "Total Orders = COUNT(DISTINCT Order ID)",
                columns: "Order ID",
                cleaning: "Duplicate rows are removed before analytics are performed."
            },

            units_sold: {
                title: "Units Sold",
                description: "Total quantity of products sold.",
                formula: "Units Sold = SUM(Quantity)",
                columns: "Quantity",
                cleaning: "Quantity is converted to a numeric value."
            },

            profit_margin: {
                title: "Profit Margin",
                description: "Shows how much of sales remains as profit.",
                formula: "Profit Margin = (Total Profit / Total Sales) × 100",
                columns: "Profit, Sales",
                cleaning: "Sales and Profit are converted to numeric values."
            },

            average_order_value: {
                title: "Average Order Value",
                description: "Average revenue generated per unique order.",
                formula: "Average Order Value = Total Sales / Total Orders",
                columns: "Sales, Order ID",
                cleaning: "Sales is converted to numeric values and duplicate records are removed."
            },

            average_discount: {
                title: "Average Discount",
                description: "Average discount value across selected records.",
                formula: "Average Discount = AVG(Discount)",
                columns: "Discount",
                cleaning: "Discount values are converted to numeric values."
            },

            monthly: {
                title: "Monthly Sales Trend",
                description: "Shows sales and profit grouped by month.",
                formula: "Monthly Sales = SUM(Sales) grouped by Order Date month.",
                columns: "Order Date, Sales, Profit",
                cleaning: "Order Date is converted to a date/datetime value. Sales and Profit are converted to numeric values."
            },

            category: {
                title: "Sales by Category",
                description: "Compares revenue and profit across product categories.",
                formula: "Category Sales = SUM(Sales) grouped by Category.",
                columns: "Category, Sales, Profit",
                cleaning: "Category names are normalized and numeric values are converted."
            },

            region: {
                title: "Sales by Region",
                description: "Compares sales and profit across geographic regions.",
                formula: "Region Sales = SUM(Sales) grouped by Region.",
                columns: "Region, Sales, Profit",
                cleaning: "Region values are cleaned and sales/profit are converted to numeric values."
            },

            top_products: {
                title: "Top Products",
                description: "Products ranked from highest to lowest by sales.",
                formula: "Product Sales = SUM(Sales) grouped by Product Name, ordered descending.",
                columns: "Product Name, Sales, Profit",
                cleaning: "Product names are normalized and numeric sales/profit values are converted."
            },

            bottom_products: {
                title: "Bottom Products",
                description: "Products ranked from lowest to highest by sales.",
                formula: "Product Sales = SUM(Sales) grouped by Product Name, ordered ascending.",
                columns: "Product Name, Sales, Profit",
                cleaning: "Product names are normalized and numeric sales/profit values are converted."
            },

            insights: {
                title: "Automatic Insights",
                description: "These observations are generated automatically from the dashboard analytics.",
                formula: "Insights use KPI, category and monthly analytics to identify totals, margins, strongest categories and best sales months.",
                columns: "Sales, Profit, Order ID, Quantity, Category, Order Date",
                cleaning: "The same cleaned dataset used by the dashboard analytics is used for automatic insights."
            }

        };


        function renderInfoDrawer() {

            if (!infoDrawerBody) {
                return;
            }

            infoDrawerBody.innerHTML =
                Object.keys(infoContent)
                    .map(
                        key => {

                            const info =
                                infoContent[key];

                            return `
                                <section class="drawer-info-card">
                                    <div class="drawer-info-title">
                                        <span>${escapeHtml(info.title)}</span>
                                        <span class="drawer-info-key">
                                            ${escapeHtml(key.replaceAll("_", " "))}
                                        </span>
                                    </div>

                                    <div class="drawer-info-row">
                                        <strong>What it means</strong>
                                        <p>${escapeHtml(info.description)}</p>
                                    </div>

                                    <div class="drawer-info-row">
                                        <strong>Calculation / Formula</strong>
                                        <div class="formula-box">
                                            ${escapeHtml(info.formula)}
                                        </div>
                                    </div>

                                    <div class="drawer-info-row">
                                        <strong>Source Columns</strong>
                                        <p>${escapeHtml(info.columns)}</p>
                                    </div>

                                    <div class="drawer-info-row">
                                        <strong>Data Cleaning</strong>
                                        <p>${escapeHtml(info.cleaning)}</p>
                                    </div>
                                </section>
                            `;

                        }
                    )
                    .join("");
        }


        function openInfoDrawer() {

            if (!infoDrawer) {
                return;
            }

            renderInfoDrawer();

            infoDrawer.classList.add(
                "open"
            );

            if (infoDrawerBackdrop) {
                infoDrawerBackdrop.classList.remove(
                    "hidden"
                );
            }

            infoDrawer.setAttribute(
                "aria-hidden",
                "false"
            );

            document.body.classList.add(
                "info-drawer-open"
            );

            if (closeInfoDrawer) {
                closeInfoDrawer.focus();
            }
        }


        function closeInfoDrawerPanel() {

            if (!infoDrawer) {
                return;
            }

            infoDrawer.classList.remove(
                "open"
            );

            if (infoDrawerBackdrop) {
                infoDrawerBackdrop.classList.add(
                    "hidden"
                );
            }

            infoDrawer.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "info-drawer-open"
            );
        }


        if (dashboardInfoButton) {
            dashboardInfoButton.addEventListener(
                "click",
                openInfoDrawer
            );
        }


        if (closeInfoDrawer) {
            closeInfoDrawer.addEventListener(
                "click",
                closeInfoDrawerPanel
            );
        }


        if (infoDrawerBackdrop) {
            infoDrawerBackdrop.addEventListener(
                "click",
                closeInfoDrawerPanel
            );
        }


        /* =====================================================
           RICH INFORMATION TOOLTIPS
        ===================================================== */

        let activeInfoTooltip = null;

        let activeInfoButton = null;

        let tooltipHideTimer = null;


        function createInfoTooltip(key) {

            const info =
                infoContent[key];

            if (!info) {
                return null;
            }


            const tooltip =
                document.createElement(
                    "div"
                );


            tooltip.className =
                "dashboard-info-tooltip";


            tooltip.setAttribute(
                "role",
                "tooltip"
            );


            tooltip.innerHTML = `

                <div
                    class="dashboard-info-tooltip-header"
                >

                    <h3
                        class="dashboard-info-tooltip-title"
                    >
                        ${escapeHtml(
                            info.title
                        )}
                    </h3>

                    <span
                        class="dashboard-info-tooltip-badge"
                    >
                        measured
                    </span>

                </div>


                <div
                    class="dashboard-info-tooltip-section"
                >

                    <div
                        class="dashboard-info-tooltip-label"
                    >
                        From
                    </div>

                    <p
                        class="dashboard-info-tooltip-value"
                    >
                        ${escapeHtml(
                            info.columns
                        )}
                    </p>

                </div>


                <div
                    class="dashboard-info-tooltip-section"
                >

                    <div
                        class="dashboard-info-tooltip-label"
                    >
                        Calculated as
                    </div>

                    <p
                        class="dashboard-info-tooltip-formula"
                    >
                        ${escapeHtml(
                            info.formula
                        )}
                    </p>

                </div>


                <div
                    class="dashboard-info-tooltip-section"
                >

                    <div
                        class="dashboard-info-tooltip-label"
                    >
                        One row is
                    </div>

                    <p
                        class="dashboard-info-tooltip-value"
                    >
                        ${escapeHtml(
                            info.description
                        )}
                    </p>

                </div>


                <div
                    class="dashboard-info-tooltip-note"
                >
                    ${escapeHtml(
                        info.cleaning
                    )}
                </div>


                <button
                    type="button"
                    class="dashboard-info-tooltip-link"
                    data-tooltip-open-drawer="true"
                >
                    See the full data flow →
                </button>

            `;


            return tooltip;
        }


        function positionInfoTooltip() {

            if (
                !activeInfoTooltip ||
                !activeInfoButton
            ) {
                return;
            }


            const buttonRect =
                activeInfoButton.getBoundingClientRect();


            const tooltipRect =
                activeInfoTooltip.getBoundingClientRect();


            const viewportWidth =
                window.innerWidth;


            const viewportHeight =
                window.innerHeight;


            const margin = 12;


            let left =
                buttonRect.right -
                tooltipRect.width;


            let top =
                buttonRect.bottom +
                10;


            if (
                top + tooltipRect.height >
                viewportHeight - margin
            ) {

                top =
                    buttonRect.top -
                    tooltipRect.height -
                    10;
            }


            if (
                top < margin
            ) {

                top = margin;
            }


            if (
                top + tooltipRect.height >
                viewportHeight - margin
            ) {

                top =
                    viewportHeight -
                    tooltipRect.height -
                    margin;
            }


            if (
                left < margin
            ) {

                left = margin;
            }


            if (
                left + tooltipRect.width >
                viewportWidth - margin
            ) {

                left =
                    viewportWidth -
                    tooltipRect.width -
                    margin;
            }


            activeInfoTooltip.style.left =
                `${Math.max(margin, left)}px`;


            activeInfoTooltip.style.top =
                `${Math.max(margin, top)}px`;
        }


        function cancelInfoTooltipHide() {

            clearTimeout(
                tooltipHideTimer
            );
        }


        function scheduleInfoTooltipHide() {

            cancelInfoTooltipHide();


            tooltipHideTimer =
                setTimeout(
                    () => {

                        hideInfoTooltip();

                    },
                    140
                );
        }


        function showInfoTooltip(button) {

            const key =
                button.dataset.info;


            if (
                !key ||
                !infoContent[key]
            ) {
                return;
            }


            cancelInfoTooltipHide();


            if (
                activeInfoButton === button &&
                activeInfoTooltip
            ) {

                positionInfoTooltip();

                return;
            }


            hideInfoTooltip();


            const tooltip =
                createInfoTooltip(key);


            if (!tooltip) {
                return;
            }


            document.body.appendChild(
                tooltip
            );


            activeInfoTooltip =
                tooltip;


            activeInfoButton =
                button;


            requestAnimationFrame(
                () => {

                    if (
                        !activeInfoTooltip
                    ) {
                        return;
                    }


                    positionInfoTooltip();


                    activeInfoTooltip.classList.add(
                        "is-visible"
                    );
                }
            );


            const drawerButton =
                tooltip.querySelector(
                    "[data-tooltip-open-drawer]"
                );


            if (drawerButton) {

                drawerButton.addEventListener(
                    "click",
                    () => {

                        cancelInfoTooltipHide();

                        hideInfoTooltip();

                        openInfoDrawer();
                    }
                );
            }


            tooltip.addEventListener(
                "mouseenter",
                cancelInfoTooltipHide
            );


            tooltip.addEventListener(
                "mouseleave",
                scheduleInfoTooltipHide
            );
        }


        function hideInfoTooltip() {

            cancelInfoTooltipHide();


            if (
                activeInfoTooltip
            ) {

                activeInfoTooltip.classList.remove(
                    "is-visible"
                );

                activeInfoTooltip.remove();
            }


            activeInfoTooltip =
                null;


            activeInfoButton =
                null;
        }


        document
            .querySelectorAll(
                "[data-info]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "mouseenter",
                        () => {

                            showInfoTooltip(
                                button
                            );
                        }
                    );


                    button.addEventListener(
                        "mouseleave",
                        () => {

                            scheduleInfoTooltipHide();
                        }
                    );


                    button.addEventListener(
                        "focus",
                        () => {

                            showInfoTooltip(
                                button
                            );
                        }
                    );


                    button.addEventListener(
                        "blur",
                        () => {

                            scheduleInfoTooltipHide();
                        }
                    );


                    button.addEventListener(
                        "keydown",
                        event => {

                            if (
                                event.key === "Escape"
                            ) {

                                hideInfoTooltip();
                            }
                        }
                    );
                }
            );


        window.addEventListener(
            "resize",
            () => {

                if (
                    activeInfoTooltip
                ) {

                    positionInfoTooltip();
                }
            }
        );


        window.addEventListener(
            "scroll",
            () => {

                if (
                    activeInfoTooltip
                ) {

                    positionInfoTooltip();
                }
            },
            true
        );


        document.addEventListener(
            "mousedown",
            event => {

                if (
                    !activeInfoTooltip
                ) {
                    return;
                }


                if (
                    activeInfoTooltip.contains(
                        event.target
                    )
                ) {
                    return;
                }


                if (
                    activeInfoButton &&
                    activeInfoButton.contains(
                        event.target
                    )
                ) {
                    return;
                }


                hideInfoTooltip();
            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    hideInfoTooltip();

                    closeInfoDrawerPanel();
                }
            }
        );


        // =====================================================
        // EVENTS
        // =====================================================

        datasetSelect.addEventListener(
            "change",
            async () => {

                try {

                    await loadFilterOptions();

                    await loadDashboard();

                } catch (error) {

                    showError(
                        error.message
                    );

                }

            }
        );


        applyFilters.addEventListener(
            "click",
            loadDashboard
        );


        resetFilters.addEventListener(
            "click",
            async () => {

                startDate.value = "";
                endDate.value = "";

                categoryFilter.value = "";
                regionFilter.value = "";

                await loadDashboard();
            }
        );


        // =====================================================
        // INITIAL LOAD
        // =====================================================

        async function initialize() {

            if (
                typeof Chart ===
                "undefined"
            ) {

                showError(
                    "Chart.js could not be loaded. Check your internet connection and refresh the page."
                );

                return;
            }


            if (!datasetSelect.value) {
                return;
            }


            try {

                await loadFilterOptions();

                await loadDashboard();

            } catch (error) {

                console.error(
                    error
                );

                showError(
                    error.message
                );

            }

        }


        initialize();

    }
);