const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://127.0.0.1:5500").replace(/\/$/, "");
const API_URL = (process.env.API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createToken() {
    return crypto.randomBytes(32).toString("hex");
}

function getJwtSecret() {
    return process.env.JWT_SECRET || "";
}

function signUser(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            account_type: user.account_type
        },
        getJwtSecret(),
        { expiresIn: "7d" }
    );
}

function setAuthCookie(res, token) {
    res.cookie("sjh_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

function clearAuthCookie(res) {
    res.clearCookie("sjh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/"
    });
}

async function authenticate(req, res, next) {
    try {
        const token = req.cookies.sjh_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated"
            });
        }

        const secret = getJwtSecret();
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: "Server authentication configuration is missing"
            });
        }

        const decoded = jwt.verify(token, secret);

        const [users] = await db.execute(
            `SELECT id, full_name, email, phone, account_type,
                    profession, experience, career_field, job_title,
                    location, skill, bio, education, career_interest, email_verified, is_active,
                    created_at, updated_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account not found"
            });
        }

        const user = users[0];

        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before continuing"
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication"
        });
    }
}

async function sendVerificationEmail(user, token) {
    const verificationLink =
        `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: `"SJH Consult" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Verify Your SJH Consult Account",
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#07172d;line-height:1.6">
                <h2 style="margin-top:0">Welcome to SJH Consult</h2>
                <p>Hello ${escapeHtml(user.full_name)},</p>
                <p>Thank you for creating your SJH Consult account. Please verify your email address to activate your account.</p>
                <p style="margin:30px 0">
                    <a href="${verificationLink}" style="background:#d4af37;color:#07172d;padding:14px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">Verify My Email</a>
                </p>
                <p>This verification link will expire in 24 hours.</p>
                <p>If you did not create this account, you can safely ignore this email.</p>
                <p>Regards,<br>SJH Consult Team</p>
            </div>
        `
    });
}

