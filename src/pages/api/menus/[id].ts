import type { APIRoute } from "astro";
import { getData, type Menu } from "../../../lib/db";

const MENUS_FILE = "menus.json";

export const GET: APIRoute = async ({ params }) => {
  const menuId = Number(params.id);
  const menus = await getData<Menu[]>(MENUS_FILE, []);
  const menu = menus.find((item) => item.id === menuId);

  if (!menu) {
    return new Response(JSON.stringify({ success: false, error: "Menu no encontrado." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, data: menu }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
