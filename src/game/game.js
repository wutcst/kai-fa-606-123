import {
  applyKillReward,
  activateSpecialWeapon,
  collectPowerDrop,
  createPlayerStats,
  getAutoFireShots,
  getBossPhase,
  getDifficultyConfig,
  updateCombo,
} from './rules.js';

const TAU = Math.PI * 2;
const LIMITS = {
  bullets: 140,
  laserBeams: 12,
  enemyBullets: 160,
  drops: 50,
  particles: 240,
  screenParticles: 360,
  shockwaves: 24,
  impactPulses: 8,
};

export function createGame(width, height, options = {}) {
  const difficultyConfig = getDifficultyConfig(options.difficulty);
  const playerStats = createPlayerStats();
  return {
    width,
    height,
    difficulty: difficultyConfig.id,
    difficultyConfig,
    time: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    mode: 'playing',
    spawnTimer: 0.05,
    bossCycle: 0,
    shake: 0,
    flash: 0,
    message: { text: 'READY', timer: 1.2 },
    player: {
      x: Math.max(92, width * 0.14),
      y: height * 0.5,
      r: 20,
      invulnerable: 1.4,
      fireTimer: 0,
      stats: playerStats,
    },
    bullets: [],
    laserBeams: [],
    enemyBullets: [],
    enemies: [],
    drops: [],
    particles: [],
    screenParticles: [],
    shockwaves: [],
    impactPulses: [],
    audioEvents: [],
    stars: createStars(width, height),
  };
}

export function resizeGame(state, width, height) {
  const oldWidth = state.width || width;
  const oldHeight = state.height || height;
  state.width = width;
  state.height = height;
  state.player.x = clamp((state.player.x / oldWidth) * width, 52, width - state.player.r);
  state.player.y = clamp((state.player.y / oldHeight) * height, 68, height - 54);
  state.stars = createStars(width, height);
}

export function updateGame(state, input, dt) {
  if (state.mode !== 'playing') return;

  dt = Math.min(dt, 0.033);
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 18);
  state.flash = Math.max(0, state.flash - dt * 2.5);
  state.player.invulnerable = Math.max(0, state.player.invulnerable - dt);

  if (state.message.timer > 0) state.message.timer -= dt;

  movePlayer(state, input, dt);
  updateComboState(state, dt);
  firePlayerWeapons(state, dt);
  spawnEnemies(state, dt);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updateLaserBeams(state, dt);
  updateDrops(state, dt);
  updateParticles(state, dt);
  updateScreenParticles(state, dt);
  updateShockwaves(state, dt);
  updateImpactPulses(state, dt);
  handleCollisions(state);
  capTransientEntities(state);
}

export function triggerBomb(state) {
  if (state.mode !== 'playing' || state.player.stats.bombCharge < 1) return false;

  state.player.stats.bombCharge = 0;
  state.flash = 1;
  state.shake = 18;
  state.enemyBullets.length = 0;
  emitAudio(state, 'bomb', 1);
  addImpactPulse(state, state.player.x + 82, state.player.y, '#fff7b0', Math.max(state.width, state.height) * 0.78, 0.5, 1.35);
  screenBurst(state, state.player.x + 82, state.player.y, '#fff7b0', 170, 1.25);
  addShockwave(state, state.player.x + 82, state.player.y, '#fff7b0', Math.min(state.width, state.height) * 0.46, 8, 0.72);
  addShockwave(state, state.player.x + 82, state.player.y, '#ff4fd8', Math.min(state.width, state.height) * 0.34, 5, 0.5);
  burst(state, state.player.x + 80, state.player.y, '#fff7b0', 64, 9);

  for (const enemy of state.enemies) {
    enemy.hp -= enemy.kind === 'boss' ? 180 : 18;
    burst(state, enemy.x, enemy.y, '#ffd166', enemy.kind === 'boss' ? 26 : 12, 5);
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    if (state.enemies[i].hp <= 0) killEnemy(state, i);
  }

  state.message = { text: 'BOMB', timer: 0.85 };
  capTransientEntities(state);
  return true;
}

function createStars(width, height) {
  const stars = [];
  const count = Math.round((width * height) / 7600);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.35 + Math.random() * 1.6,
      hue: Math.random() > 0.78 ? 315 : 190,
    });
  }
  return stars;
}

