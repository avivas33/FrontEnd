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
  
  // Formateo personalizado independiente del locale
  // Separar la parte entera y decimal
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  const [integerPart, decimalPart = "00"] = absoluteAmount.toFixed(2).split(".");
  
  // Agregar comas para separar miles
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  // Construir el resultado final
  const formattedAmount = `$${formattedInteger}.${decimalPart}`;
  
  return isNegative ? `-${formattedAmount}` : formattedAmount;
}
