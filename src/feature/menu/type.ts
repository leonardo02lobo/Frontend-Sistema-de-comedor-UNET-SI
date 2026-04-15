export const featuredMeal = {
    name: "Arroz con Pollo",
    specialLabel: "Especial de hoy",
    specialTime: "10:00 - 1:00",
    image:
        "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=400&q=80",
};

export const meals = [];

export type LunchApiItem = {
	id?: number | string | null;
	ID?: number | string | null;
	nombrePlatoPrincipal?: string | null;
	name?: string | null;
	categoria?: string | null;
	category?: string | null;
	image_url?: string | null;
	image?: string | null;
	quantity?: number | string | null;
	stockActual?: number | string | null;
	stock_actual?: number | string | null;
};

export type Meal = {
	id: number | string;
	name: string;
	category: string;
	image: string;
	stockActual?: number | string | null;
};

export type MealListProps = {
	fallbackImage?: string;
	initialMeals?: Meal[];
};

export const EMPTY_MEALS: Meal[] = [];