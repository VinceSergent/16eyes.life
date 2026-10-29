// /deep: the room behind "go deeper", open to everyone.
// The page is a plain HTML file kept outside public/, so the owner-only link can be taken out on the way.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isOwner, noStore } from "../../lib/deep.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  let html = await readFile(path.join(process.cwd(), "deep", "room.html"), "utf8");
  // the "fill the room" link is only for Vince
  if (!isOwner(request)) html = html.replace(/<a class="hud" id="fill"[^>]*>[^<]*<\/a>/, "");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...noStore } });
}
