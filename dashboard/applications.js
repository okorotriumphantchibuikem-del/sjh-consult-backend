document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const root = document.querySelector(".applications-card");

    if (!root) return;

    const esc = window.SJHUser.escapeHtml;

    const statusMeta = {
        pending: [
            "Pending",
            "Your application has been received and is waiting for review."
        ],
        reviewing: [
            "Under Review",
            "SJH Consult is reviewing your application."
        ],
        shortlisted: [
            "Shortlisted",
            "You have been shortlisted. Keep an eye on your notifications for next steps."
        ],
        interview: [
            "Interview Stage",
            "Your application has progressed to the interview stage. Check your notifications for instructions."
        ],
        accepted: [
            "Accepted",
            "Congratulations! Your application has been accepted."
        ],
        rejected: [
            "Not Selected",
            "This application was not successful this time. You can continue exploring other opportunities."
        ],
        withdrawn: [
            "Withdrawn",
            "You withdrew this application."
        ]
    };

    try {
        const r = await fetch(
            api + "/api/user/applications",
            {
                credentials: "include",
                cache: "no-store"
            }
        );

        const d = await r.json();

        if (!r.ok || !d.success) {
            throw Error(
                d.message || "Unable to load applications."
            );
        }

        const apps = d.applications || [];

        const stats = [
            ...document.querySelectorAll(".application-stat strong")
        ];

        if (stats[0]) {
            stats[0].textContent = apps.length;
        }

        if (stats[1]) {
            stats[1].textContent = apps.filter(
                a => ["pending", "reviewing"].includes(a.status)
            ).length;
        }

        if (stats[2]) {
            stats[2].textContent = apps.filter(
                a => a.status === "shortlisted"
            ).length;
        }

        if (stats[3]) {
            stats[3].textContent = apps.filter(
                a => a.status === "interview"
            ).length;
        }

        root.innerHTML = `
            <div class="card-header">
                <div>
                    <span>APPLICATION HISTORY</span>
                    <h2>Your Job Applications</h2>
                    <p>
                        Track every application and see when SJH Consult
                        changes its status.
                    </p>
                </div>

                <a href="../jobs/jobs.html" class="jobs-button">
                    Find Jobs
                </a>
            </div>

            ${
                apps.length
                    ? `
                        <div class="application-list">
                            ${apps.map(a => {
                                const m =
                                    statusMeta[a.status] ||
                                    [
                                        a.status,
                                        "Application status updated."
                                    ];

                                return `
                                    <article class="application-row application-${esc(a.status)}">
                                        <div>
                                            <span class="section-label">
                                                ${esc(m[0])}
                                            </span>

                                            <h3>
                                                ${esc(a.job_title)}
                                            </h3>

                                            <p>
                                                ${esc(a.company)}
                                                ·
                                                ${esc(a.location)}
                                            </p>

                                            <small>
                                                Applied
                                                ${window.SJHUser.formatDate(a.created_at)}
                                            </small>

                                            ${
                                                a.admin_notes
                                                    ? `
                                                        <p class="application-note">
                                                            <strong>SJH Note:</strong>
                                                            ${esc(a.admin_notes)}
                                                        </p>
                                                    `
                                                    : ""
                                            }

                                            <p class="application-status-help">
                                                ${esc(m[1])}
                                            </p>
                                        </div>

                                        <div>
                                            <strong>
                                                ${esc(
                                                    a.salary ||
                                                    "Salary not specified"
                                                )}
                                            </strong>

                                            <button
                                                class="view-application"
                                                data-id="${a.id}"
                                            >
                                                View Details
                                            </button>

                                            <button
                                                class="withdraw-application"
                                                data-id="${a.id}"
                                                ${
                                                    ["pending", "reviewing"].includes(
                                                        a.status
                                                    )
                                                        ? ""
                                                        : "disabled"
                                                }
                                            >
                                                ${
                                                    a.status === "withdrawn"
                                                        ? "Withdrawn"
                                                        : "Withdraw"
                                                }
                                            </button>
                                        </div>
                                    </article>
                                `;
                            }).join("")}
                        </div>
                    `
                    : `
                        <div class="empty-state">
                            <div class="empty-icon">JOB</div>

                            <h3>
                                No job applications yet
                            </h3>

                            <p>
                                Explore available opportunities and start applying.
                            </p>

                            <a
                                href="../jobs/jobs.html"
                                class="primary-button"
                            >
                                Explore Jobs
                            </a>
                        </div>
                    `
            }
        `;

        root
            .querySelectorAll(".withdraw-application")
            .forEach(button => {
                button.onclick = async () => {
                    if (!confirm("Withdraw this application?")) {
                        return;
                    }

                    const response = await fetch(
                        api +
                            `/api/user/applications/${button.dataset.id}/withdraw`,
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );

                    const data = await response.json();

                    alert(data.message);

                    if (response.ok) {
                        location.reload();
                    }
                };
            });

        root
            .querySelectorAll(".view-application")
            .forEach(button => {
                button.onclick = async () => {
                    const response = await fetch(
                        api +
                            `/api/user/applications/${button.dataset.id}`,
                        {
                            credentials: "include"
                        }
                    );

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        return alert(
                            data.message ||
                            "Unable to load application"
                        );
                    }

                    const a = data.application;

                    const m =
                        statusMeta[a.status] ||
                        [a.status, ""];

                    const history =
                        (data.history || [])
                            .map(h => `
                                <div style="padding:10px 0;border-bottom:1px solid rgba(7,23,45,.1)">
                                    <strong>
                                        ${
                                            statusMeta[h.new_status]?.[0] ||
                                            h.new_status
                                        }
                                    </strong>

                                    <br>

                                    <small>
                                        ${window.SJHUser.formatDate(h.created_at)}
                                    </small>

                                    ${
                                        h.admin_notes
                                            ? `<p>${esc(h.admin_notes)}</p>`
                                            : ""
                                    }
                                </div>
                            `)
                            .join("");

                    alert(
                        `${a.job_title} at ${a.company}

Status: ${m[0]}

${m[1]}${
                            a.admin_notes
                                ? `

SJH Note: ${a.admin_notes}`
                                : ""
                        }

Status history:
${history.replace(/<[^>]*>/g, "")}`
                    );
                };
            });

    } catch (e) {
        console.error(
            "Applications loading error:",
            e
        );

        root.insertAdjacentHTML(
            "beforeend",
            `<p class="error-message">${esc(e.message)}</p>`
        );
    }
});