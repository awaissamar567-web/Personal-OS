import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind className merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency as USD with comma formatting (e.g., $50,000)
export function formatUSD(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '$0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0';
  return '$' + num.toLocaleString('en-US');
}

// Format date to DD/MM/YYYY
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  // Avoid time-zone shifting for string dates (YYYY-MM-DD)
  if (typeof date === 'string' && date.includes('-')) {
    const parts = date.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date to input-friendly YYYY-MM-DD
export function formatInputDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// Get current date string in PKT timezone (Asia/Karachi) - returns YYYY-MM-DD
export function getPKTDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

// Get yesterday's date string in PKT timezone (Asia/Karachi) - returns YYYY-MM-DD
export function getYesterdayPKTDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  const pktDateStr = formatter.format(new Date());
  const pktDate = new Date(pktDateStr);
  pktDate.setDate(pktDate.getDate() - 1);
  
  const formatterENCA = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatterENCA.format(pktDate);
}

// Get date 7 days ago in PKT timezone (Asia/Karachi) - returns YYYY-MM-DD
export function getPKTDate7DaysAgoString(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  const pktDateStr = formatter.format(new Date());
  const pktDate = new Date(pktDateStr);
  pktDate.setDate(pktDate.getDate() - 7);
  
  const formatterENCA = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatterENCA.format(pktDate);
}

