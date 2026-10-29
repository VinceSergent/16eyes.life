// Lists what Vince has uploaded for the room, grouped by folder (tracks, photos, bts, ...).
// The "door" folder is left out: it only comes back from the door, with the right code.
import { list, del } from "@vercel/blob";
import { KINDS, noStore, isOwner } from "../../../../lib/deep.js";

export const dynamic = "force-dynamic";

async function all() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: "deep/", cursor, limit: 1000 });
    blobs.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

export async function GET(request) {
  const media = Object.fromEntries(KINDS.filter(k => k !== "door").map(k => [k, []]));
  const admin = new URL(request.url).searchParams.get("all") === "1" && isOwner(request);
  if (admin) media.door = [];
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ ok: true, storage: false, media }, { headers: noStore });
  try {
    for (const b of (await all()).sort((a, z) => a.pathname.localeCompare(z.pathname))) {
      const kind = b.pathname.split("/")[1];
      if (!media[kind]) continue;
      media[kind].push({ url: b.url, name: b.pathname.split("/").pop(), size: b.size, uploadedAt: b.uploadedAt });
    }
  } catch (err) {
    console.error("media list failed", err);
    return Response.json({ ok: false, error: "storage" }, { status: 503, headers: noStore });
  }
  return Response.json({ ok: true, storage: true, media }, { headers: noStore });
}

export async function DELETE(request) {
  if (!isOwner(request)) return Response.json({ ok: false }, { status: 401, headers: noStore });
  const { url } = await request.json().catch(() => ({}));
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN || !new URL(url).pathname.startsWith("/deep/")) return Response.json({ ok: false }, { status: 400, headers: noStore });
  await del(url);
  return Response.json({ ok: true }, { headers: noStore });
}
