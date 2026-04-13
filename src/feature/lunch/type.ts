import { URL_BASE, type NavKey } from "../../models/type";



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

export async function getAllLunches() {
  const lunchesResponse = await fetch(`${URL_BASE}/lunches`, {
    method: "GET",
  });

  if (lunchesResponse.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!lunchesResponse.ok) {
    throw new Error("Request failed");
  }

  const lunchesPayload = await lunchesResponse.json();
  const lunchItems = Array.isArray(lunchesPayload?.data) ? lunchesPayload.data : [];
  return lunchItems;
}

