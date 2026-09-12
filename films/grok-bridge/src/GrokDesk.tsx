import React from "react";
import { ACCOUNTS, colors, sans } from "./theme";

export const GrokDesk: React.FC<{
  step: number;
  jobVisible: boolean;
}> = ({ step, jobVisible }) => {
  return (
    <div
      style={{
        height: "100%",
        background: colors.grokBg,
        color: colors.grokInk,
        fontFamily: sans.fontFamily,
        display: "flex",
        padding: 18,
        gap: 14,
      }}
    >
      <div style={{ width: 220, paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: colors.grokMute, letterSpacing: 1, marginBottom: 14 }}>GROK BOT</div>
        <div
          style={{
            padding: "10px 12px",
            background: colors.grokPanel,
            borderRadius: 10,
            border: "1px solid #3a342c",
          }}
        >
          <div style={{ fontWeight: 600 }}>Sara</div>
          <div style={{ fontSize: 12, color: colors.grokMute, marginTop: 4 }}>Pipeline reviewer</div>
        </div>
        <div style={{ marginTop: 10, padding: "10px 12px", color: colors.grokMute, fontSize: 14 }}>Expense clerk</div>
        <div style={{ padding: "10px 12px", color: colors.grokMute, fontSize: 14 }}>Talent scout</div>
        <div style={{ marginTop: 28, fontSize: 12, color: colors.grokMute }}>
          Computer · Divyansh
          <br />
          CRM signed in
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {jobVisible ? (
          <div
            style={{
              background: colors.grokPanel,
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
              border: "1px solid #3a342c",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#d9cbb8",
            }}
          >
            POST job_id=8f2a · qm_agent=sara · reply_required=true
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            background: "#fff",
            color: colors.ink,
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: 36,
              background: "#f3f0ea",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              fontSize: 13,
              color: colors.mute,
              gap: 8,
            }}
          >
            <span>Attio · Pipeline</span>
            <span style={{ marginLeft: "auto" }}>{stepLabel(step)}</span>
          </div>
          <div style={{ padding: 16 }}>
            {ACCOUNTS.map((row, i) => {
              const on = i < step;
              return (
                <div
                  key={row.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1.4fr 90px",
                    padding: "10px 8px",
                    borderBottom: `1px solid ${colors.line}`,
                    background: on ? "#f3eee4" : "transparent",
                    fontSize: 14,
                  }}
                >
                  <span>{row.name}</span>
                  <span style={{ color: colors.mute }}>{on ? row.signal : "…"}</span>
                  <span style={{ color: on ? colors.accent : colors.mute }}>{on ? row.action : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function stepLabel(step: number): string {
  if (step <= 0) return "Opening CRM";
  if (step < 5) return `Checking sequences · ${step}/5`;
  return "Writing watch list";
}
