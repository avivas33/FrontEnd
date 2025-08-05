import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea fechas tipo "2022-07-15" a "dd/MM/yyyy"
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  
  // Parse date components to avoid timezone issues
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      return `${dayStr}/${monthStr}/${year}`;
    }
  }
  
  // Fallback for other date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// Formatea montos tipo "858.34" a "$858.34"
export function formatAmount(amountStr?: string): string {
  const amount = parseFloat(amountStr || "0");
  if (isNaN(amount)) return "$0.00";
  
  // Usar formato estándar USD para evitar problemas de locale
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
