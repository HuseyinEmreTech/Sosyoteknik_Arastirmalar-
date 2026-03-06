import * as jose from "jose";

export type UserRole = "super_admin" | "admin" | "member";

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

const JWT_ALG = "HS256";
const COOKIE_NAME = "auth_token";

export function getAuthCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function createToken(
  payload: Omit<JWTPayload, "exp" | "iat">,
  secret: string,
  expiresIn = "7d"
): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

export function createAuthCookie(token: string, maxAge = 60 * 60 * 24 * 7): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function createClearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}
