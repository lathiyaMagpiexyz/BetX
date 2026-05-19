import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LottoBlast — Discover New BSC Projects. Win Their Tokens.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(circle at 18% 12%, rgba(168, 65, 215, 0.35) 0%, transparent 55%)," +
            "radial-gradient(circle at 82% 88%, rgba(247, 73, 158, 0.32) 0%, transparent 50%)," +
            "linear-gradient(180deg, #0E0A15 0%, #1A0F26 100%)",
          color: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        {/* Top bar — brand + tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "16px",
                background:
                  "linear-gradient(135deg, #FFCB3D 0%, #F7499E 50%, #A841D7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "44px",
                fontWeight: 900,
                color: "#FFFFFF",
                boxShadow: "0 0 48px rgba(247, 73, 158, 0.55)",
              }}
            >
              L
            </div>
            <div
              style={{
                fontSize: "44px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                background:
                  "linear-gradient(90deg, #FFCB3D 0%, #F7499E 50%, #A841D7 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              LottoBlast
            </div>
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              padding: "10px 22px",
              borderRadius: "999px",
              border: "1.5px solid rgba(247, 73, 158, 0.55)",
              background: "rgba(247, 73, 158, 0.12)",
              color: "#F7499E",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            On BSC
          </div>
        </div>

        {/* Headline + sub */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div
            style={{
              fontSize: "84px",
              fontWeight: 900,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              maxWidth: "1000px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ color: "#FFFFFF" }}>Discover New BSC Projects.</span>
            <span
              style={{
                background:
                  "linear-gradient(90deg, #FFCB3D 0%, #F7499E 50%, #A841D7 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Win Their Tokens.
            </span>
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.72)",
              maxWidth: "900px",
              lineHeight: 1.4,
            }}
          >
            Pay USDT to enter. Win project tokens on-chain when entries close.
            No middleman, no &ldquo;DM the winner.&rdquo;
          </div>
        </div>

        {/* Bottom bar — proof points */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "40px",
            fontSize: "22px",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.65)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#FFCB3D" }}>●</span> Verified contracts
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#F7499E" }}>●</span> On-chain payouts
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#A841D7" }}>●</span> Curated BSC projects
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
