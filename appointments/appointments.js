document.addEventListener("DOMContentLoaded", async function () {

    const api =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const form = document.getElementById("appointmentForm");
    const date = document.getElementById("appointmentDate");
    const message = document.getElementById("appointmentMessage");

    if (!form) return;

    if (date) {
        date.min = new Date().toISOString().split("T")[0];
    }

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const selected =
            new Date(date.value + "T00:00:00");

        if (
            selected <
            new Date(new Date().toDateString())
        ) {
            message.textContent =
                "Please choose a future date.";
            return;
        }

        const button =
            form.querySelector("button[type=submit]");

        if (button) {
            button.disabled = true;
        }

        try {

            const r = await fetch(
                api + "/api/user/appointments",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        consultation_type:
                            document.getElementById(
                                "consultationType"
                            )?.value ||
                            document.getElementById(
                                "appointmentType"
                            )?.value,

                        appointment_date:
                            date.value,

                        appointment_time:
                            document.getElementById(
                                "appointmentTime"
                            )?.value,

                        notes:
                            document.getElementById(
                                "appointmentNotes"
                            )?.value ||
                            document.getElementById(
                                "appointmentMessage"
                            )?.value ||
                            ""
                    })
                }
            );

            const d = await r.json();

            message.textContent =
                d.message ||
                "Unable to submit appointment.";

            if (r.ok) {

                message.style.color = "#087443";

                form.reset();

                if (date) {
                    date.min =
                        new Date()
                            .toISOString()
                            .split("T")[0];
                }

            } else {

                message.style.color = "#b42318";
            }

        } catch (err) {

            console.error(err);

            message.textContent =
                "Unable to connect to SJH Consult.";

            message.style.color = "#b42318";

        } finally {

            if (button) {
                button.disabled = false;
            }
        }
    });
});