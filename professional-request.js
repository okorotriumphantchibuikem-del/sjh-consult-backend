document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("professionalRequestForm");

    if (!form) return;

    const status = document.getElementById(
        "professionalRequestStatus"
    );

    const button = form.querySelector(
        "button[type=submit]"
    );

    const api =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    form.addEventListener("submit", async e => {
        e.preventDefault();

        status.textContent = "";
        status.className =
            "professional-request-status";

        const data = Object.fromEntries(
            new FormData(form).entries()
        );

        if (
            !data.message.trim() ||
            data.message.trim().length < 10
        ) {
            status.textContent =
                "Please describe what you need in a little more detail.";

            status.classList.add("error");
            return;
        }

        if (
            !/^\S+@\S+\.\S+$/.test(
                data.email.trim()
            )
        ) {
            status.textContent =
                "Please enter a valid email address.";

            status.classList.add("error");
            return;
        }

        if (data.phone.trim().length < 7) {
            status.textContent =
                "Please enter a valid phone or WhatsApp number.";

            status.classList.add("error");
            return;
        }

        button.disabled = true;

        const buttonText =
            button.querySelector("span");

        if (buttonText) {
            buttonText.textContent =
                "Submitting request...";
        }

        try {
            const r = await fetch(
                api + "/api/public/professional-requests",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(data)
                }
            );

            const d = await r.json();

            if (!r.ok || !d.success) {
                throw new Error(
                    d.message ||
                    "Unable to submit request"
                );
            }

            status.textContent = d.message;
            status.classList.add("success");

            form.reset();

        } catch (err) {
            console.error(err);

            status.textContent = err.message;
            status.classList.add("error");

        } finally {
            button.disabled = false;

            if (buttonText) {
                buttonText.textContent =
                    "Request Professionals";
            }
        }
    });
});