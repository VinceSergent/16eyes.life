// The owner key for the upload page: right owner password, and the browser gets a signed owner cookie.
import { cookies } from "next/headers";
import { isAuthed, checkOwnerPassword, ownerPasswordIsSet, ownerCookie, tooManyTries, noStore, OWNER_COOKIE } from "../../../../lib/deep.js";

export async function POST(request) {
  if (!isAuthed(request)) return Response.json({ ok: false }, { status: 401, headers: noStore });
  if (!ownerPasswordIsSet()) return Response.json({ ok: false, error: "not_ready" }, { status: 503, headers: noStore });
  if (await tooManyTries(request, "owner")) return Response.json({ ok: false, error: "slow_down" }, { status: 429, headers: noStore });
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400, headers: noStore }); }
  if (!checkOwnerPassword(body?.password)) {
    await new Promise(r => setTimeout(r, 600));
    return Response.json({ ok: false, error: "wrong" }, { status: 401, headers: noStore });
  }
  (await cookies()).set(ownerCookie());
  return Response.json({ ok: true }, { headers: noStore });
}

export async function DELETE() {
  (await cookies()).delete(OWNER_COOKIE);
  return Response.json({ ok: true }, { headers: noStore });
}
