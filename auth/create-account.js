document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("createAccountForm");
    if (!form) return;

    const apiBase =
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const message = document.getElementById("formMessage");
    const submitButton = document.getElementById("createAccountBtn");
    const accountTypeInput = document.getElementById("accountType");
    const artisanOption = document.getElementById("artisanOption");
    const corporateOption = document.getElementById("corporateOption");
    const artisanFields = document.getElementById("artisanFields");
    const corporateFields = document.getElementById("corporateFields");
    const skillGroup = document.getElementById("skillGroup");
    const bioGroup = document.getElementById("bioGroup");

    const fullName = document.getElementById("fullName");
    const phone = document.getElementById("phone");
    const email = document.getElementById("email");
    const profession = document.getElementById("profession");
    const experience = document.getElementById("experience");
    const careerField = document.getElementById("careerField");
    const jobTitle = document.getElementById("jobTitle");
    const location = document.getElementById("location");
    const skill = document.getElementById("skill");
    const bio = document.getElementById("bio");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const terms = document.getElementById("terms");

    function showMessage(text, type) {
        if (!message) {
            alert(text);
            return;
        }

        message.textContent = text;
        message.className = "form-message " + (type || "");
        message.style.display = "block";
    }

    function clearMessage() {
        if (!message) return;
        message.textContent = "";
        message.className = "form-message";
        message.style.display = "none";
    }

    function setRequired(element, required) {
        if (!element) return;
        element.required = required;
    }

    function setAccountType(type) {
        const isArtisan = type === "artisan";
        const isCorporate = type === "corporate";

        if (accountTypeInput) {
            accountTypeInput.value = type;
        }

        [artisanOption, corporateOption].forEach(function (option) {
            if (!option) return;
            const active = option.dataset.accountType === type;
            option.classList.toggle("active", active);
            option.setAttribute("aria-pressed", active ? "true" : "false");
        });

        if (artisanFields) artisanFields.hidden = !isArtisan;
        if (corporateFields) corporateFields.hidden = !isCorporate;
        if (skillGroup) skillGroup.hidden = !isArtisan;
        if (bioGroup) bioGroup.hidden = !isArtisan;

        setRequired(profession, isArtisan);
        setRequired(experience, isArtisan);
        setRequired(skill, isArtisan);
        setRequired(bio, isArtisan);
        setRequired(careerField, isCorporate);
        setRequired(jobTitle, isCorporate);
    }

    if (artisanOption) {
        artisanOption.addEventListener("click", function () {
            setAccountType("artisan");
            clearMessage();
        });
    }

    if (corporateOption) {
        corporateOption.addEventListener("click", function () {
            setAccountType("corporate");
            clearMessage();
        });
    }

    document.querySelectorAll(".password-toggle").forEach(function (button) {
        button.addEventListener("click", function () {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);

            if (!input) return;

            const shouldShow = input.type === "password";
            input.type = shouldShow ? "text" : "password";
            button.textContent = shouldShow ? "Hide" : "Show";
            button.setAttribute(
                "aria-label",
                shouldShow ? "Hide password" : "Show password"
            );
        });
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearMessage();

        const accountType = accountTypeInput
            ? accountTypeInput.value.trim().toLowerCase()
            : "";

        const payload = {
            full_name: fullName ? fullName.value.trim() : "",
            phone: phone ? phone.value.trim() : "",
            email: email ? email.value.trim().toLowerCase() : "",
            account_type: accountType,
            profession: profession ? profession.value.trim() : "",
            experience: experience ? experience.value.trim() : "",
            career_field: careerField ? careerField.value.trim() : "",
            job_title: jobTitle ? jobTitle.value.trim() : "",
            location: location ? location.value.trim() : "",
            skill: skill ? skill.value.trim() : "",
            bio: bio ? bio.value.trim() : "",
            password: password ? password.value : ""
        };

        const confirmation = confirmPassword
            ? confirmPassword.value
            : "";

        if (!payload.full_name || !payload.phone || !payload.email ||
            !accountType || !payload.password || !confirmation) {
            showMessage(
                "Please complete the account type, full name, phone, email and password fields.",
                "error"
            );
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
            showMessage("Please enter a valid email address.", "error");
            return;
        }

        if (!["artisan", "corporate"].includes(accountType)) {
            showMessage("Please select an account type.", "error");
            return;
        }

        if (accountType === "artisan" &&
            (!payload.profession || !payload.experience || !payload.skill || !payload.bio)) {
            showMessage(
                "Please complete your artisan professional details.",
                "error"
            );
            return;
        }

        if (accountType === "corporate" &&
            (!payload.career_field || !payload.job_title)) {
            showMessage(
                "Please complete your corporate worker details.",
                "error"
            );
            return;
        }

        if (payload.password.length < 8) {
            showMessage(
                "Password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (payload.password !== confirmation) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        if (terms && !terms.checked) {
            showMessage(
                "Please agree to the Terms of Service and Privacy Policy.",
                "error"
            );
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText = submitButton.textContent.trim();
            submitButton.textContent = "Creating Account...";
        }

        try {
            const response = await fetch(
                apiBase + "/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(payload)
                }
            );

            let data = {};
            try {
                data = await response.json();
            } catch (parseError) {}

            if (!response.ok || !data.success) {
                showMessage(
                    data.message || "Unable to create your account. Please try again.",
                    "error"
                );
                return;
            }

            showMessage(
                data.message ||
                "Account created successfully. Please check your email to verify your account.",
                "success"
            );

            form.reset();
            setAccountType("");

            setTimeout(function () {
                window.location.href = "login.html";
            }, 2500);
        } catch (error) {
            console.error("Registration error:", error);
            showMessage(
                "Unable to connect to the SJH Consult server. Please try again.",
                "error"
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    submitButton.dataset.originalText || "Create Account";
            }
        }
    });

    setAccountType("");
});