function movePlayer(state, input, dt) {
  const player = state.player;
  let dx = Number(Boolean(input.right)) - Number(Boolean(input.left));
  let dy = Number(Boolean(input.down)) - Number(Boolean(input.up));

  if (input.pointerActive) {
    const targetX = clamp(input.pointerX, player.r, state.width - player.r);
    const targetY = clamp(input.pointerY, 62, state.height - 42);
    const tx = targetX - player.x;
    const ty = targetY - player.y;
    const distance = Math.hypot(tx, ty);
    if (distance > 4) {
      dx = tx / distance;
      dy = ty / distance;
    }
  }

  const length = Math.hypot(dx, dy) || 1;
  player.x += (dx / length) * player.stats.speed * dt;
  player.y += (dy / length) * player.stats.speed * dt;
  player.x = clamp(player.x, player.r, state.width - player.r);
  player.y = clamp(player.y, 62, state.height - 42);
}

function updateComboState(state, dt) {
  const next = updateCombo({ value: state.combo, timer: state.comboTimer }, dt, false);
  state.combo = next.value;
  state.comboTimer = next.timer;
}

function firePlayerWeapons(state, dt) {
  const player = state.player;
  updateSpecialWeapon(player.stats, dt);
  if (player.stats.weaponMode === 'laser') fireLaser(state, dt);

  const fire = getAutoFireShots(dt, player.stats.fireInterval, player.fireTimer);
  player.fireTimer = fire.nextTimer;

  for (let i = 0; i < fire.shots; i++) {
    const spread = player.stats.spread;
    const target = findForwardTarget(state);
    const baseAngle = target
      ? clamp(Math.atan2(target.y - player.y, target.x - player.x), -0.42, 0.42)
      : 0;
    for (let n = 0; n < spread; n++) {
      const offset = n - (spread - 1) / 2;
      const angle = baseAngle + offset * 0.075;
      const speed = player.stats.power >= 2.5 ? 900 : 840;
      state.bullets.push({
        x: player.x + 30,
        y: player.y + offset * 9,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: player.stats.power >= 2.5 ? 5.4 : 4.2,
        damage: player.stats.power >= 2.5 ? 2 : 1,
        color: player.stats.power >= 2.5 ? '#ffd166' : '#4df8ff',
      });
    }

    if (player.stats.weaponMode === 'missile') {
      state.bullets.push({
        x: player.x + 34,
        y: player.y + Math.sin(state.time * 14) * 16,
        vx: 560,
        vy: 0,
        r: 12,
        damage: 10 + player.stats.level * 2,
        color: '#ffd166',
        explosiveRadius: 128 + player.stats.level * 10,
        explosiveDamage: 13 + player.stats.level,
      });
      emitAudio(state, 'weapon', 0.9);
    }

    if (player.stats.power >= 3) {
      state.bullets.push(
        { x: player.x + 18, y: player.y - 23, vx: 760, vy: -42, r: 6, damage: 2, color: '#ff4fd8' },
        { x: player.x + 18, y: player.y + 23, vx: 760, vy: 42, r: 6, damage: 2, color: '#ff4fd8' },
      );
    }
  }
}

function updateSpecialWeapon(stats, dt) {
  if (stats.weaponTimer <= 0) {
    stats.weaponMode = 'standard';
    stats.weaponTimer = 0;
    stats.weaponSfxTimer = 0;
    return;
  }

  stats.weaponTimer = Math.max(0, stats.weaponTimer - dt);
  stats.weaponSfxTimer = Math.max(0, stats.weaponSfxTimer - dt);
  if (stats.weaponTimer === 0) stats.weaponMode = 'standard';
}

