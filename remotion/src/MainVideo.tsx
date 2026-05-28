import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Upload } from "./scenes/Scene2Upload";
import { Scene3Grading } from "./scenes/Scene3Grading";
import { Scene4Results } from "./scenes/Scene4Results";
import { Scene5CTA } from "./scenes/Scene5CTA";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "hsl(210 20% 98%)" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={160}>
          <Scene2Upload />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene3Grading />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene4Results />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={165}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
