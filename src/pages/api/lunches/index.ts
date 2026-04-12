import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getData, saveData, getNextId, type Lunch, type Menu } from "../../../lib/db";

const LUNCHES_FILE = "lunches.json";
const MENUS_FILE = "menus.json";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const toSafeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toIngredients = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => toSafeText(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isMultipart = (request: Request): boolean => {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("multipart/form-data");
};

const saveUploadFile = async (file: File): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.extname(safeName) || ".jpg";
  const baseName = path.basename(safeName, ext);
  const finalName = `${Date.now()}-${crypto.randomUUID()}-${baseName}${ext}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(UPLOAD_DIR, finalName);
  await fs.writeFile(filePath, buffer);

  return `/uploads/${finalName}`;
};

export const GET: APIRoute = async () => {
  const lunches = await getData<Lunch[]>(LUNCHES_FILE, []);
  return new Response(JSON.stringify({ success: true, data: lunches }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    let name = "";
    let description = "";
    let ingredients: string[] = [];
    let quantity = 0;
    let price = 0;
    let imageUrl = "";
    let shouldRedirect = false;

    if (isMultipart(request)) {
      const formData = await request.formData();
      name = toSafeText(formData.get("name"));
      description = toSafeText(formData.get("description"));
      ingredients = toIngredients(formData.get("ingredients"));
      quantity = Math.max(0, toNumber(formData.get("quantity"), 0));
      price = Math.max(0, toNumber(formData.get("price"), 0));

      const file = formData.get("file") ?? formData.get("image");
      if (file instanceof File) {
        imageUrl = await saveUploadFile(file);
      }
      shouldRedirect = true;
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      name = toSafeText(body.name);
      description = toSafeText(body.description);
      ingredients = toIngredients(body.ingredients);
      quantity = Math.max(0, toNumber(body.quantity, 0));
      price = Math.max(0, toNumber(body.price, 0));
      imageUrl = toSafeText(body.image_url ?? body.imageUrl);
    }

    if (!name || !description || ingredients.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Datos incompletos." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lunches = await getData<Lunch[]>(LUNCHES_FILE, []);
    const newLunch: Lunch = {
      id: getNextId(lunches),
      name,
      description,
      ingredients,
      quantity,
      price,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    lunches.push(newLunch);
    await saveData(LUNCHES_FILE, lunches);

    const menus = await getData<Menu[]>(MENUS_FILE, []);
    const newMenu: Menu = {
      id: getNextId(menus),
      lunch_id: newLunch.id,
      stock_actual: quantity,
      stock_inicial: quantity,
      fecha: new Date().toISOString().slice(0, 10),
    };
    menus.push(newMenu);
    await saveData(MENUS_FILE, menus);

    if (shouldRedirect) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/dashboard" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: newLunch }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: "No se pudo crear el platillo." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
