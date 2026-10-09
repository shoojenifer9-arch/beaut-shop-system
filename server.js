const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ================= MYSQL CONNECTION =================

const db = mysql.createPool({
    host: process.env.MYSQLHOST || "localhost",
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "beautyshop",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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
        "SELECT id, name, price, buying_price, quantity, date_added FROM products ORDER BY id DESC",
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
// ================= EDIT PRODUCT =================

app.put("/products/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, buying_price, price, quantity } = req.body;

    if (
        !Number.isInteger(id) || id <= 0 ||
        typeof name !== "string" || !name.trim() ||
        name.trim().length > 100 ||
        buying_price === undefined || buying_price === "" ||
        price === undefined || price === "" ||
        quantity === undefined || quantity === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid product details"
        });
    }

    const bp = Number(buying_price);
    const sp = Number(price);
    const qty = Number(quantity);

    if (
        !Number.isFinite(bp) || bp < 0 ||
        !Number.isFinite(sp) || sp < 0 ||
        !Number.isInteger(qty) || qty < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Prices must be non-negative and quantity must be a whole number"
        });
    }

    const sql = `
        UPDATE products
        SET name = ?, buying_price = ?, price = ?, quantity = ?
        WHERE id = ?
    `;

    db.query(sql, [name.trim(), bp, sp, qty, id], (err, result) => {
        if (err) {
            console.error("Edit product error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to update product"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully"
        });
    });
});


// ================= DELETE PRODUCT =================

app.delete("/products/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    // Protect products that already have sales history.
    db.query(
        "SELECT id FROM sales WHERE product_id = ? LIMIT 1",
        [id],
        (err, sales) => {
            if (err) {
                console.error("Check sales error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Could not check sales history"
                });
            }

            if (sales.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "This product has sales history and cannot be deleted. You can edit its details instead."
                });
            }

            db.query(
                "DELETE FROM products WHERE id = ?",
                [id],
                (deleteErr, result) => {
                    if (deleteErr) {
                        console.error("Delete product error:", deleteErr);
                        return res.status(500).json({
                            success: false,
                            message: "Failed to delete product"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({
                            success: false,
                            message: "Product not found"
                        });
                    }

                    res.json({
                        success: true,
                        message: "Product deleted successfully"
                    });
                }
            );
        }
    );
});

// ================= SELL PRODUCT =================

