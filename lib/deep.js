// Shared helpers for the password-locked "go deeper" room.
// The password lives only in the DEEP_PASSWORD environment variable on Vercel, never in this repo.
// A successful login sets an httpOnly cookie signed with a server-side secret (DEEP_SECRET, or the
// Upstash token that is already set), so the room can't be opened by editing anything in the browser.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "deep";
const MAX_AGE = 60 * 60 * 24 * 30;   // stay signed in for 30 days

// what Vince can upload, by folder in Blob storage
export const KINDS = ["tracks", "photos", "bts", "voicemail", "tv", "notebook", "stems", "door"];

function secret() {
  return process.env.DEEP_SECRET || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
}

const sha = s => createHash("sha256").update(String(s)).digest();
const sameText = (a, b) => timingSafeEqual(sha(a), sha(b));

export function passwordIsSet() { return !!process.env.DEEP_PASSWORD && !!secret(); }

export function checkPassword(input) {
  const real = process.env.DEEP_PASSWORD;
  if (!real || !secret()) return false;
  return sameText(String(input || "").trim().toLowerCase(), real.trim().toLowerCase());
}

function sign(issued) { return createHmac("sha256", secret()).update(`deep-v1:${issued}`).digest("base64url"); }

export function sessionCookie() {
  const issued = Date.now();
  return { name: COOKIE, value: `${issued}.${sign(issued)}`, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE };
}

// accepts a Request, or the cookie store from next/headers
export function isAuthed(source) {
  if (!secret()) return false;
  const store = source?.cookies ?? source;
  const value = store?.get?.(COOKIE)?.value;
  if (!value) return false;
  const [issued, mac] = value.split(".");
  const n = Number(issued);
  if (!n || !mac || Date.now() - n > MAX_AGE * 1000) return false;
  return sameText(mac, sign(issued));
}

// Only Vince can fill the room: a second password, DEEP_OWNER_PASSWORD on Vercel, unlocks the upload page.
export const OWNER_COOKIE = "deep_owner";
export function ownerPasswordIsSet() { return !!process.env.DEEP_OWNER_PASSWORD && !!secret(); }
export function checkOwnerPassword(input) {
  const real = process.env.DEEP_OWNER_PASSWORD;
  if (!real || !secret()) return false;
  return sameText(String(input || "").trim(), real.trim());
}
const signOwner = issued => createHmac("sha256", secret()).update(`deep-owner-v1:${issued}`).digest("base64url");
export function ownerCookie() {
  const issued = Date.now();
  return { name: OWNER_COOKIE, value: `${issued}.${signOwner(issued)}`, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE };
}
export function isOwner(source) {
  if (!ownerPasswordIsSet() || !isAuthed(source)) return false;
  const store = source?.cookies ?? source;
  const [issued, mac] = (store?.get?.(OWNER_COOKIE)?.value || "").split(".");
  const n = Number(issued);
  if (!n || !mac || Date.now() - n > MAX_AGE * 1000) return false;
  return sameText(mac, signOwner(issued));
}

export function checkDoorCode(input) {
  // the code fans find on merch or in text drops; set DOOR_CODE on Vercel to change it
  const real = process.env.DOOR_CODE || "1616";
  return sameText(String(input || "").replace(/\D/g, ""), real.replace(/\D/g, ""));
}

export async function redis(command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return res.ok ? data?.result : null;
}

// a few wrong guesses are fine; a script guessing thousands is not
export async function tooManyTries(request, bucket) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const key = `deep:tries:${bucket}:${ip}`;
  try {
    const n = await redis(["INCR", key]);
    if (n === 1) await redis(["EXPIRE", key, 600]);
    return typeof n === "number" && n > 12;
  } catch { return false; }
}

export const noStore = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
