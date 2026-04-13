import { useEffect, useMemo, useState } from "react";

type LunchApiItem = {
	id?: number | string | null;
	ID?: number | string | null;
	nombrePlatoPrincipal?: string | null;
	name?: string | null;
	descripcion?: string | null;
	description?: string | null;
	ingredientes?: string[] | string | null;
	ingredients?: string[] | string | null;
	image_url?: string | null;
	image?: string | null;
	precio?: number | string | null;
	price?: number | string | null;
};

type MenuApiItem = {
	id?: number | string | null;
	ID?: number | string | null;
	lunchId?: number | string | null;
	lunch_id?: number | string | null;
	stockActual?: number | string | null;
	stock_actual?: number | string | null;
	categoria?: string | null;
	category?: string | null;
};

type UserCookieData = {
	email?: string;
	role?: string;
};

type LunchMeal = {
	menuId: number | null;
	lunchId: number | null;
	title: string;
	description: string;
	ingredients: string[];
	imageUrl: string;
	price: number | null;
	category: string;
	stockActual: number;
};

type LunchMealClientProps = {
	mealId: string;
};


const DEFAULT_MEAL: LunchMeal = {
	menuId: null,
	lunchId: null,
	title: "Plato no disponible",
	description: "No se encontro informacion del plato seleccionado.",
	ingredients: [],
	imageUrl: "",
	price: null,
	category: "",
	stockActual: 0,
};

const normalizeIngredients = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.map((item) => String(item).trim()).filter(Boolean);
	}

	if (typeof value === "string") {
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
};

const parseNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const mapMeal = (menu: MenuApiItem, lunch: LunchApiItem | null | undefined): LunchMeal => {
	const title = lunch?.nombrePlatoPrincipal || lunch?.name || DEFAULT_MEAL.title;
	const description = lunch?.descripcion || lunch?.description || DEFAULT_MEAL.description;
	const ingredients = normalizeIngredients(lunch?.ingredientes ?? lunch?.ingredients);
	const imageUrl = String(lunch?.image_url || lunch?.image || "");
	const price = parseNumber(lunch?.precio ?? lunch?.price);
	const stockActual = parseNumber(menu.stockActual ?? menu.stock_actual) ?? 0;
	const menuId = parseNumber(menu.id ?? menu.ID);
	const lunchId = parseNumber(menu.lunchId ?? menu.lunch_id);
	const category = menu.categoria || menu.category || "";

	return {
		menuId,
		lunchId,
		title,
		description,
		ingredients,
		imageUrl,
		price,
		category,
		stockActual,
	};
};

