import React, { useEffect, useMemo, useState } from "react";
import { URL_BASE, URL_BASE_IMAGES, type ApiResponse, type Lunch, type Ticket } from "../../../models/type";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80";

const FILTERS = [
    { id: "30", label: "Ultimos 30 dias" },
    { id: "15", label: "Ultimos 15 dias" },
    { id: "month", label: "Mes" },
    { id: "day", label: "Dia" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

type LunchApiItem = {
    id?: number | string | null;
    ID?: number | string | null;
    name?: string | null;
    nombrePlatoPrincipal?: string | null;
    image_url?: string | null;
    image?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type TicketApiItem = Ticket & {
    ID?: number | string | null;
    codigo_carnet?: string | null;
    fecha_entrega?: string | null;
    fecha_solicitud?: string | null;
    lunch_id?: number | string | null;
    lunch?: LunchApiItem | null;
    status?: string | null;
};

type LunchHistoryItem = {
    id: number;
    name: string;
    image: string;
    userCode: string;
    date: Date;
    dateKey: string;
    timeLabel: string;
};

type HistoryGroup = {
    dateKey: string;
    heading: string;
    items: LunchHistoryItem[];
};

const millisecondsPerDay = 1000 * 60 * 60 * 24;

const normalizeText = (value: string) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

const parseId = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};

const API_ORIGIN = URL_BASE_IMAGES.replace(/\/images\/?$/, "");

const resolveImageUrl = (value: unknown) => {
    const image = String(value || "").trim();
    if (!image) return FALLBACK_IMAGE;
    if (image.startsWith("data:") || image.startsWith("http://") || image.startsWith("https://")) {
        return image;
    }
    if (image.startsWith("/")) return `${API_ORIGIN}${image}`;
    return `${URL_BASE_IMAGES}${image}`;
};

const toDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const parseDateKey = (dateKey: string) => {
    const [year, monthIndex, day] = String(dateKey || "").split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
        return null;
    }
    const parsed = new Date(year, monthIndex, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateHeading = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const dayDifference = Math.round((today.getTime() - dateOnly.getTime()) / millisecondsPerDay);
    const formattedDate = new Intl.DateTimeFormat("es-VE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })
        .format(dateOnly)
        .replace(/\./g, "");

    if (dayDifference === 0) return `Hoy · ${formattedDate}`;
    if (dayDifference === 1) return `Ayer · ${formattedDate}`;
    return formattedDate;
};

const matchesDateFilter = (date: Date, filterId: FilterId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const dayDifference = Math.floor((today.getTime() - dateOnly.getTime()) / millisecondsPerDay);

    switch (filterId) {
        case "day":
            return dayDifference === 0;
        case "15":
            return dayDifference >= 0 && dayDifference <= 15;
        case "30":
            return dayDifference >= 0 && dayDifference <= 30;
        case "month":
            return dateOnly.getMonth() === today.getMonth() && dateOnly.getFullYear() === today.getFullYear();
        default:
            return true;
    }
};

const parseApiArrayResponse = <T,>(payload: ApiResponse<T[]> | null | undefined, fallbackMessage: string) => {
    if (!payload?.success) {
        throw new Error(payload?.error || payload?.message || fallbackMessage);
    }
    return Array.isArray(payload.data) ? payload.data : [];
};

const mapTicketsToHistory = (tickets: TicketApiItem[], lunches: LunchApiItem[]): LunchHistoryItem[] => {
    const lunchById = new Map(
        lunches.map((lunch) => [parseId(lunch.id ?? lunch.ID), lunch]).filter(([id]) => id > 0),
    );

    const deliveredTickets = tickets.filter((ticket) => {
        const status = String(ticket.estado || ticket.status || "").toUpperCase();
        return status === "DELIVERED";
    });
    const approvedTickets = tickets.filter((ticket) => {
        const status = String(ticket.estado || ticket.status || "").toUpperCase();
        return status === "APPROVED";
    });

    const sourceTickets =
        deliveredTickets.length > 0 ? deliveredTickets : approvedTickets.length > 0 ? approvedTickets : tickets;

    return sourceTickets
        .map((ticket) => {
            const ticketId = parseId(ticket.id ?? ticket.ID);
            const lunchId = parseId(ticket.lunchId ?? ticket.lunch_id);
            const lunch = ticket.lunch || lunchById.get(lunchId) || null;
            const name = lunch?.nombrePlatoPrincipal || lunch?.name || `Platillo #${ticketId || lunchId}`;
            const rawDate =
                ticket.fechaEntrega ||
                ticket.fecha_entrega ||
                ticket.updatedAt ||
                ticket.createdAt ||
                ticket.fechaSolicitud ||
                ticket.fecha_solicitud ||
                null;
            const date = new Date(String(rawDate || ""));

            if (!ticketId || Number.isNaN(date.getTime())) {
                return null;
            }

            return {
                id: ticketId,
                name,
                image: resolveImageUrl(lunch?.image_url || lunch?.image),
                userCode: String(ticket.codigoCarnet || ticket.codigo_carnet || "").trim(),
                date,
                dateKey: toDateKey(date),
                timeLabel: new Intl.DateTimeFormat("es-VE", {
                    hour: "2-digit",
                    minute: "2-digit",
                }).format(date),
            };
        })
        .filter((item): item is LunchHistoryItem => Boolean(item))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
};

const groupEntries = (items: LunchHistoryItem[]): HistoryGroup[] => {
    const groupsByDate = new Map<string, LunchHistoryItem[]>();

    for (const item of items) {
        if (!groupsByDate.has(item.dateKey)) {
            groupsByDate.set(item.dateKey, []);
        }
        groupsByDate.get(item.dateKey)?.push(item);
    }

    return Array.from(groupsByDate.entries())
        .map(([dateKey, groupItems]) => {
            const date = parseDateKey(dateKey);
            return {
                dateKey,
                heading: date ? formatDateHeading(date) : dateKey,
                items: groupItems,
            };
        })
        .sort((a, b) => {
            const dateA = parseDateKey(a.dateKey)?.getTime() ?? 0;
            const dateB = parseDateKey(b.dateKey)?.getTime() ?? 0;
            return dateB - dateA;
        });
};

const normalizePath = (pathname: string) => {
    const safePath = String(pathname || "");
    if (safePath.length > 1 && safePath.endsWith("/")) {
        return safePath.slice(0, -1);
    }
    return safePath || "/";
};

const restorePreviousContext = () => {
    const rawReturn = sessionStorage.getItem("history:return");
    if (rawReturn) {
        try {
            const parsed = JSON.parse(rawReturn);
            const targetPath = String(parsed?.path || "");
            if (targetPath && normalizePath(targetPath) !== "/history") {
                sessionStorage.setItem(
                    "history:restore",
                    JSON.stringify({
                        path: targetPath,
                        scrollY: Number(parsed?.scrollY) || 0,
                        containerScrollTop: Number(parsed?.containerScrollTop) || 0,
                        containerSelector: String(parsed?.containerSelector || ""),
                    }),
                );
                window.location.href = targetPath;
                return;
            }
        } catch {
            // fallback below
        }
    }

    if (window.history.length > 1) {
        window.history.back();
        return;
    }

    window.location.href = "/";
};

export default function HistoryMealView() {
    const [query, setQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterId>("30");
    const [items, setItems] = useState<LunchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        const loadHistory = async () => {
            try {
                setLoading(true);
                setError("");

                const ticketsResponse = await fetch(`${URL_BASE}/tickets`, {
                    method: "GET",
                    credentials: "include",
                    signal: controller.signal,
                });
                const lunchesResponse = await fetch(`${URL_BASE}/lunches`, {
                    method: "GET",
                    credentials: "include",
                    signal: controller.signal,
                });

                if (ticketsResponse.status === 401 || lunchesResponse.status === 401) {
                    throw new Error("Sesion expirada. Inicia sesion nuevamente.");
                }

                if (!ticketsResponse.ok || !lunchesResponse.ok) {
                    throw new Error("No se pudo cargar el historial.");
                }

                const ticketsPayload = (await ticketsResponse.json()) as ApiResponse<TicketApiItem[]>;
                const lunchesPayload = (await lunchesResponse.json()) as ApiResponse<LunchApiItem[]>;
                const tickets = parseApiArrayResponse(ticketsPayload, "No se pudieron cargar los tickets.");
                const lunches = parseApiArrayResponse(lunchesPayload, "No se pudieron cargar los platos.");

                setItems(mapTicketsToHistory(tickets, lunches));
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                setItems([]);
                setError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
            } finally {
                setLoading(false);
            }
        };

        loadHistory();

        return () => controller.abort();
    }, []);

    const filteredItems = useMemo(() => {
        const normalizedQuery = normalizeText(query);

        return items.filter((item) => {
            const searchMatch =
                normalizedQuery === "" ||
                normalizeText(item.name).includes(normalizedQuery) ||
                normalizeText(item.userCode).includes(normalizedQuery);
            const dateMatch = matchesDateFilter(item.date, activeFilter);
            return searchMatch && dateMatch;
        });
    }, [items, query, activeFilter]);

    const groups = useMemo(() => groupEntries(filteredItems), [filteredItems]);
    const showEmpty = !loading && !error && groups.length === 0;

    return (
        <section className="history-view flex min-h-0 flex-1 flex-col bg-white px-5 py-5 text-brand-dark lg:px-8 lg:py-6">
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <header className="flex shrink-0 flex-col gap-0.5">
                    <div className="-ml-1 w-fit p-1">
                        <button
                            type="button"
                            aria-label="Volver a la vista anterior"
                            className="text-neutral-900 text-body-r font-semibold cursor-pointer hover:text-hover transition-colors duration-200"
                            onClick={restorePreviousContext}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32"
                                height="32"
                                viewBox="0 0 32 32"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="icon icon-tabler icons-tabler-outline icon-tabler-arrow-left"
                            >
                                <path stroke="none" d="M0 0h32v32H0z" fill="none"></path>
                                <path d="M5 16l22 0"></path>
                                <path d="M5 16l6 6"></path>
                                <path d="M5 16l6 -6"></path>
                            </svg>
                        </button>
                    </div>
                    <h1 className="flex justify-center text-4xl font-bold text-brand-title lg:text-6xl">Historial</h1>
                    <p className="flex justify-center text-lg font-medium text-brand-muted lg:text-xl">
                        Todos los platos registrados
                    </p>
                </header>

                <div className="history-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
                    <div className="sticky top-0 z-20 flex flex-col gap-2 bg-white pb-2 pt-1">
                        <label className="relative block">
                            <span className="sr-only">Buscar en el historial</span>
                            <input
                                type="search"
                                placeholder="Buscar comida..."
                                className="w-full rounded-lg border border-neutral-500 text-center text-base lg:text-lg px-4 py-2.5 text-brand-title placeholder:text-brand-muted transition-colors focus:outline-none focus:border-acento"
					            value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                            <span
                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted"
                                aria-hidden="true"
                            >
                                🔎
                            </span>
                        </label>

                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                            {FILTERS.map((filter) => {
                                const isActive = activeFilter === filter.id;
                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                                            isActive
                                                ? "border-acento bg-acento text-neutral-0"
                                                : "border-neutral-200 bg-neutral-0 text-neutral-500 hover:border-acento hover:text-neutral-900"
                                        }`}
                                        aria-pressed={isActive}
                                        onClick={() => setActiveFilter(filter.id)}
                                    >
                                        {filter.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pb-4 pt-1" aria-live="polite">
                        {loading ? (
                            <p className="rounded-xl border border-dashed border-brand-line px-4 py-6 text-center text-sm font-medium text-brand-muted sm:text-base">
                                Cargando historial...
                            </p>
                        ) : null}

                        {error ? (
                            <p className="rounded-xl border border-dashed border-brand-line px-4 py-6 text-center text-sm font-medium text-brand-muted sm:text-base">
                                {error}
                            </p>
                        ) : null}

                        {!loading && !error && groups.length > 0 ? (
                            <div>
                                {groups.map((group) => (
                                    <section key={group.dateKey} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="shrink-0 text-xs font-semibold text-brand-history-button sm:text-sm text-acento">
                                                {group.heading}
                                            </span>
                                            <span
                                                className="h-px min-w-0 flex-1 bg-brand-history-button/80"
                                                aria-hidden="true"
                                            ></span>
                                        </div>
                                        <ul className="flex flex-col gap-1.5">
                                            {group.items.map((item) => (
                                                <li key={`${group.dateKey}-${item.id}`}>
                                                    <article className="flex w-full items-center gap-2.5 rounded-xl border border-brand-line px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2">
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-12 sm:w-12"
                                                        />
                                                        <span className="min-w-0 text-base font-semibold text-brand-title sm:text-lg lg:text-xl">
                                                            {item.name}
                                                        </span>
                                                        <span className="ml-auto shrink-0 text-xs font-medium text-brand-muted">
                                                            {item.timeLabel}
                                                        </span>
                                                    </article>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        ) : null}

                        {showEmpty ? (
                            <p className="rounded-xl border border-dashed border-brand-line px-4 py-6 text-center text-sm font-medium text-brand-muted sm:text-base">
                                No encontramos platos para ese filtro.
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
