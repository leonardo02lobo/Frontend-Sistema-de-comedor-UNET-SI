const nameEl = document.querySelector("[data-user-name]");
const carreraEl = document.querySelector("[data-user-carrera]");
const cedulaEl = document.querySelector("[data-user-cedula]");
const lunchNameEl = document.getElementById("ticket-lunch-name");
const lunchImageEl = document.getElementById("ticket-lunch-image");

const storedTicket = sessionStorage.getItem("lastLunchReservation");
const ticketData = storedTicket ? JSON.parse(storedTicket) : null;

const userData = localStorage.getItem("userData");
const user = userData ? JSON.parse(userData) : null;

if(user){
    if (nameEl) nameEl.textContent = user.fullName || "Nombre no disponible";
    if (carreraEl) carreraEl.textContent = user.carrera || "Carrera no disponible";
    if (cedulaEl) cedulaEl.textContent = user.cedula || "Cédula no disponible";
}

if (ticketData) {
    if (lunchNameEl) lunchNameEl.textContent = ticketData.title || "Plato no disponible";
    if (lunchImageEl && ticketData.imageUrl) {
        const imageUrl = ticketData.imageUrl.startsWith("data:") || ticketData.imageUrl.startsWith("http")
            ? ticketData.imageUrl
            : `http://localhost:3001/images/${ticketData.imageUrl}`;
        lunchImageEl.setAttribute("src", imageUrl);
        lunchImageEl.setAttribute("alt", `Imagen de ${ticketData.title}`);
    }
}