function fireLaser(state, dt) {
  const player = state.player;
  const startX = player.x + 28;
  const endX = state.width + 80;
  const width = 16 + player.stats.level * 4;
  let didHit = false;

  state.laserBeams.push({
    x1: startX,
    y1: player.y,
    x2: endX,
    y2: player.y + Math.sin(state.time * 26) * 4,
    width,
    life: 0.08,
    maxLife: 0.08,
    color: player.stats.level >= 4 ? '#fff7b0' : '#4df8ff',
  });

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.x < startX || enemy.x > endX) continue;
    if (Math.abs(enemy.y - player.y) > enemy.r + width) continue;

    enemy.hp -= (132 + player.stats.level * 24) * dt;
    didHit = true;
    spark(state, enemy.x - enemy.r * 0.5, enemy.y, '#4df8ff');
    if (enemy.hp <= 0) killEnemy(state, i);
  }

  if (didHit && player.stats.weaponSfxTimer <= 0) {
    emitAudio(state, 'laser', 0.9 + player.stats.level * 0.12);
    player.stats.weaponSfxTimer = 0.16;
  }
}

function findForwardTarget(state) {
  let best = null;
  let bestScore = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.x <= state.player.x + 90) continue;
    const dx = enemy.x - state.player.x;
    const dy = Math.abs(enemy.y - state.player.y);
    const score = dx * 0.45 + dy;
    if (score < bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

function spawnEnemies(state, dt) {
  const phase = getBossPhase(state.time);
  const bossAlive = state.enemies.some((enemy) => enemy.kind === 'boss');
  if (phase && phase.cycle > state.bossCycle && !bossAlive) {
    const bossHp = Math.round(phase.hp * state.difficultyConfig.bossHp);
    state.bossCycle = phase.cycle;
    state.enemies.push({
      id: crypto.randomUUID(),
      kind: 'boss',
      tier: phase.tier,
      name: phase.name,
      pattern: phase.pattern,
      x: state.width + 120,
      y: state.height * 0.5,
      r: phase.radius,
      hp: bossHp,
      maxHp: bossHp,
      score: Math.round(phase.score * state.difficultyConfig.score),
      speed: -54 * state.difficultyConfig.enemySpeed,
      fireTimer: 0.3,
      attackStep: 0,
      moveSeed: Math.random() * TAU,
    });
    state.message = { text: phase.name.toUpperCase(), timer: 1.4 };
    state.shake = 10;
    emitAudio(state, 'boss', phase.cycle);
  }

  state.spawnTimer -= dt;
  if (bossAlive) return;

  while (state.spawnTimer <= 0) {
    const pressure = Math.min(1, state.time / 95);
    const roll = Math.random();
    const y = 84 + Math.random() * (state.height - 146);
    let enemy;

    if (roll < 0.5) {
      enemy = createEnemy('scout', state.width + 42, y, 2, 130, -245 - pressure * 90, 16);
    } else if (roll < 0.76) {
      enemy = createEnemy('striker', state.width + 48, y, 4, 240, -180 - pressure * 60, 22);
    } else if (roll < 0.91) {
      enemy = createEnemy('rammer', state.width + 56, y, 5, 310, -260 - pressure * 95, 20);
    } else {
      enemy = createEnemy('gunship', state.width + 72, y, 12, 620, -105 - pressure * 28, 34);
    }

    enemy.fireTimer = 0.6 + Math.random() * 1.4;
    enemy.moveSeed = Math.random() * TAU;
    enemy.hp = Math.max(1, Math.round(enemy.hp * state.difficultyConfig.enemyHp));
    enemy.maxHp = enemy.hp;
    enemy.score = Math.round(enemy.score * state.difficultyConfig.score);
    enemy.speed *= state.difficultyConfig.enemySpeed;
    state.enemies.push(enemy);
    state.spawnTimer += Math.max(0.18, 0.74 - pressure * 0.38 - state.kills * 0.0009) * state.difficultyConfig.spawn;
  }
}

function createEnemy(kind, x, y, hp, score, speed, r) {
  return {
    id: crypto.randomUUID(),
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    score,
    speed,
    r,
    fireTimer: 1,
    moveSeed: 0,
  };
}

function updateEnemies(state, dt) {
  for (const enemy of state.enemies) {
    if (enemy.kind === 'boss') {
      enemy.x = Math.max(state.width - 155, enemy.x + enemy.speed * dt);
      enemy.y = getBossY(state, enemy);
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        enemy.fireTimer += getBossFireInterval(state, enemy) * state.difficultyConfig.enemyFire;
        fireBossPattern(state, enemy);
      }
      continue;
    }

    enemy.x += enemy.speed * dt;
    if (enemy.kind === 'rammer') {
      enemy.y += clamp(state.player.y - enemy.y, -180, 180) * dt * 1.8;
    } else {
      enemy.y += Math.sin(state.time * 2.3 + enemy.moveSeed) * dt * (enemy.kind === 'scout' ? 70 : 36);
    }

    if (enemy.kind === 'striker' || enemy.kind === 'gunship') {
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && enemy.x < state.width - 40) {
        enemy.fireTimer += (enemy.kind === 'gunship' ? 1.08 : 1.46) * state.difficultyConfig.enemyFire;
        fireAtPlayer(state, enemy, enemy.kind === 'gunship' ? 2 : 1);
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => enemy.x > -160 && enemy.y > -180 && enemy.y < state.height + 180);
}

function fireAtPlayer(state, enemy, count) {
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 0.18;
    const speed = enemy.kind === 'gunship' ? 260 : 330;
    state.enemyBullets.push({
      x: enemy.x - enemy.r * 0.6,
      y: enemy.y,
      vx: Math.cos(angle + offset) * speed,
      vy: Math.sin(angle + offset) * speed,
      r: 6,
      damage: 10,
      color: '#ff4fd8',
    });
  }
}

