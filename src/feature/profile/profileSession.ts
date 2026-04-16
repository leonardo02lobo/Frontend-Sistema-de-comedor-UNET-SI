import { URL_BASE_IMAGES } from "../../models/type";

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
        if (userImage) userImage.src = userData.imageURL ? URL_BASE_IMAGES + userData.imageURL : "";
    }

    if (userData?.role === "ADMIN") {
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
document.addEventListener("astro:page-load", initProfileSession);
