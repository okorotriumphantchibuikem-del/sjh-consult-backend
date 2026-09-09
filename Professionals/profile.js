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

const whatsappButtons = document.querySelectorAll(
    ".whatsapp-button, .sidebar-whatsapp"
);

const callButtons = document.querySelectorAll(
    ".call-button, .sidebar-call"
);

const emailButtons = document.querySelectorAll(
    ".email-button, .sidebar-email"
);

function updateContactButtons(phone, whatsapp, email) {
    whatsappButtons.forEach(function (button) {
        if (whatsapp) {
            const cleanNumber = whatsapp.replace(/\D/g, "");
            button.href = "https://wa.me/" + cleanNumber;
            button.target = "_blank";
            button.rel = "noopener noreferrer";
        } else {
            button.href = "#";
        }
    });

    callButtons.forEach(function (button) {
        if (phone) {
            button.href = "tel:" + phone;
        } else {
            button.href = "#";
        }
    });

    emailButtons.forEach(function (button) {
        if (email) {
            button.href = "mailto:" + email;
        } else {
            button.href = "#";
        }
    });
}

const professionalData = {
    name: "John Daniel",
    profession: "Graphic Designer",
    location: "Port Harcourt, Rivers State",
    phone: "",
    whatsapp: "",
    email: ""
};

const profileName = document.querySelector(".profile-heading h1");
const profileProfession = document.querySelector(".profile-heading h2");
const profileLocation = document.querySelector(".profile-location");

if (profileName) {
    profileName.textContent = professionalData.name;
}

if (profileProfession) {
    profileProfession.textContent = professionalData.profession;
}

if (profileLocation) {
    profileLocation.innerHTML =
        "<span>⌖</span>" + professionalData.location;
}

document.title =
    professionalData.name + " | SJH Consult";

updateContactButtons(
    professionalData.phone,
    professionalData.whatsapp,
    professionalData.email
);