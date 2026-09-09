(function () {
    function normalizePath(path) {
        return path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    }

    function setActiveNavigation() {
        const links = document.querySelectorAll(".sjh-desktop-nav a, .sjh-mobile-menu a");
        const currentPath = normalizePath(window.location.pathname);
        const currentFile = currentPath.split("/").pop() || "index.html";

        links.forEach(function (link) {
            link.classList.remove("active");
            link.removeAttribute("aria-current");

            const href = link.getAttribute("href");
            if (!href || href === "#") return;

            const url = new URL(href, window.location.href);
            const linkPath = normalizePath(url.pathname);
            const linkFile = linkPath.split("/").pop() || "index.html";
            const currentHash = window.location.hash;

            let isActive = false;

            if (linkPath === currentPath) {
                if (url.hash) {
                    isActive = currentHash === url.hash;
                } else {
                    isActive = !currentHash;
                }
            }

            if (!isActive && !currentHash && (currentFile === "index.html" || currentFile === "")) {
                isActive = linkFile === "index.html" && !url.hash;
            }

            if (isActive) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }
        });
    }

    function initSharedNavigation() {
        const toggle = document.getElementById("sjhMenuToggle");
        const menu = document.getElementById("sjhMobileMenu");

        if (!toggle || !menu || toggle.dataset.ready === "true") return;
        toggle.dataset.ready = "true";

        function closeMenu() {
            menu.classList.remove("open");
            toggle.classList.remove("active");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation menu");
        }

        function openMenu() {
            menu.classList.add("open");
            toggle.classList.add("active");
            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Close navigation menu");
        }

        toggle.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            menu.classList.contains("open") ? closeMenu() : openMenu();
        });

        menu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", closeMenu);
        });

        setActiveNavigation();

        document.addEventListener("click", function (event) {
            if (!menu.contains(event.target) && !toggle.contains(event.target)) {
                closeMenu();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeMenu();
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth > 1050) closeMenu();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSharedNavigation);
    } else {
        initSharedNavigation();
    }
})();