async function sendResetEmail(user, token) {
    const resetLink =
        `${FRONTEND_URL}/auth/reset-password.html?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: `"SJH Consult" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Reset Your SJH Consult Password",
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#07172d;line-height:1.6">
                <h2 style="margin-top:0">Password Reset</h2>
                <p>Hello ${escapeHtml(user.full_name)},</p>
                <p>We received a request to reset your SJH Consult password.</p>
                <p style="margin:30px 0">
                    <a href="${resetLink}" style="background:#d4af37;color:#07172d;padding:14px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">Reset My Password</a>
                </p>
                <p>This link will expire in 30 minutes.</p>
                <p>If you did not request this, you can safely ignore this email.</p>
                <p>Regards,<br>SJH Consult Team</p>
            </div>
        `
    });
}

router.post("/register", async (req, res) => {
    let connection;

    try {
        const full_name = String(req.body.full_name || "").trim();
        const email = normalizeEmail(req.body.email);
        const phone = String(req.body.phone || "").trim();
        const account_type = String(req.body.account_type || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const profession = String(req.body.profession || "").trim();
        const experience = String(req.body.experience || "").trim();
        const career_field = String(req.body.career_field || "").trim();
        const job_title = String(req.body.job_title || "").trim();
        const location = String(req.body.location || "").trim();
        const skill = String(req.body.skill || "").trim();
        const bio = String(req.body.bio || "").trim();

        if (!full_name || !email || !phone || !account_type || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields"
            });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        if (!["artisan", "corporate"].includes(account_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account type"
            });
        }

        if (account_type === "artisan" && (!profession || !experience || !skill || !bio)) {
            return res.status(400).json({
                success: false,
                message: "Please complete your artisan professional details"
            });
        }

        if (account_type === "corporate" && (!career_field || !job_title)) {
            return res.status(400).json({
                success: false,
                message: "Please complete your corporate worker details"
            });
        }

        const [existingUsers] = await db.execute(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationToken = createToken();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO users
            (full_name, email, phone, account_type, password,
             profession, experience, career_field, job_title,
             location, skill, bio, email_verified,
             verification_token, verification_expires)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
            [
                full_name,
                email,
                phone,
                account_type,
                hashedPassword,
                profession || null,
                experience || null,
                career_field || null,
                job_title || null,
                location || null,
                skill || null,
                bio || null,
                verificationToken,
                verificationExpires
            ]
        );

        const user = {
            id: result.insertId,
            full_name,
            email,
            account_type
        };

        await connection.commit();
        connection = null;

        let emailSent = true;

        try {
            await sendVerificationEmail(user, verificationToken);
        } catch (emailError) {
            emailSent = false;
            console.error("Verification email error:", emailError);
        }

        return res.status(201).json({
            success: true,
            email_sent: emailSent,
            message: emailSent
                ? "Account created successfully. Please check your email to verify your account."
                : "Account created successfully, but the verification email could not be sent. Please use Resend verification from the login page.",
            user_id: result.insertId
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {}
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create account. Please check your server email settings and try again."
        });
    } finally {
        if (connection) connection.release();
    }
});

router.get("/verify-email", async (req, res) => {
    const invalidUrl = `${FRONTEND_URL}/auth/verify-email.html?status=invalid`;
    const errorUrl = `${FRONTEND_URL}/auth/verify-email.html?status=error`;

    try {
        const token = String(req.query.token || "").trim();

        if (!token || token.length < 32) {
            return res.redirect(invalidUrl);
        }

        const [users] = await db.execute(
            `SELECT id, email_verified, verification_expires
             FROM users
             WHERE verification_token = ?
             LIMIT 1`,
            [token]
        );

        if (users.length === 0) {
            return res.redirect(invalidUrl);
        }

        const user = users[0];

        if (user.email_verified) {
            return res.redirect(`${FRONTEND_URL}/auth/verify-email.html?status=already`);
        }

        if (!user.verification_expires || new Date(user.verification_expires).getTime() <= Date.now()) {
            return res.redirect(`${FRONTEND_URL}/auth/verify-email.html?status=expired`);
        }

        const [result] = await db.execute(
            `UPDATE users
             SET email_verified = TRUE,
                 verification_token = NULL,
                 verification_expires = NULL
             WHERE id = ? AND email_verified = FALSE
               AND verification_token = ?`,
            [user.id, token]
        );

        if (result.affectedRows !== 1) {
            return res.redirect(invalidUrl);
        }

        return res.redirect(`${FRONTEND_URL}/auth/verify-email.html?status=success`);
    } catch (error) {
        console.error("Email verification error:", error);
        return res.redirect(errorUrl);
    }
});

router.post("/resend-verification", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        const [users] = await db.execute(
            `SELECT id, full_name, email, email_verified, is_active
             FROM users WHERE email = ? LIMIT 1`,
            [email]
        );

        if (users.length === 0) {
            return res.json({
                success: true,
                message: "If an account exists with that email, a verification email has been sent."
            });
        }

        const user = users[0];

        if (user.email_verified) {
            return res.json({
                success: true,
                message: "This email is already verified. You can log in."
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated"
            });
        }

        const token = createToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.execute(
            `UPDATE users
             SET verification_token = ?, verification_expires = ?
             WHERE id = ?`,
            [token, expires, user.id]
        );

        await sendVerificationEmail(user, token);

        return res.json({
            success: true,
            message: "A new verification email has been sent."
        });
    } catch (error) {
        console.error("Resend verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to resend the verification email right now."
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const [users] = await db.execute(
            `SELECT id, full_name, email, phone, account_type, password,
                    email_verified, is_active
             FROM users WHERE email = ? LIMIT 1`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in"
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated"
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!getJwtSecret()) {
            return res.status(500).json({
                success: false,
                message: "Server authentication configuration is missing"
            });
        }

        const token = signUser(user);
        setAuthCookie(res, token);

        return res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                account_type: user.account_type
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to login. Please try again."
        });
    }
});

router.get("/me", authenticate, async (req, res) => {
    return res.json({
        success: true,
        user: req.user
    });
});

router.post("/logout", (req, res) => {
    clearAuthCookie(res);
    return res.json({
        success: true,
        message: "Logged out successfully"
    });
});

router.post("/forgot-password", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const genericMessage = "If an account exists with that email, password reset instructions have been sent.";

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        const [users] = await db.execute(
            `SELECT id, full_name, email, email_verified, is_active
             FROM users WHERE email = ? LIMIT 1`,
            [email]
        );

        if (users.length === 0) {
            return res.json({ success: true, message: genericMessage });
        }

        const user = users[0];

        if (!user.is_active || !user.email_verified) {
            return res.json({ success: true, message: genericMessage });
        }

        const token = createToken();
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expires = new Date(Date.now() + 30 * 60 * 1000);

        await db.execute(
            "DELETE FROM password_resets WHERE user_id = ?",
            [user.id]
        );

        await db.execute(
            `INSERT INTO password_resets (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [user.id, tokenHash, expires]
        );

        await sendResetEmail(user, token);

        return res.json({
            success: true,
            message: genericMessage
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to process your request right now."
        });
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const token = String(req.body.token || "").trim();
        const password = String(req.body.password || "");

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const [resets] = await db.execute(
            `SELECT id, user_id, expires_at
             FROM password_resets
             WHERE token_hash = ?
             LIMIT 1`,
            [tokenHash]
        );

        if (resets.length === 0 || new Date(resets[0].expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "This password reset link is invalid or has expired."
            });
        }

        const reset = resets[0];
        const hashedPassword = await bcrypt.hash(password, 12);

        await db.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, reset.user_id]
        );

        await db.execute(
            "DELETE FROM password_resets WHERE user_id = ?",
            [reset.user_id]
        );

        clearAuthCookie(res);

        return res.json({
            success: true,
            message: "Your password has been reset successfully. You can now log in."
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to reset your password right now."
        });
    }
});

