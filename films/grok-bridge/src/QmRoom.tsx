import React from "react";
import { colors, sans } from "./theme";

export const QmRoom: React.FC<{
  composer: string;
  cursor?: boolean;
  children: React.ReactNode;
  status?: string;
}> = ({ composer, cursor, children, status }) => {
  return (
    <div style={{ display: "flex", height: "100%", background: colors.window, fontFamily: sans.fontFamily }}>
      <div
        style={{
          width: 248,
          background: colors.sidebar,
          borderRight: `1px solid ${colors.line}`,
          padding: 18,
          color: colors.ink,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontWeight: 600 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: colors.accent,
              color: "#fff",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Y
          </div>
          QM
        </div>
        {["Home", "Search", "Browse"].map((item) => (
          <div key={item} style={{ padding: "7px 8px", color: colors.mute, fontSize: 14 }}>
            {item}
          </div>
        ))}
        <div style={{ marginTop: 22, fontSize: 11, color: colors.mute, letterSpacing: 0.6 }}>SESSIONS</div>
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "#ece6db",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          pipeline-review
        </div>
        {["Q3 outbound", "Hiring loop", "Friday ship"].map((s) => (
          <div key={s} style={{ padding: "8px 10px", fontSize: 14, color: colors.mute }}>
            {s}
          </div>
        ))}
        <div style={{ position: "absolute", bottom: 64, left: 28, fontSize: 12, color: colors.mute }}>
          maya@northwind
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            height: 52,
            borderBottom: `1px solid ${colors.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            fontWeight: 500,
          }}
        >
          pipeline-review
          {status ? (
            <span style={{ fontSize: 13, color: colors.good, fontWeight: 500 }}>{status}</span>
          ) : (
            <span style={{ fontSize: 13, color: colors.mute }}>Maya · Divyansh · Sara</span>
          )}
        </div>
        <div style={{ flex: 1, padding: "28px 36px 16px", overflow: "hidden" }}>{children}</div>
        <div style={{ padding: "0 28px 22px" }}>
          <div
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 16,
              padding: "16px 18px 12px",
              background: "#fff",
              minHeight: 84,
              color: composer ? colors.ink : colors.mute,
              fontSize: 16,
              lineHeight: 1.45,
            }}
          >
            {composer || "Ask anything"}
            {cursor ? (
              <span style={{ display: "inline-block", width: 2, height: 16, background: colors.ink, marginLeft: 2 }} />
            ) : null}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 14,
                color: colors.mute,
                fontSize: 12,
              }}
            >
              <span>Low · Fast</span>
              <span>Sara · Grok Bot</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Bubble: React.FC<{
  from: "maya" | "sara";
  children: React.ReactNode;
  meta?: string;
}> = ({ from, children, meta }) => {
  const mine = from === "maya";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 16 }}>
      <div style={{ maxWidth: 640 }}>
        {meta ? (
          <div style={{ fontSize: 12, color: colors.mute, marginBottom: 6, textAlign: mine ? "right" : "left" }}>
            {meta}
          </div>
        ) : null}
        <div
          style={{
            background: mine ? colors.bubble : "transparent",
            color: colors.ink,
            padding: mine ? "12px 16px" : 0,
            borderRadius: 16,
            fontSize: 16,
            lineHeight: 1.5,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
