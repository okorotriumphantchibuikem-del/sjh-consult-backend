document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const form = document.getElementById("appointmentForm");
    const date = document.getElementById("appointmentDate");

    if (!form) return;

    if (date) {
        date.min = new Date().toISOString().split("T")[0];
    }

    try {
        const response = await fetch(
            api + "/api/user/appointments",
            {
                credentials: "include"
            }
        );

        const data = await response.json();

        if (data.success) {
            const content =
                document.querySelector(".appointment-list");

            if (content) {
                content.innerHTML =
                    (data.appointments || [])
                        .map(
                            appointment => `
                                <div class="appointment-item">
                                    <strong>
                                        ${window.SJHUser.escapeHtml(
                                            appointment.consultation_type
                                        )}
                                    </strong>

                                    <span>
                                        ${window.SJHUser.formatDate(
                                            appointment.appointment_date
                                        )}
                                        ·
                                        ${window.SJHUser.escapeHtml(
                                            appointment.appointment_time
                                        )}
                                    </span>

                                    <b>
                                        ${window.SJHUser.escapeHtml(
                                            appointment.status
                                        )}
                                    </b>

                                    <p>
                                        ${window.SJHUser.escapeHtml(
                                            appointment.admin_notes ||
                                            appointment.notes ||
                                            ""
                                        )}
                                    </p>
                                </div>
                            `
                        )
                        .join("") ||
                    "<p>No appointment requests yet.</p>";
            }
        }
    } catch (error) {
        console.error(
            "Appointment loading error:",
            error
        );
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const payload = {
            consultation_type:
                document.getElementById("appointmentType").value,

            appointment_date:
                date.value,

            appointment_time:
                document.getElementById("appointmentTime").value,

            notes:
                document.getElementById("appointmentMessage").value
        };

        try {
            const response = await fetch(
                api + "/api/user/appointments",
                {
                    method: "POST",
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
                "Appointment request submitted."
            );

            if (response.ok) {
                location.reload();
            }
        } catch (error) {
            console.error(
                "Appointment submission error:",
                error
            );

            alert(
                "Unable to connect to the SJH Consult server."
            );
        }
    });
});