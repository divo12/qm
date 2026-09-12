import { loadFont as loadSans } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

const sansLoaded = loadSans("normal", {
  subsets: ["latin"],
  weights: ["400", "500", "600"],
  ignoreTooManyRequestsWarning: true,
});
const serifLoaded = loadSerif("normal", {
  subsets: ["latin"],
  weights: ["400"],
  ignoreTooManyRequestsWarning: true,
});

export const sans = sansLoaded;
export const serif = serifLoaded;

export const colors = {
  paint: "#2c2418",
  paintLight: "#6b5340",
  window: "#f4f0e8",
  sidebar: "#faf7f2",
  ink: "#1c1915",
  mute: "#6f675c",
  line: "#e4ddd2",
  bubble: "#efe8dc",
  agent: "#1c1915",
  accent: "#c45c26",
  good: "#2f6b4f",
  grokBg: "#141312",
  grokPanel: "#1e1c1a",
  grokInk: "#f3eee6",
  grokMute: "#9b9286",
};

export const MAYA =
  "Sara, pull this week's pipeline review list. Skip anyone already in an active sequence. Research the top five. Leave me a watch list by tomorrow morning.";

export const ACCOUNTS = [
  { name: "Northwind Logistics", signal: "Usage down 18%", action: "Watch" },
  { name: "Helix Freight", signal: "Expansion in APAC", action: "Draft" },
  { name: "Amberline Health", signal: "Champion left", action: "Watch" },
  { name: "Kite Harbor", signal: "Closed-won sibling", action: "Skip" },
  { name: "Vesper Rail", signal: "Three open tickets", action: "Watch" },
];
