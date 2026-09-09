document.addEventListener("DOMContentLoaded", function () {
    const dashboardPages = [
        ["dashboard.html", "Overview", "⌂"],
        ["profile.html", "My Profile", "◉"],
        ["cv-review.html", "My CV", "▣"],
        ["applications.html", "Job Applications", "✓"],
        ["training.html", "Training", "▤"],
        ["appointments.html", "Appointments", "◷"],
        ["messages.html", "Messages", "✉"],
        ["notifications.html", "Notifications", "●"],
        ["saved.html", "Saved Opportunities", "★"],
        ["certificates.html", "Certificates", "◇"],
        ["settings.html", "Settings", "⚙"]
    ];

    const currentPage = (window.location.pathname.split("/").pop() || "dashboard.html").toLowerCase();
    const existingSidebar = document.getElementById("dashboardSidebar") || document.querySelector(".sidebar");
    const pageContainers = [
        ".profile-page",
        ".applications-page",
        ".cv-page",
        ".training-page",
        ".appointments-page"
    ];

    let sidebar = existingSidebar;

    if (!sidebar) {
        sidebar = document.createElement("aside");
        sidebar.id = "dashboardSidebar";
        sidebar.className = "sjh-portal-sidebar";
        sidebar.innerHTML = '<a class="sjh-portal-brand" href="../index.html"><span class="sjh-portal-mark">SJH</span><span><strong>SJH Consult</strong><small>APPLICANT PORTAL</small></span></a><nav class="sjh-portal-nav"></nav><div class="sjh-portal-bottom"><a href="../index.html" data-portal-logout>↪ &nbsp; Logout</a></div>';
        document.body.prepend(sidebar);
    }

    sidebar.classList.add("sjh-portal-sidebar");
    sidebar.id = "dashboardSidebar";

    let brand = sidebar.querySelector(".sjh-portal-brand");
    if (!brand) {
        brand = document.createElement("a");
        brand.className = "sjh-portal-brand";
        sidebar.prepend(brand);
    }
    brand.href = "../index.html";
    brand.innerHTML = '<span class="sjh-portal-mark">SJH</span><span><strong>SJH Consult</strong><small>APPLICANT PORTAL</small></span>';

    const legacyLogo = sidebar.querySelector(".sidebar-logo");
    if (legacyLogo) legacyLogo.remove();

    let nav = sidebar.querySelector(".dashboard-nav, .sidebar-nav, .sjh-portal-nav");
    if (!nav) {
        nav = document.createElement("nav");
        sidebar.appendChild(nav);
    }
    nav.className = "sjh-portal-nav";
    nav.innerHTML = '<a class="sjh-portal-home" href="../index.html"><span class="sjh-portal-nav-icon">⌂</span><span>Home</span></a>' + dashboardPages.map(function (item) {
        return '<a class="sjh-portal-nav-link ' + (item[0] === currentPage ? "active" : "") + '" href="' + item[0] + '"><span class="sjh-portal-nav-icon">' + item[2] + '</span><span>' + item[1] + '</span></a>';
    }).join("");

    let bottom = sidebar.querySelector(".sidebar-bottom, .sjh-portal-bottom");
    if (!bottom) {
        bottom = document.createElement("div");
        sidebar.appendChild(bottom);
    }
    bottom.className = "sjh-portal-bottom";
    bottom.innerHTML = '<a href="../index.html" data-portal-logout><span class="sjh-portal-nav-icon">↪</span><span>Logout</span></a>';

    const hasNativeSidebar = Boolean(existingSidebar);
    if (hasNativeSidebar) {
        const main = document.querySelector("main");
        if (main) main.classList.add("sjh-portal-content-shift");
    } else {
        const pageContainer = pageContainers.map(function (selector) {
            return document.querySelector(selector);
        }).find(Boolean);
        if (pageContainer) {
            pageContainer.classList.add("sjh-portal-page-shift");
        } else {
            const main = document.querySelector("main");
            if (main) main.classList.add("sjh-portal-content-shift");
        }
    }

    document.body.classList.add("sjh-portal-page");

    let mobileBar = document.getElementById("sjhPortalMobileBar");
    let mobileButton = document.getElementById("mobileMenuButton");

    if (!mobileButton) {
        if (!mobileBar) {
            mobileBar = document.createElement("div");
            mobileBar.id = "sjhPortalMobileBar";
            mobileBar.className = "sjh-portal-mobile-bar";
            mobileBar.innerHTML = '<strong>SJH Consult</strong><button class="sjh-portal-mobile-button" type="button" aria-label="Open menu" aria-expanded="false">☰</button>';
            document.body.prepend(mobileBar);
        }
        mobileButton = mobileBar.querySelector("button");
    } else {
        mobileButton.setAttribute("aria-label", "Open navigation menu");
        mobileButton.setAttribute("aria-expanded", "false");
    }

    let overlay = document.getElementById("sjhPortalOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "sjhPortalOverlay";
        overlay.className = "sjh-portal-overlay";
        document.body.appendChild(overlay);
    }

    function closePortal() {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
        mobileButton.setAttribute("aria-expanded", "false");
        mobileButton.setAttribute("aria-label", "Open navigation menu");
    }

    function openPortal() {
        sidebar.classList.add("open");
        overlay.classList.add("open");
        mobileButton.setAttribute("aria-expanded", "true");
        mobileButton.setAttribute("aria-label", "Close navigation menu");
    }

    if (!mobileButton.dataset.portalReady) {
        mobileButton.dataset.portalReady = "true";
        mobileButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            sidebar.classList.contains("open") ? closePortal() : openPortal();
        });
    }

    overlay.addEventListener("click", closePortal);

    sidebar.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            closePortal();
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closePortal();
    });

    const logout = sidebar.querySelector("[data-portal-logout]");
    if (logout && !logout.dataset.ready) {
        logout.dataset.ready = "true";
        logout.addEventListener("click", function (event) {
            event.preventDefault();
            if (window.SJHAuth && typeof window.SJHAuth.logout === "function") {
                window.SJHAuth.logout();
                return;
            }
            try {
                localStorage.removeItem("sjhUser");
                localStorage.removeItem("token");
            } catch (error) {}
            window.location.href = "../auth/login.html";
        });
    }

    window.addEventListener("resize", function () {
        if (window.innerWidth > 900) closePortal();
    });
});
