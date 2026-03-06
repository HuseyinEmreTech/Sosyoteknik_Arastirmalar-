import type { APIRoute } from "astro";
import { hashPassword } from "../../lib/hash";

export const prerender = false;

/**
 * Tek seferlik kurulum - ilk Super Admin oluşturur.
 * Sadece users tablosu boşken çalışır.
 * Production'da ENABLE_SETUP=false yapın veya bu endpoint'i kaldırın.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const enableSetup = (env as Record<string, string>).ENABLE_SETUP !== "false";

  if (!enableSetup) {
    return new Response(JSON.stringify({ error: "Kurulum devre dışı" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!db) {
    return new Response(JSON.stringify({ error: "Veritabanı bağlantısı yok" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz istek" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, password, displayName } = body;
  if (!email || !password || !displayName) {
    return new Response(
      JSON.stringify({ error: "E-posta, şifre ve görünen ad gerekli" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: "Şifre en az 8 karakter olmalı" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const existing = await db.prepare("SELECT 1 FROM users LIMIT 1").first();
  if (existing) {
    return new Response(
      JSON.stringify({ error: "Kurulum zaten yapılmış. Kullanıcı mevcut." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const emailClean = email.toLowerCase().trim();

  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, 'super_admin')"
    )
    .bind(id, emailClean, passwordHash, displayName.trim())
    .run();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Super Admin oluşturuldu. Artık giriş yapabilirsiniz.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
