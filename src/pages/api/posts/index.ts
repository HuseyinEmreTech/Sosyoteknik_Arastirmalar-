import type { APIRoute } from "astro";
import { getAuthCookie, verifyToken, isAdmin } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const url = new URL(request.url);
  const publishedOnly = url.searchParams.get("published") !== "false";

  if (!db) {
    return new Response(JSON.stringify({ error: "Veritabanı bağlantısı yok" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let query = `
    SELECT p.id, p.slug, p.title, p.excerpt, p.cover_image_url, p.view_count, p.published, p.published_at, p.created_at,
           u.display_name as author_name, u.id as author_id
    FROM posts p
    JOIN users u ON p.author_id = u.id
  `;
  const params: string[] = [];

  const token = getAuthCookie(request);
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";
  const payload = token ? await verifyToken(token, secret) : null;
  const canSeeDrafts = payload && isAdmin(payload.role as "super_admin" | "admin" | "member");

  if (publishedOnly && !canSeeDrafts) {
    query += " WHERE p.published = 1";
  }

  query += " ORDER BY p.created_at DESC";

  const result = await db.prepare(query).bind(...params).all();

  const posts = (result.results || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    coverImageUrl: r.cover_image_url,
    viewCount: r.view_count ?? 0,
    published: !!r.published,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    authorName: r.author_name,
    authorId: r.author_id,
  }));

  return new Response(JSON.stringify({ posts }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";

  const token = getAuthCookie(request);
  const payload = token ? await verifyToken(token, secret) : null;
  if (!payload || !isAdmin(payload.role as "super_admin" | "admin" | "member")) {
    return new Response(JSON.stringify({ error: "Yetkisiz" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!db) {
    return new Response(JSON.stringify({ error: "Veritabanı bağlantısı yok" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { title?: string; excerpt?: string; bodyMd?: string; slug?: string; coverImageUrl?: string; published?: boolean };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz istek" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { title, excerpt, bodyMd, slug, coverImageUrl, published } = body;
  if (!title || !bodyMd) {
    return new Response(JSON.stringify({ error: "Başlık ve içerik gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slugVal = (slug || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")).slice(0, 200);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const publishedVal = published ? 1 : 0;
  const publishedAt = published ? now : null;

  try {
    await db
      .prepare(
        `INSERT INTO posts (id, author_id, slug, title, excerpt, body_md, cover_image_url, published, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        payload.sub,
        slugVal,
        title.trim(),
        (excerpt || "").trim().slice(0, 500),
        bodyMd,
        (coverImageUrl || "").trim().slice(0, 500) || null,
        publishedVal,
        publishedAt,
        now,
        now
      )
      .run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return new Response(JSON.stringify({ error: "Bu slug zaten kullanılıyor" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw e;
  }

  return new Response(
    JSON.stringify({ success: true, id, slug: slugVal }),
    { status: 201, headers: { "Content-Type": "application/json" } }
  );
};
