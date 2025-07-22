import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea fechas tipo "2022-07-15" a "dd/MM/yyyy"
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Formatea montos tipo "858.34" a "$858.34"
export function formatAmount(amountStr?: string): string {
  const amount = parseFloat(amountStr || "0");
  if (isNaN(amount)) return "$0.00";
  return `$${amount.toLocaleString("es-PA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
