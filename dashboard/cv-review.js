document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const form = document.getElementById("cvForm");
    const file = document.getElementById("cvFile");

    if (!form || !file) return;

    const fileMessage =
        document.querySelector(".file-message strong");

    const fileSubtext =
        document.querySelector(".file-message span");

    file.addEventListener("change", () => {
        const f = file.files[0];

        if (f) {
            if (fileMessage) {
                fileMessage.textContent = f.name;
            }

            if (fileSubtext) {
                fileSubtext.textContent =
                    (f.size / 1024 / 1024).toFixed(2) +
                    " MB selected";
            }
        }
    });

    try {
        const existing = await fetch(
            api + "/api/user/cv-review",
            {
                credentials: "include"
            }
        );

        const ed = await existing.json();

        if (ed.success) {
            const card = document.createElement("div");

            card.className = "cv-history-card";

            card.innerHTML = `
                <h3>Your CV Review History</h3>

                ${
                    (ed.reviews || [])
                        .map(
                            x => `
                                <div>
                                    <strong>
                                        ${window.SJHUser.escapeHtml(
                                            x.file_name
                                        )}
                                    </strong>

                                    <span>
                                        ${window.SJHUser.escapeHtml(
                                            x.status
                                        )}
                                        ·
                                        ${window.SJHUser.formatDate(
                                            x.created_at
                                        )}
                                    </span>

                                    ${
                                        x.admin_feedback
                                            ? `
                                                <p>
                                                    ${window.SJHUser.escapeHtml(
                                                        x.admin_feedback
                                                    )}
                                                </p>
                                            `
                                            : ""
                                    }

                                    <a
                                        href="${api + x.file_url}"
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        View CV
                                    </a>
                                </div>
                            `
                        )
                        .join("") ||
                    "<p>No submissions yet.</p>"
                }
            `;

            form.parentElement.parentElement?.appendChild(card);
        }
    } catch (error) {
        console.error(
            "CV review history error:",
            error
        );
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const f = file.files[0];
        const type =
            document.getElementById("reviewType").value;

        if (!f || !type) {
            return alert(
                "Select a CV and review type."
            );
        }

        if (f.size > 5 * 1024 * 1024) {
            return alert(
                "CV must be 5MB or smaller."
            );
        }

        const reader = new FileReader();

        reader.onload = async () => {
            try {
                const response = await fetch(
                    api + "/api/user/cv-review",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            file_name: f.name,
                            review_type: type,
                            message:
                                document.getElementById(
                                    "cvMessage"
                                ).value,
                            file_data: reader.result
                        })
                    }
                );

                const data = await response.json();

                alert(
                    data.message ||
                    "CV submitted successfully."
                );

                if (response.ok) {
                    location.reload();
                }
            } catch (error) {
                console.error(
                    "CV submission error:",
                    error
                );

                alert(
                    "Unable to connect to the SJH Consult server."
                );
            }
        };

        reader.readAsDataURL(f);
    });
});