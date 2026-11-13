"use client";

import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [msg, setMsg] = useState("");
  return (
    <span className="row">
      <button
        type="button"
        className="btn sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setMsg("Copied.");
          } catch {
            setMsg("Copy failed. Select the text and copy it.");
          }
        }}
      >
        {label}
      </button>
      {msg && <span role="status" className="muted">{msg}</span>}
    </span>
  );
}
