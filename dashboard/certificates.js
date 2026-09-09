document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    try {
        const response = await fetch(
            api + "/api/user/certificates",
            {
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            return;
        }

        const list =
            document.querySelector(".certificate-grid");

        const cards = data.certificates || [];

        const no =
            document.getElementById("noCertificates");

        if (list) {
            list.innerHTML = cards
                .map(
                    certificate => `
                        <article class="certificate-card">
                            <div class="certificate-icon">
                                🏆
                            </div>

                            <div class="certificate-content">
                                <span class="certificate-label">
                                    Certificate of Completion
                                </span>

                                <h3>
                                    ${window.SJHUser.escapeHtml(
                                        certificate.title
                                    )}
                                </h3>

                                <p>
                                    Your SJH Consult training certificate.
                                </p>

                                <div class="certificate-details">
                                    <span>
                                        Issued:
                                        ${window.SJHUser.formatDate(
                                            certificate.issued_at
                                        )}
                                    </span>

                                    <span>
                                        Certificate ID:
                                        ${window.SJHUser.escapeHtml(
                                            certificate.certificate_number
                                        )}
                                    </span>
                                </div>

                                ${
                                    certificate.file_url
                                        ? `
                                            <a
                                                class="certificate-button"
                                                href="${api + certificate.file_url}"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                View Certificate
                                            </a>
                                        `
                                        : ""
                                }
                            </div>
                        </article>
                    `
                )
                .join("");
        }

        if (no) {
            no.style.display =
                cards.length ? "none" : "block";
        }

    } catch (error) {
        console.error(
            "Certificates loading error:",
            error
        );
    }
});