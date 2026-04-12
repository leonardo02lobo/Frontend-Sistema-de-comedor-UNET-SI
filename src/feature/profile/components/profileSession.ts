import { clearSessionCache, loadSession } from "../../../lib/session";

const logoutEndpoint = "/api/auth/logout";

const setText = (el: Element | null, value: string) => {
    if (!el) return;
    el.textContent = value && value.trim() ? value : "-";
};

const setImage = (el: HTMLImageElement | null, src: string) => {
    if (!el) return;
    if (src && src.trim()) {
        el.src = src;
        el.classList.remove("hidden");
    } else {
        el.src = "/favicon.svg";
    }
};

async function logout(): Promise<void> {
    try {
        await fetch(logoutEndpoint, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });
    } catch {
        // Even if the request fails, continue local cleanup and redirect.
    } finally {
        clearSessionCache();
        window.location.href = "/home";
    }
}

async function hydrateProfile(): Promise<void> {
    const nameEl = document.querySelector("[data-user-name]");
    const emailEl = document.querySelector("[data-user-email]");
    const carreraEl = document.querySelector("[data-user-carrera]");
    const avatarEl = document.getElementById("user-avatar") as HTMLImageElement | null;

    const { user } = await loadSession(true);
    setText(nameEl, user?.fullName || "");
    setText(emailEl, user?.email || "");
    setText(carreraEl, user?.carrera || "");
    setImage(avatarEl, user?.imageUrl || "");
}

function bindLogoutButton(): void {
    const logoutButton = document.getElementById("logout-button");
    const logoutButtonDesktop = document.getElementById("logout-button-desktop");

    const handleLogout = () => {
        void logout();
    };

    if (logoutButton && logoutButton.getAttribute("data-bound") !== "true") {
        logoutButton.setAttribute("data-bound", "true");
        logoutButton.addEventListener("click", handleLogout);
    }

    if (logoutButtonDesktop && logoutButtonDesktop.getAttribute("data-bound") !== "true") {
        logoutButtonDesktop.setAttribute("data-bound", "true");
        logoutButtonDesktop.addEventListener("click", handleLogout);
    }
}

async function initProfileView(): Promise<void> {
    bindLogoutButton();
    await hydrateProfile();
}

document.addEventListener("astro:page-load", () => {
    void initProfileView();
});

void initProfileView();
