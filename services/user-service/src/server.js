const express = require("express");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

const pool = require("./db");

const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.json());

// ==========================================
// Health Check
// ==========================================

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "UP",
            service: "user-service",
            database: "UP"
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(503).json({
            status: "DOWN",
            service: "user-service",
            database: "DOWN"
        });
    }
});

// ==========================================
// Root
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "User service is working"
    });
});

// ==========================================
// Register User
// ==========================================

app.post("/users/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: result.insertId,
                name,
                email
            }
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Get User
// ==========================================

app.get("/users/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        const [users] = await pool.query(
            `SELECT id, name, email, status, created_at
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(users[0]);
    } catch (error) {
        console.error("Get user error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Create Expense
// ==========================================

app.post("/users/:userId/expenses", async (req, res) => {
    try {
        const userId = req.params.userId;

        const {
            title,
            description,
            amount,
            category
        } = req.body;

        // Validate required fields
        if (!title || !amount || !category) {
            return res.status(400).json({
                message: "Title, amount and category are required"
            });
        }

        // Validate amount
        if (Number(amount) <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than 0"
            });
        }

        // Validate category
        const allowedCategories = [
            "TRAVEL",
            "FOOD",
            "HOTEL",
            "OFFICE",
            "OTHER"
        ];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                message: "Invalid expense category"
            });
        }

        // Check user exists
        const [users] = await pool.query(
            "SELECT id FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Insert expense
        const [result] = await pool.query(
            `INSERT INTO expenses
            (user_id, title, description, amount, category)
            VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                title,
                description || null,
                amount,
                category
            ]
        );

        res.status(201).json({
            message: "Expense created successfully",
            expense: {
                id: result.insertId,
                user_id: Number(userId),
                title,
                description: description || null,
                amount,
                category,
                status: "PENDING"
            }
        });
    } catch (error) {
        console.error("Create expense error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Get User Expenses
// ==========================================

app.get("/users/:userId/expenses", async (req, res) => {
    try {
        const userId = req.params.userId;

        // Check user exists
        const [users] = await pool.query(
            "SELECT id FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const [expenses] = await pool.query(
            `SELECT
                id,
                user_id,
                title,
                description,
                amount,
                category,
                status,
                created_at,
                updated_at
             FROM expenses
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            count: expenses.length,
            expenses
        });
    } catch (error) {
        console.error("Get expenses error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Get Single Expense
// ==========================================

app.get(
    "/users/:userId/expenses/:expenseId",
    async (req, res) => {
        try {
            const {
                userId,
                expenseId
            } = req.params;

            const [expenses] = await pool.query(
                `SELECT
                    id,
                    user_id,
                    title,
                    description,
                    amount,
                    category,
                    status,
                    created_at,
                    updated_at
                 FROM expenses
                 WHERE id = ?
                 AND user_id = ?`,
                [expenseId, userId]
            );

            if (expenses.length === 0) {
                return res.status(404).json({
                    message: "Expense not found"
                });
            }

            res.json(expenses[0]);
        } catch (error) {
            console.error(
                "Get expense error:",
                error.message
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);

// ==========================================
// Delete Expense
// ==========================================

app.delete(
    "/users/:userId/expenses/:expenseId",
    async (req, res) => {
        try {
            const {
                userId,
                expenseId
            } = req.params;

            // Only allow deleting pending expenses
            const [expenses] = await pool.query(
                `SELECT id, status
                 FROM expenses
                 WHERE id = ?
                 AND user_id = ?`,
                [expenseId, userId]
            );

            if (expenses.length === 0) {
                return res.status(404).json({
                    message: "Expense not found"
                });
            }

            if (expenses[0].status !== "PENDING") {
                return res.status(400).json({
                    message:
                        "Only pending expenses can be deleted"
                });
            }

            await pool.query(
                `DELETE FROM expenses
                 WHERE id = ?
                 AND user_id = ?`,
                [expenseId, userId]
            );

            res.json({
                message: "Expense deleted successfully"
            });
        } catch (error) {
            console.error(
                "Delete expense error:",
                error.message
            );

            res.status(500).json({
                message: "Internal server error"
            });
        }
    }
);

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
