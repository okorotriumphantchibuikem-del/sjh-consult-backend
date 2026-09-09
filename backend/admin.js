const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("./db");

const router = express.Router();
const ADMIN_COOKIE = "sjh_admin_token";

function secret() {
    return process.env.JWT_SECRET || "";
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function setAdminCookie(res, token) {
    res.cookie(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 12 * 60 * 60 * 1000
    });
}

function clearAdminCookie(res) {
    res.clearCookie(ADMIN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/"
    });
}

async function authenticateAdmin(req, res, next) {
    try {
        const token = req.cookies[ADMIN_COOKIE];
        if (!token || !secret()) {
            return res.status(401).json({ success: false, message: "Admin authentication required" });
        }

        const decoded = jwt.verify(token, secret());
        const [admins] = await db.execute(
            `SELECT id, full_name, email, role, is_active, created_at
             FROM admins WHERE id = ? LIMIT 1`,
            [decoded.id]
        );

        if (!admins.length || !admins[0].is_active) {
            return res.status(401).json({ success: false, message: "Admin account is not available" });
        }

        req.admin = admins[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired admin session" });
    }
}

async function logActivity(adminId, action, entity, entityId, details = "") {
    try {
        await db.execute(
            `INSERT INTO admin_activity_logs (admin_id, action, entity, entity_id, details)
             VALUES (?, ?, ?, ?, ?)`,
            [adminId, action, entity, entityId || null, details]
        );
    } catch (error) {
        console.error("Admin activity log error:", error.message);
    }
}

async function notifyUser(userId, title, message, type = "info") {
    if (!userId) return;
    try {
        await db.execute(
            `INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [userId, title, message, type]
        );
    } catch (error) {
        console.error("Admin user notification error:", error.message);
    }
}

router.post("/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const [admins] = await db.execute(
            `SELECT id, full_name, email, password_hash, role, is_active
             FROM admins WHERE email = ? LIMIT 1`,
            [email]
        );

        if (!admins.length || !admins[0].is_active) {
            return res.status(401).json({ success: false, message: "Invalid admin credentials" });
        }

        const admin = admins[0];
        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, message: "Invalid admin credentials" });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role },
            secret(),
            { expiresIn: "12h" }
        );

        setAdminCookie(res, token);
        await logActivity(admin.id, "LOGIN", "admin", admin.id, "Admin signed in");

        res.json({
            success: true,
            message: "Admin login successful",
            admin: { id: admin.id, full_name: admin.full_name, email: admin.email, role: admin.role }
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ success: false, message: "Unable to complete admin login" });
    }
});

router.post("/logout", authenticateAdmin, async (req, res) => {
    await logActivity(req.admin.id, "LOGOUT", "admin", req.admin.id, "Admin signed out");
    clearAdminCookie(res);
    res.json({ success: true, message: "Logged out successfully" });
});

router.get("/me", authenticateAdmin, (req, res) => {
    res.json({ success: true, admin: req.admin });
});

router.get("/stats", authenticateAdmin, async (req, res) => {
    try {
        const [[users]] = await db.query("SELECT COUNT(*) AS count FROM users");
        const [[artisans]] = await db.query("SELECT COUNT(*) AS count FROM users WHERE account_type = 'artisan'");
        const [[corporate]] = await db.query("SELECT COUNT(*) AS count FROM users WHERE account_type = 'corporate'");
        const [[activeJobs]] = await db.query("SELECT COUNT(*) AS count FROM jobs WHERE status = 'active'");
        const [[applications]] = await db.query("SELECT COUNT(*) AS count FROM applications");
        const [[pendingApplications]] = await db.query("SELECT COUNT(*) AS count FROM applications WHERE status = 'pending'");
        const [[revenue]] = await db.query("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'successful'");
        const [[messages]] = await db.query("SELECT COUNT(*) AS count FROM messages WHERE status = 'unread'");
        const [[professionalRequests]] = await db.query("SELECT COUNT(*) AS count FROM professional_requests WHERE status = 'new'");

        res.json({
            success: true,
            stats: {
                users: Number(users.count), artisans: Number(artisans.count), corporate: Number(corporate.count),
                activeJobs: Number(activeJobs.count), applications: Number(applications.count),
                pendingApplications: Number(pendingApplications.count), revenue: Number(revenue.total), unreadMessages: Number(messages.count), professionalRequests: Number(professionalRequests.count)
            }
        });
    } catch (error) {
        console.error("Admin stats error:", error);
        res.status(500).json({ success: false, message: "Unable to load dashboard statistics" });
    }
});

router.get("/activity", authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.created_at,
                    COALESCE(a.full_name, 'System') AS admin_name
             FROM admin_activity_logs l
             LEFT JOIN admins a ON a.id = l.admin_id
             ORDER BY l.created_at DESC LIMIT 30`
        );
        res.json({ success: true, activities: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to load activity" });
    }
});

router.get("/users", authenticateAdmin, async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const type = String(req.query.type || "").trim().toLowerCase();
        const status = String(req.query.status || "").trim().toLowerCase();
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR profession LIKE ? OR job_title LIKE ?)");
            const term = `%${search}%`;
            params.push(term, term, term, term, term);
        }
        if (["artisan", "corporate"].includes(type)) { conditions.push("account_type = ?"); params.push(type); }
        if (status === "active") conditions.push("is_active = TRUE");
        if (status === "suspended") conditions.push("is_active = FALSE");
        if (status === "pending") conditions.push("email_verified = FALSE");

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const [rows] = await db.execute(
            `SELECT id, full_name, email, phone, account_type, profession, experience,
                    career_field, job_title, location, skill, bio, email_verified,
                    is_active, created_at, updated_at
             FROM users ${where} ORDER BY created_at DESC`, params
        );
        res.json({ success: true, users: rows });
    } catch (error) {
        console.error("Admin users error:", error);
        res.status(500).json({ success: false, message: "Unable to load users" });
    }
});

