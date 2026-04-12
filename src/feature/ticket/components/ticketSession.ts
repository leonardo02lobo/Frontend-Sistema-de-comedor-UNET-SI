import { loadSession } from "../../../lib/session";

const nameEl = document.querySelector("[data-user-name]");
const carreraEl = document.querySelector("[data-user-carrera]");
const cedulaEl = document.querySelector("[data-user-cedula]");
const lunchNameEl = document.getElementById("ticket-lunch-name");
const lunchImageEl = document.getElementById("ticket-lunch-image");

const setText = (el: Element | null, value: string) => {
    if (!el) return;
    el.textContent = value && value.trim() ? value : "-";
};

const readReservationContext = () => {
    const raw = sessionStorage.getItem("ticketReservationContext");
    if (!raw) return null;
    try {
        return JSON.parse(raw) as {
            lunch?: { name?: string; image?: string; image_url?: string };
            user?: { fullName?: string; carrera?: string; cedula?: string };
        };
    } catch {
        return null;
    }
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value || "");
const toProxy = (imageUrl: string) => `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

loadSession().then(({ user }) => {
    const context = readReservationContext();
    const contextUser = context?.user ?? {};

    setText(nameEl, user?.fullName || contextUser.fullName || "");
    setText(carreraEl, user?.carrera || contextUser.carrera || "");
    setText(cedulaEl, user?.cedula || contextUser.cedula || "");
    setText(lunchNameEl, context?.lunch?.name || "");

    const lunchImage = context?.lunch?.image || context?.lunch?.image_url || "";
    if (lunchImage && lunchImageEl instanceof HTMLImageElement) {
        lunchImageEl.src = isHttpUrl(lunchImage) ? toProxy(lunchImage) : lunchImage;
    }
});