function fireBossPattern(state, boss) {
  boss.attackStep += 1;
  const base = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);

  if (boss.pattern === 'fan') {
    for (let i = -2; i <= 2; i++) {
      const angle = base + i * 0.16;
      pushEnemyBullet(state, boss.x - 64, boss.y + i * 18, angle, 310, i === 0 ? '#ffd166' : '#ff4fd8', 7.5, 12);
    }
    return;
  }

  if (boss.pattern === 'crossfire') {
    for (let i = -3; i <= 3; i++) {
      const angle = base + i * 0.11;
      pushEnemyBullet(state, boss.x - 70, boss.y + i * 10, angle, 340, i % 2 === 0 ? '#ffd166' : '#ff4fd8', 6.8, 11);
    }
    for (const direction of [-1, 1]) {
      pushEnemyBullet(state, boss.x - 24, boss.y, Math.PI + direction * 0.85, 245, '#4df8ff', 5.4, 8);
    }
    return;
  }

  if (boss.pattern === 'spiral') {
    const spin = boss.attackStep * 0.42;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + spin + i * (TAU / 8);
      pushEnemyBullet(state, boss.x - 42, boss.y, angle, 235, i % 2 ? '#ff4fd8' : '#4df8ff', 5.8, 9);
    }
    for (let i = -1; i <= 1; i++) {
      pushEnemyBullet(state, boss.x - 72, boss.y + i * 20, base + i * 0.12, 330, '#ffd166', 7.2, 12);
    }
    return;
  }

  for (let i = -3; i <= 3; i++) {
    const angle = base + i * 0.16;
    pushEnemyBullet(state, boss.x - 76, boss.y + i * 14, angle, 360, i === 0 ? '#ffd166' : '#ff4fd8', 7.4, 12);
  }
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI - 0.9 + i * 0.16 + boss.attackStep * 0.08;
    pushEnemyBullet(state, boss.x - 34, boss.y, angle, 235, i % 3 === 0 ? '#ffd166' : '#ff3d5a', 5.8, 9);
  }
}

function getBossY(state, boss) {
  if (boss.pattern === 'crossfire') {
    return state.height * 0.5 + Math.sin(state.time * 2.4 + boss.moveSeed) * state.height * 0.29;
  }
  if (boss.pattern === 'spiral') {
    return state.height * 0.5 + Math.sin(state.time * 1.5 + boss.moveSeed) * state.height * 0.22 + Math.sin(state.time * 4.2) * 24;
  }
  if (boss.pattern === 'storm') {
    return state.height * 0.5 + Math.sin(state.time * 2.1 + boss.moveSeed) * state.height * 0.31;
  }
  return state.height * 0.5 + Math.sin(state.time * 1.6 + boss.moveSeed) * state.height * 0.24;
}

