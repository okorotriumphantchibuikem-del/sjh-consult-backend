const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const db = require("./db");
const { router: authRoutes } = require("./auth");
const { router: adminRoutes } = require("./admin");
const { router: userRoutes } = require("./user");
const { initializeAdminSystem } = require("./admin-init");

const app = express();

app.disable("x-powered-by");

const configuredFrontends = String(
    process.env.FRONTEND_URL || "http://127.0.0.1:5500"
)
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);

const allowedOrigins = new Set([
    ...configuredFrontends,
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://sjh-consult-backend.vercel.app"
]);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            return callback(new Error("CORS origin not allowed"));
        },
        credentials: true
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

app.post("/api/public/contact", async (req, res) => {
    try {
        const name = String(req.body.name || "")
            .trim()
            .slice(0, 150);

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase()
            .slice(0, 190);

        const phone = String(req.body.phone || "")
            .trim()
            .slice(0, 60);

        const subject = String(req.body.subject || "")
            .trim()
            .slice(0, 200);

        const message = String(req.body.message || "").trim();

        const website = String(req.body.website || "").trim();

        if (website) {
            return res.status(400).json({
                success: false,
                message: "Unable to submit this message."
            });
        }

        if (
            !name ||
            !/^\S+@\S+\.\S+$/.test(email) ||
            message.length < 10 ||
            message.length > 5000
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please complete the form with a valid email and a message of at least 10 characters."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO messages
            (user_id, sender_name, sender_email, sender_phone, subject, message)
            VALUES (NULL, ?, ?, ?, ?, ?)`,
            [
                name,
                email,
                phone || null,
                subject || "Website enquiry",
                message
            ]
        );

        try {
            await db.execute(
                `INSERT INTO admin_notifications
                (title, message, type)
                VALUES (?, ?, ?)`,
                [
                    "New website enquiry",
                    `${name} (${email}) sent a contact message: ${message.slice(
                        0,
                        180
                    )}`,
                    "info"
                ]
            );
        } catch (e) {
            console.error(
                "Contact notification error:",
                e
            );
        }

        res.status(201).json({
            success: true,
            message:
                "Thank you. Your message has been received. SJH Consult will get back to you soon.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Public contact error:", error);

        res.status(500).json({
            success: false,
            message:
                "Unable to submit your message right now. Please try again."
        });
    }
});

app.post("/api/public/professional-requests", async (req, res) => {
    try {
        const category = String(req.body.category || "")
            .trim()
            .slice(0, 100);

        const message = String(req.body.message || "").trim();

        const email = String(req.body.email || "")
            .trim()
            .toLowerCase();

        const phone = String(req.body.phone || "").trim();

        const website = String(req.body.website || "").trim();

        if (website) {
            return res.status(400).json({
                success: false,
                message: "Unable to submit this request."
            });
        }

        if (message.length < 10 || message.length > 5000) {
            return res.status(400).json({
                success: false,
                message:
                    "Please tell us what professionals you need (10–5,000 characters)."
            });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (phone.length < 7 || phone.length > 60) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a valid phone or WhatsApp number."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO professional_requests
            (category, message, email, phone)
            VALUES (?, ?, ?, ?)`,
            [
                category || null,
                message,
                email,
                phone
            ]
        );

        try {
            await db.execute(
                `INSERT INTO admin_notifications
                (title, message, type)
                VALUES (?, ?, ?)`,
                [
                    "New professional request",
                    `A client needs professionals. Contact: ${email} / ${phone}. Request: ${message.slice(
                        0,
                        180
                    )}`,
                    "info"
                ]
            );
        } catch (e) {
            console.error(
                "Professional request notification error:",
                e
            );
        }

        res.status(201).json({
            success: true,
            message:
                "Your request has been received. SJH Consult will contact you shortly.",
            id: result.insertId
        });
    } catch (error) {
        console.error(
            "Professional request error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to submit your request right now. Please try again."
        });
    }
});

app.get("/api/public/jobs", async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                id,
                title,
                company,
                location,
                category,
                job_type,
                experience,
                salary,
                description,
                requirements,
                created_at
            FROM jobs
            WHERE status = 'active'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            jobs: rows
        });
    } catch (error) {
        console.error("Public jobs error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load jobs"
        });
    }
});

app.get("/api/public/courses", async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                id,
                title,
                category,
                price,
                description
            FROM training_courses
            WHERE status = 'active'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            courses: rows
        });
    } catch (error) {
        console.error("Public courses error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load training"
        });
    }
});

app.get("/api/public/services", async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT
                id,
                name,
                category,
                description,
                price
            FROM services
            WHERE status = 'active'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            services: rows
        });
    } catch (error) {
        console.error("Public services error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load services"
        });
    }
});

app.get("/api/public/settings", async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT setting_key, setting_value FROM site_settings"
        );

        const settings = {};

        rows.forEach((row) => {
            settings[row.setting_key] = row.setting_value;
        });

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error("Public settings error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load site settings"
        });
    }
});

app.get("/api/health", async (req, res) => {
    try {
        const connection = await db.getConnection();

        connection.release();

        res.json({
            success: true,
            message:
                "SJH Consult backend and database are connected"
        });
    } catch (error) {
        console.error(
            "Database connection error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Backend is running, but database connection failed"
        });
    }
});

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to SJH Consult API"
    });
});

app.use((error, req, res, next) => {
    console.error("Unhandled server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message:
            "An unexpected server error occurred"
    });
});

async function ensureTables() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_password_resets_user_id (user_id),
            CONSTRAINT fk_password_resets_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    `);
}

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

async function startServer() {
    try {
        console.log("Starting SJH Consult backend...");
        console.log("Environment:", process.env.NODE_ENV || "development");
        console.log("Port:", PORT);

        console.log("Testing database connection...");

        const connection = await db.getConnection();

        console.log("Database connection successful.");

        connection.release();

        console.log("Checking required database tables...");

        await ensureTables();

        console.log("Password reset table is ready.");

        console.log("Initializing admin system...");

        await initializeAdminSystem();

        console.log(
            "Authentication and admin tables are ready."
        );

        const server = app.listen(PORT, "0.0.0.0", () => {
            console.log(
                `SJH Consult backend running on port ${PORT}`
            );

            console.log(
                "SJH Consult backend started successfully."
            );
        });

        server.on("error", (error) => {
            console.error("SERVER ERROR:", error);
            console.error("SERVER ERROR MESSAGE:", error?.message);
            console.error("SERVER ERROR CODE:", error?.code);
            console.error("SERVER ERROR STACK:", error?.stack);
        });
    } catch (error) {
        console.error(
            "========================================"
        );

        console.error(
            "UNABLE TO START SJH CONSULT BACKEND"
        );

        console.error(
            "========================================"
        );

        console.error("FULL ERROR:", error);
        console.error("ERROR MESSAGE:", error?.message);
        console.error("ERROR CODE:", error?.code);
        console.error("ERROR ERRNO:", error?.errno);
        console.error("ERROR SQL STATE:", error?.sqlState);
        console.error("ERROR SQL MESSAGE:", error?.sqlMessage);
        console.error("ERROR STACK:", error?.stack);

        console.error(
            "========================================"
        );

        process.exit(1);
    }
}

startServer();