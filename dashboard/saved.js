document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const grid = document.querySelector(".saved-grid");

    if (!grid) return;

    try {
        const response = await fetch(
            api + "/api/user/saved",
            {
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Unable to load saved opportunities."
            );
        }

        const jobs = data.saved || [];

        if (!jobs.length) {
            grid.innerHTML = `
                <div class="empty-saved">
                    <div class="empty-icon">⭐</div>
                    <h3>No Saved Opportunities</h3>
                    <p>
                        You have not saved any opportunities yet.
                    </p>
                    <a
                        href="../jobs/jobs.html"
                        class="primary-button"
                    >
                        Find Opportunities
                    </a>
                </div>
            `;

            return;
        }

        grid.innerHTML = jobs
            .map(
                job => `
                    <article class="saved-card">

                        <div class="saved-card-top">
                            <span class="opportunity-type">
                                ${window.SJHUser.escapeHtml(
                                    job.job_type ||
                                    "Opportunity"
                                )}
                            </span>

                            <button
                                class="remove-save"
                                data-id="${job.id}"
                                type="button"
                            >
                                ×
                            </button>
                        </div>

                        <h3>
                            ${window.SJHUser.escapeHtml(
                                job.title
                            )}
                        </h3>

                        <p class="company-name">
                            ${window.SJHUser.escapeHtml(
                                job.company
                            )}
                        </p>

                        <div class="opportunity-details">
                            <span>
                                📍
                                ${window.SJHUser.escapeHtml(
                                    job.location
                                )}
                            </span>

                            <span>
                                💼
                                ${window.SJHUser.escapeHtml(
                                    job.category
                                )}
                            </span>
                        </div>

                        <p class="opportunity-description">
                            ${window.SJHUser.escapeHtml(
                                job.description || ""
                            )}
                        </p>

                        <div class="saved-card-bottom">
                            <span class="saved-date">
                                Saved
                                ${window.SJHUser.formatDate(
                                    job.saved_at
                                )}
                            </span>

                            <a
                                href="../jobs/job-details.html?id=${job.id}"
                                class="view-button"
                            >
                                View Opportunity
                            </a>
                        </div>

                    </article>
                `
            )
            .join("");

        grid
            .querySelectorAll(".remove-save")
            .forEach(button => {
                button.onclick = async function () {
                    try {
                        const response = await fetch(
                            api +
                                "/api/user/saved/" +
                                button.dataset.id,
                            {
                                method: "DELETE",
                                credentials: "include"
                            }
                        );

                        if (!response.ok) {
                            throw new Error(
                                "Unable to remove saved opportunity."
                            );
                        }

                        button
                            .closest(".saved-card")
                            ?.remove();

                    } catch (error) {
                        console.error(
                            "Remove saved opportunity error:",
                            error
                        );

                        alert(
                            error.message ||
                            "Unable to remove saved opportunity."
                        );
                    }
                };
            });

    } catch (error) {
        console.error(
            "Saved opportunities loading error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-saved">
                <h3>Unable to load saved opportunities</h3>
                <p>Please try again.</p>
            </div>
        `;
    }
});