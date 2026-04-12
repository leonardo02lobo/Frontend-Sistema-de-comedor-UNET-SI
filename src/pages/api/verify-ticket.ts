import type { APIRoute } from "astro";
import { getData, saveData, type Ticket, type Menu } from "../../lib/db";

const TICKETS_FILE = "tickets.json";
const MENUS_FILE = "menus.json";

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ticketId = toNumber(body.ticketId ?? body.ticket_id);

    if (!ticketId) {
      return new Response(JSON.stringify({ success: false, error: "Ticket invalido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tickets = await getData<Ticket[]>(TICKETS_FILE, []);
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      return new Response(JSON.stringify({ success: false, error: "Ticket no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (ticket.estado === "DELIVERED") {
      return new Response(JSON.stringify({ success: true, data: ticket }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const menus = await getData<Menu[]>(MENUS_FILE, []);
    const menu = menus.find((item) => item.id === ticket.menu_id);
    if (!menu) {
      return new Response(JSON.stringify({ success: false, error: "Menu no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (menu.stock_actual <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Stock insuficiente." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    menu.stock_actual -= 1;
    ticket.estado = "DELIVERED";
    ticket.fecha_entrega = new Date().toISOString();

    await saveData(MENUS_FILE, menus);
    await saveData(TICKETS_FILE, tickets);

    return new Response(JSON.stringify({ success: true, data: ticket }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo verificar el ticket." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
