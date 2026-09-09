document.addEventListener("DOMContentLoaded", () => {
    const API = `${window.SJH_API_BASE || "https://sjh-consult-backend-production.up.railway.app"}/api/admin`;

    const $ = (id) => document.getElementById(id);

    const esc = (v) =>
        String(v ?? "").replace(
            /[&<>'"]/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    "'": "&#039;",
                    '"': "&quot;"
                })[c]
        );

    const money = (v) =>
        `₦${Number(v || 0).toLocaleString("en-NG", {
            maximumFractionDigits: 2
        })}`;

    const date = (v) =>
        v
            ? new Date(v).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short"
              })
            : "—";

    let cache = {
        professionalRequests: [],
        users: [],
        jobs: [],
        applications: [],
        courses: [],
        services: [],
        payments: [],
        reviews: [],
        messages: [],
        notifications: [],
        appointments: [],
        admins: [],
        logs: []
    };

    const sectionTitles = {
        overview: "Dashboard Overview",
        users: "User Management",
        jobs: "Job Management",
        applications: "Applications",
        "professional-requests": "Professional Requests",
        training: "Training Management",
        appointments: "Appointment Management",
        services: "Services Management",
        payments: "Payments",
        reviews: "Review Moderation",
        messages: "Messages",
        notifications: "Notifications",
        settings: "Platform Settings",
        admins: "Administrator Accounts",
        audit: "Admin Audit Log"
    };

    function toast(message) {
        const el = $("toast");

        if (!el) return;

        el.textContent = message;
        el.classList.add("show");

        setTimeout(() => el.classList.remove("show"), 3000);
    }

    function showSection(id) {
        document
            .querySelectorAll(".dashboard-section")
            .forEach((s) => s.classList.remove("active-section"));

        const section = $(id);

        if (section) {
            section.classList.add("active-section");
        }

        document
            .querySelectorAll(".nav-link")
            .forEach((a) =>
                a.classList.toggle("active", a.dataset.section === id)
            );

        if ($("pageTitle")) {
            $("pageTitle").textContent =
                sectionTitles[id] || "Admin Console";
        }

        window.location.hash = id;

        if (window.innerWidth <= 800) {
            closeSidebar();
        }
    }

    function openSidebar() {
        $("sidebar")?.classList.add("open");
        $("sidebarOverlay")?.classList.add("active");
    }

    function closeSidebar() {
        $("sidebar")?.classList.remove("open");
        $("sidebarOverlay")?.classList.remove("active");
    }

    async function api(path, options = {}) {
        const response = await fetch(`${API}${path}`, {
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        let data = {};

        try {
            data = await response.json();
        } catch {}

        if (response.status === 401) {
            localStorage.removeItem("sjhAdmin");
            window.location.href = "admin-login.html";

            throw new Error(
                data.message || "Admin session expired"
            );
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "Request failed"
            );
        }

        return data;
    }

    async function loadAdmin() {
        const data = await api("/me");
        const a = data.admin;

        localStorage.setItem(
            "sjhAdmin",
            JSON.stringify(a)
        );

        const name = esc(
            a.full_name || "Administrator"
        );

        if ($("sidebarAdminName")) {
            $("sidebarAdminName").textContent =
                a.full_name || "Administrator";
        }

        if ($("headerAdminName")) {
            $("headerAdminName").textContent =
                a.full_name || "Administrator";
        }

        if ($("sidebarAdminRole")) {
            $("sidebarAdminRole").textContent =
                a.role || "Super Admin";
        }

        if ($("headerAdminRole")) {
            $("headerAdminRole").textContent =
                a.role || "Super Admin";
        }

        const letter = (
            a.full_name || "A"
        )
            .trim()
            .charAt(0)
            .toUpperCase();

        if ($("sidebarAvatar")) {
            $("sidebarAvatar").textContent = letter;
        }

        if ($("headerAvatar")) {
            $("headerAvatar").textContent = letter;
        }
    }

    async function loadStats() {
        const d = await api("/stats");
        const s = d.stats;

        $("totalUsers").textContent = s.users;
        $("totalArtisans").textContent = s.artisans;
        $("activeJobs").textContent = s.activeJobs;
        $("totalRevenue").textContent = money(s.revenue);

        $("usersBadge").textContent = s.users;
        $("applicationsBadge").textContent =
            s.pendingApplications;

        $("messagesBadge").textContent =
            s.unreadMessages;

        $("professionalRequestsBadge").textContent =
            s.professionalRequests || 0;

        $("professionalRequestsTotal").textContent =
            s.professionalRequests || 0;
    }

    async function loadUsers() {
        const q = $("userSearch").value.trim();
        const type = $("userTypeFilter").value;
        const status = $("userStatusFilter").value;

        const d = await api(
            `/users?search=${encodeURIComponent(
                q
            )}&type=${encodeURIComponent(
                type
            )}&status=${encodeURIComponent(status)}`
        );

        cache.users = d.users;

        $("usersTable").innerHTML =
            d.users
                .map(
                    (u) => `
                    <tr>
                        <td class="user-cell">
                            <strong>${esc(u.full_name)}</strong>
                            <small>${esc(u.email)}</small>
                        </td>

                        <td>${esc(u.account_type)}</td>

                        <td>
                            ${esc(u.phone)}
                            <br>
                            <small>${esc(u.location || "")}</small>
                        </td>

                        <td>
                            <span class="status ${
                                u.email_verified
                                    ? "success"
                                    : "pending"
                            }">
                                ${
                                    u.email_verified
                                        ? "Verified"
                                        : "Unverified"
                                }
                            </span>
                        </td>

                        <td>
                            <span class="status ${
                                u.is_active
                                    ? "active"
                                    : "suspended"
                            }">
                                ${
                                    u.is_active
                                        ? "Active"
                                        : "Suspended"
                                }
                            </span>
                        </td>

                        <td>${date(u.created_at)}</td>

                        <td>
                            <button
                                class="table-button"
                                data-action="edit-user"
                                data-id="${u.id}"
                            >
                                Edit
                            </button>

                            <button
                                class="table-button danger-button"
                                data-action="delete-user"
                                data-id="${u.id}"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="7">No users found.</td></tr>`;
    }

    async function loadJobs() {
        const d = await api("/jobs");

        cache.jobs = d.jobs;

        renderJobs();
    }

    function renderJobs() {
        const q = $("jobSearch").value
            .trim()
            .toLowerCase();

        const status = $("jobStatusFilter").value;

        const rows = cache.jobs.filter(
            (j) =>
                (!q ||
                    `${j.title} ${j.company} ${j.location} ${j.category}`
                        .toLowerCase()
                        .includes(q)) &&
                (!status || j.status === status)
        );

        $("jobsTable").innerHTML =
            rows
                .map(
                    (j) => `
                    <tr>
                        <td>
                            <strong>${esc(j.title)}</strong>
                            <br>
                            <small>
                                ${esc(j.job_type)} ·
                                ${esc(j.experience)}
                            </small>
                        </td>

                        <td>${esc(j.company)}</td>
                        <td>${esc(j.location)}</td>
                        <td>${esc(j.category)}</td>
                        <td>${j.application_count || 0}</td>

                        <td>
                            <span class="status ${j.status}">
                                ${esc(j.status)}
                            </span>
                        </td>

                        <td>
                            <button
                                class="table-button"
                                data-action="edit-job"
                                data-id="${j.id}"
                            >
                                Edit
                            </button>

                            <button
                                class="table-button danger-button"
                                data-action="delete-job"
                                data-id="${j.id}"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="7">No jobs found.</td></tr>`;
    }

    async function loadApplications() {
        const d = await api("/applications");

        cache.applications = d.applications;

        $("applicationsTable").innerHTML =
            d.applications
                .map(
                    (a) => `
                    <tr>
                        <td>
                            <strong>${esc(a.full_name)}</strong>
                            <br>
                            <small>${esc(a.email)}</small>
                        </td>

                        <td>${esc(a.job_title)}</td>
                        <td>${esc(a.company)}</td>
                        <td>${esc(a.account_type)}</td>

                        <td>
                            <select
                                class="inline-select"
                                data-action="application-status"
                                data-id="${a.id}"
                            >
                                <option ${
                                    a.status === "pending"
                                        ? "selected"
                                        : ""
                                }>
                                    pending
                                </option>

                                <option ${
                                    a.status === "reviewing"
                                        ? "selected"
                                        : ""
                                }>
                                    reviewing
                                </option>

                                <option ${
                                    a.status === "shortlisted"
                                        ? "selected"
                                        : ""
                                }>
                                    shortlisted
                                </option>

                                <option ${
                                    a.status === "interview"
                                        ? "selected"
                                        : ""
                                }>
                                    interview
                                </option>

                                <option ${
                                    a.status === "accepted"
                                        ? "selected"
                                        : ""
                                }>
                                    accepted
                                </option>

                                <option ${
                                    a.status === "rejected"
                                        ? "selected"
                                        : ""
                                }>
                                    rejected
                                </option>

                                <option ${
                                    a.status === "withdrawn"
                                        ? "selected"
                                        : ""
                                }>
                                    withdrawn
                                </option>
                            </select>
                        </td>

                        <td>${date(a.created_at)}</td>

                        <td>
                            <button
                                class="table-button"
                                data-action="view-application"
                                data-id="${a.id}"
                            >
                                View
                            </button>
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="7">No applications found.</td></tr>`;
    }

    async function loadProfessionalRequests() {
        const d = await api(
            "/professional-requests"
        );

        cache.professionalRequests =
            d.requests || [];

        const filter =
            $("professionalRequestStatusFilter")
                ?.value || "";

        const rows =
            cache.professionalRequests.filter(
                (r) =>
                    !filter ||
                    r.status === filter
            );

        $("professionalRequestsTable").innerHTML =
            rows
                .map(
                    (r) => `
                    <tr>
                        <td>
                            <strong>
                                ${esc(
                                    r.message.slice(
                                        0,
                                        180
                                    )
                                )}
                            </strong>

                            ${
                                r.message.length > 180
                                    ? "…"
                                    : ""
                            }

                            ${
                                r.admin_notes
                                    ? `<br>
                                       <small>
                                           <strong>
                                               Admin note:
                                           </strong>
                                           ${esc(
                                               r.admin_notes
                                           )}
                                       </small>`
                                    : ""
                            }
                        </td>

                        <td>
                            <a href="mailto:${esc(
                                r.email
                            )}">
                                ${esc(r.email)}
                            </a>

                            <br>

                            <a href="tel:${esc(
                                r.phone
                            )}">
                                ${esc(r.phone)}
                            </a>
                        </td>

                        <td>
                            ${esc(
                                r.category ||
                                    "General"
                            )}
                        </td>

                        <td>
                            <select
                                class="inline-select"
                                data-action="professional-request-status"
                                data-id="${r.id}"
                            >
                                <option value="new" ${
                                    r.status === "new"
                                        ? "selected"
                                        : ""
                                }>
                                    New
                                </option>

                                <option value="contacted" ${
                                    r.status === "contacted"
                                        ? "selected"
                                        : ""
                                }>
                                    Contacted
                                </option>

                                <option value="in_progress" ${
                                    r.status === "in_progress"
                                        ? "selected"
                                        : ""
                                }>
                                    In Progress
                                </option>

                                <option value="completed" ${
                                    r.status === "completed"
                                        ? "selected"
                                        : ""
                                }>
                                    Completed
                                </option>

                                <option value="closed" ${
                                    r.status === "closed"
                                        ? "selected"
                                        : ""
                                }>
                                    Closed
                                </option>
                            </select>
                        </td>

                        <td>${date(r.created_at)}</td>

                        <td>
                            <button
                                class="table-button"
                                data-action="view-professional-request"
                                data-id="${r.id}"
                            >
                                View / Note
                            </button>
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="6">No professional requests found.</td></tr>`;
    }

    async function loadCourses() {
        const d = await api("/courses");

        cache.courses = d.courses;

        $("coursesGrid").innerHTML =
            d.courses
                .map(
                    (c) => `
                    <article class="admin-card">
                        <span>${esc(c.category)}</span>

                        <h3>${esc(c.title)}</h3>

                        <p>
                            ${esc(
                                c.description ||
                                    "No description"
                            )}
                        </p>

                        <strong>
                            ${money(c.price)}
                        </strong>

                        <p>
                            ${c.enrolled_count || 0}
                            enrolled ·

                            <span class="status ${c.status}">
                                ${esc(c.status)}
                            </span>
                        </p>

                        <div class="card-actions">
                            <button
                                class="table-button"
                                data-action="edit-course"
                                data-id="${c.id}"
                            >
                                Edit
                            </button>

                            <button
                                class="table-button danger-button"
                                data-action="delete-course"
                                data-id="${c.id}"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `
                )
                .join("") ||
            "<p>No courses yet.</p>";
    }

    async function loadServices() {
        const d = await api("/services");

        cache.services = d.services;

        $("servicesGrid").innerHTML =
            d.services
                .map(
                    (s) => `
                    <article class="admin-card">
                        <span>${esc(s.category)}</span>

                        <h3>${esc(s.name)}</h3>

                        <p>
                            ${esc(
                                s.description ||
                                    "No description"
                            )}
                        </p>

                        <strong>
                            ${
                                Number(s.price)
                                    ? money(s.price)
                                    : "Contact for price"
                            }
                        </strong>

                        <p>
                            <span class="status ${s.status}">
                                ${esc(s.status)}
                            </span>
                        </p>

                        <div class="card-actions">
                            <button
                                class="table-button"
                                data-action="edit-service"
                                data-id="${s.id}"
                            >
                                Edit
                            </button>

                            <button
                                class="table-button danger-button"
                                data-action="delete-service"
                                data-id="${s.id}"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `
                )
                .join("") ||
            "<p>No services yet.</p>";
    }

    async function loadAppointments() {
        const d = await api("/appointments");

        cache.appointments =
            d.appointments;

        const filter =
            $("appointmentStatusFilter")
                ?.value || "";

        const rows =
            d.appointments.filter(
                (a) =>
                    !filter ||
                    a.status === filter
            );

        $("appointmentsTable").innerHTML =
            rows
                .map(
                    (a) => `
                    <tr>
                        <td>
                            <strong>
                                ${esc(
                                    a.full_name ||
                                        "Guest"
                                )}
                            </strong>

                            <br>

                            <small>
                                ${esc(
                                    a.email || ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${esc(
                                a.consultation_type
                            )}
                        </td>

                        <td>
                            ${esc(
                                a.appointment_date
                            )}
                        </td>

                        <td>
                            ${esc(
                                a.appointment_time
                            )}
                        </td>

                        <td>
                            <select
                                class="inline-select"
                                data-action="appointment-status"
                                data-id="${a.id}"
                            >
                                <option ${
                                    a.status ===
                                    "pending"
                                        ? "selected"
                                        : ""
                                }>
                                    pending
                                </option>

                                <option ${
                                    a.status ===
                                    "approved"
                                        ? "selected"
                                        : ""
                                }>
                                    approved
                                </option>

                                <option ${
                                    a.status ===
                                    "rescheduled"
                                        ? "selected"
                                        : ""
                                }>
                                    rescheduled
                                </option>

                                <option ${
                                    a.status ===
                                    "completed"
                                        ? "selected"
                                        : ""
                                }>
                                    completed
                                </option>

                                <option ${
                                    a.status ===
                                    "cancelled"
                                        ? "selected"
                                        : ""
                                }>
                                    cancelled
                                </option>

                                <option ${
                                    a.status ===
                                    "rejected"
                                        ? "selected"
                                        : ""
                                }>
                                    rejected
                                </option>
                            </select>
                        </td>

                        <td>
                            ${esc(
                                a.notes || ""
                            )}
                        </td>

                        <td>
                            <button
                                class="table-button"
                                data-action="edit-appointment"
                                data-id="${a.id}"
                            >
                                Edit
                            </button>

                            <button
                                class="table-button danger-button"
                                data-action="delete-appointment"
                                data-id="${a.id}"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="7">No appointments found.</td></tr>`;
    }

    async function loadAdmins() {
        try {
            const d = await api("/admins");

            cache.admins = d.admins;

            $("adminsTable").innerHTML =
                d.admins
                    .map(
                        (a) => `
                        <tr>
                            <td>
                                <strong>
                                    ${esc(
                                        a.full_name
                                    )}
                                </strong>

                                <br>

                                <small>
                                    ${esc(
                                        a.email
                                    )}
                                </small>
                            </td>

                            <td>
                                ${esc(a.role)}
                            </td>

                            <td>
                                <span class="status ${
                                    a.is_active
                                        ? "active"
                                        : "suspended"
                                }">
                                    ${
                                        a.is_active
                                            ? "Active"
                                            : "Suspended"
                                    }
                                </span>
                            </td>

                            <td>
                                ${date(
                                    a.created_at
                                )}
                            </td>

                            <td>
                                <button
                                    class="table-button"
                                    data-action="edit-admin"
                                    data-id="${a.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="table-button danger-button"
                                    data-action="delete-admin"
                                    data-id="${a.id}"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `
                    )
                    .join("") ||
                `<tr><td colspan="5">No administrators found.</td></tr>`;
        } catch (err) {
            $("adminsTable").innerHTML =
                `<tr><td colspan="5">${esc(
                    err.message
                )}</td></tr>`;
        }
    }

    async function loadPayments() {
        const d = await api("/payments");

        cache.payments = d.payments;

        const successful =
            d.payments
                .filter(
                    (p) =>
                        p.status ===
                        "successful"
                )
                .reduce(
                    (x, p) =>
                        x + Number(p.amount),
                    0
                );

        const pending =
            d.payments
                .filter(
                    (p) =>
                        p.status ===
                        "pending"
                )
                .reduce(
                    (x, p) =>
                        x + Number(p.amount),
                    0
                );

        const total =
            d.payments.reduce(
                (x, p) =>
                    x + Number(p.amount),
                0
            );

        $("paymentTotal").textContent =
            money(total);

        $("paymentSuccessful").textContent =
            money(successful);

        $("paymentPending").textContent =
            money(pending);

        $("paymentsTable").innerHTML =
            d.payments
                .map(
                    (p) => `
                    <tr>
                        <td>
                            ${esc(
                                p.reference
                            )}
                        </td>

                        <td>
                            ${esc(
                                p.full_name ||
                                    "Guest"
                            )}

                            <br>

                            <small>
                                ${esc(
                                    p.email || ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${esc(p.purpose)}
                        </td>

                        <td>
                            ${money(p.amount)}
                        </td>

                        <td>
                            <select
                                class="inline-select"
                                data-action="payment-status"
                                data-id="${p.id}"
                            >
                                <option ${
                                    p.status ===
                                    "pending"
                                        ? "selected"
                                        : ""
                                }>
                                    pending
                                </option>

                                <option ${
                                    p.status ===
                                    "successful"
                                        ? "selected"
                                        : ""
                                }>
                                    successful
                                </option>

                                <option ${
                                    p.status ===
                                    "failed"
                                        ? "selected"
                                        : ""
                                }>
                                    failed
                                </option>

                                <option ${
                                    p.status ===
                                    "refunded"
                                        ? "selected"
                                        : ""
                                }>
                                    refunded
                                </option>
                            </select>
                        </td>

                        <td>
                            ${date(
                                p.created_at
                            )}
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="6">No payments recorded.</td></tr>`;
    }

    async function loadReviews() {
        const d = await api("/reviews");

        cache.reviews = d.reviews;

        $("reviewsList").innerHTML =
            d.reviews
                .map(
                    (r) => `
                    <article class="review-card">
                        <div class="review-top">
                            <strong>
                                ${esc(
                                    r.full_name ||
                                        "Anonymous"
                                )}
                            </strong>

                            <span>
                                ${"★".repeat(
                                    Math.max(
                                        0,
                                        Math.min(
                                            5,
                                            Number(
                                                r.rating
                                            )
                                        )
                                    )
                                )}
                            </span>
                        </div>

                        <p>
                            ${esc(
                                r.review_text
                            )}
                        </p>

                        <small>
                            ${date(
                                r.created_at
                            )}
                            ·
                            ${esc(
                                r.status
                            )}
                        </small>

                        <div class="card-actions">
                            <button
                                class="table-button"
                                data-action="review-status"
                                data-id="${r.id}"
                                data-status="published"
                            >
                                Publish
                            </button>

                            <button
                                class="table-button"
                                data-action="review-status"
                                data-id="${r.id}"
                                data-status="hidden"
                            >
                                Hide
                            </button>

                            <button
                                class="table-button danger-button"
                                data-action="delete-review"
                                data-id="${r.id}"
                            >
                                Delete
                            </button>
                        </div>
                    </article>
                `
                )
                .join("") ||
            "<p>No reviews.</p>";
    }

    async function loadMessages() {
        const d = await api("/messages");

        cache.messages = d.messages;

        $("messagesList").innerHTML =
            d.messages
                .map(
                    (m) => `
                    <article class="message-card">
                        <div class="message-avatar">
                            ${esc(
                                (
                                    m.full_name ||
                                    "U"
                                )
                                    .split(" ")
                                    .map(
                                        (x) =>
                                            x[0]
                                    )
                                    .join("")
                                    .slice(0, 2)
                            )}
                        </div>

                        <div style="flex:1">
                            <div class="message-top">
                                <strong>
                                    ${esc(
                                        m.full_name ||
                                            "Guest"
                                    )}
                                </strong>

                                <span class="status ${m.status}">
                                    ${esc(
                                        m.status
                                    )}
                                </span>
                            </div>

                            <small>
                                ${esc(
                                    m.email || ""
                                )}
                                ·
                                ${date(
                                    m.created_at
                                )}
                            </small>

                            <h4>
                                ${esc(
                                    m.subject
                                )}
                            </h4>

                            <p>
                                ${esc(
                                    m.message
                                )}
                            </p>

                            ${
                                m.admin_reply
                                    ? `
                                    <p>
                                        <strong>
                                            Admin reply:
                                        </strong>

                                        ${esc(
                                            m.admin_reply
                                        )}
                                    </p>
                                `
                                    : ""
                            }

                            <div class="card-actions">
                                <button
                                    class="table-button"
                                    data-action="reply-message"
                                    data-id="${m.id}"
                                >
                                    Reply / Update
                                </button>
                            </div>
                        </div>
                    </article>
                `
                )
                .join("") ||
            "<p>No messages.</p>";
    }

    async function loadNotifications() {
        const d = await api("/notifications");

        cache.notifications =
            d.notifications;

        $("notificationsList").innerHTML =
            d.notifications
                .map(
                    (n) => `
                    <article class="notification-card">
                        <i class="fas fa-bell"></i>

                        <div style="flex:1">
                            <strong>
                                ${esc(n.title)}
                            </strong>

                            <p>
                                ${esc(
                                    n.message
                                )}
                            </p>

                            <small>
                                ${date(
                                    n.created_at
                                )}
                                ·
                                ${esc(n.type)}
                            </small>
                        </div>

                        <button
                            class="table-button danger-button"
                            data-action="delete-notification"
                            data-id="${n.id}"
                        >
                            Delete
                        </button>
                    </article>
                `
                )
                .join("") ||
            "<p>No notifications.</p>";
    }

    async function loadSettings() {
        const d = await api("/settings");

        const s = d.settings;

        $("settingSiteName").value =
            s.site_name || "SJH Consult";

        $("settingContactEmail").value =
            s.contact_email || "";

        $("settingContactPhone").value =
            s.contact_phone || "";

        $("settingMaintenance").value =
            String(
                s.maintenance_mode ||
                    "false"
            );
    }

    async function loadAudit() {
        const d = await api("/audit-log");

        cache.logs = d.logs;

        $("auditTable").innerHTML =
            d.logs
                .map(
                    (l) => `
                    <tr>
                        <td>
                            ${esc(
                                l.admin_name ||
                                    "System"
                            )}

                            <br>

                            <small>
                                ${esc(
                                    l.admin_email ||
                                        ""
                                )}
                            </small>
                        </td>

                        <td>
                            ${esc(l.action)}
                        </td>

                        <td>
                            ${esc(l.entity)}
                            #
                            ${
                                l.entity_id ||
                                "—"
                            }
                        </td>

                        <td>
                            ${esc(
                                l.details || ""
                            )}
                        </td>

                        <td>
                            ${date(
                                l.created_at
                            )}
                        </td>
                    </tr>
                `
                )
                .join("") ||
            `<tr><td colspan="5">No audit activity.</td></tr>`;
    }

    async function loadOverviewActivity() {
        const d = await api("/activity");

        $("overviewActivity").innerHTML =
            d.activities
                .slice(0, 8)
                .map(
                    (a) => `
                    <div class="activity-item">
                        <strong>
                            ${esc(a.action)}
                            ·
                            ${esc(a.entity)}
                        </strong>

                        <div>
                            ${esc(
                                a.details || ""
                            )}
                        </div>

                        <small>
                            ${esc(
                                a.admin_name ||
                                    "System"
                            )}
                            ·
                            ${date(
                                a.created_at
                            )}
                        </small>
                    </div>
                `
                )
                .join("") ||
            "<p>No activity yet.</p>";
    }

    function formModal(
        title,
        fields,
        submitText,
        onSubmit
    ) {
        $("modalContent").innerHTML = `
            <h2>${title}</h2>

            <form id="modalForm">
                <div class="form-grid">

                    ${fields
                        .map(
                            (f) => `
                            <label class="form-field ${
                                f.full
                                    ? "full"
                                    : ""
                            }">

                                ${esc(f.label)}

                                ${
                                    f.type ===
                                    "textarea"
                                        ? `
                                            <textarea name="${f.name}">${esc(
                                              f.value ||
                                                  ""
                                          )}</textarea>
                                        `
                                        : f.type ===
                                          "select"
                                        ? `
                                            <select name="${f.name}">
                                                ${f.options
                                                    .map(
                                                        (
                                                            o
                                                        ) => `
                                                            <option
                                                                value="${esc(
                                                                    o
                                                                )}"
                                                                ${
                                                                    String(
                                                                        f.value ||
                                                                            ""
                                                                    ) ===
                                                                    String(
                                                                        o
                                                                    )
                                                                        ? "selected"
                                                                        : ""
                                                                }
                                                            >
                                                                ${esc(
                                                                    o
                                                                )}
                                                            </option>
                                                        `
                                                    )
                                                    .join(
                                                        ""
                                                    )}
                                            </select>
                                        `
                                        : `
                                            <input
                                                name="${f.name}"
                                                type="${
                                                    f.type ||
                                                    "text"
                                                }"
                                                value="${esc(
                                                    f.value ||
                                                        ""
                                                )}"
                                                ${
                                                    f.required
                                                        ? "required"
                                                        : ""
                                                }
                                            >
                                        `
                                }
                            </label>
                        `
                        )
                        .join("")}

                </div>

                <div class="modal-actions">
                    <button
                        type="button"
                        class="secondary-button"
                        data-action="close-modal"
                    >
                        Cancel
                    </button>

                    <button class="primary-button">
                        ${submitText}
                    </button>
                </div>
            </form>
        `;

        $("modal").classList.add("open");

        $("modalForm").addEventListener(
            "submit",
            async (e) => {
                e.preventDefault();

                const data = Object.fromEntries(
                    new FormData(
                        e.target
                    ).entries()
                );

                try {
                    await onSubmit(data);

                    $("modal").classList.remove(
                        "open"
                    );

                    toast(
                        "Saved successfully"
                    );

                    await refreshAll();
                } catch (err) {
                    toast(err.message);
                }
            }
        );
    }

    const userFields = (u = {}) => [
        {
            label: "Full Name",
            name: "full_name",
            value: u.full_name,
            required: true
        },
        {
            label: "Phone",
            name: "phone",
            value: u.phone,
            required: true
        },
        {
            label: "Account Type",
            name: "account_type",
            type: "select",
            options: [
                "artisan",
                "corporate"
            ],
            value: u.account_type
        },
        {
            label: "Profession",
            name: "profession",
            value: u.profession
        },
        {
            label: "Experience",
            name: "experience",
            value: u.experience
        },
        {
            label: "Career Field",
            name: "career_field",
            value: u.career_field
        },
        {
            label: "Job Title",
            name: "job_title",
            value: u.job_title
        },
        {
            label: "Location",
            name: "location",
            value: u.location
        },
        {
            label: "Skill",
            name: "skill",
            value: u.skill
        },
        {
            label: "Email Verified",
            name: "email_verified",
            type: "select",
            options: ["1", "0"],
            value: u.email_verified
                ? "1"
                : "0"
        },
        {
            label: "Account Status",
            name: "is_active",
            type: "select",
            options: ["1", "0"],
            value: u.is_active
                ? "1"
                : "0"
        },
        {
            label: "Bio",
            name: "bio",
            type: "textarea",
            full: true,
            value: u.bio
        }
    ];

    const jobFields = (j = {}) => [
        {
            label: "Title",
            name: "title",
            value: j.title,
            required: true
        },
        {
            label: "Company",
            name: "company",
            value: j.company,
            required: true
        },
        {
            label: "Location",
            name: "location",
            value: j.location,
            required: true
        },
        {
            label: "Category",
            name: "category",
            value: j.category,
            required: true
        },
        {
            label: "Job Type",
            name: "job_type",
            value: j.job_type
        },
        {
            label: "Experience",
            name: "experience",
            value: j.experience
        },
        {
            label: "Salary",
            name: "salary",
            value: j.salary
        },
        {
            label: "Status",
            name: "status",
            type: "select",
            options: [
                "active",
                "draft",
                "closed",
                "archived"
            ],
            value:
                j.status || "active"
        },
        {
            label: "Description",
            name: "description",
            type: "textarea",
            full: true,
            value: j.description
        },
        {
            label: "Requirements",
            name: "requirements",
            type: "textarea",
            full: true,
            value: j.requirements
        }
    ];

    const courseFields = (c = {}) => [
        {
            label: "Title",
            name: "title",
            value: c.title,
            required: true
        },
        {
            label: "Category",
            name: "category",
            value: c.category,
            required: true
        },
        {
            label: "Price",
            name: "price",
            type: "number",
            value: c.price
        },
        {
            label: "Status",
            name: "status",
            type: "select",
            options: [
                "active",
                "draft",
                "archived"
            ],
            value:
                c.status || "active"
        },
        {
            label: "Description",
            name: "description",
            type: "textarea",
            full: true,
            value: c.description
        }
    ];

    const serviceFields = (s = {}) => [
        {
            label: "Name",
            name: "name",
            value: s.name,
            required: true
        },
        {
            label: "Category",
            name: "category",
            value: s.category
        },
        {
            label: "Price",
            name: "price",
            type: "number",
            value: s.price
        },
        {
            label: "Status",
            name: "status",
            type: "select",
            options: [
                "active",
                "draft",
                "archived"
            ],
            value:
                s.status || "active"
        },
        {
            label: "Description",
            name: "description",
            type: "textarea",
            full: true,
            value: s.description
        }
    ];

    function openAddUser() {
        formModal(
            "Add User",
            [
                ...userFields(),
                {
                    label: "Email",
                    name: "email",
                    type: "email",
                    required: true
                },
                {
                    label: "Password",
                    name: "password",
                    type: "password",
                    required: true
                }
            ],
            "Create User",
            async (data) => {
                await api("/users", {
                    method: "POST",
                    body: JSON.stringify(
                        data
                    )
                });
            }
        );
    }

    function openEditUser(id) {
        const u = cache.users.find(
            (x) => x.id == id
        );

        if (!u) return;

        formModal(
            "Edit User",
            userFields(u),
            "Save Changes",
            (data) =>
                api(`/users/${id}`, {
                    method: "PUT",
                    body: JSON.stringify(
                        data
                    )
                })
        );
    }

    function openJob(j) {
        formModal(
            j ? "Edit Job" : "Post Job",
            jobFields(j || {}),
            j
                ? "Save Changes"
                : "Publish Job",
            (data) =>
                api(
                    j
                        ? `/jobs/${j.id}`
                        : "/jobs",
                    {
                        method: j
                            ? "PUT"
                            : "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                )
        );
    }

    function openCourse(c) {
        formModal(
            c
                ? "Edit Course"
                : "Create Course",
            courseFields(c || {}),
            c
                ? "Save Changes"
                : "Create Course",
            (data) =>
                api(
                    c
                        ? `/courses/${c.id}`
                        : "/courses",
                    {
                        method: c
                            ? "PUT"
                            : "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                )
        );
    }

    function openService(s) {
        formModal(
            s
                ? "Edit Service"
                : "Add Service",
            serviceFields(s || {}),
            s
                ? "Save Changes"
                : "Create Service",
            (data) =>
                api(
                    s
                        ? `/services/${s.id}`
                        : "/services",
                    {
                        method: s
                            ? "PUT"
                            : "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                )
        );
    }

    const appointmentFields = (
        a = {}
    ) => [
        {
            label: "User ID (optional)",
            name: "user_id",
            type: "number",
            value: a.user_id
        },
        {
            label: "Consultation Type",
            name: "consultation_type",
            value:
                a.consultation_type,
            required: true
        },
        {
            label: "Date",
            name: "appointment_date",
            type: "date",
            value:
                a.appointment_date,
            required: true
        },
        {
            label: "Time",
            name: "appointment_time",
            value:
                a.appointment_time,
            required: true
        },
        {
            label: "Status",
            name: "status",
            type: "select",
            options: [
                "pending",
                "approved",
                "rescheduled",
                "completed",
                "cancelled",
                "rejected"
            ],
            value:
                a.status || "pending"
        },
        {
            label: "Notes",
            name: "notes",
            type: "textarea",
            full: true,
            value: a.notes
        },
        {
            label: "Admin Notes",
            name: "admin_notes",
            type: "textarea",
            full: true,
            value: a.admin_notes
        }
    ];

    const adminFields = (a = {}) => [
        {
            label: "Full Name",
            name: "full_name",
            value: a.full_name,
            required: true
        },
        {
            label: "Email",
            name: "email",
            type: "email",
            value: a.email,
            required: true
        },
        {
            label: "Role",
            name: "role",
            type: "select",
            options: [
                "super_admin",
                "admin",
                "manager"
            ],
            value:
                a.role || "admin"
        },
        {
            label: "Active",
            name: "is_active",
            type: "select",
            options: ["1", "0"],
            value:
                a.is_active === false
                    ? "0"
                    : "1"
        }
    ];

    function openAppointment(a) {
        formModal(
            a
                ? "Edit Appointment"
                : "Add Appointment",
            appointmentFields(a || {}),
            a
                ? "Save Changes"
                : "Create Appointment",
            (data) =>
                api(
                    a
                        ? `/appointments/${a.id}`
                        : "/appointments",
                    {
                        method: a
                            ? "PUT"
                            : "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                )
        );
    }

    function openAdmin(a) {
        formModal(
            a
                ? "Edit Administrator"
                : "Add Administrator",
            a
                ? adminFields(a)
                : [
                      ...adminFields(),
                      {
                          label: "Password",
                          name: "password",
                          type: "password",
                          required: true
                      }
                  ],
            a
                ? "Save Changes"
                : "Create Administrator",
            (data) =>
                api(
                    a
                        ? `/admins/${a.id}`
                        : "/admins",
                    {
                        method: a
                            ? "PUT"
                            : "POST",
                        body: JSON.stringify(
                            data
                        )
                    }
                )
        );
    }

    function openNotification() {
        formModal(
            "Create Notification",
            [
                {
                    label: "Title",
                    name: "title",
                    required: true
                },
                {
                    label: "Type",
                    name: "type",
                    type: "select",
                    options: [
                        "info",
                        "success",
                        "warning",
                        "alert"
                    ],
                    value: "info"
                },
                {
                    label: "Message",
                    name: "message",
                    type: "textarea",
                    full: true,
                    required: true
                }
            ],
            "Create",
            (data) =>
                api("/notifications", {
                    method: "POST",
                    body: JSON.stringify(
                        data
                    )
                })
        );
    }

    function openReply(m) {
        formModal(
            "Reply to Message",
            [
                {
                    label: "Status",
                    name: "status",
                    type: "select",
                    options: [
                        "unread",
                        "read",
                        "replied",
                        "closed"
                    ],
                    value: m.status
                },
                {
                    label: "Admin Reply",
                    name: "admin_reply",
                    type: "textarea",
                    full: true,
                    value:
                        m.admin_reply || ""
                }
            ],
            "Save Reply",
            (data) =>
                api(`/messages/${m.id}`, {
                    method: "PUT",
                    body: JSON.stringify(
                        data
                    )
                })
        );
    }

    async function refreshAll() {
        await Promise.all([
            loadStats(),
            loadUsers(),
            loadJobs(),
            loadApplications(),
            loadProfessionalRequests(),
            loadCourses(),
            loadAppointments(),
            loadServices(),
            loadPayments(),
            loadReviews(),
            loadMessages(),
            loadNotifications(),
            loadSettings(),
            loadAdmins(),
            loadAudit(),
            loadOverviewActivity()
        ]);
    }

    document.addEventListener(
        "click",
        async (e) => {
            const el = e.target.closest(
                "[data-action],.nav-link"
            );

            if (!el) return;

            const action =
                el.dataset.action;

            if (
                el.classList.contains(
                    "nav-link"
                )
            ) {
                e.preventDefault();

                showSection(
                    el.dataset.section
                );

                return;
            }

            try {
                if (
                    action ===
                    "close-modal"
                ) {
                    $("modal").classList.remove(
                        "open"
                    );
                }

                else if (
                    action ===
                    "add-user"
                ) {
                    openAddUser();
                }

                else if (
                    action ===
                    "edit-user"
                ) {
                    openEditUser(
                        el.dataset.id
                    );
                }

                else if (
                    action ===
                        "delete-user" &&
                    confirm(
                        "Delete this user permanently?"
                    )
                ) {
                    await api(
                        `/users/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "User deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "add-job"
                ) {
                    openJob();
                }

                else if (
                    action ===
                    "edit-job"
                ) {
                    openJob(
                        cache.jobs.find(
                            (j) =>
                                j.id ==
                                el.dataset.id
                        )
                    );
                }

                else if (
                    action ===
                        "delete-job" &&
                    confirm(
                        "Delete this job and its applications?"
                    )
                ) {
                    await api(
                        `/jobs/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Job deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "add-appointment"
                ) {
                    openAppointment();
                }

                else if (
                    action ===
                    "edit-appointment"
                ) {
                    openAppointment(
                        cache.appointments.find(
                            (a) =>
                                a.id ==
                                el.dataset.id
                        )
                    );
                }

                else if (
                    action ===
                        "delete-appointment" &&
                    confirm(
                        "Delete this appointment?"
                    )
                ) {
                    await api(
                        `/appointments/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Appointment deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "add-admin"
                ) {
                    openAdmin();
                }

                else if (
                    action ===
                    "edit-admin"
                ) {
                    openAdmin(
                        cache.admins.find(
                            (a) =>
                                a.id ==
                                el.dataset.id
                        )
                    );
                }

                else if (
                    action ===
                        "delete-admin" &&
                    confirm(
                        "Delete this administrator?"
                    )
                ) {
                    await api(
                        `/admins/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Administrator deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "add-course"
                ) {
                    openCourse();
                }

                else if (
                    action ===
                    "edit-course"
                ) {
                    openCourse(
                        cache.courses.find(
                            (c) =>
                                c.id ==
                                el.dataset.id
                        )
                    );
                }

                else if (
                    action ===
                        "delete-course" &&
                    confirm(
                        "Delete this course?"
                    )
                ) {
                    await api(
                        `/courses/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Course deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "add-service"
                ) {
                    openService();
                }

                else if (
                    action ===
                    "edit-service"
                ) {
                    openService(
                        cache.services.find(
                            (s) =>
                                s.id ==
                                el.dataset.id
                        )
                    );
                }

                else if (
                    action ===
                        "delete-service" &&
                    confirm(
                        "Delete this service?"
                    )
                ) {
                    await api(
                        `/services/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Service deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "add-notification"
                ) {
                    openNotification();
                }

                else if (
                    action ===
                        "delete-notification" &&
                    confirm(
                        "Delete notification?"
                    )
                ) {
                    await api(
                        `/notifications/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Notification deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "review-status"
                ) {
                    await api(
                        `/reviews/${el.dataset.id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(
                                {
                                    status:
                                        el.dataset
                                            .status
                                }
                            )
                        }
                    );

                    toast(
                        "Review updated"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                        "delete-review" &&
                    confirm(
                        "Delete review?"
                    )
                ) {
                    await api(
                        `/reviews/${el.dataset.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    toast(
                        "Review deleted"
                    );

                    await refreshAll();
                }

                else if (
                    action ===
                    "reply-message"
                ) {
                    const m =
                        cache.messages.find(
                            (x) =>
                                x.id ==
                                el.dataset.id
                        );

                    if (m) {
                        openReply(m);
                    }
                }

                else if (
                    action ===
                    "view-application"
                ) {
                    const a =
                        cache.applications.find(
                            (x) =>
                                x.id ==
                                el.dataset.id
                        );

                    if (a) {
                        formModal(
                            "Application Review",
                            [
                                {
                                    label:
                                        "Applicant",
                                    name:
                                        "applicant",
                                    value:
                                        a.full_name
                                },
                                {
                                    label:
                                        "Email",
                                    name:
                                        "email",
                                    value:
                                        a.email
                                },
                                {
                                    label:
                                        "Job",
                                    name:
                                        "job",
                                    value:
                                        a.job_title
                                },
                                {
                                    label:
                                        "Company",
                                    name:
                                        "company",
                                    value:
                                        a.company
                                },
                                {
                                    label:
                                        "Status",
                                    name:
                                        "status",
                                    type:
                                        "select",
                                    options: [
                                        "pending",
                                        "reviewing",
                                        "shortlisted",
                                        "interview",
                                        "accepted",
                                        "rejected",
                                        "withdrawn"
                                    ],
                                    value:
                                        a.status
                                },
                                {
                                    label:
                                        "Admin Note",
                                    name:
                                        "admin_notes",
                                    type:
                                        "textarea",
                                    full:
                                        true,
                                    value:
                                        a.admin_notes ||
                                        ""
                                },
                                {
                                    label:
                                        "Cover Letter",
                                    name:
                                        "cover_letter",
                                    type:
                                        "textarea",
                                    full:
                                        true,
                                    value:
                                        a.cover_letter ||
                                        ""
                                }
                            ],
                            "Update Applicant",
                            async (data) => {
                                await api(
                                    `/applications/${a.id}`,
                                    {
                                        method:
                                            "PUT",
                                        body:
                                            JSON.stringify(
                                                {
                                                    status:
                                                        data.status,
                                                    admin_notes:
                                                        data.admin_notes
                                                }
                                            )
                                    }
                                );
                            }
                        );
                    }
                }

                else if (
                    action ===
                    "view-professional-request"
                ) {
                    const r =
                        cache.professionalRequests.find(
                            (x) =>
                                x.id ==
                                el.dataset.id
                        );

                    if (r) {
                        formModal(
                            "Professional Request",
                            [
                                {
                                    label:
                                        "Category",
                                    name:
                                        "category",
                                    value:
                                        r.category ||
                                        "General"
                                },
                                {
                                    label:
                                        "Client Email",
                                    name:
                                        "email",
                                    value:
                                        r.email
                                },
                                {
                                    label:
                                        "Phone / WhatsApp",
                                    name:
                                        "phone",
                                    value:
                                        r.phone
                                },
                                {
                                    label:
                                        "Request",
                                    name:
                                        "message",
                                    type:
                                        "textarea",
                                    full:
                                        true,
                                    value:
                                        r.message
                                },
                                {
                                    label:
                                        "Status",
                                    name:
                                        "status",
                                    type:
                                        "select",
                                    options: [
                                        "new",
                                        "contacted",
                                        "in_progress",
                                        "completed",
                                        "closed"
                                    ],
                                    value:
                                        r.status
                                },
                                {
                                    label:
                                        "Admin Notes",
                                    name:
                                        "admin_notes",
                                    type:
                                        "textarea",
                                    full:
                                        true,
                                    value:
                                        r.admin_notes ||
                                        ""
                                }
                            ],
                            "Save Request",
                            async (data) => {
                                await api(
                                    `/professional-requests/${r.id}`,
                                    {
                                        method:
                                            "PUT",
                                        body:
                                            JSON.stringify(
                                                {
                                                    status:
                                                        data.status,
                                                    admin_notes:
                                                        data.admin_notes
                                                }
                                            )
                                    }
                                );
                            }
                        );
                    }
                }

                else if (
                    action ===
                    "refresh-professional-requests"
                ) {
                    await loadProfessionalRequests();
                }

                else if (
                    action ===
                    "refresh-users"
                ) {
                    await loadUsers();
                }

                else if (
                    action ===
                    "refresh-jobs"
                ) {
                    await loadJobs();
                }

                else if (
                    action ===
                    "refresh-applications"
                ) {
                    await loadApplications();
                }

                else if (
                    action ===
                    "refresh-appointments"
                ) {
                    await loadAppointments();
                }

                else if (
                    action ===
                    "refresh-payments"
                ) {
                    await loadPayments();
                }

                else if (
                    action ===
                    "refresh-reviews"
                ) {
                    await loadReviews();
                }

                else if (
                    action ===
                    "refresh-messages"
                ) {
                    await loadMessages();
                }

                else if (
                    action ===
                    "refresh-audit"
                ) {
                    await loadAudit();
                }

                else if (
                    action ===
                    "save-settings"
                ) {
                    await api("/settings", {
                        method: "PUT",
                        body: JSON.stringify({
                            site_name:
                                $(
                                    "settingSiteName"
                                ).value,
                            contact_email:
                                $(
                                    "settingContactEmail"
                                ).value,
                            contact_phone:
                                $(
                                    "settingContactPhone"
                                ).value,
                            maintenance_mode:
                                $(
                                    "settingMaintenance"
                                ).value
                        })
                    });

                    toast(
                        "Settings saved"
                    );
                }

                else if (
                    action ===
                    "change-password"
                ) {
                    await api(
                        "/change-password",
                        {
                            method: "POST",
                            body: JSON.stringify(
                                {
                                    current_password:
                                        $(
                                            "currentAdminPassword"
                                        ).value,
                                    new_password:
                                        $(
                                            "newAdminPassword"
                                        ).value
                                }
                            )
                        }
                    );

                    $(
                        "currentAdminPassword"
                    ).value = "";

                    $(
                        "newAdminPassword"
                    ).value = "";

                    toast(
                        "Password changed"
                    );
                }
            } catch (err) {
                toast(err.message);
            }
        }
    );

    document.addEventListener(
        "change",
        async (e) => {
            const el = e.target;

            if (
                el.dataset.action ===
                "appointment-status"
            ) {
                try {
                    await api(
                        `/appointments/${el.dataset.id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(
                                {
                                    status:
                                        el.value
                                }
                            )
                        }
                    );

                    toast(
                        "Appointment updated"
                    );

                    await refreshAll();
                } catch (err) {
                    toast(err.message);
                }
            }

            else if (
                el.dataset.action ===
                "payment-status"
            ) {
                try {
                    await api(
                        `/payments/${el.dataset.id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(
                                {
                                    status:
                                        el.value
                                }
                            )
                        }
                    );

                    toast(
                        "Payment updated"
                    );

                    await refreshAll();
                } catch (err) {
                    toast(err.message);
                }
            }

            else if (
                el.dataset.action ===
                "professional-request-status"
            ) {
                try {
                    await api(
                        `/professional-requests/${el.dataset.id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(
                                {
                                    status:
                                        el.value
                                }
                            )
                        }
                    );

                    toast(
                        "Professional request updated"
                    );

                    await refreshAll();
                } catch (err) {
                    toast(err.message);
                }
            }

            else if (
                el.dataset.action ===
                "application-status"
            ) {
                try {
                    await api(
                        `/applications/${el.dataset.id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(
                                {
                                    status:
                                        el.value
                                }
                            )
                        }
                    );

                    toast(
                        "Application status updated"
                    );

                    await refreshAll();
                } catch (err) {
                    toast(err.message);
                }
            }
        }
    );

    $("appointmentStatusFilter")?.addEventListener(
        "change",
        loadAppointments
    );

    $(
        "professionalRequestStatusFilter"
    )?.addEventListener(
        "change",
        loadProfessionalRequests
    );

    $("userSearch")?.addEventListener(
        "input",
        loadUsers
    );

    $("userTypeFilter")?.addEventListener(
        "change",
        loadUsers
    );

    $("userStatusFilter")?.addEventListener(
        "change",
        loadUsers
    );

    $("jobSearch")?.addEventListener(
        "input",
        renderJobs
    );

    $("jobStatusFilter")?.addEventListener(
        "change",
        renderJobs
    );

    $("refreshBtn")?.addEventListener(
        "click",
        async () => {
            try {
                await refreshAll();
                toast(
                    "Dashboard refreshed"
                );
            } catch (err) {
                toast(err.message);
            }
        }
    );

    $("menuButton")?.addEventListener(
        "click",
        openSidebar
    );

    $("sidebarClose")?.addEventListener(
        "click",
        closeSidebar
    );

    $("sidebarOverlay")?.addEventListener(
        "click",
        closeSidebar
    );

    $("logoutBtn")?.addEventListener(
        "click",
        async () => {
            if (
                !confirm(
                    "Log out of the admin console?"
                )
            ) {
                return;
            }

            try {
                await api("/logout", {
                    method: "POST"
                });
            } catch {}

            localStorage.removeItem(
                "sjhAdmin"
            );

            window.location.href =
                "admin-login.html";
        }
    );

    window.addEventListener(
        "hashchange",
        () =>
            showSection(
                location.hash.slice(1) ||
                    "overview"
            )
    );

    (async () => {
        try {
            await loadAdmin();
            await refreshAll();

            showSection(
                location.hash.slice(1) ||
                    "overview"
            );
        } catch (err) {
            toast(err.message);
        }
    })();
});