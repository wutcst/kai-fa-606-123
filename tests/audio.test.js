import test from 'node:test';
import assert from 'node:assert/strict';

import { getBeatGrid, getMetalGrooveStep, quantizeToNextBeat } from '../src/game/audioRules.js';

test('audio beat grid derives beat and half-beat duration from bpm', () => {
  const grid = getBeatGrid(150);

  assert.equal(grid.beatSeconds, 0.4);
  assert.equal(grid.halfBeatSeconds, 0.2);
  assert.equal(grid.quarterBeatSeconds, 0.1);
});

test('audio events quantize to the next beat boundary', () => {
  assert.equal(quantizeToNextBeat(10.01, 150), 10.4);
  assert.equal(quantizeToNextBeat(10.4, 150), 10.4);
  assert.equal(quantizeToNextBeat(10.41, 150), 10.8);
});

test('metal groove drives double-kick backbeat and chug riff accents', () => {
  assert.deepEqual(getMetalGrooveStep(0), {
    step: 0,
    kick: true,
    snare: false,
    hat: true,
    crash: true,
    accent: true,
    riffFrequency: 41.2,
  });
  assert.equal(getMetalGrooveStep(4).snare, true);
  assert.equal(getMetalGrooveStep(5).riffFrequency, null);
  assert.equal(getMetalGrooveStep(14).kick, true);
  assert.equal(getMetalGrooveStep(14).riffFrequency, 55);
});
