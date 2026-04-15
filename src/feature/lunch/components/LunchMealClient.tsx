import { useEffect, useMemo, useState } from "react";
import { type Lunch } from "../../../models/type";
import { createTicket, getLunchById, validateCookie } from "../api";

type LunchMeal = {
	id: number | null;
	title: string;
	description: string;
	ingredients: string[];
	imageUrl: string;
	price: number | null;
	stockActual: number;
};

type LunchMealClientProps = {
	mealId: string;
};


const DEFAULT_MEAL: LunchMeal = {
	id: null,
	title: "Plato no disponible",
	description: "No se encontro informacion del plato seleccionado.",
	ingredients: [],
	imageUrl: "",
	price: null,
	stockActual: 0,
};

const mapLunchToView = (lunch: Lunch): LunchMeal => ({
	id: lunch.id,
	title: lunch.nombrePlatoPrincipal || DEFAULT_MEAL.title,
	description: lunch.descripcion || DEFAULT_MEAL.description,
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

		const localData = JSON.parse(localRaw) as {
			cedula?: string;
			codigoCarnet?: string;
			email?: string;
		};

		const fallback = String(
			localData?.cedula ||
				localData?.codigoCarnet ||
				localData?.email ||
				"",
		).trim();

		return fallback;
	} catch {
		return "";
	}
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

				const lunchItem = await getLunchById(mealId, controller.signal);

				if (isActive) {
					setMeal(mapLunchToView(lunchItem));
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}
				if (isActive) {
					setError(err instanceof Error ? err.message : "No se pudo cargar el plato.");
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

	const canReserve = meal.id !== null && meal.stockActual > 0 && !loading && !error;

	const handleReserve = async () => {
		if (meal.id === null) {
			setError("ID de plato invalido.");
			return;
		}

		if (meal.stockActual <= 0) {
			setError("Este platillo esta agotado.");
			return;
		}

		try {
			setReserveLoading(true);
			setError("");

			const userInfo = await validateCookie();
			const codigoCarnet = resolveCodigoCarnet(userInfo.cedula);

			if (!codigoCarnet) {
				setError("No se encontro codigo de carnet para reservar.");
				return;
			}

			const ticketData = await createTicket({
				lunchId: meal.id,
				codigoCarnet,
			});

			const ticket = ticketData.ticket;
			const qrCodePayload = ticketData.qrCodePayload;

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
							image: meal.imageUrl,
							image_url: meal.imageUrl,
							price: meal.price,
						},
						user: userInfo,
					}),
				);
				window.location.href = `/ticket?ticketId=${ticket.id}`;
				return;
			}

			setError("Ticket generado sin informacion completa de QR.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo generar el ticket.");
		} finally {
			setReserveLoading(false);
		}
	};

	const resolvedImage = meal.imageUrl
		? meal.imageUrl.startsWith("data:") || meal.imageUrl.startsWith("http")
			? meal.imageUrl
			: `http://localhost:3001/images/${meal.imageUrl}`
		: "";

	return (
		<div className="flex flex-col w-full flex-1 justify-center items-center bg-neutral-0 text-neutral-900 p-5 rounded-t-3xl gap-4">
			<div className="flex flex-col justify-center items-center py-4 gap-4">
				{resolvedImage && (
					<img
						src={resolvedImage}
						alt={`Imagen de ${meal.title}`}
						className="w-40 h-40 md:w-52 md:h-52 rounded-full object-cover border-4 border-neutral-200"
					/>
				)}
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
