document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const form = document.getElementById("supportForm");

    if (!form) return;

    async function load() {
        try {
            const response = await fetch(
                api + "/api/user/messages",
                {
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (!data.success) return;

            const history =
                document.querySelector(".message-history");

            if (history) {
                history.innerHTML =
                    (data.messages || [])
                        .map(
                            message => `
                                <div class="message-history-item">
                                    <div class="history-icon">
                                        SJH
                                    </div>

                                    <div class="history-content">
                                        <h3>
                                            ${window.SJHUser.escapeHtml(
                                                message.subject
                                            )}
                                        </h3>

                                        <p>
                                            ${window.SJHUser.escapeHtml(
                                                message.admin_reply ||
                                                message.message
                                            )}
                                        </p>

                                        <span>
                                            ${window.SJHUser.formatDate(
                                                message.created_at
                                            )}
                                        </span>
                                    </div>

                                    <span class="message-status">
                                        ${window.SJHUser.escapeHtml(
                                            message.status
                                        )}
                                    </span>
                                </div>
                            `
                        )
                        .join("") ||
                    "<p>No previous messages.</p>";
            }
        } catch (error) {
            console.error(
                "Messages loading error:",
                error
            );
        }
    }

    await load();

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            const response = await fetch(
                api + "/api/user/messages",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        subject:
                            document.getElementById("subject").value,

                        message:
                            document.getElementById("message").value
                    })
                }
            );

            const data = await response.json();

            alert(
                data.message ||
                "Message sent successfully."
            );

            if (response.ok) {
                form.reset();
                load();
            }
        } catch (error) {
            console.error(
                "Message submission error:",
                error
            );

            alert(
                "Unable to connect to the SJH Consult server."
            );
        }
    });
});