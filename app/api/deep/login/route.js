import { checkPassword, passwordIsSet, sessionCookie, tooManyTries, noStore, COOKIE } from "../../../../lib/deep.js";
import { cookies } from "next/headers";

export async function POST(request) {
  if (!passwordIsSet()) return Response.json({ ok: false, error: "not_ready" }, { status: 503, headers: noStore });
  if (await tooManyTries(request, "login")) return Response.json({ ok: false, error: "slow_down" }, { status: 429, headers: noStore });
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "bad_request" }, { status: 400, headers: noStore }); }
  if (!checkPassword(body?.password)) {
    await new Promise(r => setTimeout(r, 600));
    return Response.json({ ok: false, error: "wrong" }, { status: 401, headers: noStore });
  }
  (await cookies()).set(sessionCookie());
  return Response.json({ ok: true }, { headers: noStore });
}

export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return Response.json({ ok: true }, { headers: noStore });
}
