import type { APIRoute } from "astro";
import { hashPassword } from "../../lib/hash";

export const prerender = false;

/**
 * Mevcut kullanıcının şifresini sıfırlar (ENABLE_SETUP=true iken).
 * Production'da ENABLE_SETUP=false yapın.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const enableSetup = (env as Record<string, string>).ENABLE_SETUP !== "false";

  if (!enableSetup) {
    return new Response(JSON.stringify({ error: "Şifre sıfırlama devre dışı" }), {
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

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Geçersiz istek" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email, password } = body;
  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "E-posta ve yeni şifre gerekli" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: "Şifre en az 8 karakter olmalı" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const emailClean = email.toLowerCase().trim();
  const user = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(emailClean)
    .first<{ id: string }>();

  if (!user) {
    return new Response(JSON.stringify({ error: "Kullanıcı bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const passwordHash = await hashPassword(password);
  await db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(passwordHash, user.id)
    .run();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Şifre güncellendi. Artık yeni şifre ile giriş yapabilirsiniz.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