router.post("/users", authenticateAdmin, async (req, res) => {
    try {
        const { full_name, email, phone, account_type, password, profession, experience, career_field, job_title, location, skill, bio, email_verified, is_active } = req.body || {};
        const normalized = normalizeEmail(email);
        if (!full_name || !normalized || !phone || !account_type || !password) return res.status(400).json({ success:false, message:"Name, email, phone, account type and password are required" });
        if (!['artisan','corporate'].includes(account_type)) return res.status(400).json({success:false,message:"Invalid account type"});
        if (String(password).length < 8) return res.status(400).json({success:false,message:"Password must contain at least 8 characters"});
        const [existing] = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [normalized]);
        if (existing.length) return res.status(409).json({success:false,message:"A user with this email already exists"});
        const hash = await bcrypt.hash(String(password), 12);
        const [r] = await db.execute(`INSERT INTO users (full_name,email,phone,account_type,password,profession,experience,career_field,job_title,location,skill,bio,email_verified,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [full_name,normalized,phone,account_type,hash,profession||null,experience||null,career_field||null,job_title||null,location||null,skill||null,bio||null,Number(email_verified ?? 1),Number(is_active ?? 1)]);
        await logActivity(req.admin.id,"CREATE","user",r.insertId,`Created user: ${full_name}`);
        res.status(201).json({success:true,message:"User created",id:r.insertId});
    } catch(error){ console.error("Admin create user error:",error); res.status(500).json({success:false,message:"Unable to create user"}); }
});

router.put("/users/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const fields = req.body || {};
        const allowed = ["full_name", "phone", "account_type", "profession", "experience", "career_field", "job_title", "location", "skill", "bio", "email_verified", "is_active"];
        const updates = [];
        const params = [];
        for (const field of allowed) {
            if (Object.prototype.hasOwnProperty.call(fields, field)) {
                updates.push(`${field} = ?`);
                params.push(fields[field]);
            }
        }
        if (!updates.length) return res.status(400).json({ success: false, message: "No changes supplied" });
        params.push(id);
        await db.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
        await logActivity(req.admin.id, "UPDATE", "user", id, `Updated user #${id}`);
        const [rows] = await db.execute("SELECT id, full_name, email, phone, account_type, profession, experience, career_field, job_title, location, skill, bio, email_verified, is_active, created_at, updated_at FROM users WHERE id = ?", [id]);
        res.json({ success: true, message: "User updated", user: rows[0] });
    } catch (error) {
        console.error("Admin update user error:", error);
        res.status(500).json({ success: false, message: "Unable to update user" });
    }
});

router.delete("/users/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db.execute("DELETE FROM users WHERE id = ?", [id]);
        await logActivity(req.admin.id, "DELETE", "user", id, `Deleted user #${id}`);
        res.json({ success: true, message: "User deleted" });
    } catch (error) {
        console.error("Admin delete user error:", error);
        res.status(500).json({ success: false, message: "Unable to delete user" });
    }
});

