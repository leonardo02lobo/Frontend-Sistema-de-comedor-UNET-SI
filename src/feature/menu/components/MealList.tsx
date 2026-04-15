import { useEffect, useMemo, useState } from "react";
import MealCard from "./MealCard.jsx";
import { type LunchApiItem, type Meal, type MealListProps, EMPTY_MEALS } from "../type.js";
import { getAllLunches } from "../../lunch/type.js";

const normalizeText = (value: string) =>
	value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

const mapMeals = (lunches: LunchApiItem[], fallbackImage: string): Meal[] =>
	lunches
		.map((lunch) => {
			const lunchId = lunch.id ?? lunch.ID;
			const name = lunch.nombrePlatoPrincipal || lunch.name || "";
			const image = lunch.image_url || lunch.image || fallbackImage || "";
			const category = lunch.categoria || lunch.category || "";

			return {
				id: lunchId ?? "",
				name,
				category,
				image,
				stockActual: lunch.stockActual ?? lunch.stock_actual ?? lunch.quantity,
			};
		})
		.filter((item) => item.id !== "" && item.name);

export default function MealList({ fallbackImage = "", initialMeals }: MealListProps) {
	const stableInitialMeals = initialMeals ?? EMPTY_MEALS;
	const hasInitialMeals = stableInitialMeals.length > 0;
	const [meals, setMeals] = useState<Meal[]>(() => stableInitialMeals);
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(!hasInitialMeals);
	const [error, setError] = useState("");

	useEffect(() => {
		if (hasInitialMeals) {
			setMeals(stableInitialMeals);
			setLoading(false);
		}
	}, [hasInitialMeals, stableInitialMeals]);

	useEffect(() => {
		if (hasInitialMeals) {
			return undefined;
		}

		const controller = new AbortController();

		const loadMeals = async () => {
			try {
				setLoading(true);
				setError("");

				const lunchItems = await getAllLunches();	
				setMeals(mapMeals(lunchItems, fallbackImage));
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					return;
				}
				setMeals([]);
				setError("No se pudo cargar el menu.");
			} finally {
				setLoading(false);
			}
		};

		loadMeals();

		return () => {
			controller.abort();
		};
	}, [fallbackImage, hasInitialMeals]);

	const filteredMeals = useMemo(() => {
		const normalizedQuery = normalizeText(query);
		if (!normalizedQuery) {
			return meals;
		}

		return meals.filter((meal) => {
			const name = normalizeText(meal.name || "");
			const category = normalizeText(meal.category || "");
			return name.includes(normalizedQuery) || category.includes(normalizedQuery);
		});
	}, [meals, query]);

	const showEmpty = !loading && !error && filteredMeals.length === 0;
	return (
		<div className="flex flex-col gap-3 pb-4">
			<label className="relative block">
				<span className="sr-only">Buscar comida o bebida</span>
				<input
					type="search"
					placeholder="Buscar comida, bebida..."
					className="w-full rounded-lg border border-neutral-500 text-center text-base lg:text-lg px-4 py-2.5 text-brand-title placeholder:text-brand-muted transition-colors focus:outline-none focus:border-acento"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted">🔎</span>
			</label>

			{loading ? (
				<p className="rounded-xl border border-dashed border-brand-line px-4 py-6 text-center text-sm font-medium text-brand-muted sm:text-base">
					Cargando menu...
				</p>
			) : null}

			{error ? (
				<p className="rounded-xl border border-dashed border-brand-line px-4 py-6 text-center text-sm font-medium text-brand-muted sm:text-base">
					{error}
				</p>
			) : null}

			{!loading && !error ? (
				<ul className="flex flex-col gap-3">
					{filteredMeals.map((meal) => (
						<MealCard key={meal.id} meal={meal} />
					))}
				</ul>
			) : null}

			{showEmpty ? (
				<p className="rounded-xl border border-brand-line px-4 py-6 text-center text-sm font-medium text-brand-muted sm:text-base">
					No encontramos platos para esa busqueda.
				</p>
			) : null}
		</div>
	);
}
