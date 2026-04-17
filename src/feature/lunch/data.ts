import { URL_BASE, type ApiResponse, type Lunch, type Ticket } from "../../models/type";
import type {
  LocalUserData,
  LunchMeal,
  ReserveTicketResult,
  TicketCreateRequest,
  TicketQRCodeData,
  TicketReservationContext,
  UserCookieData,
} from "./type";

const toApiUrl = (path: string) => `${URL_BASE}${path}`;

export const DEFAULT_LUNCH_MEAL: LunchMeal = {
  id: null,
  title: "Plato no disponible",
  description: "No se encontro informacion del plato seleccionado.",
  ingredients: [],
  imageUrl: "",
  price: null,
  stockActual: 0,
};

const getErrorMessage = <T>(payload: ApiResponse<T> | null, fallback: string): string => {
  if (!payload) {
    return fallback;
  }
  const message = payload.error || payload.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

const parseApiResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  const payload = (await response.json()) as ApiResponse<T>;

  if (response.status === 401) {
    throw new Error("Sesion expirada. Inicia sesion nuevamente.");
  }

  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new Error(getErrorMessage(payload, fallbackMessage));
  }

  return payload.data;
};

const mapLunchToView = (lunch: Lunch): LunchMeal => ({
  id: lunch.id,
  title: lunch.nombrePlatoPrincipal || DEFAULT_LUNCH_MEAL.title,
  description: lunch.descripcion || DEFAULT_LUNCH_MEAL.description,
  ingredients: Array.isArray(lunch.ingredientes) ? lunch.ingredientes : [],
  imageUrl: lunch.image || "",
  price: Number.isFinite(Number(lunch.precio)) ? Number(lunch.precio) : null,
  stockActual: Number.isFinite(Number(lunch.stockActual)) ? Number(lunch.stockActual) : 0,
});

const resolveCodigoCarnet = (sessionCedula?: string): string => {
  const fromSession = String(sessionCedula || "").trim();
  if (fromSession) {
    return fromSession;
  }

  try {
    const localRaw = window.localStorage.getItem("userData");
    if (!localRaw) {
      return "";
    }

    const localData = JSON.parse(localRaw) as LocalUserData;

    return String(localData?.cedula || localData?.codigoCarnet || localData?.email || "").trim();
  } catch {
    return "";
  }
};

export const getAllLunches = async (signal?: AbortSignal): Promise<Lunch[]> => {
  const response = await fetch(toApiUrl("/lunches"), {
    method: "GET",
    credentials: "include",
    signal,
  });

  return parseApiResponse<Lunch[]>(response, "No se pudo cargar el menu.");
};

export const getLunchById = async (lunchId: string, signal?: AbortSignal): Promise<Lunch> => {
  const response = await fetch(toApiUrl(`/lunches/${lunchId}`), {
    method: "GET",
    credentials: "include",
    signal,
  });

  return parseApiResponse<Lunch>(response, "No se pudo cargar el plato.");
};

export const validateCookie = async (signal?: AbortSignal): Promise<UserCookieData> => {
  const response = await fetch(toApiUrl("/auth/validate-cookie"), {
    method: "GET",
    credentials: "include",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return parseApiResponse<UserCookieData>(response, "No se pudo validar la sesion.");
};

export const createTicket = async (
  body: TicketCreateRequest,
  signal?: AbortSignal,
): Promise<TicketQRCodeData> => {
  const response = await fetch(toApiUrl("/tickets"), {
    method: "POST",
    credentials: "include",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse<TicketQRCodeData>(response, "No se pudo generar el ticket.");
};

export const fetchLunchMeal = async (lunchId: string, signal?: AbortSignal): Promise<LunchMeal> => {
  const lunchItem = await getLunchById(lunchId, signal);
  return mapLunchToView(lunchItem);
};

export const getUserPendingTicket = async (codigoCarnet: string, signal?: AbortSignal): Promise<Ticket | null> => {
  const response = await fetch(toApiUrl("/tickets"), {
    method: "GET",
    credentials: "include",
    signal,
  });

  const tickets = await parseApiResponse<Ticket[]>(response, "No se pudo verificar tickets.");
  return tickets.find((t) => t.codigoCarnet === codigoCarnet && t.estado === "PENDING") ?? null;
};

export const reserveLunchTicket = async (meal: LunchMeal): Promise<ReserveTicketResult> => {
  if (meal.id === null) {
    throw new Error("ID de plato invalido.");
  }

  if (meal.stockActual <= 0) {
    throw new Error("Este platillo esta agotado.");
  }

  const userInfo = await validateCookie();
  const codigoCarnet = resolveCodigoCarnet(userInfo.cedula);

  if (!codigoCarnet) {
    throw new Error("No se encontro codigo de carnet para reservar.");
  }

  const ticketData = await createTicket({
    lunchId: meal.id,
    codigoCarnet,
  });

  const ticket = ticketData.ticket;
  const qrCodePayload = ticketData.qrCodePayload;

  if (!ticket?.id || !qrCodePayload) {
    throw new Error("Ticket generado sin informacion completa de QR.");
  }

  const reservationContext: TicketReservationContext = {
    lunch: {
      name: meal.title,
      description: meal.description,
      ingredients: meal.ingredients,
      image: meal.imageUrl,
      image_url: meal.imageUrl,
      price: meal.price,
    },
    user: userInfo,
  };

  sessionStorage.setItem("ticketData", JSON.stringify(ticket));
  sessionStorage.setItem("ticketQrPayload", qrCodePayload);
  sessionStorage.setItem("ticketReservationContext", JSON.stringify(reservationContext));

  return { ticketId: ticket.id };
};