app.post("/sell", (req, res) => {
    const { productId, saleQuantity } = req.body;

    const id = Number(productId);
    const qty = Number(saleQuantity);

    if (!Number.isInteger(id) || id <= 0 ||
        !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({
            success: false,
            message: "Please select a product and enter a valid quantity"
        });
    }

    db.getConnection((err, connection) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Database connection failed"
            });
        }

        const rollback = (status, message) => {
            connection.rollback(() => {
                connection.release();
                res.status(status).json({
                    success: false,
                    message
                });
            });
        };

        connection.beginTransaction((err) => {
            if (err) {
                console.error(err);
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: "Could not start transaction"
                });
            }

            connection.query(
                "SELECT * FROM products WHERE id = ? FOR UPDATE",
                [id],
                (err, results) => {
                    if (err) {
                        console.error(err);
                        return rollback(500, "Database error");
                    }

                    if (results.length === 0) {
                        return rollback(404, "Product not found");
                    }

                    const product = results[0];
                    const stockBefore = Number(product.quantity);

                    if (stockBefore < qty) {
                        return rollback(400, "Not enough stock");
                    }

                    const total = Number(product.price) * qty;
                    const stockAfter = stockBefore - qty;

                    connection.query(
                        "UPDATE products SET quantity = ? WHERE id = ?",
                        [stockAfter, id],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return rollback(500, "Failed to update stock");
                            }

                            connection.query(
                                `INSERT INTO sales
                                (product_id, product_name, price, quantity, total, sale_date)
                                VALUES (?, ?, ?, ?, ?, NOW())`,
                                [
                                    product.id,
                                    product.name,
                                    product.price,
                                    qty,
                                    total
                                ],
                                (err) => {
                                    if (err) {
                                        console.error(err);
                                        return rollback(500, "Failed to record sale");
                                    }

                                    connection.query(
                                        `INSERT INTO stock_history
                                        (product_id, product_name, movement_type,
                                         quantity, buying_price, stock_before,
                                         stock_after, reason, notes, movement_date)
                                        VALUES (?, ?, 'OUT', ?, ?, ?, ?, 'Sale', NULL, NOW())`,
                                        [
                                            product.id,
                                            product.name,
                                            qty,
                                            product.buying_price || 0,
                                            stockBefore,
                                            stockAfter
                                        ],
                                        (err) => {
                                            if (err) {
                                                console.error(err);
                                                return rollback(
                                                    500,
                                                    "Failed to record stock history"
                                                );
                                            }

                                            connection.commit((err) => {
                                                if (err) {
                                                    console.error(err);
                                                    return rollback(
                                                        500,
                                                        "Failed to save transaction"
                                                    );
                                                }

                                                connection.release();

                                                return res.json({
                                                    success: true,
                                                    message: "Sale and stock history recorded successfully",
                                                    total,
                                                    remainingStock: stockAfter
                                                });
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
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
// ================= STOCK HISTORY =================

// GET: View stock movement history
app.get("/stock-history", (req, res) => {
    const sql = `
        SELECT
            id,
            product_id,
            product_name,
            movement_type,
            quantity,
            buying_price,
            stock_before,
            stock_after,
            reason,
            notes,
            movement_date
        FROM stock_history
        ORDER BY movement_date DESC, id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Stock history error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to load stock history"
            });
        }

        res.json({
            success: true,
            history: results
        });
    });
});


// POST: Add incoming stock
app.post("/stock/in", (req, res) => {
    const { productId, quantity, buyingPrice, notes } = req.body;

    const id = Number(productId);
    const qty = Number(quantity);
    const cost = Number(buyingPrice);

    if (
        !Number.isInteger(id) || id <= 0 ||
        !Number.isInteger(qty) || qty <= 0 ||
        !Number.isFinite(cost) || cost < 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid product, quantity and buying price"
        });
    }

    if (notes != null &&
        (typeof notes !== "string" || notes.length > 255)) {
        return res.status(400).json({
            success: false,
            message: "Notes must not exceed 255 characters"
        });
    }

    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error(connectionError);
            return res.status(500).json({
                success: false,
                message: "Database connection failed"
            });
        }

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: "Could not start stock transaction"
                });
            }

            connection.query(
                "SELECT * FROM products WHERE id = ? FOR UPDATE",
                [id],
                (err, rows) => {
                    if (err || rows.length === 0) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(err ? 500 : 404).json({
                                success: false,
                                message: err
                                    ? "Failed to find product"
                                    : "Product not found"
                            });
                        });
                    }

                    const product = rows[0];
                    const before = Number(product.quantity);
                    const after = before + qty;

                    // Update current stock and latest buying price
                    connection.query(
                        `UPDATE products
                         SET quantity = ?, buying_price = ?
                         WHERE id = ?`,
                        [after, cost, id],
                        err => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({
                                        success: false,
                                        message: "Failed to update stock"
                                    });
                                });
                            }

                            connection.query(
                                `INSERT INTO stock_history
                                (product_id, product_name, movement_type,
                                 quantity, buying_price, stock_before,
                                 stock_after, reason, notes, movement_date)
                                VALUES (?, ?, 'IN', ?, ?, ?, ?,
                                        'Stock received', ?, NOW())`,
                                [
                                    id, product.name, qty, cost,
                                    before, after, notes || null
                                ],
                                err => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            res.status(500).json({
                                                success: false,
                                                message: "Failed to save stock history"
                                            });
                                        });
                                    }

                                    connection.commit(err => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                connection.release();
                                                res.status(500).json({
                                                    success: false,
                                                    message: "Failed to save stock transaction"
                                                });
                                            });
                                        }

                                        connection.release();
                                        res.json({
                                            success: true,
                                            message: "Stock received successfully",
                                            stockBefore: before,
                                            stockAfter: after
                                        });
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});


// POST: Remove stock for damage, expiry or other reasons
app.post("/stock/out", (req, res) => {
    const { productId, quantity, reason, notes } = req.body;

    const id = Number(productId);
    const qty = Number(quantity);
    const allowedReasons = [
        "Damaged",
        "Expired",
        "Lost",
        "Internal use",
        "Other"
    ];

    if (
        !Number.isInteger(id) || id <= 0 ||
        !Number.isInteger(qty) || qty <= 0 ||
        !allowedReasons.includes(reason)
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid product, quantity and reason"
        });
    }

    if (notes != null &&
        (typeof notes !== "string" || notes.length > 255)) {
        return res.status(400).json({
            success: false,
            message: "Notes must not exceed 255 characters"
        });
    }

    db.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error(connectionError);
            return res.status(500).json({
                success: false,
                message: "Database connection failed"
            });
        }

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({
                    success: false,
                    message: "Could not start stock transaction"
                });
            }

            connection.query(
                "SELECT * FROM products WHERE id = ? FOR UPDATE",
                [id],
                (err, rows) => {
                    if (err || rows.length === 0) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(err ? 500 : 404).json({
                                success: false,
                                message: err
                                    ? "Failed to find product"
                                    : "Product not found"
                            });
                        });
                    }

                    const product = rows[0];
                    const before = Number(product.quantity);

                    if (qty > before) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(400).json({
                                success: false,
                                message: "Quantity exceeds available stock"
                            });
                        });
                    }

                    const after = before - qty;

                    connection.query(
                        "UPDATE products SET quantity = ? WHERE id = ?",
                        [after, id],
                        err => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({
                                        success: false,
                                        message: "Failed to update stock"
                                    });
                                });
                            }

                            connection.query(
                                `INSERT INTO stock_history
                                (product_id, product_name, movement_type,
                                 quantity, buying_price, stock_before,
                                 stock_after, reason, notes, movement_date)
                                VALUES (?, ?, 'OUT', ?, ?, ?, ?, ?, ?, NOW())`,
                                [
                                    id, product.name, qty,
                                    Number(product.buying_price || 0),
                                    before, after, reason, notes || null
                                ],
                                err => {
                                    if (err) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            res.status(500).json({
                                                success: false,
                                                message: "Failed to save stock history"
                                            });
                                        });
                                    }

                                    connection.commit(err => {
                                        if (err) {
                                            return connection.rollback(() => {
                                                connection.release();
                                                res.status(500).json({
                                                    success: false,
                                                    message: "Failed to save stock transaction"
                                                });
                                            });
                                        }

                                        connection.release();
                                        res.json({
                                            success: true,
                                            message: "Stock removed successfully",
                                            stockBefore: before,
                                            stockAfter: after
                                        });
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});
// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});