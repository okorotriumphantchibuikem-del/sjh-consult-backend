const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function () {
        const isOpen = mobileMenu.classList.toggle("show");

        menuToggle.classList.toggle("active", isOpen);
        menuToggle.setAttribute("aria-expanded", isOpen);
    });

    const mobileLinks = mobileMenu.querySelectorAll("a");

    mobileLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            mobileMenu.classList.remove("show");
            menuToggle.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });

    document.addEventListener("click", function (event) {
        if (
            !mobileMenu.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            mobileMenu.classList.remove("show");
            menuToggle.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
        }
    });
}

const jobSearch = document.getElementById("jobSearch");
const locationSearch = document.getElementById("locationSearch");
const searchButton = document.getElementById("searchButton");
const jobCount = document.getElementById("jobCount");
const jobsGrid = document.getElementById("jobsGrid");
const noJobs = document.getElementById("noJobs");
const clearFilters = document.getElementById("clearFilters");

const apiBase =
    window.SJH_API_BASE ||
    "https://sjh-consult-backend-production.up.railway.app";

async function loadPublishedJobs() {
    try {
        const response = await fetch(
            `${apiBase}/api/public/jobs`
        );

        const data = await response.json();

        if (
            !response.ok ||
            !data.success ||
            !Array.isArray(data.jobs)
        ) {
            return;
        }

        if (!jobsGrid) return;

        jobsGrid.innerHTML = data.jobs
            .map(
                job => `
                    <article
                        class="job-card"
                        data-title="${escapeHtml(job.title)}"
                        data-location="${escapeHtml(job.location)}"
                        data-type="${escapeHtml(job.job_type)}"
                        data-experience="${escapeHtml(job.experience)}"
                        data-category="${escapeHtml(job.category)}"
                    >
                        <div class="job-card-top">
                            <span>
                                ${escapeHtml(job.category)}
                            </span>

                            <span>
                                ${escapeHtml(job.job_type)}
                            </span>
                        </div>

                        <h3>
                            ${escapeHtml(job.title)}
                        </h3>

                        <p>
                            ${escapeHtml(job.company)}
                            ·
                            ${escapeHtml(job.location)}
                        </p>

                        <div class="job-meta">
                            <span>
                                ${escapeHtml(job.experience)}
                            </span>

                            <strong>
                                ${escapeHtml(
                                    job.salary ||
                                    "Salary not specified"
                                )}
                            </strong>
                        </div>

                        <a
                            href="job-details.html?id=${encodeURIComponent(job.id)}"
                        >
                            View Job
                        </a>
                    </article>
                `
            )
            .join("");

        filterJobs();

    } catch (error) {
        console.warn(
            "Unable to load published jobs:",
            error.message
        );
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>'"]/g,
        c =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#039;",
                "\"": "&quot;"
            }[c])
    );
}

const jobCards = () =>
    document.querySelectorAll(".job-card");

const jobTypeFilters =
    document.querySelectorAll(".job-type-filter");

const experienceFilters =
    document.querySelectorAll(".experience-filter");

const categoryFilters =
    document.querySelectorAll(".category-filter");

function getSelectedValues(filters) {
    const selectedValues = [];

    filters.forEach(function (filter) {
        if (filter.checked) {
            selectedValues.push(
                filter.value.toLowerCase()
            );
        }
    });

    return selectedValues;
}

function filterJobs() {
    const searchValue = jobSearch
        ? jobSearch.value.trim().toLowerCase()
        : "";

    const locationValue = locationSearch
        ? locationSearch.value.trim().toLowerCase()
        : "";

    const selectedTypes =
        getSelectedValues(jobTypeFilters);

    const selectedExperience =
        getSelectedValues(experienceFilters);

    const selectedCategories =
        getSelectedValues(categoryFilters);

    let visibleJobs = 0;

    jobCards().forEach(function (card) {
        const title =
            (card.dataset.title || "").toLowerCase();

        const location =
            (card.dataset.location || "").toLowerCase();

        const type =
            (card.dataset.type || "").toLowerCase();

        const experience =
            (card.dataset.experience || "").toLowerCase();

        const category =
            (card.dataset.category || "").toLowerCase();

        const matchesSearch =
            searchValue === "" ||
            title.includes(searchValue) ||
            category.includes(searchValue);

        const matchesLocation =
            locationValue === "" ||
            location.includes(locationValue);

        const matchesType =
            selectedTypes.length === 0 ||
            selectedTypes.includes(type);

        const matchesExperience =
            selectedExperience.length === 0 ||
            selectedExperience.includes(experience);

        const matchesCategory =
            selectedCategories.length === 0 ||
            selectedCategories.includes(category);

        const shouldShow =
            matchesSearch &&
            matchesLocation &&
            matchesType &&
            matchesExperience &&
            matchesCategory;

        if (shouldShow) {
            card.style.display = "";
            visibleJobs++;
        } else {
            card.style.display = "none";
        }
    });

    if (jobCount) {
        jobCount.textContent = visibleJobs;
    }

    if (noJobs) {
        noJobs.style.display =
            visibleJobs === 0
                ? "block"
                : "none";
    }

    if (jobsGrid) {
        jobsGrid.style.display =
            visibleJobs === 0
                ? "none"
                : "grid";
    }
}

if (searchButton) {
    searchButton.addEventListener(
        "click",
        function () {
            filterJobs();

            const jobsSection =
                document.querySelector(".jobs-section");

            if (jobsSection) {
                jobsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }
    );
}

if (jobSearch) {
    jobSearch.addEventListener(
        "input",
        function () {
            filterJobs();
        }
    );

    jobSearch.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                filterJobs();
            }
        }
    );
}

if (locationSearch) {
    locationSearch.addEventListener(
        "input",
        function () {
            filterJobs();
        }
    );

    locationSearch.addEventListener(
        "keydown",
        function (event) {
            if (event.key === "Enter") {
                filterJobs();
            }
        }
    );
}

jobTypeFilters.forEach(function (filter) {
    filter.addEventListener(
        "change",
        function () {
            filterJobs();
        }
    );
});

experienceFilters.forEach(function (filter) {
    filter.addEventListener(
        "change",
        function () {
            filterJobs();
        }
    );
});

categoryFilters.forEach(function (filter) {
    filter.addEventListener(
        "change",
        function () {
            filterJobs();
        }
    );
});

if (clearFilters) {
    clearFilters.addEventListener(
        "click",
        function () {
            if (jobSearch) {
                jobSearch.value = "";
            }

            if (locationSearch) {
                locationSearch.value = "";
            }

            jobTypeFilters.forEach(function (filter) {
                filter.checked = false;
            });

            experienceFilters.forEach(function (filter) {
                filter.checked = false;
            });

            categoryFilters.forEach(function (filter) {
                filter.checked = false;
            });

            filterJobs();
        }
    );
}

filterJobs();
loadPublishedJobs();