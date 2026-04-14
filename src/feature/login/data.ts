import { URL_BASE } from "../../models/type";

const loginForm = document.querySelector<HTMLFormElement>('[data-login-form]');

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const email = formData.get("correo") as string;
    const password = formData.get("contrasena") as string;

    const response = await fetch(`${URL_BASE}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem("userData", JSON.stringify({
            carrera: data.data.carrera,
            email: data.data.email,
            fullName: data.data.fullName,
            role: data.data.role,
            imageURL: data.data.imageURL || data.data.image || "",
        }));
        window.location.href = "/";
    } else {
        alert("Login fallido. Por favor, verifica tus credenciales.");
    }
})