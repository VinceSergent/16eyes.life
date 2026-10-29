// /deep: the room behind "go deeper", open to everyone.
// The page is a plain HTML file kept outside public/.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { noStore } from "../../lib/deep.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const html = await readFile(path.join(process.cwd(), "deep", "room.html"), "utf8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...noStore } });
}
