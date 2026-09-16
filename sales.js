let products = [];


// ================= LOAD PRODUCTS =================

async function loadProducts() {

    try {

        const response = await fetch("/products");

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        products = await response.json();

        const select = document.getElementById("productSelect");
        const productList = document.getElementById("productList");

        // Clear old data
        select.innerHTML = '<option value="">Select Product</option>';
        productList.innerHTML = "";

        products.forEach(function(product) {

            // Dropdown
            select.innerHTML += `
                <option value="${product.id}">
                    ${product.name} - Stock: ${product.quantity}
                </option>
            `;

            // Table
            productList.innerHTML += `
                <tr>
                    <td>${product.name}</td>

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


// ================= SELL PRODUCT =================

async function sellProduct() {

    const productId =
        document.getElementById("productSelect").value;

    const saleQuantity =
        document.getElementById("saleQuantity").value;


    if (productId === "" || saleQuantity === "") {

        alert("Please select product and enter quantity");

        return;
    }


    if (Number(saleQuantity) <= 0) {

        alert("Quantity must be greater than 0");

        return;
    }


    try {

        const response = await fetch("/sell", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                productId: productId,
                saleQuantity: saleQuantity
            })

        });


        const data = await response.json();


        if (data.success) {

            alert(
                "Product sold successfully!\n\n" +
                "Total: " +
                Number(data.total).toLocaleString() +
                "\nRemaining Stock: " +
                data.remainingStock
            );


            document.getElementById("saleQuantity").value = "";

            // Refresh table
            loadProducts();

        } else {

            alert(data.message || "Sale failed");

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


// ================= START =================

document.addEventListener("DOMContentLoaded", function() {

    loadProducts();

});