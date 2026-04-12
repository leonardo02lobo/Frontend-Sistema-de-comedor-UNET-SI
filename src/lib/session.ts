type ValidateCookieUser = {
    email?: string;
    role?: string;
    fullName?: string;
    roleLabel?: string;
    carrera?: string;
    career?: string;
    cedula?: string;
    imageUrl?: string;
};

type ValidateCookieResponse = {
    success?: boolean;
    data?: ValidateCookieUser;
};

export type SessionUser = {
    email: string;
    role: string;
    fullName: string;
    roleLabel: string;
    carrera: string;
    cedula: string;
    imageUrl: string;
};

export type SessionState = {
    authenticated: boolean;
    user: SessionUser | null;
};

const VALIDATE_COOKIE_URL = "/api/auth/validate-cookie";

const EMPTY_SESSION: SessionState = {
    authenticated: false,
    user: null,
};

let cachedSession: SessionState | null = null;
let inFlightSession: Promise<SessionState> | null = null;

const toSafeText = (value: unknown): string => {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim();
};

const toDisplayNameFromEmail = (email: string): string => {
    const safeEmail = toSafeText(email);
    if (!safeEmail.includes("@")) {
        return safeEmail || "Usuario";
    }

    const localPart = safeEmail.split("@")[0].replace(/[._]+/g, " ").trim();
    if (!localPart) {
        return "Usuario";
    }

    return localPart
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

const toSessionUser = (rawUser: ValidateCookieUser | undefined): SessionUser | null => {
    if (!rawUser) {
        return null;
    }

    const email = toSafeText(rawUser.email);
    const role = toSafeText(rawUser.role);
    const fullName = toSafeText(rawUser.fullName) || toDisplayNameFromEmail(email);
    const roleLabel = toSafeText(rawUser.roleLabel);
    const carrera = toSafeText(rawUser.carrera) || toSafeText(rawUser.career) || "No registrada";
    const cedula = toSafeText(rawUser.cedula) || "-";

    if (!email && !fullName) {
        return null;
    }

    return {
        email,
        role,
        fullName: fullName || "Usuario",
        roleLabel,
        carrera,
        cedula,
        imageUrl: rawUser.imageUrl || "",
    };
};

async function fetchSessionState(): Promise<SessionState> {
    try {
        const response = await fetch(VALIDATE_COOKIE_URL, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            return EMPTY_SESSION;
        }

        const payload = (await response.json()) as ValidateCookieResponse;
        if (!payload?.success) {
            return EMPTY_SESSION;
        }

        const user = toSessionUser(payload.data);
        if (!user) {
            return EMPTY_SESSION;
        }

        return {
            authenticated: true,
            user,
        };
    } catch {
        return EMPTY_SESSION;
    }
}

export async function loadSession(forceRefresh = false): Promise<SessionState> {
    // Always reuse an in-flight request to avoid duplicate /validate-cookie calls.
    if (inFlightSession) {
        return inFlightSession;
    }

    if (!forceRefresh && cachedSession) {
        return cachedSession;
    }

    if (forceRefresh) {
        cachedSession = null;
    }

    inFlightSession = fetchSessionState()
        .then((session) => {
            cachedSession = session;
            return session;
        })
        .finally(() => {
            inFlightSession = null;
        });

    return inFlightSession;
}

export function clearSessionCache(): void {
    cachedSession = null;
    inFlightSession = null;
}
