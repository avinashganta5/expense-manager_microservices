const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const pool = require("./db");

const app = express();

const PORT = process.env.PORT || 3002;

app.use(express.json());

// ==========================================
// Health Check
// ==========================================

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "UP",
            service: "admin-service",
            database: "UP"
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(503).json({
            status: "DOWN",
            service: "admin-service",
            database: "DOWN"
        });
    }
});

// ==========================================
// Root
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "Admin service is working"
    });
});

// ==========================================
// Get All Users
// ==========================================

app.get("/admin/users", async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT
                id,
                name,
                email,
                status,
                created_at,
                updated_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Get users error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Get All Expenses
// ==========================================

app.get("/admin/expenses", async (req, res) => {
    try {
        const [expenses] = await pool.query(
            `SELECT
                e.id,
                e.user_id,
                u.name AS user_name,
                u.email AS user_email,
                e.title,
                e.description,
                e.amount,
                e.category,
                e.status,
                e.created_at,
                e.updated_at
             FROM expenses e
             JOIN users u
                 ON e.user_id = u.id
             ORDER BY e.created_at DESC`
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

app.get("/admin/expenses/:id", async (req, res) => {
    try {
        const expenseId = req.params.id;

        const [expenses] = await pool.query(
            `SELECT
                e.id,
                e.user_id,
                u.name AS user_name,
                u.email AS user_email,
                e.title,
                e.description,
                e.amount,
                e.category,
                e.status,
                e.created_at,
                e.updated_at
             FROM expenses e
             JOIN users u
                 ON e.user_id = u.id
             WHERE e.id = ?`,
            [expenseId]
        );

        if (expenses.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.json(expenses[0]);
    } catch (error) {
        console.error("Get expense error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Approve Expense
// ==========================================

app.put("/admin/expenses/:id/approve", async (req, res) => {
    try {
        const expenseId = req.params.id;

        const [expenses] = await pool.query(
            `SELECT id, status
             FROM expenses
             WHERE id = ?`,
            [expenseId]
        );

        if (expenses.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        if (expenses[0].status !== "PENDING") {
            return res.status(400).json({
                message: "Only pending expenses can be approved"
            });
        }

        await pool.query(
            `UPDATE expenses
             SET status = 'APPROVED'
             WHERE id = ?`,
            [expenseId]
        );

        res.json({
            message: "Expense approved successfully",
            expense_id: Number(expenseId),
            status: "APPROVED"
        });
    } catch (error) {
        console.error("Approve expense error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Reject Expense
// ==========================================

app.put("/admin/expenses/:id/reject", async (req, res) => {
    try {
        const expenseId = req.params.id;

        const [expenses] = await pool.query(
            `SELECT id, status
             FROM expenses
             WHERE id = ?`,
            [expenseId]
        );

        if (expenses.length === 0) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        if (expenses[0].status !== "PENDING") {
            return res.status(400).json({
                message: "Only pending expenses can be rejected"
            });
        }

        await pool.query(
            `UPDATE expenses
             SET status = 'REJECTED'
             WHERE id = ?`,
            [expenseId]
        );

        res.json({
            message: "Expense rejected successfully",
            expense_id: Number(expenseId),
            status: "REJECTED"
        });
    } catch (error) {
        console.error("Reject expense error:", error.message);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {
    console.log(`Admin Service running on port ${PORT}`);
});
