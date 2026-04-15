export type UserRole = 'ADMIN' | 'USER';
export type LunchStatus = 'ACTIVE' | 'INACTIVE';
export type TicketStatus = 'PENDING' | 'APPROVED' | 'CANCELLED';
const URL = 'http://localhost:3001';
export const URL_BASE = `${URL}/api`;
export const URL_BASE_IMAGES = `${URL}/images/`;
export type NavKey = "home" | "history" | "profile";

export interface Admin {
  email: string;
  role: UserRole;
  fullName: string;
  cedula: string;
  carrera: string;
  imageURL?: string;
}

export interface Lunch {
  id: number;
  status: LunchStatus;
  nombrePlatoPrincipal: string;
  image?: string;
  stockInicial: number;
  stockActual: number;
  descripcion?: string;
  ingredientes: string[];
  precio: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Ticket {
  id: number;
  codigoCarnet: string;
  fechaSolicitud: Date | string;
  fechaEntrega?: Date | string;
  estado: TicketStatus;
  lunchId: number;
  validadoPorId?: number;
  lunch?: Lunch;
  validadoPor?: Admin;
}

export interface UserCookieData {
  email?: string;
  role?: UserRole;
  fullName?: string;
  roleLabel?: string;
  carrera?: string;
  career?: string;
  cedula?: string;
}

export interface TicketCreateRequest {
  lunchId: number;
  codigoCarnet: string;
}

export interface TicketQRCodeData {
  ticket: Ticket;
  qrCodePayload: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: unknown;
}