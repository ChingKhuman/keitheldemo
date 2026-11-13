"use client";

import { useMemo, useSyncExternalStore } from "react";

// The cart lives in the visitor's browser. Prices are always re-checked on the server at checkout.
const KEY = "keithel-cart";
const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export type Cart = Record<string, number>;

function parse(raw: string): Cart {
  try {
    const v = JSON.parse(raw);
    const out: Cart = {};
    if (v && typeof v === "object") {
      for (const [k, q] of Object.entries(v)) {
        const n = Math.floor(Number(q));
        if (n >= 1) out[k] = Math.min(20, n);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function useCart(): Cart {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "{}");
  return useMemo(() => parse(raw), [raw]);
}

function write(cart: Cart) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    /* private mode: the cart simply will not persist */
  }
  listeners.forEach((l) => l());
}

export function addToCart(id: string) {
  const c = parse(readRaw());
  c[id] = Math.min(20, (c[id] ?? 0) + 1);
  write(c);
}

export function setQty(id: string, qty: number) {
  const c = parse(readRaw());
  if (qty <= 0) delete c[id];
  else c[id] = Math.min(20, qty);
  write(c);
}

export function clearCart() {
  write({});
}
