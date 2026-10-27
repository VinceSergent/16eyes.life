// The phone on the landing page posts here; the number goes to Laylo, which handles the texting.
// Needs LAYLO_API_KEY (Laylo > Settings > Integrations > API Keyring) set in Vercel.

const LAYLO_URL = "https://laylo.com/api/graphql";

function toE164(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15 && String(raw).trim().startsWith("+")) return `+${digits}`;
  return null;
}

export async function POST(request) {
  const key = process.env.LAYLO_API_KEY;
  if (!key) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  if (body?.agree !== true) return Response.json({ ok: false, error: "no_consent" }, { status: 400 });
  const phoneNumber = toE164(body?.phone);
  if (!phoneNumber) return Response.json({ ok: false, error: "bad_number" }, { status: 400 });

  const ipAddress = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || undefined;
  try {
    const res = await fetch(LAYLO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query: "mutation($phoneNumber: String, $ipAddress: String) { subscribeToUser(phoneNumber: $phoneNumber, ipAddress: $ipAddress) }",
        variables: { phoneNumber, ipAddress },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.errors || data?.data?.subscribeToUser !== true) {
      console.error("laylo subscribe failed", res.status, JSON.stringify(data?.errors ?? data));
      return Response.json({ ok: false, error: "upstream" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("laylo subscribe error", err);
    return Response.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
