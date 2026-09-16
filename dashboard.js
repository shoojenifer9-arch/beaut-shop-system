// ================= DASHBOARD.JS =================

// Format numbers
function formatNumber(number) {
    return Number(number || 0).toLocaleString();
}


// ================= DAILY SALES =================

async function loadDailySales() {
    try {
        const response = await fetch("/dashboard/daily-sales");
        const data = await response.json();

        document.getElementById("dailySales").textContent =
            formatNumber(data.total);

    } catch (error) {
        console.log("Daily sales error:", error);
    }
}


// ================= WEEKLY SALES =================

async function loadWeeklySales() {
    try {
        const response = await fetch("/dashboard/weekly-sales");
        const data = await response.json();

        document.getElementById("weeklySales").textContent =
            formatNumber(data.total);

    } catch (error) {
        console.log("Weekly sales error:", error);
    }
}


// ================= MONTHLY SALES =================

async function loadMonthlySales() {
    try {
        const response = await fetch("/dashboard/monthly-sales");
        const data = await response.json();

        document.getElementById("monthlySales").textContent =
            formatNumber(data.total);

    } catch (error) {
        console.log("Monthly sales error:", error);
    }
}


// ================= TOTAL PRODUCTS =================

async function loadTotalProducts() {
    try {
        const response = await fetch("/dashboard/total-products");
        const data = await response.json();

        document.getElementById("totalProducts").textContent =
            formatNumber(data.total);

    } catch (error) {
        console.log("Total products error:", error);
    }
}


// ================= TOTAL STOCK =================

async function loadStock() {
    try {
        const response = await fetch("/dashboard/stock");
        const data = await response.json();

        const stockElement = document.getElementById("stock");

        if (stockElement) {
            stockElement.textContent =
                formatNumber(data.total);
        }

    } catch (error) {
        console.log("Stock error:", error);
    }
}


// ================= PROFIT =================

async function loadProfit() {
    try {
        const response = await fetch("/dashboard/profit");
        const data = await response.json();

        document.getElementById("profit").textContent =
            formatNumber(data.profit);

    } catch (error) {
        console.log("Profit error:", error);
    }
}


// ================= LOAD ALL DASHBOARD DATA =================

async function loadDashboard() {

    await loadDailySales();

    await loadWeeklySales();

    await loadMonthlySales();

    await loadTotalProducts();

    await loadStock();

    await loadProfit();
}


// ================= START DASHBOARD =================

document.addEventListener("DOMContentLoaded", function() {
    loadDashboard();
});