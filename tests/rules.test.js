import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyKillReward,
  activateSpecialWeapon,
  collectPowerDrop,
  createPlayerStats,
  getAutoFireShots,
  getBossPhase,
  getDifficultyConfig,
  getPlayerLevel,
  updateCombo,
} from '../src/game/rules.js';

test('auto-fire emits repeated shots when the fire interval elapses', () => {
  const stats = createPlayerStats();
  const result = getAutoFireShots(0.37, stats.fireInterval, 0);

  assert.equal(result.shots, 2);
  assert.ok(result.nextTimer > 0);
  assert.ok(result.nextTimer < stats.fireInterval);
});

test('combo decays when no kill lands before the timeout', () => {
  const active = updateCombo({ value: 6, timer: 0.5 }, 0.25, false);
  const expired = updateCombo({ value: 6, timer: 0.1 }, 0.25, false);

  assert.deepEqual(active, { value: 6, timer: 0.25 });
  assert.deepEqual(expired, { value: 0, timer: 0 });
});

test('kills add score through combo and refresh the combo timer', () => {
  const state = applyKillReward({ score: 1000, combo: 4, comboTimer: 0.2, bombCharge: 0.2 }, 140);

  assert.equal(state.combo, 5);
  assert.equal(state.comboTimer, 2.4);
  assert.equal(state.score, 1700);
  assert.equal(state.bombCharge, 0.32);
});

test('power drops stack weapon intensity but stay capped', () => {
  const player = createPlayerStats();
  player.power = 2.75;

  collectPowerDrop(player, 0.8);

  assert.equal(player.power, 3);
  assert.equal(player.fireInterval, 0.075);
  assert.equal(player.spread, 4);
});

test('player level follows power milestones', () => {
  assert.equal(getPlayerLevel(0), 1);
  assert.equal(getPlayerLevel(-1), 1);
  assert.equal(getPlayerLevel(1), 2);
  assert.equal(getPlayerLevel(2), 3);
  assert.equal(getPlayerLevel(3), 4);
  assert.equal(getPlayerLevel(99), 4);

  const player = createPlayerStats();
  collectPowerDrop(player, 2.2);

  assert.equal(player.level, 3);
});

test('special weapon pickups activate one timed attack mode', () => {
  const player = createPlayerStats();

  activateSpecialWeapon(player, 'laser');

  assert.equal(player.weaponMode, 'laser');
  assert.equal(player.weaponTimer, 9);

  activateSpecialWeapon(player, 'missile');

  assert.equal(player.weaponMode, 'missile');
  assert.equal(player.weaponTimer, 10);

  activateSpecialWeapon(player, 'unknown');

  assert.equal(player.weaponMode, 'missile');
  assert.equal(player.weaponTimer, 10);
});

test('difficulty configs scale arcade pressure and rewards', () => {
  assert.equal(getDifficultyConfig('unknown').id, 'normal');
  assert.equal(getDifficultyConfig('easy').enemySpeed < getDifficultyConfig('normal').enemySpeed, true);
  assert.equal(getDifficultyConfig('hard').enemySpeed > getDifficultyConfig('normal').enemySpeed, true);
  assert.equal(getDifficultyConfig('easy').bossHp < getDifficultyConfig('normal').bossHp, true);
  assert.equal(getDifficultyConfig('hard').score > getDifficultyConfig('normal').score, true);
});

test('boss phase appears on cadence with escalating boss tiers', () => {
  assert.equal(getBossPhase(29.9), null);
  assert.deepEqual(getBossPhase(30.1), {
    cycle: 1,
    tier: 'warden',
    name: 'Pulse Warden',
    hp: 900,
    score: 2800,
    radius: 74,
    pattern: 'fan',
  });
  assert.deepEqual(getBossPhase(61), {
    cycle: 2,
    tier: 'seraph',
    name: 'Blade Seraph',
    hp: 1260,
    score: 3800,
    radius: 84,
    pattern: 'crossfire',
  });
  assert.deepEqual(getBossPhase(91), {
    cycle: 3,
    tier: 'leviathan',
    name: 'Void Leviathan',
    hp: 1680,
    score: 5200,
    radius: 96,
    pattern: 'spiral',
  });
  assert.deepEqual(getBossPhase(121), {
    cycle: 4,
    tier: 'overlord',
    name: 'Nova Overlord',
    hp: 2160,
    score: 7000,
    radius: 108,
    pattern: 'storm',
  });
});
