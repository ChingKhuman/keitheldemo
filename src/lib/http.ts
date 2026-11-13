import { getUser, type CurrentUser } from "./auth";

export function fail(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * Cross-site request check for anything that changes data. Browsers send an
 * Origin header on cross-site POSTs; if it names another host, refuse.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

type Guard = { user: CurrentUser; res?: undefined } | { user?: undefined; res: Response };

/** Use at the top of a mutating handler. Returns the user or a ready error response. */
export async function guard(req: Request, opts: { admin?: boolean } = {}): Promise<Guard> {
  if (!sameOrigin(req)) return { res: fail(403, "Request blocked.") };
  const user = await getUser();
  if (!user) return { res: fail(401, "Sign in to continue.") };
  if (opts.admin && !user.isAdmin) return { res: fail(403, "Admins only.") };
  return { user };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
