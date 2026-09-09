document.addEventListener("DOMContentLoaded", function () {
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener("click", function () {
            const isOpen = mobileMenu.classList.toggle("show");

            menuToggle.classList.toggle("active", isOpen);
            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        mobileMenu
            .querySelectorAll("a")
            .forEach(link => {
                link.addEventListener("click", () => {
                    mobileMenu.classList.remove("show");
                    menuToggle.classList.remove("active");
                    menuToggle.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                });
            });

        document.addEventListener("click", event => {
            if (
                !mobileMenu.contains(event.target) &&
                !menuToggle.contains(event.target)
            ) {
                mobileMenu.classList.remove("show");
                menuToggle.classList.remove("active");
                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        });
    }

    const form = document.getElementById("contactForm");

    const messageBox =
        document.getElementById("formMessage") ||
        document.getElementById("contactMessageBox");

    if (!form) {
        return;
    }

    const api =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const button =
            form.querySelector("button[type=submit]");

        if (button) {
            button.disabled = true;
            button.dataset.label = button.textContent;
            button.textContent = "Sending...";
        }

        const body = {
            name:
                document
                    .getElementById("fullName")
                    ?.value
                    .trim(),

            email:
                document
                    .getElementById("email")
                    ?.value
                    .trim(),

            phone:
                document
                    .getElementById("phone")
                    ?.value
                    .trim(),

            subject:
                document
                    .getElementById("subject")
                    ?.value
                    .trim(),

            message:
                document
                    .getElementById("message")
                    ?.value
                    .trim(),

            website:
                document
                    .getElementById("website")
                    ?.value
                    .trim()
        };

        try {
            const response = await fetch(
                api + "/api/public/contact",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch (error) {
                data = {};
            }

            if (messageBox) {
                messageBox.textContent =
                    data.message ||
                    "Unable to send your message.";

                messageBox.className =
                    "form-message " +
                    (response.ok ? "success" : "error") +
                    " show";
            }

            if (response.ok) {
                form.reset();
            }

        } catch (error) {
            console.error(
                "SJH contact form error:",
                error
            );

            if (messageBox) {
                messageBox.textContent =
                    "Unable to connect to SJH Consult. Please try again.";

                messageBox.className =
                    "form-message error show";
            }

        } finally {
            if (button) {
                button.disabled = false;

                button.textContent =
                    button.dataset.label ||
                    "Send Message";
            }
        }
    });
});