import type {
  Lunch,
  NavKey,
  TicketCreateRequest,
  TicketQRCodeData,
  UserCookieData,
} from "../../models/type";

export type { Lunch, TicketCreateRequest, TicketQRCodeData, UserCookieData };

export interface NavItem {
  key: NavKey;
  label: string;
}

export interface LunchMealClientProps {
  lunchId: string;
}

export interface LunchMeal {
  id: number | null;
  title: string;
  description: string;
  ingredients: string[];
  imageUrl: string;
  price: number | null;
  stockActual: number;
}

export interface LunchTicket {
  studentName: string;
  major: string;
  dateLabel: string;
  idLabel: string;
  barcodeDigits: string;
}

export interface LocalUserData {
  cedula?: string;
  codigoCarnet?: string;
  email?: string;
}

export interface TicketReservationContext {
  lunch: {
    name: string;
    description: string;
    ingredients: string[];
    image: string;
    image_url: string;
    price: number | null;
  };
  user: UserCookieData;
}

export interface ReserveTicketResult {
  ticketId: number;
}

