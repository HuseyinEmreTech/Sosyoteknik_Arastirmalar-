import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;

  if (!db) {
    return new Response(JSON.stringify({ authors: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await db
    .prepare(
      `SELECT u.id, u.display_name, u.avatar_url,
              (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.published = 1) as post_count
       FROM users u
       WHERE EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND p.published = 1)
       ORDER BY post_count DESC`
    )
    .all();

  const authors = (result.results || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    postCount: r.post_count ?? 0,
  }));

  return new Response(JSON.stringify({ authors }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
