export const CATEGORIES = [
  "Handloom & textiles",
  "Local food",
  "Crafts & pottery",
  "Fashion",
  "Home & kitchen",
  "Groceries",
  "Electronics",
  "Other",
] as const;

export const DISTRICTS = [
  "Imphal West",
  "Imphal East",
  "Thoubal",
  "Bishnupur",
  "Kakching",
  "Churachandpur",
  "Ukhrul",
  "Senapati",
  "Other",
] as const;

export const ORDER_STATUSES = [
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["key"];

export function statusLabel(key: string): string {
  return ORDER_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export function isStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && ORDER_STATUSES.some((s) => s.key === v);
}

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹2,400 for whole rupees, ₹1,250.50 when there are paise. */
export function rupees(paise: number): string {
  const p = Math.round(Number(paise) || 0);
  return (p % 100 === 0 ? inrWhole : inrExact).format(p / 100);
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/** Trim, collapse control characters, and cap the length. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

/** Accepts 10-digit Indian mobile numbers, with or without +91 / 91 / spaces / dashes. */
export function normalizePhone(v: unknown): string | null {
  if (typeof v !== "string") return null;
  let s = v.replace(/[\s-]/g, "");
  if (s.startsWith("+91")) s = s.slice(3);
  else if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}

export function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/";
}
