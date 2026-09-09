const bcrypt = require("bcrypt");
const db = require("./db");

async function ensureAdminTables() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            phone VARCHAR(50) NOT NULL,
            account_type ENUM('artisan','corporate') NOT NULL,
            password VARCHAR(255) NOT NULL,
            profession VARCHAR(150) NULL,
            experience VARCHAR(50) NULL,
            career_field VARCHAR(150) NULL,
            job_title VARCHAR(150) NULL,
            location VARCHAR(150) NULL,
            skill VARCHAR(500) NULL,
            bio TEXT NULL,
            education TEXT NULL,
            career_interest VARCHAR(300) NULL,
            email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            verification_token VARCHAR(100) NULL,
            verification_expires DATETIME NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(30) NOT NULL DEFAULT 'super_admin',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    const [userColumns] = await db.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
    const userColumnNames = new Set(userColumns.map(row => row.COLUMN_NAME));
    const missingUserColumns = {
        education: 'TEXT NULL',
        career_interest: 'VARCHAR(300) NULL'
    };
    for (const [column, definition] of Object.entries(missingUserColumns)) {
        if (!userColumnNames.has(column)) {
            await db.execute(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
        }
    }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            company VARCHAR(200) NOT NULL,
            location VARCHAR(200) NOT NULL,
            category VARCHAR(100) NOT NULL,
            job_type VARCHAR(100) NOT NULL DEFAULT 'Full-time',
            experience VARCHAR(100) NOT NULL DEFAULT 'Any',
            salary VARCHAR(150) NULL,
            description TEXT,
            requirements TEXT,
            status ENUM('active','draft','closed','archived') NOT NULL DEFAULT 'active',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_jobs_status (status),
            INDEX idx_jobs_category (category)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            job_id INT NOT NULL,
            status ENUM('pending','reviewing','shortlisted','interview','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
            cover_letter TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_application_user_job (user_id, job_id),
            CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS application_status_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            application_id INT NOT NULL,
            old_status VARCHAR(30) NULL,
            new_status VARCHAR(30) NOT NULL,
            admin_notes TEXT,
            changed_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_app_history_application (application_id),
            CONSTRAINT fk_app_history_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
            CONSTRAINT fk_app_history_admin FOREIGN KEY (changed_by) REFERENCES admins(id) ON DELETE SET NULL
        )
    `);

    try { await db.execute("ALTER TABLE applications ADD COLUMN admin_notes TEXT NULL"); } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS training_courses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            category VARCHAR(100) NOT NULL,
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            description TEXT,
            status ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            user_id INT NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_course_user (course_id, user_id),
            CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE,
            CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            consultation_type VARCHAR(150) NOT NULL,
            appointment_date DATE NOT NULL,
            appointment_time VARCHAR(50) NOT NULL,
            notes TEXT,
            status ENUM('pending','approved','rescheduled','completed','cancelled','rejected') NOT NULL DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_appointments_date (appointment_date),
            INDEX idx_appointments_status (status),
            CONSTRAINT fk_appointment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS services (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT 'General',
            description TEXT,
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            status ENUM('active','draft','archived') NOT NULL DEFAULT 'active',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            reference VARCHAR(100) NOT NULL UNIQUE,
            purpose VARCHAR(150) NOT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            course_id INT NULL,
            status ENUM('pending','successful','failed','refunded') NOT NULL DEFAULT 'pending',
            provider VARCHAR(50) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_payments_status (status),
            CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    const [paymentCourseColumn] = await db.query(`SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payments' AND COLUMN_NAME='course_id'`);
    if (Number(paymentCourseColumn[0]?.count || 0) === 0) {
        await db.execute("ALTER TABLE payments ADD COLUMN course_id INT NULL AFTER amount");
    }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            rating TINYINT NOT NULL,
            review_text TEXT NOT NULL,
            status ENUM('pending','published','hidden') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            sender_name VARCHAR(150) NULL,
            sender_email VARCHAR(190) NULL,
            sender_phone VARCHAR(60) NULL,
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            admin_reply TEXT,
            status ENUM('unread','read','replied','closed') NOT NULL DEFAULT 'unread',
            replied_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_message_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    try {
        const [messageColumns] = await db.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages'`);
        const names = new Set(messageColumns.map(row => row.COLUMN_NAME));
        if (!names.has('sender_name')) await db.execute("ALTER TABLE messages ADD COLUMN sender_name VARCHAR(150) NULL AFTER user_id");
        if (!names.has('sender_email')) await db.execute("ALTER TABLE messages ADD COLUMN sender_email VARCHAR(190) NULL AFTER sender_name");
        if (!names.has('sender_phone')) await db.execute("ALTER TABLE messages ADD COLUMN sender_phone VARCHAR(60) NULL AFTER sender_email");
    } catch (e) { console.error('Message contact fields setup error:', e.message); }

    await db.execute(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(30) NOT NULL DEFAULT 'info',
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_admin_notification_creator FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS site_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_setting_admin FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
        )
    `);


    await db.execute(`
        CREATE TABLE IF NOT EXISTS cv_reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            review_type VARCHAR(50) NOT NULL,
            message TEXT,
            status ENUM('pending','reviewing','completed','rejected') NOT NULL DEFAULT 'pending',
            admin_feedback TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_cv_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_cv_review_user (user_id),
            INDEX idx_cv_review_status (status)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(30) NOT NULL DEFAULT 'info',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user_notification_user (user_id),
            INDEX idx_user_notification_read (user_id,is_read)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS saved_jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            job_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_saved_job (user_id,job_id),
            CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_saved_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            course_id INT NULL,
            title VARCHAR(200) NOT NULL,
            certificate_number VARCHAR(100) NOT NULL UNIQUE,
            issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            file_url VARCHAR(500) NULL,
            CONSTRAINT fk_certificate_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_certificate_course FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE SET NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS service_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            service_id INT NULL,
            subject VARCHAR(200) NOT NULL,
            details TEXT NOT NULL,
            status ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_service_request_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT fk_service_request_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS professional_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category VARCHAR(100) NULL,
            message TEXT NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NOT NULL,
            status ENUM('new','contacted','in_progress','completed','closed') NOT NULL DEFAULT 'new',
            admin_notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_prof_requests_status (status),
            INDEX idx_prof_requests_created (created_at)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS admin_activity_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NULL,
            action VARCHAR(50) NOT NULL,
            entity VARCHAR(50) NOT NULL,
            entity_id INT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_activity_created (created_at),
            CONSTRAINT fk_activity_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
        )
    `);
}

async function ensureInitialAdmin() {
    const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || "");
    const name = String(process.env.ADMIN_NAME || "SJH Super Administrator").trim();

    if (!email || !password || email.includes("your-admin-email@example.com") || password === "change-this-admin-password") {
        console.log("Admin seed skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env to create the first admin.");
        return;
    }

    const [existing] = await db.execute("SELECT id FROM admins WHERE email = ? LIMIT 1", [email]);
    if (existing.length) return;

    const hash = await bcrypt.hash(password, 12);
    await db.execute("INSERT INTO admins (full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'super_admin', TRUE)", [name, email, hash]);
    console.log(`Initial admin created for ${email}.`);
}

async function initializeAdminSystem() {
    await ensureAdminTables();
    await ensureInitialAdmin();
}

module.exports = { initializeAdminSystem };
