import type { APIRoute } from "astro";
import { getData, type Menu } from "../../../lib/db";

const MENUS_FILE = "menus.json";

export const GET: APIRoute = async () => {
  const menus = await getData<Menu[]>(MENUS_FILE, []);
  return new Response(JSON.stringify({ success: true, data: menus }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
