import { useEffect, useMemo, useState } from "react";
import {
	DEFAULT_LUNCH_MEAL,
	fetchLunchMeal,
	reserveLunchTicket,
} from "../data";
import type { LunchMeal, LunchMealClientProps } from "../type";

export default function LunchMealClient({ lunchId }: LunchMealClientProps) {
	const [meal, setMeal] = useState<LunchMeal>(DEFAULT_LUNCH_MEAL);
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

				const lunchItem = await fetchLunchMeal(lunchId, controller.signal);

				if (isActive) {
					setMeal(lunchItem);
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}
				if (isActive) {
					setError(err instanceof Error ? err.message : "No se pudo cargar el plato.");
					setMeal(DEFAULT_LUNCH_MEAL);
				}
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		};

		if (lunchId) {
			loadMeal();
		} else {
			setLoading(false);
		}

		return () => {
			isActive = false;
			controller.abort();
		};
	}, [lunchId]);

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
		try {
			setReserveLoading(true);
			setError("");

			sessionStorage.setItem("lastLunchReservation", JSON.stringify(meal));
			const reservation = await reserveLunchTicket(meal);
			window.location.href = `/ticket?ticketId=${reservation.ticketId}`;
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo generar el ticket.");
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
