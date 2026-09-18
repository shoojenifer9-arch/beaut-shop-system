const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ================= MYSQL CONNECTION =================

const db = mysql.createConnection(
    process.env.MYSQL_URL || {
        host: "localhost",
        user: "root",
        password: "",
        database: "beautyshop"
    }
);

db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
    } else {
        console.log("MySQL connected successfully!");
    }
});

// ================= HOME PAGE =================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// ================= LOGIN =================

app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (username === "admin" && password === "1234") {

        res.json({
            success: true,
            message: "Login successful"
        });

    } else {

        res.json({
            success: false,
            message: "Username or password is incorrect"
        });
    }
});

// ================= GET ALL PRODUCTS =================

app.get("/products", (req, res) => {

    db.query(
        "SELECT * FROM products ORDER BY id DESC",
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to get products"
                });
            }

            res.json(results);
        }
    );
});

// ================= ADD PRODUCT =================

app.post("/products", (req, res) => {

    const {
        name,
        buying_price,
        price,
        quantity
    } = req.body;

    if (
        !name ||
        buying_price === "" ||
        price === "" ||
        quantity === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "Please fill all fields"
        });
    }

    const sql = `
        INSERT INTO products
        (name, price, buying_price, quantity)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            name,
            price,
            buying_price,
            quantity
        ],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to add product"
                });
            }

            res.json({
                success: true,
                message: "Product added successfully",
                id: result.insertId
            });
        }
    );
});

// ================= SELL PRODUCT =================

app.post("/sell", (req, res) => {

    const {
        productId,
        saleQuantity
    } = req.body;

    if (!productId || !saleQuantity) {

        return res.status(400).json({
            success: false,
            message: "Please select product and quantity"
        });
    }

    db.query(
        "SELECT * FROM products WHERE id = ?",
        [productId],
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Database error"
                });
            }

            if (results.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            // Product found
            const product = results[0];

            // Check stock
            if (Number(product.quantity) < Number(saleQuantity)) {

                return res.json({
                    success: false,
                    message: "Not enough stock"
                });
            }

            // Calculate total
            const total =
                Number(product.price) * Number(saleQuantity);

            // Calculate remaining stock
            const newQuantity =
                Number(product.quantity) - Number(saleQuantity);

            // Reduce stock
            db.query(
                "UPDATE products SET quantity = ? WHERE id = ?",
                [
                    newQuantity,
                    productId
                ],
                (err) => {

                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            success: false,
                            message: "Failed to update stock"
                        });
                    }

                    // Save sale history
                    db.query(
                        `INSERT INTO sales
                        (product_id, product_name, price, quantity, total, sale_date)
                        VALUES (?, ?, ?, ?, ?, NOW())`,
                        [
                            product.id,
                            product.name,
                            product.price,
                            saleQuantity,
                            total
                        ],
                        (err) => {

                            if (err) {
                                console.log(err);

                                return res.status(500).json({
                                    success: false,
                                    message: "Stock updated but sale was not recorded"
                                });
                            }

                            res.json({
                                success: true,
                                message: "Product sold and sale recorded successfully",
                                total: total,
                                remainingStock: newQuantity
                            });
                        }
                    );
                }
            );
        }
    );
});

// ================= SALES HISTORY =================

app.get("/sales-history", (req, res) => {

    db.query(
        "SELECT * FROM sales ORDER BY id DESC",
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to load sales history"
                });
            }

            res.json(results);
        }
    );
});

// ================= TOTAL NUMBER OF PRODUCTS =================

app.get("/products-count", (req, res) => {

    db.query(
        "SELECT COUNT(*) AS total FROM products",
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to count products"
                });
            }

            res.json({
                total: results[0].total
            });
        }
    );
});

// ================= TOTAL ITEMS SOLD =================

app.get("/items-sold", (req, res) => {

    db.query(
        "SELECT COALESCE(SUM(quantity), 0) AS total FROM sales",
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    message: "Failed to calculate items sold"
                });
            }

            res.json({
                total: results[0].total
            });
        }
    );
});

// ======================================================
//                    DASHBOARD DATA
// ======================================================

// ================= DAILY SALES =================

app.get("/dashboard/daily-sales", (req, res) => {

    db.query(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM sales
         WHERE DATE(sale_date) = CURDATE()`,
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    total: 0
                });
            }

            res.json({
                success: true,
                total: results[0].total
            });
        }
    );
});

// ================= WEEKLY SALES =================

app.get("/dashboard/weekly-sales", (req, res) => {

    db.query(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM sales
         WHERE YEARWEEK(sale_date, 1)
         = YEARWEEK(CURDATE(), 1)`,
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    total: 0
                });
            }

            res.json({
                success: true,
                total: results[0].total
            });
        }
    );
});

// ================= MONTHLY SALES =================

app.get("/dashboard/monthly-sales", (req, res) => {

    db.query(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM sales
         WHERE YEAR(sale_date) = YEAR(CURDATE())
         AND MONTH(sale_date) = MONTH(CURDATE())`,
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    total: 0
                });
            }

            res.json({
                success: true,
                total: results[0].total
            });
        }
    );
});

// ================= TOTAL PRODUCT TYPES =================

app.get("/dashboard/total-products", (req, res) => {

    db.query(
        "SELECT COUNT(*) AS total FROM products",
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    total: 0
                });
            }

            res.json({
                success: true,
                total: results[0].total
            });
        }
    );
});

// ================= TOTAL STOCK ITEMS =================

app.get("/dashboard/stock", (req, res) => {

    db.query(
        "SELECT COALESCE(SUM(quantity), 0) AS total FROM products",
        (err, results) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    success: false,
                    total: 0
                });
            }

            res.json({
                success: true,
                total: results[0].total
            });
        }
    );
});

// ================= TOTAL PROFIT =================

app.get("/dashboard/profit", (req, res) => {

    const sql = `
        SELECT COALESCE(
            SUM(
                (s.price - p.buying_price) * s.quantity
            ),
            0
        ) AS profit
        FROM sales s
        INNER JOIN products p
            ON s.product_id = p.id
        WHERE DATE(s.sale_date) = CURDATE()
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.log("Profit error:", err);

            return res.status(500).json({
                success: false,
                profit: 0
            });
        }

        res.json({
            success: true,
            profit: Number(results[0].profit || 0)
        });
    });
});
// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});