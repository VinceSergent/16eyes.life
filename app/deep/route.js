// /deep: the room behind "go deeper". Signed-in visitors get the room; everyone else gets the password door.
// Both pages are plain HTML files kept outside public/, so they can't be fetched without passing through here.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAuthed, noStore } from "../../lib/deep.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const file = isAuthed(request) ? "room.html" : "enter.html";
  const html = await readFile(path.join(process.cwd(), "deep", file), "utf8");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...noStore } });
}
