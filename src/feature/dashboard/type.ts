export type DashboardMeal = {
  id: number;
  name: string;
  image: string;
  remaining: number;
};

export interface DashboardStat {
    label: string;
    value: number;
}

export interface DashboardSummary {
    consumed: number;
    available: number;
}
