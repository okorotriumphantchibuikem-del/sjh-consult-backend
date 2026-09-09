document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("resetPasswordForm");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const message = document.getElementById("resetMessage");
    const button = document.getElementById("resetButton");

    const token = new URLSearchParams(window.location.search).get("token");

    const apiBase =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    function showMessage(text, type) {
        message.textContent = text;
        message.className = "login-message show " + type;
    }

    if (!token) {
        showMessage(
            "This password reset link is invalid or missing.",
            "error"
        );

        button.disabled = true;
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (password.value !== confirmPassword.value) {
            showMessage("The passwords do not match.", "error");
            return;
        }

        const original = button.innerHTML;

        button.disabled = true;
        button.innerHTML = "Resetting...";

        try {
            const response = await fetch(
                `${apiBase}/api/auth/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        token,
                        password: password.value
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                showMessage(
                    data.message || "Unable to reset your password.",
                    "error"
                );

                button.disabled = false;
                button.innerHTML = original;
                return;
            }

            showMessage(data.message, "success");
            form.reset();

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            console.error("Reset password error:", error);

            showMessage(
                "Unable to connect to the SJH Consult server.",
                "error"
            );

            button.disabled = false;
            button.innerHTML = original;
        }
    });
});