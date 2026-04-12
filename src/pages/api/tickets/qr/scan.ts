import type { APIRoute } from "astro";
import { getData, saveData, type Ticket, type Menu, type Lunch } from "../../../../lib/db";

const TICKETS_FILE = "tickets.json";
const MENUS_FILE = "menus.json";
const LUNCHES_FILE = "lunches.json";

const toSafeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const qrPayload = toSafeText(body.qrCodePayload ?? body.qr_payload);

    if (!qrPayload) {
      return new Response(JSON.stringify({ success: false, error: "QR invalido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tickets = await getData<Ticket[]>(TICKETS_FILE, []);
    const ticket = tickets.find((item) => item.qr_payload === qrPayload);

    if (!ticket) {
      return new Response(JSON.stringify({ success: false, error: "Ticket no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (ticket.estado !== "DELIVERED") {
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
    }

    const menus = await getData<Menu[]>(MENUS_FILE, []);
    const lunches = await getData<Lunch[]>(LUNCHES_FILE, []);

    const menu = menus.find((item) => item.id === ticket.menu_id) || null;
    const lunch = menu ? lunches.find((item) => item.id === menu.lunch_id) || null : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scannedAt: ticket.fecha_entrega ?? ticket.fecha_solicitud,
          ticket,
          user: ticket.user ?? {},
          lunch: lunch ?? {},
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo validar el QR." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
