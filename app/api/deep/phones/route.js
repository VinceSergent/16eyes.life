// The phone list from the landing page, for Vince only: a count, or ?csv=1 to download it for Laylo.
import { isOwner, noStore } from "../../../../lib/deep.js";

const TEST = "+15555550100";   // the number used to test the phone, not a fan

async function signups() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("storage not configured");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["HGETALL", "line:signups"]),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) throw new Error(`redis ${res.status}`);
  const flat = data.result || [], rows = [];
  for (let i = 0; i < flat.length; i += 2) {
    if (flat[i] === TEST) continue;
    let r = {}; try { r = JSON.parse(flat[i + 1]); } catch {}
    rows.push({ phone: flat[i], joinedAt: r.joinedAt || "" });
  }
  return rows.sort((a, z) => a.joinedAt.localeCompare(z.joinedAt));
}

export async function GET(request) {
  if (!isOwner(request)) return Response.json({ ok: false }, { status: 401, headers: noStore });
  let rows;
  try { rows = await signups(); } catch { return Response.json({ ok: false, error: "storage" }, { status: 503, headers: noStore }); }
  if (new URL(request.url).searchParams.get("csv") === "1") {
    const csv = "phone,joined\n" + rows.map(r => `${r.phone},${r.joinedAt}`).join("\n") + "\n";
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="16eyes-phone-list.csv"', ...noStore } });
  }
  return Response.json({ ok: true, count: rows.length }, { headers: noStore });
}
