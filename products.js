// ================= PRODUCTS =================

let allProducts = [];

// Format prices safely
function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
}

// Escape database text before displaying it in HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Format Date Added
function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


// ================= LOAD PRODUCTS =================

async function loadProducts() {
    const productList = document.getElementById("productList");

    try {
        productList.innerHTML =
            '<tr><td colspan="6">Loading products...</td></tr>';

        const response = await fetch("/products");
        const products = await response.json();

        if (!response.ok || !Array.isArray(products)) {
            throw new Error(products.message || "Failed to load products");
        }

        allProducts = products;
        searchProducts();

    } catch (error) {
        console.error("Load products error:", error);

        productList.innerHTML =
            '<tr><td colspan="6">Failed to load products. Please refresh.</td></tr>';
    }
}


// ================= DISPLAY PRODUCTS =================

function displayProducts(products) {
    const productList = document.getElementById("productList");

    if (!products.length) {
        productList.innerHTML =
            '<tr><td colspan="6">No products found.</td></tr>';
        return;
    }

    productList.innerHTML = products.map(product => `
        <tr>
            <td>${escapeHTML(product.name)}</td>
            <td>${formatNumber(product.buying_price)}</td>
            <td>${formatNumber(product.price)}</td>
            <td>${formatNumber(product.quantity)}</td>
            <td>${formatDate(product.date_added)}</td>
            <td class="product-actions">
                <button type="button"
                    onclick="openEditModal(${Number(product.id)})">
                    Edit
                </button>

                <button type="button"
                    onclick="deleteProduct(${Number(product.id)})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}


// ================= SEARCH =================

function searchProducts() {
    const searchInput = document.getElementById("searchProduct");
    const term = searchInput.value.trim().toLowerCase();

    const filtered = allProducts.filter(product =>
        String(product.name || "").toLowerCase().includes(term)
    );

    displayProducts(filtered);
}


// ================= ADD PRODUCT =================

async function addProduct() {
    const name = document.getElementById("productName").value.trim();
    const buyingPrice = document.getElementById("buyingPrice").value;
    const sellingPrice = document.getElementById("productPrice").value;
    const quantity = document.getElementById("productQuantity").value;

    if (!name || buyingPrice === "" ||
        sellingPrice === "" || quantity === "") {
        alert("Please fill all fields.");
        return;
    }

    if (
        Number(buyingPrice) < 0 ||
        Number(sellingPrice) < 0 ||
        !Number.isFinite(Number(buyingPrice)) ||
        !Number.isFinite(Number(sellingPrice)) ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) <= 0
    ) {
        alert("Enter valid prices and a whole-number quantity greater than zero.");
        return;
    }

    try {
        const response = await fetch("/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                buying_price: Number(buyingPrice),
                price: Number(sellingPrice),
                quantity: Number(quantity)
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to add product");
        }

        alert("Product added successfully!");

        document.getElementById("productName").value = "";
        document.getElementById("buyingPrice").value = "";
        document.getElementById("productPrice").value = "";
        document.getElementById("productQuantity").value = "";

        await loadProducts();

    } catch (error) {
        console.error("Add product error:", error);
        alert(error.message || "Server connection failed.");
    }
}


// ================= OPEN EDIT FORM =================

function openEditModal(id) {
    const product = allProducts.find(item => Number(item.id) === id);

    if (!product) {
        alert("Product not found. Refresh the page.");
        return;
    }

    document.getElementById("editProductId").value = product.id;
    document.getElementById("editProductName").value = product.name;
    document.getElementById("editBuyingPrice").value = product.buying_price;
    document.getElementById("editSellingPrice").value = product.price;
    document.getElementById("editProductQuantity").value = product.quantity;

    document.getElementById("editProductModal").hidden = false;
}

function closeEditModal() {
    document.getElementById("editProductModal").hidden = true;
}


// ================= SAVE EDIT =================

async function updateProduct() {
    const id = document.getElementById("editProductId").value;
    const name = document.getElementById("editProductName").value.trim();
    const buyingPrice = document.getElementById("editBuyingPrice").value;
    const sellingPrice = document.getElementById("editSellingPrice").value;
    const quantity = document.getElementById("editProductQuantity").value;

    if (!name || buyingPrice === "" ||
        sellingPrice === "" || quantity === "") {
        alert("Please fill all fields.");
        return;
    }

    if (
        Number(buyingPrice) < 0 ||
        Number(sellingPrice) < 0 ||
        !Number.isFinite(Number(buyingPrice)) ||
        !Number.isFinite(Number(sellingPrice)) ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0
    ) {
        alert("Enter valid prices and a whole-number quantity (zero or more).");
        return;
    }

    try {
        const response = await fetch(`/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                buying_price: Number(buyingPrice),
                price: Number(sellingPrice),
                quantity: Number(quantity)
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to update product");
        }

        alert("Product updated successfully!");
        closeEditModal();
        await loadProducts();

    } catch (error) {
        console.error("Update product error:", error);
        alert(error.message || "Failed to update product.");
    }
}


// ================= DELETE PRODUCT =================

async function deleteProduct(id) {
    const product = allProducts.find(item => Number(item.id) === id);

    if (!product) {
        alert("Product not found. Refresh the page.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`/products/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to delete product");
        }

        alert("Product deleted successfully!");
        await loadProducts();

    } catch (error) {
        console.error("Delete product error:", error);
        alert(error.message || "Failed to delete product.");
    }
}


// ================= BACK TO DASHBOARD =================

function goDashboard() {
    window.location.href = "dashboard.html";
}


// ================= START =================

document.addEventListener("DOMContentLoaded", loadProducts);