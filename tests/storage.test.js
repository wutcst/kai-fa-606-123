import test from 'node:test';
import assert from 'node:assert/strict';

import { loadSaveData, saveDifficulty, saveRunRecord } from '../src/game/storage.js';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test('save data defaults to normal difficulty with empty records', () => {
  const save = loadSaveData(createMemoryStorage());

  assert.equal(save.difficulty, 'normal');
  assert.equal(save.records.easy.bestScore, 0);
  assert.equal(save.records.normal.plays, 0);
  assert.equal(save.records.hard.bestKills, 0);
});

test('difficulty choice is persisted and normalized', () => {
  const storage = createMemoryStorage();

  assert.equal(saveDifficulty(storage, 'hard').difficulty, 'hard');
  assert.equal(loadSaveData(storage).difficulty, 'hard');
  assert.equal(saveDifficulty(storage, 'bad-value').difficulty, 'normal');
});

test('run records are saved per difficulty', () => {
  const storage = createMemoryStorage();

  let save = saveRunRecord(storage, { difficulty: 'hard', score: 1200, kills: 9 });
  save = saveRunRecord(storage, { difficulty: 'hard', score: 800, kills: 11 });

  assert.equal(save.records.hard.plays, 2);
  assert.equal(save.records.hard.bestScore, 1200);
  assert.equal(save.records.hard.bestKills, 11);
  assert.equal(save.records.hard.lastScore, 800);
  assert.equal(save.lastRun.score, 800);
  assert.equal(save.records.normal.plays, 0);
});
