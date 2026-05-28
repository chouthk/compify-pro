import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

/**
 * Scene 1 — Replicates the actual Compify.Pro landing page hero section.
 * Shows: navbar, badge, headline with gradient text, subtitle, CTA buttons, and stats.
 */
export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered entrances
  const navOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeY = interpolate(spring({ frame: frame - 10, fps, config: { damping: 20 } }), [0, 1], [-20, 0]);
  const badgeOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineY = interpolate(spring({ frame: frame - 20, fps, config: { damping: 20 } }), [0, 1], [40, 0]);
  const headlineOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnsOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const statsOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, hsl(234 89% 96%) 0%, hsl(280 72% 96%) 100%)",
        fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Gradient orb (like the real site) */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          opacity: 0.2,
          background: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%), hsl(16 90% 58%))",
          filter: "blur(120px)",
        }}
      />

      {/* Navbar - matches real site */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 60px",
          opacity: navOpacity,
          borderBottom: "1px solid hsl(214 32% 91%)",
          background: "hsl(0 0% 100% / 0.8)",
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
          <span style={{ fontWeight: 700, fontSize: 18, color: "hsl(222 47% 11%)" }}>
            Compify.Pro
          </span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {["Features", "How It Works", "Pricing", "Testimonials"].map((item) => (
            <span key={item} style={{ fontSize: 14, color: "hsl(215 16% 47%)", fontWeight: 500 }}>
              {item}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 14, color: "hsl(215 16% 47%)" }}>English</span>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid hsl(214 32% 91%)",
              fontSize: 14,
              fontWeight: 500,
              color: "hsl(222 47% 11%)",
            }}
          >
            Dashboard
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 999,
            border: "1px solid hsl(214 32% 91%)",
            background: "white",
            opacity: badgeOpacity,
            transform: `translateY(${badgeY}px)`,
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 14, color: "hsl(16 90% 58%)" }}>✨</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "hsl(215 16% 47%)" }}>
            AI-Powered Essay Grading for Teachers
          </span>
        </div>

        {/* Headline — matches real site gradient text */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: -2,
            color: "hsl(222 47% 11%)",
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            margin: 0,
          }}
        >
          Grade 30 Essays in{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%), hsl(16 90% 58%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Minutes,
            <br />
            Not Hours
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 20,
            color: "hsl(215 16% 47%)",
            textAlign: "center",
            maxWidth: 600,
            lineHeight: 1.6,
            marginTop: 24,
            opacity: subOpacity,
          }}
        >
          Compify uses AI to batch-grade essays with consistent rubrics, detailed feedback, and exportable reports
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: 16, marginTop: 40, opacity: btnsOpacity }}>
          <div
            style={{
              padding: "16px 32px",
              borderRadius: 10,
              background: "linear-gradient(135deg, hsl(234 89% 63%), hsl(280 72% 58%), hsl(16 90% 58%))",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 60px -12px hsl(234 89% 63% / 0.25)",
            }}
          >
            <span style={{ color: "white", fontWeight: 600, fontSize: 16 }}>Start Free Trial</span>
            <span style={{ color: "white", fontSize: 16 }}>→</span>
          </div>
          <div
            style={{
              padding: "16px 32px",
              borderRadius: 10,
              border: "1px solid hsl(214 32% 91%)",
              background: "white",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>▶</span>
            <span style={{ fontWeight: 600, fontSize: 16, color: "hsl(222 47% 11%)" }}>Watch Demo</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 60, marginTop: 50, opacity: statsOpacity }}>
          {[
            { icon: "🕐", value: "10hrs+", label: "Saved per week", color: "hsl(234 89% 63%)" },
            { icon: "📄", value: "98%", label: "Grading accuracy", color: "hsl(16 90% 58%)" },
            { icon: "✨", value: "2,000+", label: "Teachers trust us", color: "hsl(152 69% 41%)" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${stat.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {stat.icon}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 24, color: "hsl(222 47% 11%)", margin: 0 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 12, color: "hsl(215 16% 47%)", margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
