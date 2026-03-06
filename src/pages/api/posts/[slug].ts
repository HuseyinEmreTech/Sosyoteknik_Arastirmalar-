import type { APIRoute } from "astro";
import { getAuthCookie, verifyToken, isAdmin } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const slug = params.slug;

  if (!db || !slug) {
    return new Response(JSON.stringify({ error: "Bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = getAuthCookie(request);
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";
  const payload = token ? await verifyToken(token, secret) : null;
  const canSeeDraft = payload && isAdmin(payload.role as "super_admin" | "admin" | "member");

  let row = await db
    .prepare(
      `SELECT p.*, u.display_name as author_name, u.avatar_url as author_avatar
       FROM posts p JOIN users u ON p.author_id = u.id WHERE p.slug = ?`
    )
    .bind(slug)
    .first<{
      id: string;
      slug: string;
      title: string;
      excerpt: string;
      body_md: string;
      cover_image_url: string | null;
      view_count: number;
      published: number;
      published_at: number | null;
      created_at: number;
      author_id: string;
      author_name: string;
      author_avatar: string | null;
    }>();

  if (!row) {
    return new Response(JSON.stringify({ error: "Yazı bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!row.published && !canSeeDraft) {
    return new Response(JSON.stringify({ error: "Yazı bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      post: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        bodyMd: row.body_md,
        coverImageUrl: row.cover_image_url,
        viewCount: row.view_count ?? 0,
        published: !!row.published,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const slug = params.slug;
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";

  const token = getAuthCookie(request);
  const payload = token ? await verifyToken(token, secret) : null;
  if (!payload || !isAdmin(payload.role as "super_admin" | "admin" | "member")) {
    return new Response(JSON.stringify({ error: "Yetkisiz" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!db || !slug) {
    return new Response(JSON.stringify({ error: "Bulunamadı" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  let body: { title?: string; excerpt?: string; bodyMd?: string; coverImageUrl?: string; published?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz istek" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { title, excerpt, bodyMd, coverImageUrl, published } = body;
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE posts SET title = ?, excerpt = ?, body_md = ?, cover_image_url = ?, published = ?, published_at = CASE WHEN ? = 1 AND published = 0 THEN ? ELSE published_at END, updated_at = ?
       WHERE slug = ? AND author_id = ?`
    )
    .bind(
      title ?? "",
      excerpt ?? "",
      bodyMd ?? "",
      (coverImageUrl ?? "").trim().slice(0, 500) || null,
      published ? 1 : 0,
      published ? 1 : 0,
      now,
      now,
      slug,
      payload.sub
    )
    .run();

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const slug = params.slug;
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";

  const token = getAuthCookie(request);
  const payload = token ? await verifyToken(token, secret) : null;
  const isSA = payload?.role === "super_admin";
  if (!payload || (!isAdmin(payload.role as "super_admin" | "admin" | "member") && !isSA)) {
    return new Response(JSON.stringify({ error: "Yetkisiz" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!db || !slug) {
    return new Response(JSON.stringify({ error: "Bulunamadı" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  if (isSA) {
    await db.prepare("DELETE FROM posts WHERE slug = ?").bind(slug).run();
  } else {
    await db.prepare("DELETE FROM posts WHERE slug = ? AND author_id = ?").bind(slug, payload.sub).run();
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};
