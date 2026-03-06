import type { APIRoute } from "astro";
import { getAuthCookie, verifyToken, isSuperAdmin } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";

  const token = getAuthCookie(request);
  const payload = token ? await verifyToken(token, secret) : null;
  if (!payload || !isSuperAdmin(payload.role as "super_admin" | "admin" | "member")) {
    return new Response(JSON.stringify({ error: "Yetkisiz" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!db) {
    return new Response(JSON.stringify({ users: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await db
    .prepare("SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at DESC")
    .all();

  const users = (result.results || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    role: r.role,
    createdAt: r.created_at,
  }));

  return new Response(JSON.stringify({ users }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
