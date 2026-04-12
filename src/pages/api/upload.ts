import type { APIRoute } from "astro";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") ?? formData.get("image");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ success: false, error: "Archivo invalido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeName) || ".jpg";
    const baseName = path.basename(safeName, ext);
    const finalName = `${Date.now()}-${crypto.randomUUID()}-${baseName}${ext}`;

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(UPLOAD_DIR, finalName);
    await fs.writeFile(filePath, buffer);

    return new Response(JSON.stringify({ success: true, url: `/uploads/${finalName}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "No se pudo subir la imagen." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