router.get("/jobs", authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT j.*, COUNT(a.id) AS application_count
             FROM jobs j LEFT JOIN applications a ON a.job_id = j.id
             GROUP BY j.id ORDER BY j.created_at DESC`
        );
        res.json({ success: true, jobs: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to load jobs" });
    }
});

router.post("/jobs", authenticateAdmin, async (req, res) => {
    try {
        const { title, company, location, category, job_type, experience, salary, description, requirements, status } = req.body;
        if (!title || !company || !location || !category) return res.status(400).json({ success: false, message: "Title, company, location and category are required" });
        const [result] = await db.execute(
            `INSERT INTO jobs (title, company, location, category, job_type, experience, salary, description, requirements, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, company, location, category, job_type || "Full-time", experience || "Any", salary || null, description || "", requirements || "", status || "active", req.admin.id]
        );
        await logActivity(req.admin.id, "CREATE", "job", result.insertId, `Created job: ${title}`);
        res.status(201).json({ success: true, message: "Job created", id: result.insertId });
    } catch (error) {
        console.error("Admin create job error:", error);
        res.status(500).json({ success: false, message: "Unable to create job" });
    }
});

router.put("/jobs/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const allowed = ["title", "company", "location", "category", "job_type", "experience", "salary", "description", "requirements", "status"];
        const updates = []; const params = [];
        for (const field of allowed) if (Object.prototype.hasOwnProperty.call(req.body, field)) { updates.push(`${field} = ?`); params.push(req.body[field]); }
        if (!updates.length) return res.status(400).json({ success: false, message: "No changes supplied" });
        params.push(id);
        await db.execute(`UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`, params);
        await logActivity(req.admin.id, "UPDATE", "job", id, `Updated job #${id}`);
        res.json({ success: true, message: "Job updated" });
    } catch (error) {
        console.error("Admin update job error:", error);
        res.status(500).json({ success: false, message: "Unable to update job" });
    }
});

router.delete("/jobs/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        await db.execute("DELETE FROM jobs WHERE id = ?", [id]);
        await logActivity(req.admin.id, "DELETE", "job", id, `Deleted job #${id}`);
        res.json({ success: true, message: "Job deleted" });
    } catch (error) {
        console.error("Admin delete job error:", error);
        res.status(500).json({ success: false, message: "Unable to delete job" });
    }
});

router.get("/applications", authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT a.id, a.user_id, a.job_id, a.status, a.cover_letter, a.admin_notes, a.created_at, a.updated_at,
                    u.full_name, u.email, u.account_type, j.title AS job_title, j.company
             FROM applications a
             JOIN users u ON u.id = a.user_id
             JOIN jobs j ON j.id = a.job_id
             ORDER BY a.created_at DESC`
        );
        res.json({ success: true, applications: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to load applications" });
    }
});

router.put("/applications/:id", authenticateAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
        const id = Number(req.params.id);
        const allowedStatuses = ["pending","reviewing","shortlisted","interview","accepted","rejected","withdrawn"];
        const requestedStatus = String(req.body.status || "").trim().toLowerCase();
        const adminNotes = req.body.admin_notes === undefined ? null : String(req.body.admin_notes || "").trim().slice(0,5000);
        if (requestedStatus && !allowedStatuses.includes(requestedStatus)) return res.status(400).json({success:false,message:"Invalid application status"});

        await connection.beginTransaction();
        const [[before]] = await connection.query(`SELECT a.*, j.title job_title, j.company, u.full_name, u.email FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.user_id WHERE a.id=? FOR UPDATE`,[id]);
        if(!before){await connection.rollback();return res.status(404).json({success:false,message:"Application not found"});}
        const newStatus = requestedStatus || before.status;
        const notesChanged = req.body.admin_notes !== undefined;
        if (newStatus === before.status && !notesChanged) { await connection.rollback(); return res.json({success:true,message:"No changes supplied",application:before}); }

        await connection.execute(`UPDATE applications SET status=?, admin_notes=CASE WHEN ? THEN ? ELSE admin_notes END WHERE id=?`,[newStatus,notesChanged,adminNotes,id]);
        if (newStatus !== before.status) {
            await connection.execute(`INSERT INTO application_status_history (application_id,old_status,new_status,admin_notes,changed_by) VALUES (?,?,?,?,?)`,[id,before.status,newStatus,adminNotes,req.admin.id]);
        }
        await connection.commit();

        const labels={pending:"Pending",reviewing:"Under Review",shortlisted:"Shortlisted",interview:"Interview Stage",accepted:"Accepted",rejected:"Rejected",withdrawn:"Withdrawn"};
        let title=`Application ${labels[newStatus]||newStatus}`;
        let message=`Your application for ${before.job_title} at ${before.company} is now ${labels[newStatus]||newStatus}.`;
        if(newStatus==='accepted') message=`Congratulations! Your application for ${before.job_title} at ${before.company} has been accepted.`;
        if(newStatus==='rejected') message=`Your application for ${before.job_title} at ${before.company} was not successful this time. Thank you for applying.`;
        if(newStatus==='interview') message=`Good news! Your application for ${before.job_title} at ${before.company} has moved to the interview stage. Check your dashboard for next steps.`;
        if(newStatus==='shortlisted') message=`Good news! You have been shortlisted for ${before.job_title} at ${before.company}.`;
        if(adminNotes) message += ` Admin note: ${adminNotes}`;
        if(newStatus !== before.status || notesChanged) await notifyUser(before.user_id,title,message,newStatus==='rejected'?'warning':'success');
        await logActivity(req.admin.id,"UPDATE","application",id,`Application #${id}: ${before.status} → ${newStatus}`);
        res.json({success:true,message:"Application updated and applicant notified",status:newStatus});
    } catch (error) {
        try { await connection.rollback(); } catch {}
        console.error("Admin application update error:",error);
        res.status(500).json({success:false,message:"Unable to update application"});
    } finally { connection.release(); }
});

