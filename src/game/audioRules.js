export function getBeatGrid(bpm) {
  const beatSeconds = Number((60 / bpm).toFixed(6));
  return {
    beatSeconds,
    halfBeatSeconds: Number((beatSeconds / 2).toFixed(6)),
  };
}

export function quantizeToNextBeat(timeSeconds, bpm) {
  const { beatSeconds } = getBeatGrid(bpm);
  return Number((Math.ceil((timeSeconds - 1e-9) / beatSeconds) * beatSeconds).toFixed(6));
}
