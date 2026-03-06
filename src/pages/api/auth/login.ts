import type { APIRoute } from "astro";
import { hashPassword, verifyPassword } from "../../../lib/hash";
import { createToken, createAuthCookie } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";
  const db = env.DB;

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
    return new Response(JSON.stringify({ error: "E-posta ve şifre gerekli" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await db
    .prepare("SELECT id, email, password_hash, display_name, role FROM users WHERE email = ?")
    .bind(email.toLowerCase().trim())
    .first<{ id: string; email: string; password_hash: string; display_name: string; role: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return new Response(JSON.stringify({ error: "E-posta veya şifre hatalı" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const role = user.role as "super_admin" | "admin" | "member";
  if (role !== "super_admin" && role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin paneline erişim yetkiniz yok" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await createToken({
    sub: user.id,
    email: user.email,
    role,
  }, secret);

  const cookie = createAuthCookie(token);

  return new Response(
    JSON.stringify({ success: true, user: { id: user.id, email: user.email, displayName: user.display_name, role } }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    }
  );
};