router.get("/applications/:id/history", authenticateAdmin, async (req,res)=>{
    try { const [rows]=await db.execute(`SELECT h.*, ad.full_name admin_name FROM application_status_history h LEFT JOIN admins ad ON ad.id=h.changed_by WHERE h.application_id=? ORDER BY h.created_at DESC`,[Number(req.params.id)]); res.json({success:true,history:rows}); }
    catch(error){res.status(500).json({success:false,message:"Unable to load application history"});}
});

router.get("/courses", authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT c.*, (SELECT COUNT(*) FROM course_enrollments e WHERE e.course_id = c.id) AS enrolled_count
             FROM training_courses c ORDER BY c.created_at DESC`
        );
        res.json({ success: true, courses: rows });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to load training courses" }); }
});

router.post("/courses", authenticateAdmin, async (req, res) => {
    try {
        const { title, category, price, description, status } = req.body;
        if (!title || !category) return res.status(400).json({ success: false, message: "Course title and category are required" });
        const [result] = await db.execute("INSERT INTO training_courses (title, category, price, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)", [title, category, Number(price || 0), description || "", status || "active", req.admin.id]);
        await logActivity(req.admin.id, "CREATE", "course", result.insertId, `Created course: ${title}`);
        res.status(201).json({ success: true, message: "Course created", id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to create course" }); }
});

router.put("/courses/:id", authenticateAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id); const allowed = ["title", "category", "price", "description", "status"]; const updates = []; const params = [];
        for (const field of allowed) if (Object.prototype.hasOwnProperty.call(req.body, field)) { updates.push(`${field} = ?`); params.push(req.body[field]); }
        if (!updates.length) return res.status(400).json({ success: false, message: "No changes supplied" });
        params.push(id); await db.execute(`UPDATE training_courses SET ${updates.join(", ")} WHERE id = ?`, params); await logActivity(req.admin.id, "UPDATE", "course", id, `Updated course #${id}`); res.json({ success: true, message: "Course updated" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to update course" }); }
});

router.delete("/courses/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); await db.execute("DELETE FROM training_courses WHERE id = ?", [id]); await logActivity(req.admin.id, "DELETE", "course", id, `Deleted course #${id}`); res.json({ success: true, message: "Course deleted" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to delete course" }); }
});

router.get("/services", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute("SELECT * FROM services ORDER BY created_at DESC"); res.json({ success: true, services: rows }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load services" }); }
});

