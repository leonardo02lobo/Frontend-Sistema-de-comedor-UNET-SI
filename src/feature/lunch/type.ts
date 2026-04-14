import { URL_BASE, type ApiResponse, type Lunch, type NavKey } from "../../models/type";



export interface NavItem {
  key: NavKey;
  label: string;
}

export interface LunchMeal {
  title: string;
  description: string;
  ingredientsLeft: string[];
  ingredientsRight: string[];
  price: number;
}

export interface LunchTicket {
  studentName: string;
  major: string;
  dateLabel: string;
  idLabel: string;
  barcodeDigits: string;
}

export async function getAllLunches(): Promise<Lunch[]> {
  const lunchesResponse = await fetch(`${URL_BASE}/lunches`, {
    method: "GET",
    credentials: "include",
  });

  if (lunchesResponse.status === 401) {
    throw new Error("Sesion expirada. Inicia sesion nuevamente.");
  }

  if (!lunchesResponse.ok) {
    throw new Error("No se pudo cargar el menu.");
  }

  const lunchesPayload = (await lunchesResponse.json()) as ApiResponse<Lunch[]>;
  const lunchItems = Array.isArray(lunchesPayload?.data) ? lunchesPayload.data : [];
  return lunchItems;
}

