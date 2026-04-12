import type { APIRoute } from "astro";
import { getData, saveData, type SessionEntry } from "../../../lib/db";

const SESSION_FILE = "sessions.json";
const SESSION_COOKIE = "session_id";

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const sessionId = cookies.get(SESSION_COOKIE)?.value;
    if (sessionId) {
      const sessions = await getData<SessionEntry[]>(SESSION_FILE, []);
      const nextSessions = sessions.filter((session) => session.id !== sessionId);
      await saveData(SESSION_FILE, nextSessions);
    }

    cookies.delete(SESSION_COOKIE, { path: "/" });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo cerrar sesion." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
