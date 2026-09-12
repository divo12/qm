import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, MacWindow } from "./chrome";
import { GrokDesk } from "./GrokDesk";
import { Bubble, QmRoom } from "./QmRoom";
import { ACCOUNTS, colors, MAYA, sans, serif } from "./theme";

export const FPS = 30;
export const DURATION = 54 * FPS;

export const GrokBridgeFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: colors.paint }}>
      <Sequence from={0} durationInFrames={90} layout="none">
        <Title />
      </Sequence>
      <Sequence from={78} durationInFrames={300} layout="none">
        <Ask />
      </Sequence>
      <Sequence from={360} durationInFrames={180} layout="none">
        <Dispatch />
      </Sequence>
      <Sequence from={520} durationInFrames={420} layout="none">
        <Work />
      </Sequence>
      <Sequence from={920} durationInFrames={420} layout="none">
        <Result />
      </Sequence>
      <Sequence from={1320} durationInFrames={300} layout="none">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ padding: 48, fontFamily: sans.fontFamily }}>{children}</AbsoluteFill>
);

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        background: colors.paint,
        justifyContent: "center",
        padding: 96,
        opacity: interpolate(frame, [70, 90], [1, 0], { extrapolateRight: "clamp" }),
      }}
    >
      <div
        style={{
          fontFamily: serif.fontFamily,
          fontSize: 92,
          color: "#f4ead9",
          transform: `translateY(${(1 - s) * 24}px)`,
          lineHeight: 1.05,
        }}
      >
        Monday, 9:12am
      </div>
      <div style={{ marginTop: 18, fontSize: 28, color: "#cbbba4", fontFamily: sans.fontFamily }}>
        #pipeline-review · Maya asks Sara. Divyansh is in a customer call.
      </div>
    </AbsoluteFill>
  );
};

const Ask: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.min(MAYA.length, Math.max(0, Math.floor(frame * 1.05)));
  const sent = frame > 230;
  return (
    <Stage>
      <MacWindow url="qm.northwind.com/pipeline-review">
        <QmRoom composer={sent ? "" : MAYA.slice(0, typed)} cursor={!sent}>
          {sent ? (
            <Bubble from="maya" meta="Maya">
              {MAYA}
            </Bubble>
          ) : (
            <div style={{ color: colors.mute, fontSize: 15 }}>No messages yet this morning.</div>
          )}
        </QmRoom>
      </MacWindow>
      <Caption>The team room is QM. Sara is a named agent, not a shared login.</Caption>
    </Stage>
  );
};

const Dispatch: React.FC = () => {
  const frame = useCurrentFrame();
  const split = spring({ frame, fps: 30, config: { damping: 16 } });
  return (
    <Stage>
      <div style={{ display: "flex", height: "100%", gap: 18 }}>
        <div style={{ flex: interpolate(split, [0, 1], [1, 0.52]), minWidth: 0 }}>
          <MacWindow url="qm.northwind.com/pipeline-review">
            <QmRoom composer="" status="Sara → Divyansh’s Grok Bot">
              <Bubble from="maya" meta="Maya">
                {MAYA}
              </Bubble>
              <Bubble from="sara" meta="Sara">
                <span style={{ color: colors.mute }}>Picked up. Using Divyansh’s computer.</span>
              </Bubble>
            </QmRoom>
          </MacWindow>
        </div>
        <div style={{ flex: interpolate(split, [0, 1], [0.0001, 0.48]), minWidth: 0, overflow: "hidden" }}>
          <MacWindow url="grok.bot / Sara" dark>
            <GrokDesk step={0} jobVisible={frame > 40} />
          </MacWindow>
        </div>
      </div>
      <Caption>QM POSTs a job envelope. Grok Bot’s 200 only means the run started.</Caption>
    </Stage>
  );
};

const Work: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.min(5, Math.floor(frame / 70));
  return (
    <Stage>
      <MacWindow url="grok.bot / Sara · Divyansh’s computer" dark>
        <GrokDesk step={step} jobVisible />
      </MacWindow>
      <Caption>Work runs where the CRM is already signed in — Divyansh’s Grok Bot, not the QM sandbox.</Caption>
    </Stage>
  );
};

const Result: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = Math.min(ACCOUNTS.length, Math.max(0, Math.floor((frame - 40) / 28)));
  return (
    <Stage>
      <MacWindow url="qm.northwind.com/pipeline-review">
        <QmRoom composer="" status="Watch list in the room">
          <Bubble from="maya" meta="Maya">
            {MAYA}
          </Bubble>
          <Bubble from="sara" meta="Sara · via Divyansh’s Grok Bot">
            <div>Watch list for this week. Kite Harbor is already in a sequence — skipped.</div>
            <div style={{ marginTop: 12, borderTop: `1px solid ${colors.line}`, paddingTop: 8 }}>
              {ACCOUNTS.slice(0, Math.max(rows, 1)).map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 1.5fr 70px",
                    padding: "6px 0",
                    fontSize: 15,
                  }}
                >
                  <b>{row.name}</b>
                  <span style={{ color: colors.mute }}>{row.signal}</span>
                  <span style={{ color: colors.accent }}>{row.action}</span>
                </div>
              ))}
            </div>
          </Bubble>
        </QmRoom>
      </MacWindow>
      <Caption>Sara POSTs events home. The room sees the result. Divyansh never left the call.</Caption>
    </Stage>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: colors.paint,
        justifyContent: "center",
        padding: 96,
        opacity: o,
        fontFamily: sans.fontFamily,
      }}
    >
      <div style={{ fontFamily: serif.fontFamily, fontSize: 72, color: "#f4ead9", lineHeight: 1.1 }}>
        QM is the room.
        <br />
        Grok Bot is the computer.
      </div>
      <div style={{ marginTop: 28, fontSize: 26, color: "#cbbba4", maxWidth: 980, lineHeight: 1.4 }}>
        Pairing by consent. Jobs on a versioned protocol. Computer-use only to install Sara — never to click through the
        team’s Monday.
      </div>
    </AbsoluteFill>
  );
};
