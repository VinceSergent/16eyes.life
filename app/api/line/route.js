// The phone on the landing page posts here. Every number is saved to the site's Upstash Redis
// (hash "line:signups", keyed by number) so it can be exported to Laylo later. If LAYLO_API_KEY
// is ever set (Laylo Pro), the number is also sent straight to Laylo.

const CONSENT = "I agree to get texts from 16eyes about music, drops and shows. Msg & data rates may apply. Reply STOP to opt out.";

function toE164(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15 && String(raw).trim().startsWith("+")) return `+${digits}`;
  return null;
}

async function redis(command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("storage not configured");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new Error(`redis ${res.status} ${data?.error ?? ""}`);
  return data.result;
}

async function sendToLaylo(phoneNumber, ipAddress) {
  const key = process.env.LAYLO_API_KEY;
  if (!key) return;
  const res = await fetch("https://laylo.com/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query: "mutation($phoneNumber: String, $ipAddress: String) { subscribeToUser(phoneNumber: $phoneNumber, ipAddress: $ipAddress) }",
      variables: { phoneNumber, ipAddress },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.errors) console.error("laylo subscribe failed", res.status, JSON.stringify(data?.errors ?? data));
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "bad_request" }, { status: 400 }); }
  if (body?.agree !== true) return Response.json({ ok: false, error: "no_consent" }, { status: 400 });
  const phone = toE164(body?.phone);
  if (!phone) return Response.json({ ok: false, error: "bad_number" }, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || undefined;
  const record = { phone, joinedAt: new Date().toISOString(), consent: CONSENT, source: "16eyes.life phone" };
  try {
    await redis(["HSETNX", "line:signups", phone, JSON.stringify(record)]);   // keep the first sign-up if they join twice
  } catch (err) {
    console.error("saving number failed", err);
    return Response.json({ ok: false, error: "storage" }, { status: 503 });
  }
  await sendToLaylo(phone, ip).catch(err => console.error("laylo subscribe error", err));
  return Response.json({ ok: true });
}
