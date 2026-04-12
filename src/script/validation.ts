import { loadSession } from "../lib/session";

type SessionState = {
    authenticated: boolean;
    role: string;
};

const PUBLIC_PATHS = new Set(["/home", "/login", "/ticket"]);
const DASHBOARD_PATHS = ["/dashboard"];

function normalizePath(pathname: string): string {
    if (pathname.length > 1 && pathname.endsWith("/")) {
        return pathname.slice(0, -1);
    }
    return pathname;
}

function normalizeRole(role?: string): string {
    const normalizedRole = (role ?? "").trim().toUpperCase();

    switch (normalizedRole) {
        case "ADMINISTRADOR":
            return "ADMIN";
        case "ESTUDIANTE":
            return "USER";
        case "OBRERO":
            return "MANAGER";
        default:
            return normalizedRole;
    }
}

function isAdminRole(role: string): boolean {
    return normalizeRole(role) === "ADMIN";
}

function updateDashboardButtonVisibility(canAccessDashboard: boolean): void {
    const dashboardAccess = document.getElementById("dashboard-access");
    if (dashboardAccess) {
        dashboardAccess.classList.toggle("hidden", !canAccessDashboard);
        dashboardAccess.setAttribute("aria-hidden", String(!canAccessDashboard));
    }

    const dashboardAccessDesktop = document.getElementById("dashboard-access-desktop");
    if (dashboardAccessDesktop) {
        dashboardAccessDesktop.classList.toggle("hidden", !canAccessDashboard);
        dashboardAccessDesktop.setAttribute("aria-hidden", String(!canAccessDashboard));
    }
}

async function getSessionState(): Promise<SessionState> {
    const session = await loadSession(true);
    return {
        authenticated: session.authenticated,
        role: normalizeRole(session.user?.role),
    };
}

function isDashboardPath(pathname: string): boolean {
    return DASHBOARD_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function validateAccess(): Promise<void> {
    const pathname = normalizePath(window.location.pathname);

    if (PUBLIC_PATHS.has(pathname)) {
        updateDashboardButtonVisibility(false);
        return;
    }

    const session = await getSessionState();

    if (!session.authenticated) {
        updateDashboardButtonVisibility(false);
        if (!PUBLIC_PATHS.has(pathname)) {
            window.location.href = "/home";
        }
        return;
    }

    const canAccessDashboard = isAdminRole(session.role);
    updateDashboardButtonVisibility(canAccessDashboard);

    if (isDashboardPath(pathname) && !canAccessDashboard) {
        window.location.href = "/profile";
    }
}

let lastValidationLocation = "";

function runValidationOncePerLocation(): void {
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (lastValidationLocation === currentLocation) {
        return;
    }

    lastValidationLocation = currentLocation;
    void validateAccess();
}

document.addEventListener("astro:page-load", runValidationOncePerLocation);

runValidationOncePerLocation();
