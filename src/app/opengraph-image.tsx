import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Chatterbox — Fast, Clean Team Communication";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #635bff 0%, #4f46e5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 90px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "52px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              background: "white",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
              <rect x="6" y="7" width="20" height="13" rx="3" fill="#635bff"/>
              <path d="M10 20L10 25L15 20Z" fill="#635bff"/>
              <circle cx="11.5" cy="13.5" r="1.5" fill="white"/>
              <circle cx="16" cy="13.5" r="1.5" fill="white"/>
              <circle cx="20.5" cy="13.5" r="1.5" fill="white"/>
            </svg>
          </div>
          <span
            style={{
              color: "white",
              fontSize: "30px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
              opacity: 0.95,
            }}
          >
            Chatterbox
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: "white",
            fontSize: "68px",
            fontWeight: "800",
            lineHeight: 1.05,
            letterSpacing: "-2.5px",
            marginBottom: "28px",
            maxWidth: "880px",
          }}
        >
          Team communication,
          <br />
          done right.
        </div>

        {/* Subheadline */}
        <div
          style={{
            color: "rgba(255,255,255,0.78)",
            fontSize: "26px",
            fontWeight: "400",
            lineHeight: 1.5,
            maxWidth: "680px",
            marginBottom: "56px",
          }}
        >
          Channels, threads, DMs, file sharing, and video calls — all in one
          fast, beautiful workspace.
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "12px" }}>
          {["Channels", "Threads", "Direct Messages", "Video Calls", "File Sharing"].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "100px",
                  padding: "8px 18px",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: "500",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