function getBossFireInterval(state, boss) {
  if (boss.pattern === 'storm') return Math.max(0.18, 0.46 - state.bossCycle * 0.018);
  if (boss.pattern === 'spiral') return Math.max(0.2, 0.5 - state.bossCycle * 0.02);
  if (boss.pattern === 'crossfire') return Math.max(0.22, 0.56 - state.bossCycle * 0.024);
  return Math.max(0.24, 0.64 - state.bossCycle * 0.028);
}

function pushEnemyBullet(state, x, y, angle, speed, color, r, damage) {
  state.enemyBullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r,
    damage,
    color,
  });
}

function updateBullets(state, dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }

  for (const bullet of state.enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  }

  state.bullets = state.bullets.filter((bullet) => bullet.x < state.width + 80 && bullet.y > -50 && bullet.y < state.height + 50);
  state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.x > -80 && bullet.x < state.width + 120 && bullet.y > -80 && bullet.y < state.height + 80);
  trimToLimit(state.bullets, LIMITS.bullets);
  trimToLimit(state.enemyBullets, LIMITS.enemyBullets);
}

function updateLaserBeams(state, dt) {
  for (const beam of state.laserBeams) {
    beam.life -= dt;
  }

  state.laserBeams = state.laserBeams.filter((beam) => beam.life > 0);
  trimToLimit(state.laserBeams, LIMITS.laserBeams);
}

function updateDrops(state, dt) {
  for (const drop of state.drops) {
    const dx = state.player.x - drop.x;
    const dy = state.player.y - drop.y;
    const distance = Math.hypot(dx, dy) || 1;
    const pull = distance < 170 ? 460 : 110;
    drop.x += (drop.vx + (dx / distance) * pull) * dt;
    drop.y += (drop.vy + (dy / distance) * pull) * dt;
    drop.life -= dt;
  }

  state.drops = state.drops.filter((drop) => drop.life > 0 && drop.x > -60);
  trimToLimit(state.drops, LIMITS.drops);
}

function updateParticles(state, dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - dt * 1.8;
    particle.vy *= 1 - dt * 1.8;
    particle.life -= dt;
  }

  state.particles = state.particles.filter((particle) => particle.life > 0);
  trimToLimit(state.particles, LIMITS.particles);
}

function updateScreenParticles(state, dt) {
  for (const particle of state.screenParticles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - dt * 0.8;
    particle.vy *= 1 - dt * 0.8;
    particle.angle += particle.spin * dt;
    particle.life -= dt;
  }

  state.screenParticles = state.screenParticles.filter((particle) => particle.life > 0);
  trimToLimit(state.screenParticles, LIMITS.screenParticles);
}

function updateShockwaves(state, dt) {
  for (const wave of state.shockwaves) {
    wave.radius += wave.speed * dt;
    wave.life -= dt;
  }

  state.shockwaves = state.shockwaves.filter((wave) => wave.life > 0);
  trimToLimit(state.shockwaves, LIMITS.shockwaves);
}

function updateImpactPulses(state, dt) {
  for (const pulse of state.impactPulses) {
    pulse.radius += pulse.speed * dt;
    pulse.life -= dt;
  }

  state.impactPulses = state.impactPulses.filter((pulse) => pulse.life > 0);
  trimToLimit(state.impactPulses, LIMITS.impactPulses);
}

