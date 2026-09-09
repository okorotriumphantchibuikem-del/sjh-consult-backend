document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const grid =
        document.getElementById("courseGrid") ||
        document.querySelector(".course-grid");

    if (!grid) return;

    try {
        const r = await fetch(
            api + "/api/user/training",
            {
                credentials: "include"
            }
        );

        const d = await r.json();

        if (!r.ok || !d.success) {
            throw Error(
                d.message || "Unable to load training"
            );
        }

        const courses = d.courses || [];

        const count =
            document.getElementById("courseCount");

        if (count) {
            count.textContent = courses.length;
        }

        grid.innerHTML = courses.map(c => {
            const price = Number(c.price || 0);

            const enrolled =
                !!c.enrollment_id &&
                c.enrollment_status !== "cancelled";

            const status = enrolled
                ? (c.enrollment_status || "active")
                : "Available";

            return `
                <article class="course-card">

                    <div class="course-top">
                        <span class="course-category">
                            ${window.SJHUser.escapeHtml(c.category)}
                        </span>

                        <span class="course-duration">
                            SJH Consult
                        </span>
                    </div>

                    <div class="course-icon">
                        TR
                    </div>

                    <h3>
                        ${window.SJHUser.escapeHtml(c.title)}
                    </h3>

                    <p>
                        ${window.SJHUser.escapeHtml(
                            c.description ||
                            "Professional SJH Consult training course."
                        )}
                    </p>

                    <div class="course-details">

                        <div>
                            <span>PRICE</span>

                            <strong>
                                ${
                                    price > 0
                                        ? window.SJHUser.money(price)
                                        : "FREE"
                                }
                            </strong>
                        </div>

                        <div>
                            <span>STATUS</span>

                            <strong>
                                ${window.SJHUser.escapeHtml(status)}
                            </strong>
                        </div>

                    </div>

                    <button
                        class="enroll-button"
                        data-id="${c.id}"
                        data-title="${window.SJHUser.escapeHtml(c.title)}"
                        ${enrolled ? "disabled" : ""}
                    >
                        ${
                            enrolled
                                ? "Enrolled"
                                : price > 0
                                    ? `Pay ${window.SJHUser.money(price)} & Enroll`
                                    : "Enroll Free"
                        }
                    </button>

                </article>
            `;
        }).join("");

        grid
            .querySelectorAll(
                ".enroll-button:not(:disabled)"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    async () => {
                        if (
                            !confirm(
                                "You will be taken to secure Paystack checkout to complete this training enrollment. Continue?"
                            )
                        ) {
                            return;
                        }

                        button.disabled = true;
                        button.textContent =
                            "Starting secure checkout...";

                        try {
                            const r = await fetch(
                                api +
                                    `/api/user/training/${button.dataset.id}/enroll`,
                                {
                                    method: "POST",
                                    credentials: "include"
                                }
                            );

                            const d = await r.json();

                            if (!r.ok || !d.success) {
                                throw Error(
                                    d.message ||
                                    "Unable to start enrollment"
                                );
                            }

                            if (
                                d.free ||
                                d.alreadyEnrolled
                            ) {
                                alert(d.message);
                                location.reload();
                                return;
                            }

                            if (d.authorization_url) {
                                window.location.href =
                                    d.authorization_url;
                                return;
                            }

                            throw Error(
                                "Payment checkout was not created."
                            );

                        } catch (e) {
                            alert(
                                e.message ||
                                "Unable to start enrollment."
                            );

                            button.disabled = false;
                            button.textContent =
                                "Enroll Now";
                        }
                    }
                );
            });

    } catch (e) {
        console.error(
            "Training loading error:",
            e
        );

        grid.innerHTML = `
            <p class="empty-state">
                Unable to load training courses right now.
            </p>
        `;
    }
});