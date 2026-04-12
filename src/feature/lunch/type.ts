export type NavKey = "home" | "history" | "profile";

export interface NavItem {
  key: NavKey;
  label: string;
}

export interface LunchMeal {
  title: string;
  description: string;
  ingredientsLeft: string[];
  ingredientsRight: string[];
  price: number;
}

export interface LunchTicket {
  studentName: string;
  major: string;
  dateLabel: string;
  idLabel: string;
  barcodeDigits: string;
}
