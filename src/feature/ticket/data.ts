import { URL_BASE_IMAGES } from "../../models/type";

const nameEl = document.querySelector("[data-user-name]");
const carreraEl = document.querySelector("[data-user-carrera]");
const cedulaEl = document.querySelector("[data-user-cedula]");
const lunchNameEl = document.getElementById("ticket-lunch-name");
const lunchImageEl = document.getElementById("ticket-lunch-image");

const storedTicket = sessionStorage.getItem("lastLunchReservation");
const ticketData = storedTicket ? JSON.parse(storedTicket) : null;

const userData = localStorage.getItem("userData");
const user = userData ? JSON.parse(userData) : null;
const imageOrigin = new URL(URL_BASE_IMAGES).origin;

const resolveTicketImageUrl = (rawImage: string) => {
    const value = String(rawImage || "").trim();
    if (!value) return "";

    if (value.startsWith("data:") || value.startsWith("http")) {
        return value;
    }

    if (value.startsWith("/images/")) {
        return `${imageOrigin}${value}`;
    }

    if (value.startsWith("images/")) {
        return `${imageOrigin}/${value}`;
    }

    return `${URL_BASE_IMAGES}${value.replace(/^\/+/, "")}`;
};

if(user){
    if (nameEl) nameEl.textContent = user.fullName || "Nombre no disponible";
    if (carreraEl) carreraEl.textContent = user.carrera || "Carrera no disponible";
    if (cedulaEl) cedulaEl.textContent = user.cedula || "Cédula no disponible";
}

if (ticketData) {
    if (lunchNameEl) lunchNameEl.textContent = ticketData.title || "Plato no disponible";
    if (lunchImageEl && ticketData.imageUrl) {
        const raw = ticketData.imageUrl;
        const imageUrl = raw.startsWith("data:") || raw.startsWith("http")
            ? raw
            : raw.startsWith("/")
                ? `http://localhost:3001${raw}`
                : `http://localhost:3001/images/${raw}`;
        lunchImageEl.setAttribute("src", imageUrl);
        lunchImageEl.setAttribute("alt", `Imagen de ${ticketData.title}`);
    }
}