document.addEventListener("DOMContentLoaded", async function () {
    const api =
        window.SJHUser?.apiBase ||
        window.SJH_API_BASE ||
        "https://sjh-consult-backend-production.up.railway.app";

    const list =
        document.querySelector(".notifications-list") ||
        document.querySelector(".notification-list");

    const empty =
        document.getElementById("emptyNotifications");

    try {
        const response = await fetch(
            api + "/api/user/notifications",
            {
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!data.success) return;

        if (list) {
            list.innerHTML =
                (data.notifications || [])
                    .map(
                        notification => `
                            <div
                                class="notification-item ${
                                    notification.is_read
                                        ? ""
                                        : "unread"
                                }"
                                data-id="${notification.id}"
                            >
                                <div class="notification-icon">
                                    🔔
                                </div>

                                <div class="notification-content">
                                    <h3>
                                        ${window.SJHUser.escapeHtml(
                                            notification.title
                                        )}
                                    </h3>

                                    <p>
                                        ${window.SJHUser.escapeHtml(
                                            notification.message
                                        )}
                                    </p>

                                    <span>
                                        ${window.SJHUser.formatDate(
                                            notification.created_at
                                        )}
                                    </span>
                                </div>

                                <button
                                    class="delete-notification"
                                    type="button"
                                >
                                    ×
                                </button>
                            </div>
                        `
                    )
                    .join("");
        }

        if (empty) {
            empty.style.display =
                data.notifications?.length
                    ? "none"
                    : "block";
        }

        document
            .querySelectorAll(".delete-notification")
            .forEach(button => {
                button.onclick = async function () {
                    const item =
                        button.closest(
                            ".notification-item"
                        );

                    if (!item) return;

                    try {
                        await fetch(
                            api +
                                `/api/user/notifications/${item.dataset.id}`,
                            {
                                method: "DELETE",
                                credentials: "include"
                            }
                        );

                        item.remove();
                    } catch (error) {
                        console.error(
                            "Delete notification error:",
                            error
                        );
                    }
                };
            });

        const mark =
            document.getElementById("markAllRead");

        if (mark) {
            mark.onclick = async function () {
                try {
                    await fetch(
                        api +
                            "/api/user/notifications/read-all",
                        {
                            method: "PUT",
                            credentials: "include"
                        }
                    );

                    document
                        .querySelectorAll(
                            ".notification-item"
                        )
                        .forEach(item => {
                            item.classList.remove("unread");
                        });
                } catch (error) {
                    console.error(
                        "Mark notifications read error:",
                        error
                    );
                }
            };
        }

    } catch (error) {
        console.error(
            "Notifications loading error:",
            error
        );
    }
});