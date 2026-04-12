import type { DashboardMeal, DashboardStat, DashboardSummary } from "./type";


export const dashboardMeals: DashboardMeal[] = [
  {
    id: 1,
    name: "Hamburguesa",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=80&q=80",
    remaining: 5,
  },
  {
    id: 2,
    name: "Pizza",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=80&q=80",
    remaining: 0,
  },
  {
    id: 3,
    name: "Arroz con Pollo",
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=80&q=80",
    remaining: 8,
  },
  {
    id: 4,
    name: "Hallaca",
    image: "https://images.unsplash.com/photo-1601315379734-425a469078de?auto=format&fit=crop&w=80&q=80",
    remaining: 0,
  },
  {
    id: 5,
    name: "Pasta Boloñesa",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=80&q=80",
    remaining: 3,
  },
];

export const dashboardChartMaxPx = 96;

export const dashboardStats: DashboardStat[] = [
    { label: "Pasta", value: 105 },
    { label: "Pollo", value: 72 },
    { label: "Pizza", value: 46 },
    { label: "Otros", value: 20 },
];

export const dashboardSummary: DashboardSummary = {
    consumed: 24,
    available: 24,
};
