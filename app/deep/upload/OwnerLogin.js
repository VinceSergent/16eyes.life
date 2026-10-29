"use client";

// The upload page asks for the owner password, so only Vince can fill the room.
import { useState } from "react";

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const s = {
  page: { minHeight: "100vh", background: "#000", color: "#eee", fontFamily: font, display: "grid", placeItems: "center", padding: 16, boxSizing: "border-box" },
  box: { width: "min(360px, 100%)", display: "grid", gap: 14 },
  small: { fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "#888" },
  input: { background: "transparent", border: 0, borderBottom: "1px solid #555", color: "#fff", padding: "10px 2px", fontFamily: font, fontSize: 18, outline: "none" },
  btn: { background: "#fff", color: "#000", border: 0, padding: "10px 14px", fontFamily: font, fontWeight: 700, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer" },
  back: { color: "#888", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", textDecoration: "none" },
};

export default function OwnerLogin({ ready }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function go(e) {
    e.preventDefault();
    if (!pw) return;
    setMsg("...");
    const r = await fetch("/api/deep/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) }).catch(() => null);
    if (r && r.ok) return location.reload();
    setMsg(r && r.status === 429 ? "too many tries. wait a few minutes." : "wrong.");
    setPw("");
  }
  return (
    <main style={s.page}>
      <div style={s.box}>
        <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: "-.02em" }}>fill the room</div>
        {ready ? (
          <form onSubmit={go} style={{ display: "grid", gap: 14 }}>
            <div style={s.small}>owner password</div>
            <input style={s.input} type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" autoFocus />
            <button style={s.btn} type="submit">unlock</button>
            <div style={s.small} role="status">{msg}</div>
          </form>
        ) : (
          <div style={s.small}>uploads are locked until the owner password is set on vercel (DEEP_OWNER_PASSWORD).</div>
        )}
        <a href="/deep" style={s.back}>← back to the room</a>
      </div>
    </main>
  );
}
