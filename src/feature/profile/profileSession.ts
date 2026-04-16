import { URL_BASE_IMAGES } from "../../models/type";

const userName = document.querySelector<HTMLElement>("[data-user-name]")!;
const userEmail = document.querySelector<HTMLElement>("[data-user-email]")!;
const carrier = document.querySelector<HTMLElement>("[data-user-carrera]")!;
const userImage = document.querySelector<HTMLImageElement>("[data-user-image]")!;
const dashboard = document.querySelector<HTMLElement>("[dashboard-access]")!;
const logoutButton = document.querySelector<HTMLElement>("#logout-button")!;

const userData = JSON.parse(localStorage.getItem("userData") || "{}");

if (userData) {
    userName.textContent = userData.fullName || "-";
    userEmail.textContent = userData.email || "-";
    carrier.textContent = userData.carrera || "-";
    userImage.src = URL_BASE_IMAGES+"/images/"+userData.imageURL || "/";
}

if (userData?.role === "ADMIN") {
    dashboard.classList.remove("hidden");
} else {
    dashboard.classList.add("hidden");
}

logoutButton?.addEventListener("click", async () => {
    await fetch("http://localhost:3001/api/auth/logout", {
        method: "POST",
        credentials: "include",
    });
    localStorage.removeItem("userData");
    window.location.replace("/home");
});