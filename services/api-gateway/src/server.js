const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

// ==========================================
// Health Check
// ==========================================

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "api-gateway"
    });
});

// ==========================================
// User Service
// /api/users/*
//        ↓
// /users/*
// ==========================================

app.use(
    "/api/users",
    createProxyMiddleware({
        target: "http://localhost:3001",
        changeOrigin: true,

        pathRewrite: {
            "^/": "/users/"
        },

        on: {
            proxyReq: (proxyReq, req) => {
                console.log(
                    `[Gateway] ${req.method} ${req.originalUrl} -> User Service`
                );
            },

            error: (err) => {
                console.error(
                    `[Gateway] User Service Error: ${err.message}`
                );
            }
        }
    })
);

// ==========================================
// Admin Service
// /api/admin/*
//        ↓
// /admin/*
// ==========================================

app.use(
    "/api/admin",
    createProxyMiddleware({
        target: "http://localhost:3002",
        changeOrigin: true,

        pathRewrite: {
            "^/": "/admin/"
        },

        on: {
            proxyReq: (proxyReq, req) => {
                console.log(
                    `[Gateway] ${req.method} ${req.originalUrl} -> Admin Service`
                );
            },

            error: (err) => {
                console.error(
                    `[Gateway] Admin Service Error: ${err.message}`
                );
            }
        }
    })
);

// ==========================================
// 404 Handler
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found",
        path: req.originalUrl
    });
});

// ==========================================
// Start Server
// ==========================================

app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
