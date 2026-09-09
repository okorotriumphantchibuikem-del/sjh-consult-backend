async function checkAuthentication() {
    try {
        const response = await fetch(
            `${window.SJH_API_BASE || "https://sjh-consult-backend-production.up.railway.app"}/api/auth/me`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            window.location.href = "../auth/login.html";
            return null;
        }

        if (data.user.account_type !== "artisan") {
            window.location.href = "../auth/login.html";
            return null;
        }

        localStorage.setItem(
            "sjhUser",
            JSON.stringify(data.user)
        );

        return data.user;

    } catch (error) {
        console.error("Authentication check failed:", error);

        window.location.href = "../auth/login.html";
        return null;
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    const authenticatedUser = await checkAuthentication();

    if (!authenticatedUser) {
        return;
    }

    const sidebar = document.getElementById("sidebar");
    const sidebarClose = document.getElementById("sidebarClose");
    const menuButton = document.getElementById("menuButton");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".dashboard-section");
    const pageTitle = document.getElementById("pageTitle");

    const notificationButton =
        document.getElementById("notificationButton");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const sectionTitles = {
        overview: "Dashboard Overview",
        profile: "My Profile",
        services: "My Services",
        jobs: "Find Jobs",
        applications: "My Applications",
        portfolio: "My Portfolio",
        messages: "Messages",
        notifications: "Notifications",
        payments: "Payments",
        settings: "Settings"
    };

    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.add("active");
        }
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove("active");
        }
    }

    function showSection(sectionId) {
        sections.forEach(function (section) {
            section.classList.remove("active-section");
        });

        const targetSection =
            document.getElementById(sectionId);

        if (targetSection) {
            targetSection.classList.add("active-section");
        }

        navLinks.forEach(function (link) {
            link.classList.remove("active");

            if (link.dataset.section === sectionId) {
                link.classList.add("active");
            }
        });

        if (pageTitle) {
            pageTitle.textContent =
                sectionTitles[sectionId] || "Dashboard";
        }

        closeSidebar();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    if (menuButton) {
        menuButton.addEventListener("click", openSidebar);
    }

    if (sidebarClose) {
        sidebarClose.addEventListener("click", closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener(
            "click",
            closeSidebar
        );
    }

    navLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();

            const sectionId = link.dataset.section;

            if (sectionId) {
                showSection(sectionId);
            }
        });
    });

    const navigationButtons =
        document.querySelectorAll("[data-target]");

    navigationButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const target = button.dataset.target;

            if (target) {
                showSection(target);
            }
        });
    });

    if (notificationButton) {
        notificationButton.addEventListener(
            "click",
            function () {
                showSection("notifications");
            }
        );
    }

    const user = authenticatedUser;

    const fullName =
        user.full_name ||
        user.name ||
        "Artisan User";

    const profession =
        user.profession ||
        "Artisan / Professional";

    const nameElements = [
        document.getElementById("sidebarUserName"),
        document.getElementById("headerUserName"),
        document.getElementById("welcomeName")
    ];

    nameElements.forEach(function (element) {
        if (element) {
            element.textContent = fullName;
        }
    });

    const professionElements = [
        document.getElementById("sidebarProfession"),
        document.getElementById("headerProfession")
    ];

    professionElements.forEach(function (element) {
        if (element) {
            element.textContent = profession;
        }
    });

    const profileFullName =
        document.getElementById("profileFullName");

    const profilePhone =
        document.getElementById("profilePhone");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileLocation =
        document.getElementById("profileLocation");

    const profileProfession =
        document.getElementById("profileProfession");

    const profileExperience =
        document.getElementById("profileExperience");

    const profileSkill =
        document.getElementById("profileSkill");

    const profileBio =
        document.getElementById("profileBio");

    if (profileFullName) {
        profileFullName.value =
            user.full_name ||
            user.name ||
            "";
    }

    if (profilePhone) {
        profilePhone.value =
            user.phone || "";
    }

    if (profileEmail) {
        profileEmail.value =
            user.email || "";
    }

    if (profileLocation) {
        profileLocation.value =
            user.location || "";
    }

    if (profileProfession) {
        profileProfession.value =
            user.profession || "";
    }

    if (profileExperience) {
        profileExperience.value =
            user.experience || "";
    }

    if (profileSkill) {
        profileSkill.value =
            user.skill || "";
    }

    if (profileBio) {
        profileBio.value =
            user.bio || "";
    }

    const saveProfileButton =
        document.querySelector(
            "#profileForm button[type='submit']"
        );

    if (saveProfileButton) {
        saveProfileButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();

                const profileData = {
                    full_name:
                        document.getElementById(
                            "profileFullName"
                        )?.value || "",

                    phone:
                        document.getElementById(
                            "profilePhone"
                        )?.value || "",

                    email:
                        document.getElementById(
                            "profileEmail"
                        )?.value || "",

                    location:
                        document.getElementById(
                            "profileLocation"
                        )?.value || "",

                    profession:
                        document.getElementById(
                            "profileProfession"
                        )?.value || "",

                    experience:
                        document.getElementById(
                            "profileExperience"
                        )?.value || "",

                    skill:
                        document.getElementById(
                            "profileSkill"
                        )?.value || "",

                    bio:
                        document.getElementById(
                            "profileBio"
                        )?.value || ""
                };

                localStorage.setItem(
                    "sjhUser",
                    JSON.stringify(profileData)
                );

                const originalText =
                    saveProfileButton.textContent;

                saveProfileButton.textContent =
                    "Changes Saved";

                setTimeout(function () {
                    saveProfileButton.textContent =
                        originalText;
                }, 2000);

                const nameElements = [
                    document.getElementById(
                        "sidebarUserName"
                    ),
                    document.getElementById(
                        "headerUserName"
                    ),
                    document.getElementById(
                        "welcomeName"
                    )
                ];

                nameElements.forEach(function (element) {
                    if (element) {
                        element.textContent =
                            profileData.full_name ||
                            "Artisan User";
                    }
                });
            }
        );
    }

    const applyButtons =
        document.querySelectorAll(".apply-button");

    applyButtons.forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                if (button.disabled) {
                    return;
                }

                button.disabled = true;
                button.textContent = "Applied";

                button.classList.add("applied");

                const jobItem =
                    button.closest(".job-item");

                if (jobItem) {
                    const message =
                        document.createElement("div");

                    message.className =
                        "application-feedback";

                    message.textContent =
                        "Application submitted successfully.";

                    jobItem.appendChild(message);

                    setTimeout(function () {
                        message.remove();
                    }, 3000);
                }
            }
        );
    });

    const jobSearch =
        document.getElementById("jobSearch");

    const jobLocation =
        document.getElementById("jobLocation");

    const jobItems =
        document.querySelectorAll(".job-item");

    function filterJobs() {
        const searchValue = jobSearch
            ? jobSearch.value.toLowerCase().trim()
            : "";

        const locationValue = jobLocation
            ? jobLocation.value.toLowerCase().trim()
            : "";

        jobItems.forEach(function (job) {
            const jobText =
                job.textContent.toLowerCase();

            const matchesSearch =
                searchValue === "" ||
                jobText.includes(searchValue);

            const matchesLocation =
                locationValue === "" ||
                jobText.includes(locationValue);

            job.style.display =
                matchesSearch && matchesLocation
                    ? ""
                    : "none";
        });
    }

    if (jobSearch) {
        jobSearch.addEventListener(
            "input",
            filterJobs
        );
    }

    if (jobLocation) {
        jobLocation.addEventListener(
            "change",
            filterJobs
        );
    }

    if (logoutBtn) {
        logoutBtn.addEventListener(
            "click",
            async function () {
                const confirmLogout =
                    confirm(
                        "Are you sure you want to log out?"
                    );

                if (!confirmLogout) {
                    return;
                }

                try {
                    await fetch(
                        `${window.SJH_API_BASE || "https://sjh-consult-backend-production.up.railway.app"}/api/auth/logout`,
                        {
                            method: "POST",
                            credentials: "include"
                        }
                    );

                } catch (error) {
                    console.error(
                        "Logout error:",
                        error
                    );
                }

                localStorage.removeItem("sjhUser");
                localStorage.removeItem("token");
                sessionStorage.clear();

                window.location.href =
                    "../auth/login.html";
            }
        );
    }

    const passwordToggleButtons =
        document.querySelectorAll(
            ".password-toggle"
        );

    passwordToggleButtons.forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                const targetId =
                    button.dataset.target;

                const input =
                    document.getElementById(
                        targetId
                    );

                if (!input) {
                    return;
                }

                if (input.type === "password") {
                    input.type = "text";
                    button.textContent = "Hide";
                } else {
                    input.type = "password";
                    button.textContent = "Show";
                }
            }
        );
    });

    const settingsToggles =
        document.querySelectorAll(
            ".settings-toggle"
        );

    settingsToggles.forEach(function (toggle) {
        toggle.addEventListener(
            "change",
            function () {
                const settingName =
                    toggle.dataset.setting;

                if (settingName) {
                    localStorage.setItem(
                        "sjh_setting_" +
                            settingName,
                        toggle.checked
                            ? "true"
                            : "false"
                    );
                }
            }
        );
    });

    settingsToggles.forEach(function (toggle) {
        const settingName =
            toggle.dataset.setting;

        if (!settingName) {
            return;
        }

        const savedSetting =
            localStorage.getItem(
                "sjh_setting_" +
                    settingName
            );

        if (savedSetting !== null) {
            toggle.checked =
                savedSetting === "true";
        }
    });

    const currentSection =
        window.location.hash.replace("#", "");

    if (
        currentSection &&
        document.getElementById(currentSection)
    ) {
        showSection(currentSection);
    } else {
        showSection("overview");
    }
});