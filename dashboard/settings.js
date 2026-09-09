document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    try {
        const me = await fetch(
            api + "/api/user/profile",
            {
                credentials: "include"
            }
        );

        const md = await me.json();

        if (md.success) {
            const u = md.user;

            const map = {
                fullName: u.full_name,
                email: u.email,
                phone: u.phone,
                accountType: u.account_type
            };

            Object.entries(map).forEach(([id, value]) => {
                const element = document.getElementById(id);

                if (element) {
                    element.value = value || "";
                }
            });
        }
    } catch (error) {
        console.error(
            "Settings profile loading error:",
            error
        );
    }

    const passwordForm =
        document.getElementById("passwordForm");

    if (passwordForm) {
        passwordForm.addEventListener(
            "submit",
            async function (event) {
                event.preventDefault();

                const currentPassword =
                    document.getElementById(
                        "currentPassword"
                    ).value;

                const newPassword =
                    document.getElementById(
                        "newPassword"
                    ).value;

                const confirmPassword =
                    document.getElementById(
                        "confirmPassword"
                    ).value;

                if (newPassword !== confirmPassword) {
                    return alert(
                        "New passwords do not match."
                    );
                }

                try {
                    const response = await fetch(
                        api + "/api/auth/change-password",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            credentials: "include",
                            body: JSON.stringify({
                                currentPassword,
                                newPassword
                            })
                        }
                    );

                    const data = await response.json();

                    alert(
                        data.message ||
                        "Password update completed."
                    );

                    if (response.ok) {
                        window.location.href =
                            "../auth/login.html";
                    }
                } catch (error) {
                    console.error(
                        "Change password error:",
                        error
                    );

                    alert(
                        "Unable to connect to the SJH Consult server."
                    );
                }
            }
        );
    }

    const del =
        document.getElementById("deleteAccount");

    if (del) {
        del.onclick = async function () {
            if (
                !confirm(
                    "Deactivate your SJH Consult account?"
                )
            ) {
                return;
            }

            try {
                const response = await fetch(
                    api + "/api/user/account",
                    {
                        method: "DELETE",
                        credentials: "include"
                    }
                );

                const data = await response.json();

                alert(
                    data.message ||
                    "Account deactivation completed."
                );

                if (response.ok) {
                    window.location.href =
                        "../auth/login.html";
                }
            } catch (error) {
                console.error(
                    "Account deletion error:",
                    error
                );

                alert(
                    "Unable to connect to the SJH Consult server."
                );
            }
        };
    }

    const pref =
        document.getElementById("savePreferences");

    if (pref) {
        pref.onclick = function () {
            localStorage.setItem(
                "sjhNotificationPreferences",
                "saved"
            );

            alert(
                "Notification preferences saved."
            );
        };
    }
});