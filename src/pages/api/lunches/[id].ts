import type { APIRoute } from "astro";
import { getData, saveData, type Lunch, type Menu, type Ticket } from "../../../lib/db";

const LUNCHES_FILE = "lunches.json";
const MENUS_FILE = "menus.json";
const TICKETS_FILE = "tickets.json";

const toSafeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toIngredients = (value: unknown): string[] | null => {
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((item) => toSafeText(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return null;
};

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const findMenuForLunch = (menus: Menu[], lunchId: number): Menu | null => {
  const menu = menus.find((item) => item.lunch_id === lunchId);
  return menu ?? null;
};

export const GET: APIRoute = async ({ params }) => {
  const lunchId = Number(params.id);
  const lunches = await getData<Lunch[]>(LUNCHES_FILE, []);
  const lunch = lunches.find((item) => item.id === lunchId);

  if (!lunch) {
    return new Response(JSON.stringify({ success: false, error: "Platillo no encontrado." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, data: lunch }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const lunchId = Number(params.id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const lunches = await getData<Lunch[]>(LUNCHES_FILE, []);
    const index = lunches.findIndex((item) => item.id === lunchId);
    if (index < 0) {
      return new Response(JSON.stringify({ success: false, error: "Platillo no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lunch = lunches[index];
    const name = toSafeText(body.name);
    const description = toSafeText(body.description);
    const imageUrl = toSafeText(body.image_url ?? body.imageUrl);
    const ingredients = toIngredients(body.ingredients);
    const quantity = toNumber(body.quantity);
    const price = toNumber(body.price);

    lunches[index] = {
      ...lunch,
      name: name || lunch.name,
      description: description || lunch.description,
      image_url: imageUrl || lunch.image_url,
      ingredients: ingredients ?? lunch.ingredients,
      quantity: quantity ?? lunch.quantity,
      price: price ?? lunch.price,
      updated_at: new Date().toISOString(),
    };

    await saveData(LUNCHES_FILE, lunches);

    const menus = await getData<Menu[]>(MENUS_FILE, []);
    const menu = findMenuForLunch(menus, lunchId);
    if (quantity !== null) {
      if (menu) {
        menu.stock_actual = Math.max(0, quantity);
        menu.stock_inicial = Math.max(0, quantity);
      } else {
        menus.push({
          id: menus.reduce((max, item) => Math.max(max, item.id), 0) + 1,
          lunch_id: lunchId,
          stock_actual: Math.max(0, quantity),
          stock_inicial: Math.max(0, quantity),
          fecha: new Date().toISOString().slice(0, 10),
        });
      }
      await saveData(MENUS_FILE, menus);
    }

    return new Response(JSON.stringify({ success: true, data: lunches[index] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo actualizar el platillo." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const lunchId = Number(params.id);
    const lunches = await getData<Lunch[]>(LUNCHES_FILE, []);
    const nextLunches = lunches.filter((item) => item.id !== lunchId);

    if (nextLunches.length === lunches.length) {
      return new Response(JSON.stringify({ success: false, error: "Platillo no encontrado." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await saveData(LUNCHES_FILE, nextLunches);

    const menus = await getData<Menu[]>(MENUS_FILE, []);
    const removedMenuIds = menus.filter((item) => item.lunch_id === lunchId).map((item) => item.id);
    const nextMenus = menus.filter((item) => item.lunch_id !== lunchId);
    await saveData(MENUS_FILE, nextMenus);

    if (removedMenuIds.length > 0) {
      const tickets = await getData<Ticket[]>(TICKETS_FILE, []);
      const nextTickets = tickets.filter((ticket) => !removedMenuIds.includes(ticket.menu_id));
      await saveData(TICKETS_FILE, nextTickets);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo eliminar el platillo." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
