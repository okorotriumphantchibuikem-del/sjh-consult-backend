document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("adminLoginForm");
    const msg = document.getElementById("adminLoginMessage");

    const API =
        `${window.SJH_API_BASE || "https://sjh-consult-backend-production.up.railway.app"}/api/admin`;

    if (!form) {
        console.error("Admin login form not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (msg) {
            msg.className = "login-message";
            msg.textContent = "Signing in...";
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        try {
            const response = await fetch(`${API}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email: document
                        .getElementById("adminEmail")
                        .value
                        .trim(),

                    password: document
                        .getElementById("adminPassword")
                        .value
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Login failed"
                );
            }

            localStorage.setItem(
                "sjhAdmin",
                JSON.stringify(data.admin)
            );

            if (msg) {
                msg.textContent =
                    "Login successful. Opening admin console...";

                msg.className =
                    "login-message success";
            }

            setTimeout(() => {
                window.location.href =
                    "admin-dashboard.html";
            }, 400);

        } catch (error) {
            console.error(
                "Admin login error:",
                error
            );

            if (msg) {
                msg.textContent =
                    error.message ||
                    "Unable to sign in";

                msg.className =
                    "login-message error";
            }
        }
    });
});