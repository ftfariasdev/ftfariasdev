import { round } from "./format.mjs";

// Base styles are always the final frame, so switching animations off shows the finished piece.
export const REDUCED_MOTION_CSS = "@media (prefers-reduced-motion: reduce){*{animation:none!important}}";

// Every duration on the page is a number of beats at a single tempo.
export function createMotion(tokens) {
  const secondsPerBeat = 60 / tokens.tempo.bpm;
  const seconds = (beats) => round(beats * secondsPerBeat, 3);

  return {
    secondsPerBeat,
    seconds,
    time: (beats) => `${seconds(beats)}s`,
    unit: (name) => `${seconds(tokens.beats[name])}s`,
    ease: tokens.easing,
  };
}
