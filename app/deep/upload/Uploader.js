"use client";

// Vince's upload page for the room: pick where a file goes, drop it in, done.
import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";

const PLACES = [
  ["tracks", "CD player", "Songs (mp3, wav, m4a). They play in name order."],
  ["photos", "Photo book", "Photos."],
  ["bts", "Photo book: BTS", "Behind-the-scenes photos and videos."],
  ["voicemail", "Answering machine", "Snippets and voice notes (audio)."],
  ["tv", "CRT TV", "Videos. Each one becomes a channel."],
  ["notebook", "Notebook", "Scans or photos of lyrics and scribbles."],
  ["stems", "Studio desk", "Stems of one song (drums, bass, vocals...), same length."],
  ["door", "Behind the locked door", "Anything. Only shows after the door code."],
];

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const s = {
  page: { minHeight: "100vh", background: "#000", color: "#eee", fontFamily: font, padding: "40px 16px 80px", boxSizing: "border-box" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  h1: { fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "0 0 4px" },
  small: { fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#888" },
  card: { border: "1px solid #333", padding: 16, marginTop: 14 },
  row: { display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" },
  btn: { background: "#fff", color: "#000", border: 0, padding: "9px 14px", fontFamily: font, fontWeight: 700, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" },
  ghost: { background: "none", color: "#888", border: "1px solid #444", padding: "4px 8px", fontFamily: font, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" },
  file: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, padding: "6px 0", borderTop: "1px solid #1c1c1c" },
};

function Place({ kind, title, help, files, onDone, storage }) {
  const input = useRef(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function send(list) {
    setErr("");
    for (const file of list) {
      try {
        setBusy(`${file.name} 0%`);
        await upload(`deep/${kind}/${file.name}`, file, {
          access: "public", handleUploadUrl: "/api/deep/upload", multipart: file.size > 20e6,
          onUploadProgress: p => setBusy(`${file.name} ${Math.round(p.percentage)}%`),
        });
      } catch (e) { setErr(`${file.name}: ${e.message}`); }
    }
    setBusy(""); onDone();
  }

  async function remove(url) {
    if (!confirm("Remove this file from the room?")) return;
    await fetch("/api/deep/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    onDone();
  }

  return (
    <div style={s.card}>
      <div style={s.row}>
        <div><div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div><div style={{ ...s.small, textTransform: "none", letterSpacing: 0, marginTop: 4 }}>{help}</div></div>
        <button style={{ ...s.btn, opacity: storage ? 1 : .4 }} disabled={!storage || !!busy} onClick={() => input.current.click()}>{busy ? "Uploading…" : "Add files"}</button>
        <input ref={input} type="file" multiple hidden accept="image/*,video/*,audio/*,application/pdf"
          onChange={e => { const l = [...e.target.files]; e.target.value = ""; if (l.length) send(l); }} />
      </div>
      {busy && <div style={{ ...s.small, marginTop: 10 }}>{busy}</div>}
      {err && <div style={{ color: "#fff", marginTop: 10, fontSize: 13 }}>Couldn't upload {err}</div>}
      {files?.length > 0 && <div style={{ marginTop: 12 }}>
        {files.map(f => <div key={f.url} style={s.file}>
          <a href={f.url} target="_blank" rel="noreferrer" style={{ color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</a>
          <button style={s.ghost} onClick={() => remove(f.url)}>Remove</button>
        </div>)}
      </div>}
    </div>
  );
}

export default function Uploader() {
  const [data, setData] = useState(null);
  const load = useCallback(() => fetch("/api/deep/media?all=1", { cache: "no-store" }).then(r => r.json()).then(setData).catch(() => setData({ ok: false })), []);
  useEffect(() => { load(); }, [load]);
  const storage = data?.storage;
  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <div style={s.small}><a href="/deep" style={{ color: "#888" }}>← back to the room</a></div>
        <h1 style={{ ...s.h1, marginTop: 18 }}>Fill the room</h1>
        <div style={s.small}>Only people with the password can see this page.</div>
        {data && !storage && <div style={{ ...s.card, borderColor: "#fff" }}>File storage isn't switched on yet, so uploads are off. Until then the room shows placeholders.</div>}
        {PLACES.map(([kind, title, help]) => <Place key={kind} kind={kind} title={title} help={help} files={data?.media?.[kind]} onDone={load} storage={storage} />)}
      </div>
    </main>
  );
}
