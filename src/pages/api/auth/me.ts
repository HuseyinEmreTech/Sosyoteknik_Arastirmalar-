import type { APIRoute } from "astro";
import { getAuthCookie, verifyToken } from "../../../lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const secret = env.JWT_SECRET || "dev-secret-change-in-production";

  const token = getAuthCookie(request);
  if (!token) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await verifyToken(token, secret);
  if (!payload) {
    return new Response(JSON.stringify({ user: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
