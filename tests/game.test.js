import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame, triggerBomb, updateGame } from '../src/game/game.js';

test('game loop auto-fires and spawns enemies during normal play', () => {
  const game = createGame(1280, 720);

  for (let i = 0; i < 90; i++) {
    updateGame(game, {}, 1 / 60);
  }

  assert.ok(game.bullets.length > 0);
  assert.ok(game.enemies.length > 0);
  assert.equal(game.mode, 'playing');
});

test('boss joins the fight on the timed arcade cadence', () => {
  const game = createGame(1280, 720);
  game.player.stats.hp = 100000;
  game.time = 29.99;
  game.spawnTimer = 999;

  updateGame(game, {}, 1 / 60);

  assert.ok(game.enemies.some((enemy) => enemy.kind === 'boss'));
});

test('bomb consumes charge, clears hostile bullets, and damages enemies', () => {
  const game = createGame(1280, 720);
  game.player.stats.bombCharge = 1;
  game.enemyBullets.push({ x: 500, y: 300, vx: -1, vy: 0, r: 6, damage: 10, color: '#fff' });
  game.enemies.push({
    id: 'target',
    kind: 'gunship',
    x: 700,
    y: 300,
    r: 34,
    hp: 20,
    maxHp: 20,
    score: 620,
    speed: -100,
    fireTimer: 1,
    moveSeed: 0,
  });

  assert.equal(triggerBomb(game), true);

  assert.equal(game.player.stats.bombCharge, 0);
  assert.equal(game.enemyBullets.length, 0);
  assert.equal(game.enemies[0].hp, 2);
  assert.deepEqual(
    game.audioEvents.map((event) => event.type),
    ['bomb'],
  );
});

test('enemy kills emit audio events for beat-synced impact sounds', () => {
  const game = createGame(1280, 720);
  game.player.stats.bombCharge = 1;
  game.enemies.push({
    id: 'target',
    kind: 'scout',
    x: 700,
    y: 300,
    r: 16,
    hp: 1,
    maxHp: 1,
    score: 130,
    speed: -100,
    fireTimer: 1,
    moveSeed: 0,
  });

  triggerBomb(game);

  assert.ok(game.audioEvents.some((event) => event.type === 'kill'));
  assert.ok(game.audioEvents.some((event) => event.type === 'bomb'));
});

test('bomb creates short-lived shockwaves for explosive feedback', () => {
  const game = createGame(1280, 720);
  game.player.stats.bombCharge = 1;
  game.spawnTimer = 999;

  triggerBomb(game);

  assert.ok(game.shockwaves.length >= 1);

  for (let i = 0; i < 90; i++) {
    updateGame(game, {}, 1 / 60);
  }

  assert.equal(game.shockwaves.length, 0);
});

test('update loop caps transient entities under heavy arcade effects', () => {
  const game = createGame(1280, 720);

  for (let i = 0; i < 260; i++) {
    game.bullets.push({ x: 100, y: 100, vx: 0, vy: 0, r: 4, damage: 1, color: '#4df8ff' });
    game.enemyBullets.push({ x: 600, y: 300, vx: 0, vy: 0, r: 6, damage: 10, color: '#ff4fd8' });
    game.particles.push({ x: 640, y: 360, vx: 0, vy: 0, r: 2, life: 1, color: '#ffd166' });
    game.shockwaves.push({ x: 640, y: 360, radius: 1, maxRadius: 120, life: 1, maxLife: 1, color: '#ffd166', lineWidth: 4 });
  }

  for (let i = 0; i < 90; i++) {
    game.drops.push({ kind: 'power', x: 700, y: 300, vx: 0, vy: 0, r: 7, life: 5, value: 0.32, color: '#4df8ff' });
  }

  updateGame(game, {}, 1 / 60);

  assert.ok(game.bullets.length <= 140);
  assert.ok(game.enemyBullets.length <= 160);
  assert.ok(game.particles.length <= 240);
  assert.ok(game.shockwaves.length <= 24);
  assert.ok(game.drops.length <= 50);
});
