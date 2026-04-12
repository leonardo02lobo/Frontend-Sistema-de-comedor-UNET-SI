import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { getData, saveData, getNextId, type Ticket, type Menu, type Admin, type SessionEntry } from "../../../lib/db";

const TICKETS_FILE = "tickets.json";
const MENUS_FILE = "menus.json";
const ADMINS_FILE = "admins.json";
const SESSIONS_FILE = "sessions.json";
const SESSION_COOKIE = "session_id";

const toSafeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveSessionUser = async (sessionId: string | undefined) => {
  if (!sessionId) return null;
  const sessions = await getData<SessionEntry[]>(SESSIONS_FILE, []);
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const admins = await getData<Admin[]>(ADMINS_FILE, []);
  const admin = admins.find((item) => item.id === session.admin_id);
  if (!admin) return null;
  return {
    fullName: admin.full_name,
    email: admin.email,
    role: admin.role,
    cedula: admin.cedula,
    carrera: admin.carrera,
  };
};

export const GET: APIRoute = async () => {
  const tickets = await getData<Ticket[]>(TICKETS_FILE, []);
  return new Response(JSON.stringify({ success: true, data: tickets }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const menuId = toNumber(body.menuId ?? body.menu_id);

    if (!menuId) {
      return new Response(JSON.stringify({ success: false, error: "Menu invalido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const menus = await getData<Menu[]>(MENUS_FILE, []);
    const menu = menus.find((item) => item.id === menuId);
    if (!menu) {
      return new Response(JSON.stringify({ success: false, error: "Menu no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (menu.stock_actual <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Platillo agotado." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tickets = await getData<Ticket[]>(TICKETS_FILE, []);
    const qrPayload = `ticket-${menuId}-${crypto.randomUUID()}`;
    const sessionUser = await resolveSessionUser(cookies.get(SESSION_COOKIE)?.value);

    // Idempotencia basica para evitar doble creacion por doble click/refresco rapido.
    const existingPending = tickets.find((item) => {
      if (item.menu_id !== menuId) return false;
      if (String(item.estado || "").toUpperCase() !== "PENDING") return false;

      const itemUserCedula = item.user?.cedula || "";
      const currentUserCedula = sessionUser?.cedula || "";
      if (itemUserCedula && currentUserCedula && itemUserCedula !== currentUserCedula) {
        return false;
      }

      const createdAt = new Date(item.fecha_solicitud).getTime();
      const now = Date.now();
      const isRecent = Number.isFinite(createdAt) && now - createdAt <= 15_000;
      return isRecent;
    });

    if (existingPending) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ticket: existingPending,
            qrCodePayload: existingPending.qr_payload,
            reused: true,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const newTicket: Ticket = {
      id: getNextId(tickets),
      menu_id: menuId,
      estado: "PENDING",
      fecha_solicitud: new Date().toISOString(),
      codigo_carnet: toSafeText(body.codigoCarnet ?? body.codigo_carnet),
      qr_payload: qrPayload,
      user: sessionUser
        ? {
            fullName: sessionUser.fullName,
            email: sessionUser.email,
            role: sessionUser.role,
            cedula: sessionUser.cedula,
            carrera: sessionUser.carrera,
          }
        : undefined,
    };

    tickets.push(newTicket);
    await saveData(TICKETS_FILE, tickets);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ticket: newTicket,
          qrCodePayload: qrPayload,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo crear el ticket." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
