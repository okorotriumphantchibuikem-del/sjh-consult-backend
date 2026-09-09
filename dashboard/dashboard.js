(function () {
    const apiBase =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const money = n =>
        "₦" + Number(n || 0).toLocaleString("en-NG");

    const escapeHtml = v =>
        String(v ?? "").replace(
            /[&<>"']/g,
            c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#039;"
            }[c])
        );

    const initials = name =>
        String(name || "U")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(x => x[0])
            .join("")
            .toUpperCase();

    const formatDate = d =>
        d
            ? new Date(d).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
              })
            : "";

    function userLinks() {
        const map = {
            "Overview": "dashboard.html",
            "My Profile": "profile.html",
            "My CV": "cv-review.html",
            "Job Applications": "applications.html",
            "Training": "training.html",
            "Appointments": "appointments.html",
            "Messages": "messages.html",
            "Payments": "payments.html",
            "Settings": "settings.html"
        };

        document
            .querySelectorAll(".dashboard-nav-link")
            .forEach(a => {
                const text = (
                    a.querySelector("span:last-child") || a
                ).textContent.trim();

                if (map[text]) {
                    a.href = map[text];
                }
            });

        document
            .querySelectorAll('a[href="#"]')
            .forEach(a => {
                const t = a.textContent.trim();

                if (map[t]) {
                    a.href = map[t];
                }
            });

        document
            .querySelectorAll(".sidebar-nav, .dashboard-nav")
            .forEach(nav => {
                if (
                    ![...nav.querySelectorAll("a")]
                        .some(a => /Payments/i.test(a.textContent))
                ) {
                    const a = document.createElement("a");

                    a.href = "payments.html";
                    a.className = "dashboard-nav-link";

                    a.innerHTML =
                        '<span class="nav-icon">₦</span>' +
                        "<span>Payments</span>";

                    nav.appendChild(a);
                }
            });
    }

    function paintUser(user) {
        document
            .querySelectorAll("[data-auth-name]")
            .forEach(e => {
                e.textContent =
                    user.full_name || "SJH User";
            });

        document
            .querySelectorAll("[data-auth-email]")
            .forEach(e => {
                e.textContent = user.email || "";
            });

        document
            .querySelectorAll(".user-avatar")
            .forEach(e => {
                e.textContent = initials(user.full_name);
            });

        document
            .querySelectorAll(".header-title h1")
            .forEach(e => {
                e.textContent =
                    "Welcome back, " +
                    (user.full_name || "SJH User");
            });
    }

    async function getDashboard() {
        const r = await fetch(
            apiBase + "/api/user/dashboard",
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        const d = await r.json();

        if (!r.ok || !d.success) {
            throw new Error(
                d.message || "Unable to load dashboard"
            );
        }

        return d;
    }

    function stat(label, value, text) {
        const card = [
            ...document.querySelectorAll(".stat-card")
        ].find(
            c =>
                c.querySelector("span")?.textContent.includes(label)
        );

        if (card) {
            const h = card.querySelector("h3");
            const p = card.querySelector("p");

            if (h) h.textContent = value;
            if (p) p.textContent = text || "";
        }
    }

    async function init() {
        userLinks();

        try {
            const d = await getDashboard();

            paintUser(d.user);

            stat(
                "CV STATUS",
                d.cv
                    ? (d.cv.status || "Pending").toUpperCase()
                    : "Not Submitted",
                d.cv
                    ? "Your latest CV review status"
                    : "Upload your CV for review"
            );

            stat(
                "APPLICATIONS",
                d.stats.applications,
                d.stats.pendingApplications +
                    " awaiting action"
            );

            stat(
                "TRAINING",
                d.stats.enrollments,
                "Courses enrolled"
            );

            stat(
                "APPOINTMENTS",
                d.stats.appointments,
                "Upcoming appointments"
            );

            const count =
                document.querySelector(".notification-count");

            if (count) {
                count.textContent = d.stats.unread;
            }

            const progress =
                document.querySelector(
                    ".profile-progress-panel"
                );

            if (progress) {
                const h = progress.querySelector("h2");
                const p = progress.querySelector("p");

                if (h) {
                    h.textContent =
                        d.stats.profileCompletion >= 100
                            ? "Your profile is complete"
                            : "Complete your profile";
                }

                if (p) {
                    p.textContent =
                        `Your profile is ${d.stats.profileCompletion}% complete. ` +
                        "A complete profile helps SJH Consult match you with opportunities.";
                }

                const bar =
                    progress.querySelector(".progress-fill");

                if (bar) {
                    bar.style.width =
                        d.stats.profileCompletion + "%";
                }
            }

            const activity =
                document.querySelector(".activity-empty");

            if (activity && d.activity.length) {
                activity.outerHTML =
                    `<div class="activity-list">${
                        d.activity
                            .map(
                                a =>
                                    `<div class="activity-row">
                                        <div class="empty-icon">✓</div>
                                        <div>
                                            <strong>${escapeHtml(a.title)}</strong>
                                            <p>${escapeHtml(a.status || "")}</p>
                                            <small>${formatDate(a.created_at)}</small>
                                        </div>
                                    </div>`
                            )
                            .join("")
                    }</div>`;
            }

            const notification =
                document.querySelector(".notification-icon");

            if (notification) {
                notification.onclick = () =>
                    (location.href = "notifications.html");
            }

        } catch (e) {
            console.error(e);
        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    window.SJHUser = {
        apiBase,
        escapeHtml,
        formatDate,
        money,
        initials,
        paintUser
    };
})();