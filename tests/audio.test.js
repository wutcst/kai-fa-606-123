import test from 'node:test';
import assert from 'node:assert/strict';

import { getBeatGrid, quantizeToNextBeat } from '../src/game/audioRules.js';

test('audio beat grid derives beat and half-beat duration from bpm', () => {
  const grid = getBeatGrid(150);

  assert.equal(grid.beatSeconds, 0.4);
  assert.equal(grid.halfBeatSeconds, 0.2);
});

test('audio events quantize to the next beat boundary', () => {
  assert.equal(quantizeToNextBeat(10.01, 150), 10.4);
  assert.equal(quantizeToNextBeat(10.4, 150), 10.4);
  assert.equal(quantizeToNextBeat(10.41, 150), 10.8);
});
