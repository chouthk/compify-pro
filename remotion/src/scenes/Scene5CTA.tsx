import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * Scene 5 — Dashboard overview + CTA ending.
 * Shows the actual dashboard layout with stats cards, then transitions to CTA.
 */
export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dashboard fades in, then CTA takes over
  const dashOpacity = interpolate(frame, [0, 15, 80, 100], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: frame - 95, fps, config: { damping: 15 } });

  const stats = [
    { label: "Essays Graded", value: "47 / ∞", sub: "Pro Plan", color: "hsl(234 89% 63%)" },
    { label: "Current Plan", value: "Pro", sub: "Renews May 1, 2026", color: "hsl(152 69% 41%)" },
    { label: "Time Saved", value: "18.8 hrs", sub: "Based on grading history", color: "hsl(16 90% 58%)" },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "hsl(210 20% 98%)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Dashboard view */}
      <div style={{ opacity: dashOpacity }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        </div>

        {/* Dashboard content */}
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, padding: "40px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "hsl(222 47% 11%)", margin: 0 }}>Dashboard</h1>
              <p style={{ fontSize: 16, color: "hsl(215 16% 47%)", margin: "4px 0 0" }}>Welcome back, Teacher</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {["📊 Analytics", "👥 Class Roster", "📦 Batch Grade", "✨ Grade Essay"].map((btn, i) => {
                const delay = 20 + i * 8;
                const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                const isLast = i === 3;
                return (
                  <div
                    key={btn}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 8,
                      border: isLast ? "none" : "1px solid hsl(214 32% 91%)",
                      background: isLast
                        ? "hsl(234 89% 63%)"
                        : "white",
                      opacity,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: isLast ? "white" : "hsl(222 47% 11%)",
                      }}
                    >
                      {btn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {stats.map((stat, i) => {
              const delay = 25 + i * 10;
              const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 100 } });
              const scale = interpolate(s, [0, 1], [0.9, 1]);
              const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={stat.label}
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    border: "1px solid hsl(214 32% 91%)",
                    background: "white",
                    opacity,
                    transform: `scale(${scale})`,
                  }}
                >
                  <p style={{ fontSize: 14, color: "hsl(215 16% 47%)", margin: "0 0 4px" }}>{stat.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: "hsl(222 47% 11%)", margin: 0 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 12, color: "hsl(215 16% 47%)", margin: "8px 0 0" }}>{stat.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA overlay */}
      <AbsoluteFill
        style={{
          opacity: ctaOpacity,
          background: "linear-gradient(135deg, hsl(234 89% 96%) 0%, hsl(280 72% 96%) 100%)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Gradient orb */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%))",
            opacity: 0.15,
            filter: "blur(100px)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${ctaScale})` }}>
          {/* Logo */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%), hsl(16 90% 58%))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span style={{ color: "white", fontWeight: 800, fontSize: 28 }}>C</span>
          </div>

          <h2
            style={{
              fontSize: 56,
              fontWeight: 800,
              textAlign: "center",
              letterSpacing: -2,
              lineHeight: 1.2,
              color: "hsl(222 47% 11%)",
              margin: 0,
            }}
          >
            Grade Smarter.
            <br />
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%), hsl(16 90% 58%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Save Hours.
            </span>
          </h2>
          <p style={{ fontSize: 20, color: "hsl(215 16% 47%)", marginTop: 16, textAlign: "center" }}>
            compify.pro
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
