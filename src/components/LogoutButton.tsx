"use client";

import { api } from "@/lib/client";

export default function LogoutButton({ name }: { name: string }) {
  async function out() {
    await api("/api/auth/logout", "POST");
    window.location.href = "/";
  }
  return (
    <button type="button" onClick={out} title={`Signed in as ${name}`}>
      Sign out
    </button>
  );
}
