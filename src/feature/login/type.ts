import { clearSessionCache } from "../../lib/session";

type LoginResponse = {
    success?: boolean;
    error?: string;
};

const LOGIN_ENDPOINT = "/api/auth/login";
const DEBUG_LOGIN = true;

const logDebug = (...args: unknown[]) => {
    if (!DEBUG_LOGIN) return;
    console.info("[login]", ...args);
};

function getFormFields(form: HTMLFormElement): { correo: string; contrasena: string } {
    const correoInput = form.querySelector('input[name="correo"]') as HTMLInputElement | null;
    const contrasenaInput = form.querySelector('input[name="contrasena"]') as HTMLInputElement | null;

    return {
        correo: String(correoInput?.value ?? "").trim(),
        contrasena: String(contrasenaInput?.value ?? "").trim(),
    };
}

async function submitLogin(form: HTMLFormElement): Promise<void> {
    const { correo, contrasena } = getFormFields(form);
    if (!correo || !contrasena) {
        alert("Debes completar correo y contrasena.");
        return;
    }

    try {
        clearSessionCache();

        logDebug("Enviando login", { correo, contrasena});

        const response = await fetch(LOGIN_ENDPOINT, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                correo,
                email: correo,
                username: correo,
                contrasena,
                contrasenia: contrasena,
                password: contrasena,
            }),
        });
        console.log("Respuesta raw", response);
        const payload = (await response.json().catch(() => ({}))) as LoginResponse;
        logDebug("Respuesta login", { status: response.status, payload });
        if (!response.ok || !payload?.success) {
            alert(payload?.error || "Correo o contrasena incorrectos.");
            return;
        }

        clearSessionCache();
        window.location.href = "/";
    } catch {
        alert("No se pudo iniciar sesion. Verifica la conexion con el backend.");
    }
}

function bindLoginForm(): void {
    const form = document.querySelector("[data-login-form]") as HTMLFormElement | null;
    if (!form || form.dataset.bound === "true") {
        return;
    }

    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        void submitLogin(form);
    });
}

document.addEventListener("astro:page-load", bindLoginForm);
bindLoginForm();
