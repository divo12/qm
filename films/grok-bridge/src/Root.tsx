import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS, GrokBridgeFilm } from "./GrokBridgeFilm";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="GrokBridgeFilm"
      component={GrokBridgeFilm}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
