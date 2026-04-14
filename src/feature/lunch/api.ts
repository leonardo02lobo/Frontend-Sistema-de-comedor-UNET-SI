import {
  URL_BASE,
  type ApiResponse,
  type Lunch,
  type TicketCreateRequest,
  type TicketQRCodeData,
  type UserCookieData,
} from "../../models/type";

const toApiUrl = (path: string) => `${URL_BASE}${path}`;

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
