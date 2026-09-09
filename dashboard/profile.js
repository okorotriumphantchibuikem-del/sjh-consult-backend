document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const form = document.getElementById("profileForm");

    if (!form) return;

    let original = {};

    const fields = {
        full_name: "fullName",
        email: "email",
        phone: "phone",
        location: "location",
        profession: "profession",
        experience: "experience",
        career_field: "careerField",
        job_title: "jobTitle",
        skill: "skill",
        education: "education",
        career_interest: "careerInterest",
        bio: "bio"
    };

    function fill(user) {
        original = user;

        Object.entries(fields).forEach(([key, id]) => {
            const element = document.getElementById(id);

            if (element) {
                element.value = user[key] || "";
            }
        });

        const name =
            document.querySelector(".profile-summary-text h2");

        const email =
            document.querySelector(".profile-summary-text p");

        const status =
            document.querySelector(".profile-status strong");

        if (name) {
            name.textContent =
                user.full_name || "SJH User";
        }

        if (email) {
            email.textContent =
                user.email || "";
        }

        if (status) {
            status.textContent =
                user.is_active ? "Active" : "Inactive";
        }
    }

    async function load() {
        try {
            const response = await fetch(
                api + "/api/user/profile",
                {
                    credentials: "include"
                }
            );

            const data = await response.json();

            if (data.success) {
                fill(data.user);
            } else {
                alert(
                    data.message ||
                    "Unable to load profile"
                );
            }
        } catch (error) {
            console.error(
                "Profile loading error:",
                error
            );

            alert(
                "Unable to connect to the SJH Consult server."
            );
        }
    }

    await load();

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const payload = {};

        Object.entries(fields).forEach(([key, id]) => {
            if (key !== "email") {
                payload[key] =
                    document.getElementById(id)?.value.trim() || "";
            }
        });

        if (!payload.full_name || !payload.phone) {
            return alert(
                "Full name and phone number are required."
            );
        }

        const button =
            form.querySelector('button[type="submit"]');

        if (button) {
            button.disabled = true;
        }

        try {
            const response = await fetch(
                api + "/api/user/profile",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            alert(
                data.message ||
                "Profile update completed."
            );

            if (data.success) {
                localStorage.setItem(
                    "sjhUser",
                    JSON.stringify(data.user)
                );

                fill(data.user);
            }
        } catch (error) {
            console.error(
                "Profile update error:",
                error
            );

            alert(
                "Unable to connect to the SJH Consult server."
            );
        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    });

    const cancel =
        document.getElementById("cancelButton");

    if (cancel) {
        cancel.onclick = () => fill(original);
    }
});