function handleCollisions(state) {
  for (let b = state.bullets.length - 1; b >= 0; b--) {
    const bullet = state.bullets[b];
    for (let e = state.enemies.length - 1; e >= 0; e--) {
      const enemy = state.enemies[e];
      if (!touching(bullet, enemy)) continue;

      if (bullet.explosiveRadius) {
        state.bullets.splice(b, 1);
        explodePlayerProjectile(state, bullet);
        break;
      }

      enemy.hp -= bullet.damage;
      state.bullets.splice(b, 1);
      spark(state, bullet.x, bullet.y, bullet.color);
      emitAudio(state, 'hit', enemy.kind === 'boss' ? 1.25 : Math.min(1.1, 0.48 + bullet.damage * 0.24));
      state.shake = Math.max(state.shake, enemy.kind === 'boss' ? 9 : 4);
      state.flash = Math.max(state.flash, enemy.kind === 'boss' ? 0.16 : 0.1);
      addImpactPulse(state, bullet.x, bullet.y, bullet.color, enemy.kind === 'boss' ? 190 : 92, 0.22, enemy.kind === 'boss' ? 1.05 : 0.62);
      screenBurst(state, bullet.x, bullet.y, bullet.color, enemy.kind === 'boss' ? 34 : 20, enemy.kind === 'boss' ? 0.62 : 0.36);
      if (enemy.hp <= 0) killEnemy(state, e);
      break;
    }
  }

  if (state.player.invulnerable <= 0) {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      if (touching(state.player, state.enemyBullets[i])) {
        damagePlayer(state, state.enemyBullets[i].damage);
        state.enemyBullets.splice(i, 1);
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      if (touching(state.player, state.enemies[i])) {
        damagePlayer(state, state.enemies[i].kind === 'boss' ? 28 : 18);
        state.enemies[i].hp -= 8;
        if (state.enemies[i].hp <= 0) killEnemy(state, i);
      }
    }
  }

  for (let i = state.drops.length - 1; i >= 0; i--) {
    const drop = state.drops[i];
    if (!touching(state.player, drop)) continue;

    if (drop.kind === 'power') collectPowerDrop(state.player.stats, drop.value);
    if (drop.kind === 'heal') state.player.stats.hp = Math.min(state.player.stats.maxHp, state.player.stats.hp + 18);
    if (drop.kind === 'charge') state.player.stats.bombCharge = Math.min(1, state.player.stats.bombCharge + 0.28);
    if (drop.kind === 'laser' || drop.kind === 'missile') {
      activateSpecialWeapon(state.player.stats, drop.kind);
      state.message = { text: drop.kind === 'laser' ? 'LASER' : 'MISSILE', timer: 0.8 };
      state.flash = Math.max(state.flash, 0.18);
      screenBurst(state, drop.x, drop.y, drop.color, 48, 0.5);
      emitAudio(state, 'weapon', 1);
    } else {
      emitAudio(state, drop.kind, 0.6);
    }
    state.score += 80 * Math.max(1, state.combo);
    state.drops.splice(i, 1);
    burst(state, drop.x, drop.y, drop.color, 12, 4);
  }
}

function explodePlayerProjectile(state, projectile) {
  emitAudio(state, 'missile', 1.15);
  state.shake = Math.max(state.shake, 12);
  state.flash = Math.max(state.flash, 0.32);
  addShockwave(state, projectile.x, projectile.y, '#ffd166', projectile.explosiveRadius, 7, 0.42);
  addImpactPulse(state, projectile.x, projectile.y, '#ffd166', projectile.explosiveRadius * 2.4, 0.38, 1.1);
  screenBurst(state, projectile.x, projectile.y, '#ffd166', 110, 0.82);
  burst(state, projectile.x, projectile.y, '#ffd166', 48, 7);

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
    if (distance > projectile.explosiveRadius + enemy.r) continue;

    enemy.hp -= projectile.explosiveDamage + (touching(projectile, enemy) ? projectile.damage : 0);
    spark(state, enemy.x, enemy.y, '#ffd166');
    if (enemy.hp <= 0) killEnemy(state, i);
  }
}

