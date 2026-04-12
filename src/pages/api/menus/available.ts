import type { APIRoute } from "astro";
import { getData, type Menu } from "../../../lib/db";

const MENUS_FILE = "menus.json";

export const GET: APIRoute = async () => {
  const menus = await getData<Menu[]>(MENUS_FILE, []);
  const available = menus.filter((menu) => menu.stock_actual > 0);

  return new Response(JSON.stringify({ success: true, data: available }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
