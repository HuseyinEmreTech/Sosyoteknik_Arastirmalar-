import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const slug = params.slug;

  if (!db || !slug) {
    return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  await db
    .prepare("UPDATE posts SET view_count = view_count + 1 WHERE slug = ?")
    .bind(slug)
    .run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};
