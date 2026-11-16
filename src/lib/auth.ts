import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Role } from "./status";

const COOKIE = "alf_session";
const SESSION_DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** الجلسة: رمز عشوائي في كوكي httpOnly، وقاعدة البيانات تحفظ بصمته فقط. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export function homeFor(role: string) {
  return role === "ADMIN" ? "/admin" : role === "MERCHANT" ? "/merchant" : "/creator";
}

/** يتأكد إن المستخدم مسجل وله الدور المطلوب، وإلا يحوّله. */
export async function requireRole(...roles: Role[]) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role as Role)) redirect(homeFor(user.role));
  return user;
}

// حد بسيط لمحاولات الدخول (في الذاكرة، يكفي لخادم واحد)
const attempts = new Map<string, { n: number; until: number }>();
export function loginAllowed(key: string) {
  const a = attempts.get(key);
  return !a || a.until < Date.now() || a.n < 8;
}
export function loginFailed(key: string) {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { n: 1, until: Date.now() + 15 * 60_000 });
  else a.n++;
}
export const loginSucceeded = (key: string) => attempts.delete(key);
