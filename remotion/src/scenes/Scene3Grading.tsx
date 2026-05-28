import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * Scene 3 — Replicates the BatchGrade page during grading.
 * Shows the batch grading UI with progress bars, file list, and status indicators.
 */
const batchItems = [
  { name: "emma_watson_essay.pdf", student: "Emma Watson", words: 842, progress: 100, score: 92 },
  { name: "john_smith_essay.pdf", student: "John Smith", words: 651, progress: 100, score: 78 },
  { name: "sarah_chen_essay.pdf", student: "Sarah Chen", words: 923, progress: 85, score: null },
  { name: "michael_brown_essay.pdf", student: "Michael Brown", words: 710, progress: 45, score: null },
];

export const Scene3Grading: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
          2 / 50 this month
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 0,
          right: 0,
          padding: "40px 120px",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "hsl(222 47% 11%)", margin: 0 }}>Batch Grade</h1>
        <p style={{ fontSize: 16, color: "hsl(215 16% 47%)", marginTop: 4, marginBottom: 24 }}>
          Upload multiple essays and grade them all at once.
        </p>

        {/* Overall progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "hsl(222 47% 11%)" }}>
              Grading Progress
            </span>
            <span style={{ fontSize: 14, color: "hsl(215 16% 47%)" }}>
              {Math.round(interpolate(frame, [20, 140], [0, 75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 4,
              background: "hsl(210 40% 96%)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${interpolate(frame, [20, 140], [0, 75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                height: "100%",
                borderRadius: 4,
                background: "hsl(234 89% 63%)",
              }}
            />
          </div>
        </div>

        {/* File list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {batchItems.map((item, i) => {
            const delay = 10 + i * 12;
            const itemOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const progressStart = delay + 15;
            const currentProgress = interpolate(frame, [progressStart, progressStart + 50], [0, item.progress], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const isComplete = currentProgress >= 100;
            const isGrading = currentProgress > 0 && currentProgress < 100;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: "1px solid hsl(214 32% 91%)",
                  background: "white",
                  opacity: itemOpacity,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: isComplete
                        ? "hsl(152 69% 41% / 0.1)"
                        : "hsl(234 89% 63% / 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{isComplete ? "✅" : isGrading ? "⚡" : "📄"}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "hsl(222 47% 11%)", margin: 0 }}>
                      {item.student}
                    </p>
                    <p style={{ fontSize: 12, color: "hsl(215 16% 47%)", margin: 0 }}>
                      {item.name} · {item.words} words
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {isComplete && item.score !== null && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "4px 12px",
                        borderRadius: 999,
                        background:
                          item.score >= 80
                            ? "hsl(152 69% 41% / 0.1)"
                            : "hsl(234 89% 63% / 0.1)",
                        color:
                          item.score >= 80 ? "hsl(152 69% 41%)" : "hsl(234 89% 63%)",
                      }}
                    >
                      {item.score}/100
                    </span>
                  )}
                  {isGrading && (
                    <span style={{ fontSize: 12, color: "hsl(234 89% 63%)", fontWeight: 500 }}>
                      {Math.round(currentProgress)}%
                    </span>
                  )}
                  {!isComplete && !isGrading && (
                    <span style={{ fontSize: 12, color: "hsl(215 16% 47%)" }}>Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 20,
            opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "hsl(234 89% 63%)",
              boxShadow: "0 0 12px hsl(234 89% 63% / 0.5)",
              transform: `scale(${1 + Math.sin(frame * 0.15) * 0.3})`,
            }}
          />
          <span style={{ fontSize: 13, color: "hsl(215 16% 47%)" }}>
            AI is analyzing grammar, structure, and content...
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
