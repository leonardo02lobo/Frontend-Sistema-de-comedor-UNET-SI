import { URL_BASE_IMAGES } from "../../models/type";

const DEFAULT_AVATAR = "/default-avatar.svg";

function resolveProfileImage(imageURL?: string): string {
    if (!imageURL || imageURL === "/") return "";
    if (imageURL.startsWith("data:") || imageURL.startsWith("http")) return imageURL;
    if (imageURL.startsWith("/")) return URL_BASE_IMAGES + imageURL;
    return URL_BASE_IMAGES + "/" + imageURL;
}

function applyUserImage(img: HTMLImageElement, userImageURL: string): void {
    if (!userImageURL) {
        if (img.src.indexOf(DEFAULT_AVATAR) === -1) img.src = DEFAULT_AVATAR;
        return;
    }

    const cacheKey = "profileAvatar:" + userImageURL;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached === "ok") {
        if (img.src !== userImageURL) img.src = userImageURL;
        return;
    }
    if (cached === "bad") {
        if (img.src.indexOf(DEFAULT_AVATAR) === -1) img.src = DEFAULT_AVATAR;
        return;
    }

    // Mantener el default mientras probamos la URL en segundo plano
    if (img.src.indexOf(DEFAULT_AVATAR) === -1) img.src = DEFAULT_AVATAR;

    const tester = new Image();
    let settled = false;
    const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        tester.src = "";
        try { sessionStorage.setItem(cacheKey, "bad"); } catch { /* ignore */ }
    }, 3000);

    tester.onload = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        try { sessionStorage.setItem(cacheKey, "ok"); } catch { /* ignore */ }
        img.src = userImageURL;
    };
    tester.onerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        try { sessionStorage.setItem(cacheKey, "bad"); } catch { /* ignore */ }
    };
    tester.src = userImageURL;
}

function initProfileSession() {
    const userName = document.querySelector<HTMLElement>("[data-user-name]");
    if (!userName) return;

    const userEmail = document.querySelector<HTMLElement>("[data-user-email]");
    const carrier = document.querySelector<HTMLElement>("[data-user-carrera]");
    const userImage = document.querySelector<HTMLImageElement>("[data-user-image]");
    const dashboard = document.querySelector<HTMLElement>("[dashboard-access]");
    const logoutButton = document.querySelector<HTMLElement>("#logout-button");

    const userData = JSON.parse(localStorage.getItem("userData") || "{}");

    if (userData) {
        userName.textContent = userData.fullName || "-";
        if (userEmail) userEmail.textContent = userData.email || "-";
        if (carrier) carrier.textContent = userData.carrera || "-";
        if (userImage) {
            applyUserImage(userImage, resolveProfileImage(userData.imageURL));
            userImage.onerror = () => { userImage.src = DEFAULT_AVATAR; };
        }
    }

    if (userData?.role === "ADMIN" || userData?.role === "MANAGER") {
        dashboard?.classList.remove("hidden");
    } else {
        dashboard?.classList.add("hidden");
    }

    logoutButton?.addEventListener("click", async () => {
        try {
            await fetch("http://localhost:3001/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // ignorar error de red
        }
        localStorage.removeItem("userData");
        window.location.replace("/home");
    });
}

initProfileSession();
document.addEventListener("astro:after-swap", initProfileSession);
document.addEventListener("astro:page-load", initProfileSession);
