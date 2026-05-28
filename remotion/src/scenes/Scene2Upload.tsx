import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * Scene 2 — Replicates the actual GradeEssay page upload UI.
 * Shows: top navbar with Compify.Pro branding, sidebar with recent essays,
 * main area with title/subject inputs, drag-drop zone with file type badges.
 */
const recentEssays = [
  { title: "人工智能", score: 68, date: "4/1/2026" },
  { title: "香港仔避風塘", score: 78, date: "4/1/2026" },
  { title: "香港仔避風塘", score: 85, date: "4/1/2026" },
];

export const Scene2Upload: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const navOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sidebarOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const formOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dropzoneScale = spring({ frame: frame - 40, fps, config: { damping: 15, stiffness: 100 } });
  const dropzoneOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // File appearing animation
  const fileTypes = ["PDF", "DOCX", "Images (OCR)", "ZIP", "TXT / MD"];

  return (
    <AbsoluteFill
      style={{
        background: "hsl(210 20% 98%)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Top navbar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          borderBottom: "1px solid hsl(214 32% 91%)",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          opacity: navOpacity,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20, color: "hsl(215 16% 47%)", cursor: "pointer" }}>←</div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%), hsl(16 90% 58%))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>C</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "hsl(222 47% 11%)" }}>Compify.Pro</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 999,
              background: "hsl(210 40% 96%)",
              color: "hsl(222 47% 11%)",
              fontWeight: 500,
            }}
          >
            4 / 5 this month
          </span>
          <span style={{ fontSize: 14, color: "hsl(215 16% 47%)" }}>English</span>
          <span style={{ fontSize: 14, color: "hsl(215 16% 47%)" }}>user@email.com</span>
        </div>
      </div>

      {/* Sidebar — Recent Essays */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          width: 280,
          bottom: 0,
          padding: 24,
          opacity: sidebarOpacity,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "hsl(215 16% 47%)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 12,
          }}
        >
          Recent Essays
        </p>
        {recentEssays.map((essay, i) => {
          const delay = 15 + i * 8;
          const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid hsl(214 32% 91%)",
                background: "white",
                marginBottom: 8,
                opacity,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: "hsl(215 16% 47%)" }}>📄</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "hsl(222 47% 11%)" }}>{essay.title}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: essay.score >= 80 ? "hsl(152 69% 41%)" : essay.score >= 60 ? "hsl(16 90% 58%)" : "hsl(0 84% 60%)",
                  }}
                >
                  {essay.score}/100
                </span>
                <span style={{ fontSize: 12, color: "hsl(215 16% 47%)" }}>{essay.date}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content area */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 280,
          right: 0,
          padding: "40px 60px",
          opacity: formOpacity,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "hsl(222 47% 11%)", margin: 0 }}>Grade an Essay</h1>
        <p style={{ fontSize: 16, color: "hsl(215 16% 47%)", marginTop: 4, marginBottom: 24 }}>
          Paste text, or drag & drop files to receive AI-powered feedback.
        </p>

        {/* Title / Subject inputs */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "hsl(222 47% 11%)", marginBottom: 6 }}>
              Title (optional)
            </p>
            <div
              style={{
                height: 44,
                borderRadius: 10,
                border: "1px solid hsl(214 32% 91%)",
                background: "white",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
              }}
            >
              <span style={{ fontSize: 14, color: "hsl(215 16% 67%)" }}>Essay title</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "hsl(222 47% 11%)", marginBottom: 6 }}>
              Subject (optional)
            </p>
            <div
              style={{
                height: 44,
                borderRadius: 10,
                border: "1px solid hsl(214 32% 91%)",
                background: "white",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
              }}
            >
              <span style={{ fontSize: 14, color: "hsl(215 16% 67%)" }}>e.g. English Literature</span>
            </div>
          </div>
        </div>

        {/* Drag & drop zone */}
        <div
          style={{
            marginTop: 20,
            borderRadius: 16,
            border: "2px dashed hsl(214 32% 85%)",
            background: "white",
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: dropzoneOpacity,
            transform: `scale(${interpolate(dropzoneScale, [0, 1], [0.95, 1])})`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(215, 16%, 67%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontSize: 16, fontWeight: 500, color: "hsl(222 47% 11%)", margin: 0 }}>
            Drag & drop files here
          </p>
          <p style={{ fontSize: 13, color: "hsl(215 16% 67%)", margin: 0 }}>or click to browse</p>

          {/* File type badges */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {fileTypes.map((type, i) => {
              const delay = 55 + i * 6;
              const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    opacity,
                  }}
                >
                  <span style={{ fontSize: 12, color: "hsl(215 16% 47%)" }}>📄</span>
                  <span style={{ fontSize: 13, color: "hsl(215 16% 47%)" }}>{type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
