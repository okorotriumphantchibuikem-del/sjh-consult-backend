(function () {
    const menu = document.getElementById("sjhMobileMenu");
    const toggle = document.getElementById("sjhMenuToggle");

    if (toggle && menu) {
        toggle.onclick = () => {
            const open = menu.classList.toggle("show");
            toggle.setAttribute("aria-expanded", String(open));
        };
    }

    const params = new URLSearchParams(location.search);
    const jobId = Number(params.get("id"));

    const api =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const esc = v =>
        String(v ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        }[c]));

    async function load() {
        if (!jobId) return;

        try {
            const r = await fetch(api + "/api/public/jobs");
            const d = await r.json();

            const job = (d.jobs || []).find(
                x => Number(x.id) === jobId
            );

            if (!job) return;

            document.title = job.title + " | SJH Consult";

            const set = (id, v) => {
                const e = document.getElementById(id);
                if (e) e.textContent = v || "";
            };

            set("jobTitle", job.title);
            set("companyName", job.company);
            set("jobLocation", job.location);

            const label = document.querySelector(".job-label");

            if (label) {
                label.textContent = job.category;
            }

            const main = document.querySelector(".job-main");

            if (main) {
                const cards = main.querySelectorAll(".details-card");

                if (cards[0]) {
                    cards[0].innerHTML = `
                        <h2>Job Description</h2>
                        <p>${esc(
                            job.description ||
                            "No description provided."
                        )}</p>
                    `;
                }

                if (cards[1]) {
                    cards[1].innerHTML = `
                        <h2>Responsibilities</h2>
                        <p>${esc(
                            job.requirements ||
                            "See requirements below."
                        )}</p>
                    `;
                }

                if (cards[2]) {
                    cards[2].innerHTML = `
                        <h2>Requirements</h2>
                        <p>${esc(
                            job.requirements ||
                            "No additional requirements provided."
                        )}</p>
                    `;
                }
            }

            const meta =
                document.querySelectorAll(
                    ".job-title-area .job-meta span"
                );

            if (meta[1]) {
                meta[1].textContent =
                    job.job_type || "Full-time";
            }

            if (meta[2]) {
                meta[2].textContent =
                    job.experience || "Any";
            }

            const apply =
                document.getElementById("applyButton");

            const save =
                document.getElementById("saveJobButton");

            if (apply) {
                apply.onclick = async e => {
                    e.preventDefault();

                    try {
                        const r = await fetch(
                            api + "/api/auth/me",
                            {
                                credentials: "include"
                            }
                        );

                        const d = await r.json();

                        if (!r.ok || !d.success) {
                            location.href =
                                `../auth/login.html?redirect=${encodeURIComponent(
                                    location.href
                                )}`;

                            return;
                        }

                        const cover =
                            prompt(
                                "Optional cover letter for this application:",
                                ""
                            ) || "";

                        const rr = await fetch(
                            api + "/api/user/applications",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                credentials: "include",
                                body: JSON.stringify({
                                    job_id: jobId,
                                    cover_letter: cover
                                })
                            }
                        );

                        const dd = await rr.json();

                        alert(dd.message);

                        if (rr.ok) {
                            apply.textContent = "Applied";
                        }

                    } catch (e) {
                        console.error(e);
                        alert(
                            "Unable to submit application."
                        );
                    }
                };
            }

            if (save) {
                save.onclick = async () => {
                    try {
                        const r = await fetch(
                            api +
                            "/api/user/saved/" +
                            jobId,
                            {
                                method: "POST",
                                credentials: "include"
                            }
                        );

                        const d = await r.json();

                        if (r.status === 401) {
                            location.href =
                                `../auth/login.html?redirect=${encodeURIComponent(
                                    location.href
                                )}`;

                            return;
                        }

                        alert(d.message);

                    } catch (e) {
                        console.error(e);
                        alert(
                            "Unable to save this job."
                        );
                    }
                };
            }

        } catch (e) {
            console.error(e);
        }
    }

    load();
})();