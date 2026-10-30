// Shared helpers for the "go deeper" room. The room is open to everyone; filling it needs the owner password
// (DEEP_OWNER_PASSWORD on Vercel, never in this repo). Unlocking sets an httpOnly cookie signed with a
// server-side secret (DEEP_SECRET, or the Upstash token that is already set), so it can't be faked in the browser.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE = 60 * 60 * 24 * 30;   // stay signed in for 30 days

// what Vince can upload, by folder in Blob storage
export const KINDS = ["tracks", "photos", "bts", "voicemail", "tv", "notebook", "stems", "door", "poster"];

function secret() {
  return process.env.DEEP_SECRET || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
}

const sha = s => createHash("sha256").update(String(s)).digest();
const sameText = (a, b) => timingSafeEqual(sha(a), sha(b));

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
  if (!ownerPasswordIsSet()) return false;
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
