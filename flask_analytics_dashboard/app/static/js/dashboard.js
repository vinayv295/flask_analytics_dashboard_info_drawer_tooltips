document.addEventListener(
    "DOMContentLoaded",
    () => {

        // =====================================================
        // DOM ELEMENTS
        // =====================================================

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


        // =====================================================
        // CHART INSTANCES
        // =====================================================

        let monthlyChart = null;

        let categoryChart = null;

        let regionChart = null;


        // =====================================================
        // SAFETY
        // =====================================================

        /*
         * dashboard.js is loaded by the common base template.
         * If the current page is not the dashboard page,
         * dashboard-specific elements may not exist.
         */

        if (
            !datasetSelect ||
            !startDate ||
            !endDate ||
            !categoryFilter ||
            !regionFilter
        ) {
            /*
             * The Info drawer is handled separately below,
             * so do not stop the entire script here.
             */
        }


        // =====================================================
        // HELPERS
        // =====================================================

        function escapeHtml(
            value
        ) {

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


        function formatCurrency(
            value
        ) {

            const number =
                Number(
                    value || 0
                );

            return "₹" +
                number.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );
        }


        function formatNumber(
            value
        ) {

            return Number(
                value || 0
            ).toLocaleString(
                "en-IN"
            );
        }


        function showLoading() {

            if (!loading) {
                return;
            }

            loading.classList.remove(
                "hidden"
            );

            if (errorBox) {

                errorBox.classList.add(
                    "hidden"
                );
            }
        }


        function hideLoading() {

            if (!loading) {
                return;
            }

            loading.classList.add(
                "hidden"
            );
        }


        function showError(
            message
        ) {

            hideLoading();

            if (errorMessage) {

                errorMessage.textContent =
                    message;
            }

            if (errorBox) {

                errorBox.classList.remove(
                    "hidden"
                );
            }
        }


        function hideError() {

            if (!errorBox) {
                return;
            }

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
                await fetch(
                    url
                );

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


        // =====================================================
        // BUILD FILTER QUERY
        // =====================================================

        function buildQueryString() {

            if (
                !startDate ||
                !endDate ||
                !categoryFilter ||
                !regionFilter
            ) {
                return "";
            }


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

            if (!datasetSelect) {
                return;
            }


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
                `
                <option value="">
                    All Categories
                </option>
                `;


            regionFilter.innerHTML =
                `
                <option value="">
                    All Regions
                </option>
                `;


            (
                data.categories || []
            ).forEach(
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


            (
                data.regions || []
            ).forEach(
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

                if (noRegion) {

                    noRegion.classList.remove(
                        "hidden"
                    );
                }


                canvas.style.display =
                    "none";


                return;
            }


            if (noRegion) {

                noRegion.classList.add(
                    "hidden"
                );
            }


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

        function renderKpis(
            data
        ) {

            const totalSales =
                document.getElementById(
                    "totalSales"
                );


            const totalProfit =
                document.getElementById(
                    "totalProfit"
                );


            const totalOrders =
                document.getElementById(
                    "totalOrders"
                );


            const unitsSold =
                document.getElementById(
                    "unitsSold"
                );


            const profitMargin =
                document.getElementById(
                    "profitMargin"
                );


            const averageOrderValue =
                document.getElementById(
                    "averageOrderValue"
                );


            const averageDiscount =
                document.getElementById(
                    "averageDiscount"
                );


            if (totalSales) {

                totalSales.textContent =
                    formatCurrency(
                        data.total_sales
                    );
            }


            if (totalProfit) {

                totalProfit.textContent =
                    formatCurrency(
                        data.total_profit
                    );
            }


            if (totalOrders) {

                totalOrders.textContent =
                    formatNumber(
                        data.total_orders
                    );
            }


            if (unitsSold) {

                unitsSold.textContent =
                    formatNumber(
                        data.units_sold
                    );
            }


            if (profitMargin) {

                profitMargin.textContent =
                    `${Number(
                        data.profit_margin || 0
                    ).toFixed(2)}%`;
            }


            if (averageOrderValue) {

                averageOrderValue.textContent =
                    formatCurrency(
                        data.average_order_value
                    );
            }


            if (averageDiscount) {

                averageDiscount.textContent =
                    `${Number(
                        data.average_discount || 0
                    ).toFixed(2)}`;
            }
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


            if (!tbody) {
                return;
            }


            if (!products.length) {

                tbody.innerHTML = "";

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


            if (!container) {
                return;
            }


            if (!insights.length) {

                container.innerHTML =
                    `
                    <div class="empty-state">

                        No automatic insights are available.

                    </div>
                    `;

                return;
            }


            container.innerHTML =
                insights.map(
                    insight =>

                        `
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

            if (!datasetSelect) {
                return;
            }


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

        const infoButton =
            document.getElementById(
                "dashboardInfoButton"
            );


        const infoDrawer =
            document.getElementById(
                "dashboardInfoDrawer"
            );


        const infoOverlay =
            document.getElementById(
                "infoDrawerOverlay"
            );


        const infoClose =
            document.getElementById(
                "infoDrawerClose"
            );


        // =====================================================
        // OPEN INFO DRAWER
        // =====================================================

        function openInfoDrawer() {

            if (!infoDrawer) {
                return;
            }


            infoDrawer.classList.add(
                "open"
            );


            if (infoOverlay) {

                infoOverlay.classList.add(
                    "open"
                );

                infoOverlay.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }


            infoDrawer.setAttribute(
                "aria-hidden",
                "false"
            );


            if (infoButton) {

                infoButton.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }


            /*
             * Prevent the dashboard page from scrolling
             * while the drawer is open.
             */

            document.body.style.overflow =
                "hidden";


            /*
             * Put keyboard focus on close button.
             */

            if (infoClose) {

                window.setTimeout(
                    () => {

                        infoClose.focus();

                    },
                    50
                );
            }
        }


        // =====================================================
        // CLOSE INFO DRAWER
        // =====================================================

        function closeInfoDrawer() {

            if (!infoDrawer) {
                return;
            }


            infoDrawer.classList.remove(
                "open"
            );


            if (infoOverlay) {

                infoOverlay.classList.remove(
                    "open"
                );

                infoOverlay.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }


            infoDrawer.setAttribute(
                "aria-hidden",
                "true"
            );


            if (infoButton) {

                infoButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }


            /*
             * Restore page scrolling.
             */

            document.body.style.overflow =
                "";


            /*
             * Return focus to Info menu.
             */

            if (infoButton) {

                infoButton.focus();
            }
        }


        // =====================================================
        // INFO BUTTON
        // =====================================================

        if (infoButton) {

            infoButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openInfoDrawer();

                }
            );
        }


        // =====================================================
        // CLOSE BUTTON
        // =====================================================

        if (infoClose) {

            infoClose.addEventListener(
                "click",
                () => {

                    closeInfoDrawer();

                }
            );
        }


        // =====================================================
        // OVERLAY CLICK
        // =====================================================

        if (infoOverlay) {

            infoOverlay.addEventListener(
                "click",
                () => {

                    closeInfoDrawer();

                }
            );
        }


        // =====================================================
        // ESCAPE KEY
        // =====================================================

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    infoDrawer &&
                    infoDrawer.classList.contains(
                        "open"
                    )
                ) {

                    closeInfoDrawer();
                }

            }
        );


        // =====================================================
        // EVENTS
        // =====================================================

        if (datasetSelect) {

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
        }


        if (applyFilters) {

            applyFilters.addEventListener(
                "click",
                loadDashboard
            );
        }


        if (resetFilters) {

            resetFilters.addEventListener(
                "click",
                async () => {

                    if (startDate) {

                        startDate.value =
                            "";
                    }


                    if (endDate) {

                        endDate.value =
                            "";
                    }


                    if (categoryFilter) {

                        categoryFilter.value =
                            "";
                    }


                    if (regionFilter) {

                        regionFilter.value =
                            "";
                    }


                    await loadDashboard();

                }
            );
        }


        // =====================================================
        // INITIAL LOAD
        // =====================================================

        async function initialize() {

            /*
             * If this is not the dashboard page,
             * there is nothing to initialize here.
             */

            if (!datasetSelect) {
                return;
            }


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