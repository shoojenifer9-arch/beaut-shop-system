// ================= PRODUCTS =================

async function loadProducts() {
    try {
        const response = await fetch("/products");

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const products = await response.json();

        const productList = document.getElementById("productList");

        productList.innerHTML = "";

        products.forEach(function(product) {

            productList.innerHTML += `
                <tr>
                    <td>${product.name}</td>

                    <td>
                        ${Number(product.buying_price).toLocaleString()}
                    </td>

                    <td>
                        ${Number(product.price).toLocaleString()}
                    </td>

                    <td>
                        ${product.quantity}
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error(error);
        alert("Failed to load products");
    }
}


// ================= ADD PRODUCT =================

async function addProduct() {

    const name = document.getElementById("productName").value;
    const buying_price = document.getElementById("buyingPrice").value;
    const price = document.getElementById("productPrice").value;
    const quantity = document.getElementById("productQuantity").value;

    if (
        name === "" ||
        buying_price === "" ||
        price === "" ||
        quantity === ""
    ) {
        alert("Please fill all fields");
        return;
    }

    if (
        Number(buying_price) < 0 ||
        Number(price) < 0 ||
        Number(quantity) <= 0
    ) {
        alert("Please enter valid values");
        return;
    }

    try {

        const response = await fetch("/products", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                buying_price: buying_price,
                price: price,
                quantity: quantity
            })
        });

        const data = await response.json();

        if (data.success) {

            alert("Product added successfully!");

            // Clear form
            document.getElementById("productName").value = "";
            document.getElementById("buyingPrice").value = "";
            document.getElementById("productPrice").value = "";
            document.getElementById("productQuantity").value = "";

            // Reload table
            loadProducts();

        } else {

            alert(data.message || "Failed to add product");

        }

    } catch (error) {

        console.error(error);
        alert("Server connection failed");

    }
}


// ================= BACK TO DASHBOARD =================

function goDashboard() {
    window.location.href = "dashboard.html";
}


// ================= LOAD PRODUCTS =================

document.addEventListener("DOMContentLoaded", function() {
    loadProducts();
});