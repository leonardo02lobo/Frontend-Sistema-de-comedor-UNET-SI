import type { APIRoute } from "astro";
import { getData, type Admin, type SessionEntry } from "../../../lib/db";

const SESSION_FILE = "sessions.json";
const ADMIN_FILE = "admins.json";
const SESSION_COOKIE = "session_id";

const toUserPayload = (admin: Admin) => ({
  email: admin.email,
  role: admin.role,
  fullName: admin.full_name,
  roleLabel: admin.role_label,
  carrera: admin.carrera,
  cedula: admin.cedula,
  imageUrl: admin.image_url || "",
});

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionId = cookies.get(SESSION_COOKIE)?.value;
    if (!sessionId) {
      return new Response(JSON.stringify({ success: false, error: "Sesion no encontrada." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessions = await getData<SessionEntry[]>(SESSION_FILE, []);
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return new Response(JSON.stringify({ success: false, error: "Sesion invalida." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admins = await getData<Admin[]>(ADMIN_FILE, []);
    const admin = admins.find((item) => item.id === session.admin_id);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: "Usuario no encontrado." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: toUserPayload(admin) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo validar la sesion." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
