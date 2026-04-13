export type UserRole = 'ADMIN' | 'USER';
export type LunchStatus = 'ACTIVE' | 'INACTIVE';
export type TicketStatus = 'PENDING' | 'APPROVED' | 'CANCELLED';
export const URL_BASE = 'http://localhost:3001/api';
export type NavKey = "home" | "history" | "profile";

export interface Admin {
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  cedula: string;
  carrera?: string;
  imageURL: string;
}

export interface Lunch {
  id: number;
  status: LunchStatus;
  nombre_plato_principal: string;
  image?: string;
  stock_inicial: number;
  stock_actual: number;
  descripcion?: string;
  ingredientes: string[];
  precio: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Ticket {
  id: number;
  codigo_carnet: string;
  fecha_solicitud: Date | string;
  fecha_entrega?: Date | string;
  estado: TicketStatus;
  lunch_id: number;
  validado_por_id?: number;
  user?: Admin;
  lunch?: Lunch;
  admin?: Admin;
}