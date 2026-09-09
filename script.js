const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
        const isOpen = mobileMenu.classList.toggle("show");

        menuToggle.classList.toggle("active", isOpen);
        menuToggle.setAttribute("aria-expanded", isOpen);
    });

    const mobileLinks = mobileMenu.querySelectorAll("a");

    mobileLinks.forEach(link => {
        link.addEventListener("click", () => {
            mobileMenu.classList.remove("show");
            menuToggle.classList.remove("active");
            menuToggle.setAttribute("aria-expanded", "false");
        });
    });

    document.addEventListener("click", event => {
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

const professionalSearch = document.getElementById("professionalSearch");
const professionalQuery = document.getElementById("professionalQuery");
const professionalLocation = document.getElementById("professionalLocation");

if (professionalSearch) {
    professionalSearch.addEventListener("submit", event => {
        event.preventDefault();

        const query = professionalQuery.value.trim();
        const location = professionalLocation.value.trim();

        const searchParams = new URLSearchParams();

        if (query) {
            searchParams.set("profession", query);
        }

        if (location) {
            searchParams.set("location", location);
        }

        window.location.href =
            "professionals/professionals.html?" +
            searchParams.toString();
    });
}

const popularButtons = document.querySelectorAll(".popular-searches button");

popularButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (professionalQuery) {
            professionalQuery.value = button.textContent.trim();
            professionalQuery.focus();
        }
    });
});

const contactForm = document.getElementById("contactForm");
const contactMessageBox = document.getElementById("contactMessageBox");

if (contactForm && contactMessageBox) {
    contactForm.addEventListener("submit", event => {
        event.preventDefault();

        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        contactMessageBox.textContent =
            "Thank you. Your message has been received.";

        contactMessageBox.className =
            "contact-message show success";

        contactForm.reset();
    });
}