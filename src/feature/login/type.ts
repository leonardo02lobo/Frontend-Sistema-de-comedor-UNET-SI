const loginForm = document.querySelector<HTMLFormElement>('[data-login-form]');

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const username = formData.get("correo") as string;
    const password = formData.get("contrasena") as string;

    const response = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem("userData", JSON.stringify(data.data));
        window.location.href = "/";
    } else {
        alert("Login failed. Please check your credentials and try again.");
    }
})