function killEnemy(state, index) {
  const enemy = state.enemies[index];
  const reward = applyKillReward(
    {
      score: state.score,
      combo: state.combo,
      comboTimer: state.comboTimer,
      bombCharge: state.player.stats.bombCharge,
    },
    enemy.score,
  );
  state.score = reward.score;
  state.combo = reward.combo;
  state.comboTimer = reward.comboTimer;
  state.player.stats.bombCharge = reward.bombCharge;
  state.kills += 1;
  state.shake = Math.max(state.shake, enemy.kind === 'boss' ? 20 : 6);
  state.flash = Math.max(state.flash, enemy.kind === 'boss' ? 1 : 0.22);
  emitAudio(state, enemy.kind === 'boss' ? 'bossKill' : 'kill', enemy.kind === 'boss' ? 1.4 : Math.min(1.2, 0.55 + state.combo * 0.04));

  addShockwave(
    state,
    enemy.x,
    enemy.y,
    enemy.kind === 'boss' ? '#ffd166' : '#4df8ff',
    enemy.kind === 'boss' ? 300 : 104,
    enemy.kind === 'boss' ? 10 : 5,
    enemy.kind === 'boss' ? 0.9 : 0.5,
  );
  addShockwave(
    state,
    enemy.x,
    enemy.y,
    enemy.kind === 'boss' ? '#ff4fd8' : '#ff4fd8',
    enemy.kind === 'boss' ? 210 : 62,
    enemy.kind === 'boss' ? 6 : 3,
    enemy.kind === 'boss' ? 0.68 : 0.32,
  );
  addImpactPulse(
    state,
    enemy.x,
    enemy.y,
    enemy.kind === 'boss' ? '#ffd166' : '#4df8ff',
    enemy.kind === 'boss' ? Math.max(state.width, state.height) * 0.9 : Math.max(state.width, state.height) * 0.42,
    enemy.kind === 'boss' ? 0.74 : 0.42,
    enemy.kind === 'boss' ? 1.5 : 0.95,
  );
  screenBurst(state, enemy.x, enemy.y, enemy.kind === 'boss' ? '#ffd166' : '#4df8ff', enemy.kind === 'boss' ? 260 : 104, enemy.kind === 'boss' ? 1.7 : 0.9);
  burst(state, enemy.x, enemy.y, enemy.kind === 'boss' ? '#ffd166' : '#4df8ff', enemy.kind === 'boss' ? 120 : 36, enemy.kind === 'boss' ? 10 : 5.5);
  dropLoot(state, enemy);
  state.enemies.splice(index, 1);

  if (enemy.kind === 'boss') {
    state.flash = 1;
    state.message = { text: 'BOSS DOWN', timer: 1.4 };
    state.player.stats.hp = Math.min(state.player.stats.maxHp, state.player.stats.hp + 28);
  }
}

function dropLoot(state, enemy) {
  const drops = enemy.kind === 'boss' ? 14 : enemy.kind === 'gunship' ? 4 : Math.random() > 0.42 ? 1 : 0;
  for (let i = 0; i < drops; i++) {
    const roll = Math.random();
    const kind = roll > 0.94 ? 'laser' : roll > 0.88 ? 'missile' : roll > 0.78 ? 'heal' : roll > 0.62 ? 'charge' : 'power';
    state.drops.push({
      kind,
      x: enemy.x + randomRange(-enemy.r, enemy.r),
      y: enemy.y + randomRange(-enemy.r, enemy.r),
      vx: randomRange(-30, 80),
      vy: randomRange(-120, 120),
      r: kind === 'heal' || kind === 'laser' || kind === 'missile' ? 9 : 7,
      life: enemy.kind === 'boss' ? 8 : 5.5,
      value: kind === 'power' ? 0.32 : 0,
      color: kind === 'heal' ? '#60ff9a' : kind === 'charge' || kind === 'missile' ? '#ffd166' : kind === 'laser' ? '#ff4fd8' : '#4df8ff',
    });
  }
}

function damagePlayer(state, amount) {
  state.player.stats.hp = Math.max(0, state.player.stats.hp - amount * state.difficultyConfig.damage);
  state.player.invulnerable = 0.85;
  state.combo = 0;
  state.comboTimer = 0;
  state.shake = 16;
  state.flash = Math.max(state.flash, 0.25);
  emitAudio(state, 'damage', 0.7);
  addShockwave(state, state.player.x, state.player.y, '#ff3d5a', 96, 5, 0.45);
  addImpactPulse(state, state.player.x, state.player.y, '#ff3d5a', 180, 0.38, 0.85);
  screenBurst(state, state.player.x, state.player.y, '#ff3d5a', 72, 0.7);
  burst(state, state.player.x, state.player.y, '#ff3d5a', 24, 6);

  if (state.player.stats.hp <= 0) {
    state.mode = 'gameover';
    state.message = { text: 'DESTROYED', timer: 999 };
    addImpactPulse(state, state.player.x, state.player.y, '#ff4fd8', Math.max(state.width, state.height) * 0.76, 0.75, 1.4);
    screenBurst(state, state.player.x, state.player.y, '#ff4fd8', 210, 1.35);
    burst(state, state.player.x, state.player.y, '#ff4fd8', 120, 12);
  }
}

