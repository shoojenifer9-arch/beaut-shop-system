let stockProducts = [];
let stockHistory = [];

function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

function money(value) {
    return Number(value || 0).toLocaleString("en-US");
}

function selectedProduct() {
    return document.getElementById("stockProduct").value;
}

async function loadStockProducts() {
    const select = document.getElementById("stockProduct");

    try {
        const response = await fetch("/products");
        const data = await response.json();

        if (!response.ok || !Array.isArray(data)) {
            throw new Error("Could not load products");
        }

        stockProducts = data;

        select.innerHTML =
            '<option value="">Select product</option>' +
            data.map(p => `
                <option value="${Number(p.id)}">
                    ${safeText(p.name)} — Stock: ${Number(p.quantity)}
                </option>
            `).join("");

    } catch (error) {
        console.error(error);
        select.innerHTML =
            '<option value="">Failed to load products</option>';
    }
}

async function submitStock(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Stock operation failed");
    }

    return data;
}

async function stockIn() {
    const productId = selectedProduct();
    const quantity = document.getElementById("stockQuantity").value;
    const buyingPrice = document.getElementById("stockBuyingPrice").value;
    const notes = document.getElementById("stockNotes").value.trim();
    const expiryDate = document.getElementById("stockExpiryDate").value;
    if (!productId || quantity === "" || buyingPrice === "") {
        alert("Please select a product, quantity and buying price.");
        return;
    }

    if (
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) <= 0 ||
        !Number.isFinite(Number(buyingPrice)) ||
        Number(buyingPrice) < 0
    ) {
        alert("Enter a valid quantity and buying price.");
        return;
    }

    try {
        const result = await submitStock("/stock/in", {
            productId: Number(productId),
            quantity: Number(quantity),
            buyingPrice: Number(buyingPrice),
            notes
        });

        alert(
            `${result.message}\nStock before: ${result.stockBefore}` +
            `\nStock after: ${result.stockAfter}`
        );

        document.getElementById("stockQuantity").value = "";
        document.getElementById("stockBuyingPrice").value = "";
        document.getElementById("stockNotes").value = "";

        await loadStockProducts();
        await loadStockHistory();

    } catch (error) {
        alert(error.message);
    }
}

async function stockOut() {
    const productId = selectedProduct();
    const quantity = document.getElementById("stockQuantity").value;
    const reason = document.getElementById("stockReason").value;
    const notes = document.getElementById("stockNotes").value.trim();

    if (!productId || quantity === "" || !reason) {
        alert("Please select a product, quantity and reason.");
        return;
    }

    if (
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) <= 0
    ) {
        alert("Enter a valid whole-number quantity.");
        return;
    }

    if (!confirm("Are you sure you want to remove this stock?")) {
        return;
    }

    try {
        const result = await submitStock("/stock/out", {
            productId: Number(productId),
            quantity: Number(quantity),
            reason,
            notes
        });

        alert(
            `${result.message}\nStock before: ${result.stockBefore}` +
            `\nStock after: ${result.stockAfter}`
        );

        document.getElementById("stockQuantity").value = "";
        document.getElementById("stockReason").value = "";
        document.getElementById("stockNotes").value = "";

        await loadStockProducts();
        await loadStockHistory();

    } catch (error) {
        alert(error.message);
    }
}

async function loadStockHistory() {
    const tbody = document.getElementById("stockHistoryList");

    try {
        const response = await fetch("/stock-history");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Could not load history");
        }

        stockHistory = data.history;
        filterHistory();

    } catch (error) {
        console.error(error);
        tbody.innerHTML =
            '<tr><td colspan="8">Failed to load stock history.</td></tr>';
    }
}

function filterHistory() {
    const term = document.getElementById("historySearch")
        .value.trim().toLowerCase();

    const filtered = stockHistory.filter(item =>
        [
            item.product_name,
            item.movement_type,
            item.reason,
            item.notes
        ].some(value => String(value ?? "").toLowerCase().includes(term))
    );

    const tbody = document.getElementById("stockHistoryList");

    if (!filtered.length) {
        tbody.innerHTML =
            '<tr><td colspan="8">No stock history found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr>
            <td>${safeText(new Date(item.movement_date).toLocaleString())}</td>
            <td>${safeText(item.product_name)}</td>
            <td>${safeText(item.movement_type)}</td>
            <td>${Number(item.quantity)}</td>
            <td>${safeText(item.reason)}</td>
            <td>${Number(item.stock_before)}</td>
            <td>${Number(item.stock_after)}</td>
            <td>${safeText(item.notes || "-")}</td>
        </tr>
    `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    loadStockProducts();
    loadStockHistory();
});