router.post("/services", authenticateAdmin, async (req, res) => {
    try { const { name, category, description, price, status } = req.body; if (!name) return res.status(400).json({ success: false, message: "Service name is required" }); const [r] = await db.execute("INSERT INTO services (name, category, description, price, status, created_by) VALUES (?, ?, ?, ?, ?, ?)", [name, category || "General", description || "", Number(price || 0), status || "active", req.admin.id]); await logActivity(req.admin.id, "CREATE", "service", r.insertId, `Created service: ${name}`); res.status(201).json({ success: true, id: r.insertId, message: "Service created" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to create service" }); }
});

router.put("/services/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); const allowed = ["name", "category", "description", "price", "status"]; const updates = []; const params = []; for (const f of allowed) if (Object.prototype.hasOwnProperty.call(req.body, f)) { updates.push(`${f} = ?`); params.push(req.body[f]); } if (!updates.length) return res.status(400).json({ success: false, message: "No changes supplied" }); params.push(id); await db.execute(`UPDATE services SET ${updates.join(", ")} WHERE id = ?`, params); await logActivity(req.admin.id, "UPDATE", "service", id, `Updated service #${id}`); res.json({ success: true, message: "Service updated" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to update service" }); }
});

router.delete("/services/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); await db.execute("DELETE FROM services WHERE id = ?", [id]); await logActivity(req.admin.id, "DELETE", "service", id, `Deleted service #${id}`); res.json({ success: true, message: "Service deleted" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to delete service" }); }
});

router.get("/payments", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute(`SELECT p.*, u.full_name, u.email FROM payments p LEFT JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC`); res.json({ success: true, payments: rows }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load payments" }); }
});

router.get("/reviews", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute(`SELECT r.*, u.full_name, u.email FROM reviews r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`); res.json({ success: true, reviews: rows }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load reviews" }); }
});

router.put("/reviews/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); const status = String(req.body.status || "published"); await db.execute("UPDATE reviews SET status = ? WHERE id = ?", [status, id]); await logActivity(req.admin.id, "MODERATE", "review", id, `Set review status to ${status}`); res.json({ success: true, message: "Review moderated" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to moderate review" }); }
});

router.delete("/reviews/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); await db.execute("DELETE FROM reviews WHERE id = ?", [id]); await logActivity(req.admin.id, "DELETE", "review", id, `Deleted review #${id}`); res.json({ success: true, message: "Review deleted" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to delete review" }); }
});

router.get("/messages", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute(`SELECT m.*, COALESCE(u.full_name,m.sender_name) AS full_name, COALESCE(u.email,m.sender_email) AS email, m.sender_phone FROM messages m LEFT JOIN users u ON u.id = m.user_id ORDER BY m.created_at DESC`); res.json({ success: true, messages: rows }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load messages" }); }
});

router.put("/messages/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); const status = String(req.body.status || "read"); const reply = req.body.admin_reply === undefined ? null : String(req.body.admin_reply); await db.execute("UPDATE messages SET status = ?, admin_reply = COALESCE(?, admin_reply), replied_at = CASE WHEN ? IS NULL OR ? = '' THEN replied_at ELSE NOW() END WHERE id = ?", [status, reply, reply, reply, id]); await logActivity(req.admin.id, "REPLY", "message", id, `Updated message #${id}`); res.json({ success: true, message: "Message updated" }); }
    catch (error) { console.error(error); res.status(500).json({ success: false, message: "Unable to update message" }); }
});

router.get("/notifications", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute("SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 100"); res.json({ success: true, notifications: rows }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load notifications" }); }
});