const getUserCookieData = async (): Promise<UserCookieData> => {
	const response = await fetch("/api/auth/validate-cookie", {
		method: "GET",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		return {};
	}

	const payload = await response.json();
	return payload?.data ?? {};
};

export default function LunchMealClient({ mealId }: LunchMealClientProps) {
	const [meal, setMeal] = useState<LunchMeal>(DEFAULT_MEAL);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [reserveLoading, setReserveLoading] = useState(false);

	useEffect(() => {
		let isActive = true;
		const controller = new AbortController();

		const loadMeal = async () => {
			try {
				setLoading(true);
				setError("");

				const menuResponse = await fetch(`/api/menus/${mealId}`, {
					method: "GET",
					credentials: "include",
					signal: controller.signal,
				});

				if (menuResponse.status === 401) {
					if (isActive) {
						setError("Sesion expirada. Inicia sesion nuevamente.");
					}
					return;
				}

				if (!menuResponse.ok) {
					throw new Error("Menu request failed");
				}

				const menuPayload = await menuResponse.json();
				const menuItem = menuPayload?.data ?? null;
				const lunchId = parseNumber(menuItem?.lunchId ?? menuItem?.lunch_id);
				if (!lunchId) {
					throw new Error("Lunch ID missing");
				}

				const lunchResponse = await fetch(`/api/lunches/${lunchId}`, {
					method: "GET",
					credentials: "include",
					signal: controller.signal,
				});

				if (!lunchResponse.ok) {
					throw new Error("Lunch request failed");
				}

				const lunchPayload = await lunchResponse.json();
				const lunchItem = lunchPayload?.data ?? null;

				if (isActive) {
					setMeal(mapMeal(menuItem, lunchItem));
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}
				if (isActive) {
					setError("No se pudo cargar el plato.");
					setMeal(DEFAULT_MEAL);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		if (mealId) {
			loadMeal();
		} else {
			setLoading(false);
		}

		return () => {
			isActive = false;
			controller.abort();
		};
	}, [mealId]);

	const priceLabel = useMemo(() => {
		if (meal.price === null || meal.price === undefined) {
			return "-";
		}
		return `$${Number(meal.price).toFixed(2)}`;
	}, [meal.price]);

	const [leftIngredients, rightIngredients] = useMemo(() => {
		const mid = Math.ceil(meal.ingredients.length / 2);
		return [meal.ingredients.slice(0, mid), meal.ingredients.slice(mid)];
	}, [meal.ingredients]);

	const canReserve = meal.menuId !== null && meal.stockActual > 0 && !loading && !error;

	const handleReserve = async () => {
		if (meal.menuId === null) {
			setError("Menu ID invalido.");
			return;
		}

		if (meal.stockActual <= 0) {
			setError("Este platillo esta agotado.");
			return;
		}

		const lugarEntrega = window.localStorage.getItem("lugarEntrega")?.trim() || "Comedor";

		try {
			setReserveLoading(true);
			setError("");

			const userInfo = await getUserCookieData();

			const response = await fetch("/api/tickets", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					menuId: meal.menuId,
					prioridad: "LOW",
					lugarEntrega,
				}),
			});
			console.log("Reserva response", response);

			if (response.status === 401) {
				setError("Sesion expirada. Inicia sesion nuevamente.");
				return;
			}

			const payload = await response.json();

			if (!response.ok || !payload?.success) {
				setError(payload?.error || "No se pudo generar el ticket.");
				return;
			}

			const ticket = payload?.data?.ticket;
			const qrCodePayload = payload?.data?.qrCodePayload;

			if (ticket?.id && qrCodePayload) {
				sessionStorage.setItem("ticketData", JSON.stringify(ticket));
				sessionStorage.setItem("ticketQrPayload", qrCodePayload);
				sessionStorage.setItem(
					"ticketReservationContext",
					JSON.stringify({
						lunch: {
							name: meal.title,
							description: meal.description,
							ingredients: meal.ingredients,
							image_url: meal.imageUrl,
							price: meal.price,
							category: meal.category,
						},
						user: userInfo,
					}),
				);
				window.location.href = `/ticket?ticketId=${ticket.id}`;
				return;
			}

			setError("Ticket generado sin informacion completa de QR.");
		} catch {
			setError("No se pudo generar el ticket.");
		} finally {
			setReserveLoading(false);
		}
	};

	return (
		<div className="flex flex-col w-full flex-1 justify-center items-center bg-neutral-0 text-neutral-900 p-5 rounded-t-3xl gap-4">
			<div className="flex flex-col justify-center items-center py-4 gap-4">
				<h2 className="text-h4 md:text-h3 text-center lg:text-start font-bold">{meal.title}</h2>

				{loading ? (
					<p className="text-body-r md:text-body-l text-center lg:text-start">Cargando detalle...</p>
				) : null}

				{error ? <p className="text-body-r md:text-body-l text-center lg:text-start">{error}</p> : null}

				{!loading && !error ? (
					<section className="flex w-full flex-col gap-2 p-3">
						<h3 className="text-h5 text-left font-bold">Detalles</h3>
						<p className="text-body-r md:text-body-l text-left">{meal.description}</p>
					</section>
				) : null}

				{!loading && !error ? (
					<section className="flex flex-col gap-2 p-3 w-full">
						<h3 className="text-h5 text-center lg:text-start font-bold">Ingredientes</h3>
						<nav className="w-full">
							<ul className="grid lg:flex text-body-r w-full grid-cols-2">
								{leftIngredients.map((ingredient) => (
									<li key={`left-${ingredient}`} className="w-full list-disc list-inside">
										{ingredient}
									</li>
								))}
								{rightIngredients.map((ingredient) => (
									<li key={`right-${ingredient}`} className="w-full list-disc list-inside">
										{ingredient}
									</li>
								))}
							</ul>
						</nav>
					</section>
				) : null}
			</div>

			<section className="flex flex-row justify-around items-center gap-4 p-3 w-full">
				<div className="flex flex-col text-center">
					<span className="text-body-r md:text-h5">Precio</span>
					<p className="text-h4 md:text-h2">{priceLabel}</p>
				</div>
				<div>
					<button
						type="button"
						id="reserve"
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-primario px-4 py-2 lg:px-8 lg:py-4 text-body-r md:text-h6 font-semibold text-neutral-50 transition-colors hover:bg-hover active:bg-activo w-full cursor-pointer shadow-[0px_2px_10px_0px_color-mix(in_srgb,var(--color-primario)_50%,transparent)] hover:shadow-[0px_2px_10px_0px_color-mix(in_srgb,var(--color-hover)_50%,transparent)] active:shadow-[0px_2px_10px_0px_color-mix(in_srgb,var(--color-activo)_50%,transparent)] disabled:opacity-60 disabled:cursor-not-allowed"
						onClick={handleReserve}
						disabled={reserveLoading || !canReserve}
						aria-busy={reserveLoading}
					>
						<svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 stroke-current" aria-hidden="true">
							<path d="M4 7h16" strokeWidth="2" strokeLinecap="round" />
							<path
								d="M6 7l1.4 8.2a2 2 0 0 0 2 1.7h5.2a2 2 0 0 0 2-1.7L18 7"
								strokeWidth="2"
								strokeLinecap="round"
							/>
							<circle cx="10" cy="19" r="1" fill="currentColor" stroke="none" />
							<circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
						</svg>
						{meal.stockActual > 0 ? "Reservar" : "Agotado"}
					</button>
				</div>
			</section>
		</div>
	);
}
