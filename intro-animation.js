document.addEventListener("DOMContentLoaded", () => {
    const intro = document.getElementById("sjhIntro");
    const skip = document.getElementById("sjhIntroSkip");

    if (!intro) return;

    document.body.classList.add("sjh-intro-active");

    const closeIntro = () => {
        intro.classList.add("is-hidden");
        document.body.classList.remove("sjh-intro-active");
        window.setTimeout(() => {
            intro.remove();
        }, 800);
    };

    if (skip) {
        skip.addEventListener("click", closeIntro);
    }

    window.setTimeout(closeIntro, 4300);
});