router.post("/notifications", authenticateAdmin, async (req, res) => {
    try { const { title, message, type } = req.body; if (!title || !message) return res.status(400).json({ success: false, message: "Title and message are required" }); const [r] = await db.execute("INSERT INTO admin_notifications (title, message, type, created_by) VALUES (?, ?, ?, ?)", [title, message, type || "info", req.admin.id]); await logActivity(req.admin.id, "CREATE", "notification", r.insertId, `Created notification: ${title}`); res.status(201).json({ success: true, message: "Notification created" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to create notification" }); }
});

router.delete("/notifications/:id", authenticateAdmin, async (req, res) => {
    try { const id = Number(req.params.id); await db.execute("DELETE FROM admin_notifications WHERE id = ?", [id]); await logActivity(req.admin.id, "DELETE", "notification", id, `Deleted notification #${id}`); res.json({ success: true, message: "Notification deleted" }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to delete notification" }); }
});

router.get("/cv-reviews", authenticateAdmin, async (req,res)=>{
    try { const [rows]=await db.execute(`SELECT c.*,u.full_name,u.email,u.account_type FROM cv_reviews c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC`); res.json({success:true,reviews:rows}); }
    catch(error){res.status(500).json({success:false,message:"Unable to load CV reviews"});}
});
router.put("/cv-reviews/:id", authenticateAdmin, async (req,res)=>{
    try { const id=Number(req.params.id); const status=String(req.body.status||"reviewing"); const feedback=req.body.admin_feedback===undefined?null:String(req.body.admin_feedback); await db.execute("UPDATE cv_reviews SET status=?, admin_feedback=COALESCE(?,admin_feedback) WHERE id=?",[status,feedback,id]); const [[cv]]=await db.query("SELECT user_id,file_name,status FROM cv_reviews WHERE id=? LIMIT 1",[id]); if(cv) await notifyUser(cv.user_id,"CV review updated",`Your CV review is now ${cv.status}.`,cv.status==="rejected"?"warning":"success"); await logActivity(req.admin.id,"UPDATE","cv_review",id,`Updated CV review #${id}`); res.json({success:true,message:"CV review updated"}); }
    catch(error){res.status(500).json({success:false,message:"Unable to update CV review"});}
});

router.get("/service-requests", authenticateAdmin, async (req,res)=>{
    try { const [rows]=await db.execute(`SELECT r.*,u.full_name,u.email,s.name service_name FROM service_requests r LEFT JOIN users u ON u.id=r.user_id LEFT JOIN services s ON s.id=r.service_id ORDER BY r.created_at DESC`); res.json({success:true,requests:rows}); }
    catch(error){res.status(500).json({success:false,message:"Unable to load service requests"});}
});
router.put("/service-requests/:id", authenticateAdmin, async (req,res)=>{
    try { const id=Number(req.params.id); const status=String(req.body.status||"in_progress"); const notes=req.body.admin_notes===undefined?null:String(req.body.admin_notes); await db.execute("UPDATE service_requests SET status=?, admin_notes=COALESCE(?,admin_notes) WHERE id=?",[status,notes,id]); const [[r]]=await db.query("SELECT user_id,subject,status FROM service_requests WHERE id=? LIMIT 1",[id]); if(r) await notifyUser(r.user_id,"Service request updated",`Your service request “${r.subject}” is now ${r.status}.`,r.status==="cancelled"?"warning":"success"); await logActivity(req.admin.id,"UPDATE","service_request",id,`Updated service request #${id}`); res.json({success:true,message:"Service request updated"}); }
    catch(error){res.status(500).json({success:false,message:"Unable to update service request"});}
});

router.get("/professional-requests", authenticateAdmin, async (req,res)=>{
    try{const [rows]=await db.execute(`SELECT id,category,message,email,phone,status,admin_notes,created_at,updated_at FROM professional_requests ORDER BY FIELD(status,'new','contacted','in_progress','completed','closed'), created_at DESC`);res.json({success:true,requests:rows});}
    catch(error){console.error(error);res.status(500).json({success:false,message:"Unable to load professional requests"});}
});
router.put("/professional-requests/:id", authenticateAdmin, async(req,res)=>{
    try{const id=Number(req.params.id);const allowed=['new','contacted','in_progress','completed','closed'];const status=String(req.body.status||'new');const notes=req.body.admin_notes===undefined?null:String(req.body.admin_notes).slice(0,5000);if(!allowed.includes(status))return res.status(400).json({success:false,message:"Invalid request status"});const [result]=await db.execute("UPDATE professional_requests SET status=?,admin_notes=COALESCE(?,admin_notes) WHERE id=?",[status,notes,id]);if(!result.affectedRows)return res.status(404).json({success:false,message:"Request not found"});await logActivity(req.admin.id,"UPDATE","professional_request",id,`Updated professional request #${id} to ${status}`);res.json({success:true,message:"Professional request updated"});}
    catch(error){res.status(500).json({success:false,message:"Unable to update professional request"});}
});

router.get("/settings", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute("SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key"); const settings = {}; rows.forEach(row => settings[row.setting_key] = row.setting_value); res.json({ success: true, settings }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load settings" }); }
});

router.put("/settings", authenticateAdmin, async (req, res) => {
    try {
        const entries = Object.entries(req.body || {});
        for (const [key, value] of entries) {
            await db.execute(
                `INSERT INTO site_settings (setting_key, setting_value, updated_by)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
                [key, String(value), req.admin.id]
            );
        }
        await logActivity(req.admin.id, "UPDATE", "settings", null, "Updated platform settings");
        res.json({ success: true, message: "Settings saved" });
    } catch (error) { res.status(500).json({ success: false, message: "Unable to save settings" }); }
});

router.post("/change-password", authenticateAdmin, async (req, res) => {
    try {
        const currentPassword = String(req.body.current_password || "");
        const newPassword = String(req.body.new_password || "");
        if (newPassword.length < 8) return res.status(400).json({success:false,message:"New password must contain at least 8 characters"});
        const [rows] = await db.execute("SELECT password_hash FROM admins WHERE id = ? LIMIT 1", [req.admin.id]);
        if (!rows.length || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) return res.status(400).json({success:false,message:"Current password is incorrect"});
        const hash = await bcrypt.hash(newPassword, 12);
        await db.execute("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, req.admin.id]);
        await logActivity(req.admin.id,"UPDATE","admin",req.admin.id,"Changed admin password");
        res.json({success:true,message:"Password changed successfully"});
    } catch(error){ res.status(500).json({success:false,message:"Unable to change admin password"}); }
});

router.get("/audit-log", authenticateAdmin, async (req, res) => {
    try { const [rows] = await db.execute(`SELECT l.*, a.full_name AS admin_name, a.email AS admin_email FROM admin_activity_logs l LEFT JOIN admins a ON a.id = l.admin_id ORDER BY l.created_at DESC LIMIT 200`); res.json({ success: true, logs: rows }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load audit log" }); }
});



function requireSuperAdmin(req, res, next) {
    if (req.admin?.role !== "super_admin") {
        return res.status(403).json({ success: false, message: "Super administrator permission required" });
    }
    next();
}

router.get("/admins", authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT id, full_name, email, role, is_active, created_at, updated_at FROM admins ORDER BY created_at DESC");
        res.json({ success: true, admins: rows });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Unable to load administrators" }); }
});

router.post("/admins", authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const name = String(req.body.full_name || "").trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");
        const role = ["super_admin", "admin", "manager"].includes(req.body.role) ? req.body.role : "admin";
        if (!name || !email || password.length < 8) return res.status(400).json({ success:false, message:"Name, email and a password of at least 8 characters are required" });
        const [existing] = await db.execute("SELECT id FROM admins WHERE email = ? LIMIT 1", [email]);
        if (existing.length) return res.status(409).json({ success:false, message:"An administrator with this email already exists" });
        const hash = await bcrypt.hash(password, 12);
        const [r] = await db.execute("INSERT INTO admins (full_name,email,password_hash,role,is_active) VALUES (?,?,?,?,TRUE)",[name,email,hash,role]);
        await logActivity(req.admin.id,"CREATE","admin",r.insertId,`Created administrator: ${name}`);
        res.status(201).json({ success:true, message:"Administrator created" });
    } catch(error){ console.error(error); res.status(500).json({success:false,message:"Unable to create administrator"}); }
});

router.put("/admins/:id", authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const id=Number(req.params.id); const updates=[]; const params=[];
        if (req.body.full_name !== undefined) { updates.push("full_name = ?"); params.push(String(req.body.full_name).trim()); }
        if (req.body.email !== undefined) { updates.push("email = ?"); params.push(normalizeEmail(req.body.email)); }
        if (req.body.role !== undefined && ["super_admin","admin","manager"].includes(req.body.role)) { updates.push("role = ?"); params.push(req.body.role); }
        if (req.body.is_active !== undefined) {
            if (id === req.admin.id && !Number(req.body.is_active)) return res.status(400).json({success:false,message:"You cannot suspend your own account"});
            updates.push("is_active = ?"); params.push(Number(req.body.is_active));
        }
        if (!updates.length) return res.status(400).json({success:false,message:"No changes supplied"});
        params.push(id); await db.execute(`UPDATE admins SET ${updates.join(", ")} WHERE id = ?`,params);
        await logActivity(req.admin.id,"UPDATE","admin",id,`Updated administrator #${id}`);
        res.json({success:true,message:"Administrator updated"});
    } catch(error){ console.error(error); res.status(500).json({success:false,message:"Unable to update administrator"}); }
});

router.delete("/admins/:id", authenticateAdmin, requireSuperAdmin, async (req,res)=>{
    try { const id=Number(req.params.id); if(id===req.admin.id) return res.status(400).json({success:false,message:"You cannot delete your own account"}); await db.execute("DELETE FROM admins WHERE id=?",[id]); await logActivity(req.admin.id,"DELETE","admin",id,`Deleted administrator #${id}`); res.json({success:true,message:"Administrator deleted"}); }
    catch(error){ console.error(error); res.status(500).json({success:false,message:"Unable to delete administrator"}); }
});

router.get("/appointments", authenticateAdmin, async (req,res)=>{
    try { const [rows]=await db.execute(`SELECT ap.*, u.full_name, u.email, u.phone FROM appointments ap LEFT JOIN users u ON u.id=ap.user_id ORDER BY ap.appointment_date DESC, ap.created_at DESC`); res.json({success:true,appointments:rows}); }
    catch(error){ console.error(error); res.status(500).json({success:false,message:"Unable to load appointments"}); }
});

router.post("/appointments", authenticateAdmin, async (req,res)=>{
    try { const {user_id,consultation_type,appointment_date,appointment_time,notes,status,admin_notes}=req.body; if(!consultation_type||!appointment_date||!appointment_time) return res.status(400).json({success:false,message:"Consultation type, date and time are required"}); const [r]=await db.execute(`INSERT INTO appointments (user_id,consultation_type,appointment_date,appointment_time,notes,status,admin_notes) VALUES (?,?,?,?,?,?,?)`,[user_id||null,consultation_type,appointment_date,appointment_time,notes||"",status||"pending",admin_notes||""]); await logActivity(req.admin.id,"CREATE","appointment",r.insertId,"Created appointment"); res.status(201).json({success:true,message:"Appointment created"}); }
    catch(error){ console.error(error); res.status(500).json({success:false,message:"Unable to create appointment"}); }
});

router.put("/appointments/:id", authenticateAdmin, async (req,res)=>{
    try { const id=Number(req.params.id); const allowed=["user_id","consultation_type","appointment_date","appointment_time","notes","status","admin_notes"]; const updates=[]; const params=[]; for(const f of allowed) if(Object.prototype.hasOwnProperty.call(req.body,f)){updates.push(`${f}=?`);params.push(req.body[f]);} if(!updates.length)return res.status(400).json({success:false,message:"No changes supplied"}); params.push(id); await db.execute(`UPDATE appointments SET ${updates.join(", ")} WHERE id=?`,params); await logActivity(req.admin.id,"UPDATE","appointment",id,`Updated appointment #${id}`); res.json({success:true,message:"Appointment updated"}); }
    catch(error){ console.error(error); res.status(500).json({success:false,message:"Unable to update appointment"}); }
});

router.delete("/appointments/:id", authenticateAdmin, async (req,res)=>{ try {const id=Number(req.params.id);await db.execute("DELETE FROM appointments WHERE id=?",[id]);await logActivity(req.admin.id,"DELETE","appointment",id,`Deleted appointment #${id}`);res.json({success:true,message:"Appointment deleted"});}catch(error){res.status(500).json({success:false,message:"Unable to delete appointment"});} });

router.put("/payments/:id", authenticateAdmin, async (req,res)=>{
    try { const id=Number(req.params.id); const status=String(req.body.status||""); if(!["pending","successful","failed","refunded"].includes(status)) return res.status(400).json({success:false,message:"Invalid payment status"}); await db.execute("UPDATE payments SET status=? WHERE id=?",[status,id]); await logActivity(req.admin.id,"UPDATE","payment",id,`Set payment status to ${status}`); res.json({success:true,message:"Payment updated"}); }
    catch(error){res.status(500).json({success:false,message:"Unable to update payment"});}
});

router.get("/enrollments", authenticateAdmin, async (req,res)=>{
    try { const [rows]=await db.execute(`SELECT e.*,u.full_name,u.email,c.title AS course_title FROM course_enrollments e JOIN users u ON u.id=e.user_id JOIN training_courses c ON c.id=e.course_id ORDER BY e.created_at DESC`); res.json({success:true,enrollments:rows}); }
    catch(error){res.status(500).json({success:false,message:"Unable to load enrollments"});}
});

router.put("/enrollments/:id", authenticateAdmin, async (req,res)=>{
    try { const id=Number(req.params.id); const status=String(req.body.status||"active"); await db.execute("UPDATE course_enrollments SET status=? WHERE id=?",[status,id]); await logActivity(req.admin.id,"UPDATE","enrollment",id,`Set enrollment status to ${status}`); res.json({success:true,message:"Enrollment updated"}); }
    catch(error){res.status(500).json({success:false,message:"Unable to update enrollment"});}
});

module.exports = { router, authenticateAdmin };
