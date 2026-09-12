import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, sans } from "./theme";

export const MacWindow: React.FC<{
  url: string;
  children: React.ReactNode;
  dark?: boolean;
}> = ({ url, children, dark }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 18,
        overflow: "hidden",
        background: dark ? colors.grokBg : colors.window,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${dark ? "#2a2724" : colors.line}`,
      }}
    >
      <div
        style={{
          height: 46,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          background: dark ? "#1a1816" : "#efeae2",
          borderBottom: `1px solid ${dark ? "#2a2724" : colors.line}`,
        }}
      >
        <Dot c="#e2554a" />
        <Dot c="#e6b326" />
        <Dot c="#3cba5f" />
        <div
          style={{
            margin: "0 auto",
            fontFamily: sans.fontFamily,
            fontSize: 13,
            color: dark ? colors.grokMute : colors.mute,
            background: dark ? "#141312" : "#fff",
            padding: "4px 48px",
            borderRadius: 8,
            letterSpacing: 0.2,
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
    </div>
  );
};

const Dot: React.FC<{ c: string }> = ({ c }) => (
  <div style={{ width: 10, height: 10, borderRadius: 99, background: c }} />
);

export const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 12], [10, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        bottom: 36,
        opacity: o,
        transform: `translateY(${y}px)`,
        fontFamily: sans.fontFamily,
        fontSize: 22,
        color: "#f6f1e8",
        background: "rgba(20,18,14,0.72)",
        padding: "12px 18px",
        borderRadius: 12,
        maxWidth: 980,
        lineHeight: 1.35,
      }}
    >
      {children}
    </div>
  );
};

export const Typewriter: React.FC<{ text: string; start: number; cps?: number }> = ({ text, start, cps = 1.15 }) => {
  const frame = useCurrentFrame();
  const n = Math.min(text.length, Math.max(0, Math.floor((frame - start) * cps)));
  return <>{text.slice(0, n)}</>;
};
