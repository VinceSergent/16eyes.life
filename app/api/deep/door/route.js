// The locked door inside the room. Right code: send back what's behind it (anything uploaded to the "door" folder).
import { list } from "@vercel/blob";
import { checkDoorCode, isAuthed, tooManyTries, noStore } from "../../../../lib/deep.js";

export async function POST(request) {
  if (!isAuthed(request)) return Response.json({ ok: false }, { status: 401, headers: noStore });
  if (await tooManyTries(request, "door")) return Response.json({ ok: false, error: "slow_down" }, { status: 429, headers: noStore });
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400, headers: noStore }); }
  if (!checkDoorCode(body?.code)) return Response.json({ ok: false, error: "wrong" }, { status: 401, headers: noStore });
  let items = [];
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try { items = (await list({ prefix: "deep/door/", limit: 100 })).blobs.map(b => ({ url: b.url, name: b.pathname.split("/").pop() })); }
    catch (err) { console.error("door list failed", err); }
  }
  return Response.json({ ok: true, items }, { headers: noStore });
}
