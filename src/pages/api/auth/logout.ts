import type { APIRoute } from "astro";
import { createClearAuthCookie } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": createClearAuthCookie(),
    },
  });
};
