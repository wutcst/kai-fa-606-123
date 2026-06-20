import { getDifficultyConfig } from './rules.js';

const SAVE_KEY = 'starline-valkyrie-save-v1';
const DIFFICULTY_IDS = ['easy', 'normal', 'hard'];

function getDefaultStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function createRecord() {
  return {
    plays: 0,
    bestScore: 0,
    bestKills: 0,
    lastScore: 0,
    lastKills: 0,
  };
}

function normalizeRecord(record) {
  return {
    plays: Math.max(0, Number(record?.plays) || 0),
    bestScore: Math.max(0, Number(record?.bestScore) || 0),
    bestKills: Math.max(0, Number(record?.bestKills) || 0),
    lastScore: Math.max(0, Number(record?.lastScore) || 0),
    lastKills: Math.max(0, Number(record?.lastKills) || 0),
  };
}

function writeSave(storage, save) {
  if (!storage) return save;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    return save;
  }
  return save;
}

export function createDefaultSave() {
  return {
    difficulty: 'normal',
    records: {
      easy: createRecord(),
      normal: createRecord(),
      hard: createRecord(),
    },
    lastRun: null,
  };
}

export function loadSaveData(storage = getDefaultStorage()) {
  const fallback = createDefaultSave();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const save = createDefaultSave();
    save.difficulty = getDifficultyConfig(parsed?.difficulty).id;
    for (const id of DIFFICULTY_IDS) {
      save.records[id] = normalizeRecord(parsed?.records?.[id]);
    }
    save.lastRun = parsed?.lastRun && typeof parsed.lastRun === 'object'
      ? {
          difficulty: getDifficultyConfig(parsed.lastRun.difficulty).id,
          score: Math.max(0, Number(parsed.lastRun.score) || 0),
          kills: Math.max(0, Number(parsed.lastRun.kills) || 0),
          endedAt: parsed.lastRun.endedAt || '',
        }
      : null;
    return save;
  } catch {
    return fallback;
  }
}

export function saveDifficulty(storage = getDefaultStorage(), difficulty) {
  const save = loadSaveData(storage);
  save.difficulty = getDifficultyConfig(difficulty).id;
  return writeSave(storage, save);
}

export function saveRunRecord(storage = getDefaultStorage(), run) {
  const save = loadSaveData(storage);
  const difficulty = getDifficultyConfig(run?.difficulty).id;
  const score = Math.max(0, Math.floor(Number(run?.score) || 0));
  const kills = Math.max(0, Math.floor(Number(run?.kills) || 0));
  const record = save.records[difficulty];

  record.plays += 1;
  record.bestScore = Math.max(record.bestScore, score);
  record.bestKills = Math.max(record.bestKills, kills);
  record.lastScore = score;
  record.lastKills = kills;
  save.difficulty = difficulty;
  save.lastRun = {
    difficulty,
    score,
    kills,
    endedAt: new Date().toISOString(),
  };

  return writeSave(storage, save);
}
