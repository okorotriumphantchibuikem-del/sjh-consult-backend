document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("passwordToggle");
    const loginMessage = document.getElementById("loginMessage");
    const loginButton = loginForm
        ? loginForm.querySelector(".login-button")
        : null;
    const resendLink = document.getElementById("resendVerificationLink");

    // SJH CONSULT PRODUCTION BACKEND
    const apiBase = "https://sjh-consult-backend-production.up.railway.app";

    if (!loginForm) {
        console.error("SJH Consult: login form not found.");
        return;
    }

    function showMessage(message, type) {
        if (!loginMessage) {
            return;
        }

        loginMessage.textContent = message;
        loginMessage.className =
            "login-message show " + (type || "");
    }

    function clearMessage() {
        if (!loginMessage) {
            return;
        }

        loginMessage.textContent = "";
        loginMessage.className = "login-message";
    }

    function setLoading(isLoading) {
        if (!loginButton) {
            return;
        }

        if (isLoading) {
            loginButton.disabled = true;

            if (!loginButton.dataset.originalHtml) {
                loginButton.dataset.originalHtml =
                    loginButton.innerHTML;
            }

            loginButton.innerHTML =
                "<span>Signing In...</span>";
        } else {
            loginButton.disabled = false;

            loginButton.innerHTML =
                loginButton.dataset.originalHtml ||
                "<span>Login to Account</span><span>→</span>";
        }
    }

    function saveUserSession(user) {
        localStorage.setItem(
            "sjhUser",
            JSON.stringify(user)
        );

        localStorage.setItem(
            "sjhLoggedIn",
            "true"
        );
    }

    function redirectToDashboard() {
        window.location.replace(
            "../dashboard/dashboard.html"
        );
    }

    // PASSWORD SHOW / HIDE
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener(
            "click",
            function () {
                const shouldShow =
                    passwordInput.type === "password";

                passwordInput.type =
                    shouldShow ? "text" : "password";

                passwordToggle.textContent =
                    shouldShow ? "Hide" : "Show";

                passwordToggle.setAttribute(
                    "aria-label",
                    shouldShow
                        ? "Hide password"
                        : "Show password"
                );
            }
        );
    }

    // LOGIN
    loginForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            clearMessage();

            const email = emailInput
                ? emailInput.value.trim().toLowerCase()
                : "";

            const password = passwordInput
                ? passwordInput.value
                : "";

            if (!email || !password) {
                showMessage(
                    "Please enter your email address and password.",
                    "error"
                );
                return;
            }

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                showMessage(
                    "Please enter a valid email address.",
                    "error"
                );
                return;
            }

            if (password.length < 8) {
                showMessage(
                    "Your password must contain at least 8 characters.",
                    "error"
                );
                return;
            }

            setLoading(true);

            try {
                const response = await fetch(
                    apiBase + "/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );

                let data = {};

                try {
                    data = await response.json();
                } catch (parseError) {
                    console.error(
                        "SJH login response was not JSON:",
                        parseError
                    );
                }

                if (
                    !response.ok ||
                    !data.success ||
                    !data.user
                ) {
                    showMessage(
                        data.message ||
                        "Unable to login. Please check your details and try again.",
                        "error"
                    );

                    setLoading(false);
                    return;
                }

                // Save the returned user information locally.
                saveUserSession(data.user);

                showMessage(
                    "Login successful. Opening your dashboard...",
                    "success"
                );

                setTimeout(
                    redirectToDashboard,
                    500
                );

            } catch (error) {
                console.error(
                    "SJH Consult login connection error:",
                    error
                );

                showMessage(
                    "Unable to connect to SJH Consult server. Please check your internet connection and try again.",
                    "error"
                );

                setLoading(false);
            }
        }
    );

    // RESEND EMAIL VERIFICATION
    if (resendLink) {
        resendLink.addEventListener(
            "click",
            async function (event) {
                event.preventDefault();

                clearMessage();

                const email = emailInput
                    ? emailInput.value.trim().toLowerCase()
                    : "";

                if (!email) {
                    showMessage(
                        "Enter your email address first, then click Resend verification.",
                        "error"
                    );

                    if (emailInput) {
                        emailInput.focus();
                    }

                    return;
                }

                if (!/^\S+@\S+\.\S+$/.test(email)) {
                    showMessage(
                        "Please enter a valid email address.",
                        "error"
                    );
                    return;
                }

                try {
                    const response = await fetch(
                        apiBase +
                        "/api/auth/resend-verification",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials: "include",

                            body: JSON.stringify({
                                email: email
                            })
                        }
                    );

                    let data = {};

                    try {
                        data = await response.json();
                    } catch (parseError) {
                        console.error(
                            "Verification response error:",
                            parseError
                        );
                    }

                    showMessage(
                        data.message ||
                        "Verification email request processed.",
                        response.ok
                            ? "success"
                            : "error"
                    );

                } catch (error) {
                    console.error(
                        "SJH verification resend error:",
                        error
                    );

                    showMessage(
                        "Unable to connect to SJH Consult server.",
                        "error"
                    );
                }
            }
        );
    }
});