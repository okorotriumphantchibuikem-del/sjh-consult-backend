document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("forgotPasswordForm");
    const message = document.getElementById("forgotMessage");

    const apiBase =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    if (!form) return;

    function showMessage(text, type) {
        if (!message) return;

        message.textContent = text;
        message.className = "forgot-message show " + type;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const email = document.getElementById("email").value.trim();
        const button = form.querySelector(".reset-button");
        const original = button
            ? button.innerHTML
            : "Send Reset Instructions";

        if (button) {
            button.disabled = true;
            button.innerHTML = "<span>Sending...</span>";
        }

        try {
            const response = await fetch(
                `${apiBase}/api/auth/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ email })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(
                    data.message || "Unable to process your request.",
                    "error"
                );
            } else {
                showMessage(data.message, "success");
                form.reset();
            }
        } catch (error) {
            console.error("Forgot password error:", error);

            showMessage(
                "Unable to connect to the SJH Consult server.",
                "error"
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = original;
            }
        }
    });
});