import { URL_BASE_IMAGES } from "../../../models/type";

export default function MealCard({ meal }) {
    const image = URL_BASE_IMAGES+meal.image || "";
    const category = meal.category ? meal.category.trim() : "";
    const stock = Number.isFinite(Number(meal.stockActual)) ? Number(meal.stockActual) : null;

    return (
        <li className="rounded-xl border border-neutral-500">
            <a
                href={`/lunch/${meal.id}`}
                className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 lg:px-4 lg:py-3 text-left"
            >
                <img
                    src={image}
                    alt={`Imagen de ${meal.name}`}
                    className="w-14 h-14 lg:w-16 lg:h-16 rounded-full object-cover"
                />
                <div className="flex flex-col">
                    <span className="text-2xl lg:text-3xl font-semibold text-brand-title">
                        {meal.name}
                    </span>
                    {category ? (
                        <span className="text-sm lg:text-base text-brand-muted">{category}</span>
                    ) : null}
                    {stock !== null ? (
                        <span className="text-xs lg:text-sm text-brand-orange">Disponibles: {stock}</span>
                    ) : null}
                </div>
            </a>
        </li>
    );
}
