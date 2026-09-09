document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const box = document.getElementById("paymentHistory");

    if (!box) return;

    try {
        const response = await fetch(
            api + "/api/user/payments",
            {
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw Error(
                data.message || "Unable to load payment history."
            );
        }

        box.innerHTML =
            (data.payments || [])
                .map(
                    payment => `
                        <div
                            class="activity-row"
                            style="display:flex;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid #ddd"
                        >
                            <div>
                                <strong>
                                    ${window.SJHUser.escapeHtml(
                                        payment.purpose
                                    )}
                                </strong>

                                <p>
                                    ${window.SJHUser.escapeHtml(
                                        payment.reference
                                    )}
                                </p>

                                <small>
                                    ${window.SJHUser.formatDate(
                                        payment.created_at
                                    )}
                                </small>
                            </div>

                            <div style="text-align:right">
                                <strong>
                                    ${window.SJHUser.money(
                                        payment.amount
                                    )}
                                </strong>

                                <p>
                                    ${window.SJHUser.escapeHtml(
                                        payment.status
                                    )}
                                </p>
                            </div>
                        </div>
                    `
                )
                .join("") ||
            "<p>No payments yet.</p>";

    } catch (error) {
        console.error(
            "Payment history error:",
            error
        );

        box.textContent =
            error.message ||
            "Unable to load payment history.";
    }
});