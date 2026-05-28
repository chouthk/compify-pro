import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * Scene 4 — Replicates the GradeEssay result view with score, feedback, and export buttons.
 * Matches the actual result view: score circle, metadata, markdown feedback, PDF export button.
 */
export const Scene4Results: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scoreReveal = interpolate(frame, [20, 55], [0, 92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feedbackOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exportOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const feedbackLines = [
    { heading: "Overall Assessment", text: "This is a well-structured essay that demonstrates strong understanding of the topic. The arguments are logically organized with clear transitions between paragraphs." },
    { heading: "Content & Ideas (28/30)", text: "The thesis is clearly stated and supported with relevant evidence. The analysis shows depth of thinking, though some points could benefit from additional examples." },
    { heading: "Organization (18/20)", text: "Excellent paragraph structure with logical flow. Introduction effectively sets up the argument, and the conclusion provides meaningful closure." },
    { heading: "Language & Grammar (19/20)", text: "Very few grammatical errors. Vocabulary is varied and appropriate. Sentence structure shows good variety." },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "hsl(210 20% 98%)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Navbar */}
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, color: "hsl(215 16% 47%)" }}>←</span>
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
        <div style={{ display: "flex", gap: 8, opacity: exportOpacity }}>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid hsl(214 32% 91%)",
              background: "white",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>📥</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(222 47% 11%)" }}>PDF Report</span>
          </div>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid hsl(214 32% 91%)",
              background: "white",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13 }}>📄</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(222 47% 11%)" }}>DOC</span>
          </div>
        </div>
      </div>

      {/* Result content */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          padding: "40px 120px",
          display: "flex",
          gap: 40,
        }}
      >
        {/* Left: Score card */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
          }}
        >
          {/* Score circle */}
          <div
            style={{
              padding: 32,
              borderRadius: 16,
              border: "1px solid hsl(214 32% 91%)",
              background: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: `conic-gradient(hsl(152 69% 41%) ${scoreReveal * 3.6}deg, hsl(210 40% 96%) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 32, fontWeight: 800, color: "hsl(152 69% 41%)" }}>
                  {Math.round(scoreReveal)}
                </span>
                <span style={{ fontSize: 12, color: "hsl(215 16% 47%)" }}>/100</span>
              </div>
            </div>

            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "hsl(152 69% 41%)",
                padding: "4px 12px",
                borderRadius: 999,
                background: "hsl(152 69% 41% / 0.1)",
              }}
            >
              Excellent
            </span>

            {/* Metadata */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Title", value: "人工智能" },
                { label: "Subject", value: "Chinese Literature" },
                { label: "Words", value: "842" },
                { label: "Grade Level", value: "High School" },
              ].map((meta) => (
                <div key={meta.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "hsl(215 16% 47%)" }}>{meta.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(222 47% 11%)" }}>
                    {meta.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Feedback */}
        <div style={{ flex: 1, opacity: feedbackOpacity }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "hsl(222 47% 11%)", marginBottom: 20, marginTop: 0 }}>
            AI Feedback
          </h2>
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              border: "1px solid hsl(214 32% 91%)",
              background: "white",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {feedbackLines.map((section, i) => {
              const delay = 50 + i * 10;
              const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div key={i} style={{ opacity }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "hsl(234 89% 63%)", margin: "0 0 6px" }}>
                    {section.heading}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "hsl(222 47% 11%)", margin: 0 }}>
                    {section.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