router.post("/change-password", authenticate, async (req, res) => {
    try {
        const currentPassword = String(req.body.currentPassword || "");
        const newPassword = String(req.body.newPassword || "");

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current and new passwords are required"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "New password must contain at least 8 characters"
            });
        }

        const [rows] = await db.execute(
            "SELECT password FROM users WHERE id = ? LIMIT 1",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User account not found"
            });
        }

        const valid = await bcrypt.compare(currentPassword, rows[0].password);

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "Your current password is incorrect"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, req.user.id]
        );

        clearAuthCookie(res);

        return res.json({
            success: true,
            message: "Password changed successfully. Please log in again."
        });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to change your password right now."
        });
    }
});

router.put("/profile", authenticate, async (req, res) => {
    try {
        const fields = {
            full_name: String(req.body.full_name || "").trim(),
            phone: String(req.body.phone || "").trim(),
            profession: String(req.body.profession || "").trim(),
            experience: String(req.body.experience || "").trim(),
            career_field: String(req.body.career_field || "").trim(),
            job_title: String(req.body.job_title || "").trim(),
            location: String(req.body.location || "").trim(),
            skill: String(req.body.skill || "").trim(),
            bio: String(req.body.bio || "").trim(),
            education: String(req.body.education || "").trim(),
            career_interest: String(req.body.career_interest || "").trim()
        };

        if (!fields.full_name || !fields.phone) {
            return res.status(400).json({
                success: false,
                message: "Full name and phone number are required"
            });
        }

        await db.execute(
            `UPDATE users SET
                full_name = ?, phone = ?, profession = ?, experience = ?,
                career_field = ?, job_title = ?, location = ?, skill = ?, bio = ?, education = ?, career_interest = ?
             WHERE id = ?`,
            [
                fields.full_name,
                fields.phone,
                fields.profession || null,
                fields.experience || null,
                fields.career_field || null,
                fields.job_title || null,
                fields.location || null,
                fields.skill || null,
                fields.bio || null,
                fields.education || null,
                fields.career_interest || null,
                req.user.id
            ]
        );

        const [users] = await db.execute(
            `SELECT id, full_name, email, phone, account_type,
                    profession, experience, career_field, job_title,
                    location, skill, bio, education, career_interest, email_verified, is_active,
                    created_at, updated_at
             FROM users WHERE id = ? LIMIT 1`,
            [req.user.id]
        );

        return res.json({
            success: true,
            message: "Profile updated successfully",
            user: users[0]
        });
    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update your profile right now."
        });
    }
});

module.exports = {
    router,
    authenticate
};
