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

const searchInput = document.getElementById("professionalSearch");
const locationInput = document.getElementById("locationSearch");
const searchButton = document.getElementById("searchButton");
const resultCount = document.getElementById("resultCount");
const professionalsGrid = document.getElementById("professionalsGrid");
const noResults = document.getElementById("noResults");
const categoryButtons = document.querySelectorAll(".category-button");
const professionalCards = document.querySelectorAll(".professional-card");

let selectedCategory = "all";

function filterProfessionals() {
    const searchValue = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const locationValue = locationInput
        ? locationInput.value.trim().toLowerCase()
        : "";

    let visibleCount = 0;

    professionalCards.forEach(function (card) {
        const name = (card.dataset.name || "").toLowerCase();
        const profession = (card.dataset.profession || "").toLowerCase();
        const location = (card.dataset.location || "").toLowerCase();
        const category = (card.dataset.category || "").toLowerCase();

        const matchesSearch =
            searchValue === "" ||
            name.includes(searchValue) ||
            profession.includes(searchValue);

        const matchesLocation =
            locationValue === "" ||
            location.includes(locationValue);

        const matchesCategory =
            selectedCategory === "all" ||
            category === selectedCategory;

        if (
            matchesSearch &&
            matchesLocation &&
            matchesCategory
        ) {
            card.style.display = "";
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    if (resultCount) {
        resultCount.textContent = visibleCount;
    }

    if (noResults) {
        noResults.style.display =
            visibleCount === 0 ? "block" : "none";
    }

    if (professionalsGrid) {
        professionalsGrid.style.display =
            visibleCount === 0 ? "none" : "grid";
    }
}

categoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        categoryButtons.forEach(function (item) {
            item.classList.remove("active");
        });

        button.classList.add("active");

        selectedCategory =
            button.dataset.category || "all";

        filterProfessionals();
    });
});

if (searchInput) {
    searchInput.addEventListener("input", function () {
        filterProfessionals();
    });
}

if (locationInput) {
    locationInput.addEventListener("input", function () {
        filterProfessionals();
    });
}

if (searchButton) {
    searchButton.addEventListener("click", function () {
        filterProfessionals();

        const directorySection =
            document.querySelector(".directory-section");

        if (directorySection) {
            directorySection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            filterProfessionals();
        }
    });
}

if (locationInput) {
    locationInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            filterProfessionals();
        }
    });
}

filterProfessionals();