function emitAudio(state, type, intensity = 1) {
  state.audioEvents.push({
    type,
    intensity,
    time: state.time,
  });
  if (state.audioEvents.length > 48) state.audioEvents.splice(0, state.audioEvents.length - 48);
}

function spark(state, x, y, color) {
  burst(state, x, y, color, 5, 2.8);
}

function burst(state, x, y, color, count, speedScale) {
  const available = LIMITS.particles - state.particles.length;
  count = Math.max(0, Math.min(count, available));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TAU;
    const speed = randomRange(40, 110) * speedScale;
    const roll = Math.random();
    const type = speedScale >= 5 && roll < 0.32 ? 'ray' : roll < 0.72 ? 'spark' : 'ember';
    const life = type === 'ray' ? randomRange(0.18, 0.34) : type === 'spark' ? randomRange(0.32, 0.62) : randomRange(0.55, 0.95);
    state.particles.push({
      type,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      length: type === 'ray' ? randomRange(18, 44) * Math.min(2.4, speedScale / 5) : 0,
      r: randomRange(1.5, 5.6) * Math.min(2.4, speedScale / 4),
      life,
      maxLife: life,
      color,
    });
  }
}

function screenBurst(state, x, y, color, count, force) {
  const available = LIMITS.screenParticles - state.screenParticles.length;
  count = Math.max(0, Math.min(count, available));
  const colors = [color, '#ffffff', '#fff7b0', '#4df8ff', '#ff4fd8', '#60ff9a'];
  const focusRadius = Math.min(Math.max(150, 250 + force * 120), Math.min(state.width, state.height) * 0.72);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TAU;
    const spawnDistance = Math.sqrt(Math.random()) * focusRadius * 0.78;
    const speed = randomRange(360, 980) * force;
    const roll = Math.random();
    const type = roll < 0.4 ? 'slash' : roll < 0.78 ? 'streak' : 'confetti';
    const life = type === 'slash' ? randomRange(0.18, 0.42) : type === 'streak' ? randomRange(0.34, 0.72) : randomRange(0.55, 1.05);
    state.screenParticles.push({
      type,
      x: clamp(x + Math.cos(angle) * spawnDistance, 0, state.width),
      y: clamp(y + Math.sin(angle) * spawnDistance, 0, state.height),
      focusX: x,
      focusY: y,
      focusRadius,
      vx: Math.cos(angle) * speed + randomRange(-80, 80),
      vy: Math.sin(angle) * speed + randomRange(-80, 80),
      angle,
      spin: randomRange(-18, 18),
      length: randomRange(24, 92) * Math.min(2.2, 0.8 + force),
      r: randomRange(2.4, 8.6) * Math.min(1.8, 0.9 + force * 0.55),
      life,
      maxLife: life,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }
}

function addShockwave(state, x, y, color, maxRadius, lineWidth, life) {
  if (state.shockwaves.length >= LIMITS.shockwaves) state.shockwaves.shift();
  state.shockwaves.push({
    x,
    y,
    radius: 4,
    maxRadius,
    speed: maxRadius / life,
    life,
    maxLife: life,
    lineWidth,
    color,
  });
}

function addImpactPulse(state, x, y, color, maxRadius, life, force) {
  if (state.impactPulses.length >= LIMITS.impactPulses) state.impactPulses.shift();
  state.impactPulses.push({
    x,
    y,
    radius: 8,
    maxRadius,
    speed: maxRadius / life,
    life,
    maxLife: life,
    color,
    force,
  });
}

function capTransientEntities(state) {
  trimToLimit(state.bullets, LIMITS.bullets);
  trimToLimit(state.laserBeams, LIMITS.laserBeams);
  trimToLimit(state.enemyBullets, LIMITS.enemyBullets);
  trimToLimit(state.drops, LIMITS.drops);
  trimToLimit(state.particles, LIMITS.particles);
  trimToLimit(state.screenParticles, LIMITS.screenParticles);
  trimToLimit(state.shockwaves, LIMITS.shockwaves);
  trimToLimit(state.impactPulses, LIMITS.impactPulses);
}

function trimToLimit(items, limit) {
  if (items.length > limit) items.splice(0, items.length - limit);
}

function touching(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
