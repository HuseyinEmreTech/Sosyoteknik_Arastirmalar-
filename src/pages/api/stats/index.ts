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
    return new Response(JSON.stringify({ totalPosts: 0, publishedPosts: 0, totalViews: 0, authorCount: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [totalRes, publishedRes, viewsRes, authorsRes] = await Promise.all([
    db.prepare("SELECT COUNT(*) as c FROM posts").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM posts WHERE published = 1").first<{ c: number }>(),
    db.prepare("SELECT COALESCE(SUM(view_count), 0) as v FROM posts").first<{ v: number }>(),
    db.prepare("SELECT COUNT(DISTINCT author_id) as c FROM posts WHERE published = 1").first<{ c: number }>(),
  ]);

  return new Response(
    JSON.stringify({
      totalPosts: totalRes?.c ?? 0,
      publishedPosts: publishedRes?.c ?? 0,
      totalViews: viewsRes?.v ?? 0,
      authorCount: authorsRes?.c ?? 0,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
