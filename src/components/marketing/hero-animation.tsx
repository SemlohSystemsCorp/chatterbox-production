"use client";

import { useEffect, useState } from "react";

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function HeroAnimation() {
  const dark = useDarkMode();

  const c = dark ? {
    titleBar:    "#16181d",
    titleBorder: "#2a2d35",
    urlBar:      "#1e2128",
    urlText:     "#5a5f6e",
    urlBorder:   "#2a2d35",
    sidebar:     "#111318",
    sidebarBorder: "#1e2128",
    sidebarLabel: "rgba(255,255,255,0.28)",
    sidebarText:  "rgba(255,255,255,0.45)",
    sidebarActive: "rgba(255,255,255,0.08)",
    sidebarActiveText: "#fff",
    orgName:     "#e8e8ed",
    chat:        "#1a1d21",
    chatBorder:  "#2a2d35",
    headerBg:    "#1a1d21",
    name:        "#e8e8ed",
    meta:        "#5a5f6e",
    msg:         "#b5b9c4",
    input:       "#222529",
    inputBorder: "#2a2d35",
    inputText:   "#5a5f6e",
    threadLink:  "#7b73ff",
  } : {
    titleBar:    "#f6f9fc",
    titleBorder: "#e1e4e8",
    urlBar:      "#fff",
    urlText:     "#8898aa",
    urlBorder:   "#e1e4e8",
    sidebar:     "#0a2540",
    sidebarBorder: "rgba(255,255,255,0.08)",
    sidebarLabel: "rgba(255,255,255,0.35)",
    sidebarText:  "rgba(255,255,255,0.55)",
    sidebarActive: "rgba(255,255,255,0.10)",
    sidebarActiveText: "#fff",
    orgName:     "#fff",
    chat:        "#fff",
    chatBorder:  "#e1e4e8",
    headerBg:    "#fff",
    name:        "#0a2540",
    meta:        "#8898aa",
    msg:         "#425466",
    input:       "#fff",
    inputBorder: "#e1e4e8",
    inputText:   "#8898aa",
    threadLink:  "#635bff",
  };

  return (
    <div
      style={{
        width: 560,
        maxWidth: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${c.chatBorder}`,
        boxShadow: dark
          ? "0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)"
          : "0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        background: c.chat,
        fontFamily: "inherit",
        flexShrink: 0,
      }}
    >
      {/* Title bar */}
      <div style={{ background: c.titleBar, borderBottom: `1px solid ${c.titleBorder}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <div style={{ flex: 1, margin: "0 8px", background: c.urlBar, border: `1px solid ${c.urlBorder}`, borderRadius: 6, padding: "3px 10px", fontSize: 11, color: c.urlText, textAlign: "center" }}>
          app.chatterbox.io
        </div>
      </div>

      {/* App shell */}
      <div style={{ display: "flex", height: 380 }}>

        {/* Sidebar */}
        <div style={{ width: 200, background: c.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: `1px solid ${c.sidebarBorder}` }}>
          {/* Org name */}
          <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${c.sidebarBorder}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.orgName, marginBottom: 1 }}>Acme Corp</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ecf8e" }} />
              <span style={{ fontSize: 10, color: c.sidebarLabel }}>4 online</span>
            </div>
          </div>

          {/* Channels */}
          <div style={{ padding: "10px 0", flex: 1 }}>
            <div style={{ padding: "2px 14px 6px", fontSize: 10, fontWeight: 600, color: c.sidebarLabel, letterSpacing: "0.06em", textTransform: "uppercase" }}>Channels</div>
            {[
              { name: "general",     active: true,  unread: 0 },
              { name: "engineering", active: false, unread: 3 },
              { name: "design",      active: false, unread: 0 },
              { name: "marketing",   active: false, unread: 0 },
            ].map(ch => (
              <div
                key={ch.name}
                style={{
                  padding: "5px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: ch.active ? c.sidebarActive : "transparent",
                  borderRadius: ch.active ? "0 8px 8px 0" : 0,
                  marginRight: ch.active ? 8 : 0,
                }}
              >
                <span style={{ fontSize: 12, color: ch.active ? c.sidebarActiveText : c.sidebarText, fontWeight: ch.active ? 600 : 400 }}>
                  # {ch.name}
                </span>
                {ch.unread > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#635bff", color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{ch.unread}</span>
                )}
              </div>
            ))}

            <div style={{ padding: "8px 14px 6px", marginTop: 4, fontSize: 10, fontWeight: 600, color: c.sidebarLabel, letterSpacing: "0.06em", textTransform: "uppercase" }}>Direct messages</div>
            {[
              { name: "Alex Chen", color: "#635bff", online: true  },
              { name: "Sarah Kim", color: "#3ecf8e", online: true  },
              { name: "Jordan",    color: "#f59e0b", online: false },
            ].map(dm => (
              <div key={dm.name} style={{ padding: "4px 14px", display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${dm.color}33`, border: `1.5px solid ${dm.color}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: dm.color }}>
                    {dm.name[0]}
                  </div>
                  {dm.online && <div style={{ position: "absolute", bottom: -1, right: -1, width: 6, height: 6, borderRadius: "50%", background: "#3ecf8e", border: `1.5px solid ${c.sidebar}` }} />}
                </div>
                <span style={{ fontSize: 11, color: c.sidebarText }}>{dm.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: c.chat, minWidth: 0 }}>
          {/* Channel header */}
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${c.chatBorder}`, background: c.headerBg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.name }}># general</span>
              <span style={{ fontSize: 11, color: c.meta }}>·</span>
              <span style={{ fontSize: 11, color: c.meta }}>Team announcements</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {["#635bff", "#3ecf8e", "#f59e0b"].map((col, i) => (
                <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: `${col}33`, border: `1.5px solid ${col}88`, marginLeft: i > 0 ? -6 : 0 }} />
              ))}
              <span style={{ fontSize: 11, color: c.meta, marginLeft: 6 }}>4</span>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
            {[
              { av: "A", color: "#635bff", name: "Alex Chen", time: "9:41 AM", msg: "Morning team! 👋 The new release just went live on prod.",         thread: null },
              { av: "S", color: "#3ecf8e", name: "Sarah Kim", time: "9:43 AM", msg: "Response times are down 40% from last week 🚀",                    thread: "3 replies" },
              { av: "J", color: "#f59e0b", name: "Jordan",    time: "9:47 AM", msg: "Nice! Let's sync at 2pm to go over the backlog. I'll set up a call.", thread: null },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${m.color}22`, border: `1.5px solid ${m.color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: m.color, flexShrink: 0 }}>
                  {m.av}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.name }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: c.meta }}>{m.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: c.msg, margin: 0, lineHeight: 1.5 }}>{m.msg}</p>
                  {m.thread && (
                    <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: c.threadLink, fontWeight: 500 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {m.thread}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30 }} />
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c.meta, opacity: 0.5 }} />)}
              </div>
              <span style={{ fontSize: 11, color: c.meta }}>Maya is typing…</span>
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ border: `1px solid ${c.inputBorder}`, background: c.input, borderRadius: 8, padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: c.inputText }}>Message # general</span>
              <div style={{ display: "flex", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.meta} strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.meta} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" strokeLinecap="round" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
