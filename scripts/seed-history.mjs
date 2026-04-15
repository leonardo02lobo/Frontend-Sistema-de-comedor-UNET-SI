const API_BASE = (process.env.COMEDOR_API_URL || "http://localhost:3001/api").replace(/\/$/, "");
const LOGIN_EMAIL = process.env.COMEDOR_LOGIN_EMAIL || "admin@comedor.unet";
const LOGIN_PASSWORD = process.env.COMEDOR_LOGIN_PASSWORD || "hash_de_prueba";
const DEMO_PREFIX = "HIST-DEMO-";

let authCookie = "";

const demoEntries = [
  { code: `${DEMO_PREFIX}HOY`, daysAgo: 0 },
  { code: `${DEMO_PREFIX}DOS-DIAS`, daysAgo: 2 },
  { code: `${DEMO_PREFIX}NUEVE-DIAS`, daysAgo: 9 },
  { code: `${DEMO_PREFIX}DIECIOCHO-DIAS`, daysAgo: 18 },
  { code: `${DEMO_PREFIX}TREINTA-Y-DOS-DIAS`, daysAgo: 32 },
];

const formatError = (message, details) => {
  if (!details) return message;
  return `${message}\n${details}`;
};

const request = async (path, { method = "GET", body, auth = true } = {}) => {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && authCookie) {
    headers["Cookie"] = authCookie;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  return { response, payload, rawText };
};

const requireSuccess = ({ response, payload, rawText }, fallbackMessage) => {
  if (!response.ok) {
    throw new Error(formatError(payload?.error || payload?.message || fallbackMessage, rawText));
  }
  if (payload && payload.success === false) {
    throw new Error(payload.error || payload.message || fallbackMessage);
  }
  return payload;
};

const daysAgoToIso = (daysAgo) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const login = async () => {
  const result = await request("/login", {
    method: "POST",
    auth: false,
    body: {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    },
  });

  const payload = requireSuccess(result, "No se pudo iniciar sesion en el backend.");
  const setCookie = result.response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("El backend no devolvio la cookie de autenticacion.");
  }

  authCookie = setCookie.split(";")[0];
  return payload?.data || null;
};

const getLunches = async () => {
  const result = await request("/lunches");
  const payload = requireSuccess(result, "No se pudieron obtener los platos.");
  return Array.isArray(payload?.data) ? payload.data : [];
};

const getTickets = async () => {
  const result = await request("/tickets");
  const payload = requireSuccess(result, "No se pudieron obtener los tickets.");
  return Array.isArray(payload?.data) ? payload.data : [];
};

const deleteTicket = async (ticketId) => {
  const result = await request(`/tickets/${ticketId}`, { method: "DELETE" });
  requireSuccess(result, `No se pudo eliminar el ticket ${ticketId}.`);
};

const createTicket = async (lunchId, codigoCarnet) => {
  const result = await request("/tickets", {
    method: "POST",
    body: {
      lunchId,
      codigoCarnet,
    },
  });
  const payload = requireSuccess(result, `No se pudo crear el ticket para ${codigoCarnet}.`);
  return payload?.data?.ticket || payload?.data || null;
};

const updateTicket = async (ticketId, body) => {
  const result = await request(`/tickets/${ticketId}`, {
    method: "PUT",
    body,
  });
  const payload = requireSuccess(result, `No se pudo actualizar el ticket ${ticketId}.`);
  return payload?.data || null;
};

const main = async () => {
  console.log(`Usando backend: ${API_BASE}`);
  console.log(`Iniciando sesion con: ${LOGIN_EMAIL}`);

  const user = await login();
  console.log(`Sesion lista para: ${user?.fullName || user?.email || LOGIN_EMAIL}`);

  const lunches = await getLunches();
  const targetLunch = lunches.find((lunch) => Number(lunch?.id) > 0) || null;
  if (!targetLunch) {
    throw new Error("No hay platos disponibles en el backend. Necesitas al menos un lunch.");
  }

  console.log(`Usando lunch #${targetLunch.id}: ${targetLunch.nombrePlatoPrincipal || "Sin nombre"}`);

  const existingTickets = await getTickets();
  const demoTickets = existingTickets.filter((ticket) =>
    String(ticket?.codigoCarnet || "").startsWith(DEMO_PREFIX),
  );

  if (demoTickets.length > 0) {
    console.log(`Eliminando ${demoTickets.length} ticket(s) demo anterior(es)...`);
    for (const ticket of demoTickets) {
      await deleteTicket(ticket.id);
    }
  }

  const createdSummaries = [];
  for (const entry of demoEntries) {
    const createdTicket = await createTicket(Number(targetLunch.id), entry.code);
    const ticketId = Number(createdTicket?.id);

    if (!ticketId) {
      throw new Error(`El backend no devolvio un id valido para ${entry.code}.`);
    }

    const deliveredAt = daysAgoToIso(entry.daysAgo);
    await updateTicket(ticketId, {
      estado: "APPROVED",
      fechaEntrega: deliveredAt,
    });

    createdSummaries.push({
      id: ticketId,
      codigoCarnet: entry.code,
      fechaEntrega: deliveredAt,
    });
  }

  console.log("");
  console.log("Historial demo listo.");
  console.log("Abre http://localhost:4321/history despues de iniciar sesion en el frontend.");
  console.log("");
  for (const item of createdSummaries) {
    console.log(`- Ticket #${item.id} | ${item.codigoCarnet} | ${item.fechaEntrega}`);
  }
};

main().catch((error) => {
  console.error("");
  console.error("No se pudo preparar el historial demo.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
