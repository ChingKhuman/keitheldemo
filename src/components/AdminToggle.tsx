"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function AdminToggle({
  path,
  field,
  value,
  onLabel,
  offLabel,
}: {
  path: string;
  field: "verified" | "hidden";
  value: boolean;
  onLabel: string;
  offLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <span className="row">
      <button
        type="button"
        className="btn sm"
        onClick={async () => {
          const res = await api(path, "PATCH", { [field]: !value });
          if (res.ok) router.refresh();
          else setError(res.error);
        }}
      >
        {value ? onLabel : offLabel}
      </button>
      {error && <span className="error" role="alert">{error}</span>}
    </span>
  );
}
