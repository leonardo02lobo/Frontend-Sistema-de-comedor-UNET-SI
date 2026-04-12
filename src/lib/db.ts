import { promises as fs } from "node:fs";
import path from "node:path";

export type Admin = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  role_label: string;
  carrera: string;
  cedula: string;
  image_url: string;
  password?: string;
  password_hash?: string;
};

export type Lunch = {
  id: number;
  name: string;
  description: string;
  ingredients: string[];
  quantity: number;
  price: number;
  image_url: string;
  admin_id?: number;
  created_at: string;
  updated_at: string;
};

export type Menu = {
  id: number;
  lunch_id: number;
  stock_actual: number;
  stock_inicial: number;
  fecha: string;
};

export type Ticket = {
  id: number;
  menu_id: number;
  estado: string;
  fecha_solicitud: string;
  fecha_entrega?: string;
  codigo_carnet?: string;
  qr_payload?: string;
  user?: {
    fullName?: string;
    email?: string;
    role?: string;
    cedula?: string;
    carrera?: string;
  };
};

export type SessionEntry = {
  id: string;
  admin_id: number;
  created_at: string;
};

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getData<T>(fileName: string, fallback: T): Promise<T> {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, fileName);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function saveData<T>(fileName: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, `${json}\n`, "utf-8");
}

export function getNextId(items: Array<{ id: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}
