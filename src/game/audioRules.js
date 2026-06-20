export function getBeatGrid(bpm) {
  const beatSeconds = Number((60 / bpm).toFixed(6));
  return {
    beatSeconds,
    halfBeatSeconds: Number((beatSeconds / 2).toFixed(6)),
    quarterBeatSeconds: Number((beatSeconds / 4).toFixed(6)),
  };
}

export function quantizeToNextBeat(timeSeconds, bpm) {
  const { beatSeconds } = getBeatGrid(bpm);
  return Number((Math.ceil((timeSeconds - 1e-9) / beatSeconds) * beatSeconds).toFixed(6));
}

const KICK_STEPS = new Set([0, 2, 3, 6, 8, 10, 11, 14]);
const SNARE_STEPS = new Set([4, 12]);
const RIFF_STEPS = new Map([
  [0, 41.2],
  [2, 41.2],
  [3, 49],
  [6, 55],
  [8, 41.2],
  [10, 61.74],
  [11, 55],
  [14, 55],
]);

export function getMetalGrooveStep(stepIndex) {
  const step = ((stepIndex % 16) + 16) % 16;
  return {
    step,
    kick: KICK_STEPS.has(step),
    snare: SNARE_STEPS.has(step),
    hat: true,
    crash: step === 0,
    accent: step === 0 || step === 8,
    riffFrequency: RIFF_STEPS.get(step) ?? null,
  };
}
