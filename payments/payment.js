document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const form = document.getElementById("paymentForm");
    const service = document.getElementById("paymentService");
    const amount = document.getElementById("paymentAmount");
    const message = document.getElementById("paymentMessage");

    if (!form) return;

    const prices = {
        "CV Review": 10000,
        "Career Consultation": 15000,
        "Professional Consultation": 20000,
        "Training": 12000
    };

    const fmt = n =>
        "₦" + Number(n || 0).toLocaleString("en-NG");

    service.addEventListener("change", () => {
        amount.value = prices[service.value]
            ? fmt(prices[service.value])
            : "";
    });

    const params = new URLSearchParams(location.search);
    const ref = params.get("reference");

    if (ref) {
        form.style.display = "none";
        message.textContent =
            "Verifying your payment securely...";

        try {
            const r = await fetch(
                api +
                `/api/user/payments/verify/${encodeURIComponent(ref)}`,
                {
                    credentials: "include"
                }
            );

            const d = await r.json();

            message.textContent = d.verified
                ? (
                    d.enrolled
                        ? "Payment verified. Your training enrollment is now active."
                        : "Payment verified successfully."
                )
                : (
                    (d.message ||
                        "Payment verification failed.") +
                    " You have not been enrolled."
                );

        } catch (e) {
            console.error(e);
            message.textContent =
                "Unable to verify payment. Please contact SJH Consult support.";
        }
    }

    form.addEventListener("submit", async e => {
        e.preventDefault();

        if (!service.value) {
            return alert("Select a service.");
        }

        const value = prices[service.value];

        if (!value) return;

        message.textContent =
            "Initializing secure Paystack checkout...";

        try {
            const r = await fetch(
                api + "/api/user/payments/initialize",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        purpose: service.value,
                        amount: value
                    })
                }
            );

            const d = await r.json();

            if (!r.ok || !d.success) {
                message.textContent =
                    d.message ||
                    "Unable to initialize payment.";
                return;
            }

            window.location.href =
                d.authorization_url;

        } catch (err) {
            console.error(err);
            message.textContent =
                "Unable to connect to the SJH Consult server.";
        }
    });
});