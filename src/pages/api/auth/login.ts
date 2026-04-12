import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { getData, saveData, type Admin, type SessionEntry } from "../../../lib/db";

const SESSION_FILE = "sessions.json";
const ADMIN_FILE = "admins.json";
const SESSION_COOKIE = "session_id";

const toSafeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toUserPayload = (admin: Admin) => ({
  email: admin.email,
  role: admin.role,
  fullName: admin.full_name,
  roleLabel: admin.role_label,
  carrera: admin.carrera,
  cedula: admin.cedula,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = toSafeText(body.correo ?? body.email ?? body.username);
    const password = toSafeText(body.contrasena ?? body.password ?? body.contrasenia);

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: "Credenciales incompletas." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admins = await getData<Admin[]>(ADMIN_FILE, []);
    const admin = admins.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() || item.username.toLowerCase() === email.toLowerCase(),
    );

    const storedPassword = admin?.password_hash ?? admin?.password ?? "";
    if (!admin || storedPassword !== password) {
      return new Response(JSON.stringify({ success: false, error: "Correo o contrasena incorrectos." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessions = await getData<SessionEntry[]>(SESSION_FILE, []);
    const sessionId = crypto.randomUUID();
    const nextSessions = sessions.filter((session) => session.admin_id !== admin.id);
    nextSessions.push({
      id: sessionId,
      admin_id: admin.id,
      created_at: new Date().toISOString(),
    });

    await saveData(SESSION_FILE, nextSessions);

    cookies.set(SESSION_COOKIE, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    return new Response(JSON.stringify({ success: true, data: toUserPayload(admin) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo iniciar sesion." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
