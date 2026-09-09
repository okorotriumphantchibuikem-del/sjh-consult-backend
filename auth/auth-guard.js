(function () {
    const apiBase =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    window.SJHAuth = {
        apiBase,
        user: null,
        ready: false,

        async check() {
            try {
                const response = await fetch(
                    `${apiBase}/api/auth/me`,
                    {
                        credentials: "include",
                        cache: "no-store"
                    }
                );

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message || "Not authenticated"
                    );
                }

                this.user = data.user;
                this.ready = true;

                localStorage.setItem(
                    "sjhUser",
                    JSON.stringify(data.user)
                );

                document.dispatchEvent(
                    new CustomEvent("sjhAuthReady", {
                        detail: data.user
                    })
                );

                return data.user;

            } catch (error) {
                console.error(
                    "Authentication check failed:",
                    error
                );

                localStorage.removeItem("sjhUser");

                window.location.replace(
                    "../auth/login.html"
                );

                return null;
            }
        },

        async logout() {
            try {
                await fetch(
                    `${apiBase}/api/auth/logout`,
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );
            } catch (error) {
                console.error(
                    "Logout request failed:",
                    error
                );
            }

            localStorage.removeItem("sjhUser");
            localStorage.removeItem("token");
            sessionStorage.clear();

            window.location.replace(
                "../auth/login.html"
            );
        }
    };

    document.addEventListener(
        "DOMContentLoaded",
        async function () {
            const user = await window.SJHAuth.check();

            if (!user) return;

            document
                .querySelectorAll("[data-auth-name]")
                .forEach(function (element) {
                    element.textContent =
                        user.full_name || "SJH User";
                });

            document
                .querySelectorAll("[data-auth-email]")
                .forEach(function (element) {
                    element.textContent =
                        user.email || "";
                });

            document
                .querySelectorAll(
                    "#logoutButton, #logoutBtn, [data-portal-logout]"
                )
                .forEach(function (button) {
                    if (button.dataset.authLogoutReady) {
                        return;
                    }

                    button.dataset.authLogoutReady = "true";

                    button.addEventListener(
                        "click",
                        function (event) {
                            event.preventDefault();
                            window.SJHAuth.logout();
                        }
                    );
                });
        }
    );
})();