const TAU = Math.PI * 2;
let backgroundCache = null;

export function renderGame(ctx, state) {
  const width = state.width;
  const height = state.height;
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawSpace(ctx, state);
  ctx.translate(shakeX, shakeY);
  drawDrops(ctx, state.drops, state.time);
  drawBullets(ctx, state.bullets, true);
  drawBullets(ctx, state.enemyBullets, false);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state.particles);
  drawShockwaves(ctx, state.shockwaves);
  drawImpactPulses(ctx, state);
  drawScreenParticles(ctx, state.screenParticles);
  drawMessage(ctx, state);
  ctx.restore();

  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = state.flash * 0.28;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function drawSpace(ctx, state) {
  const background = getBackground(ctx, state.width, state.height);
  ctx.drawImage(background, 0, 0, state.width, state.height);

  for (const star of state.stars) {
    const x = (star.x - state.time * 54 * star.z) % state.width;
    const wrappedX = x < 0 ? x + state.width : x;
    ctx.fillStyle = `hsla(${star.hue}, 100%, 82%, ${0.26 + star.z * 0.32})`;
    ctx.fillRect(wrappedX, star.y, 1 + star.z * 1.7, 1 + star.z * 0.4);
  }

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#4df8ff';
  ctx.lineWidth = 1;
  for (let x = (state.time * -42) % 80; x < state.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 130, state.height);
    ctx.stroke();
  }
  ctx.restore();
}

function getBackground(ctx, width, height) {
  if (backgroundCache && backgroundCache.width === width && backgroundCache.height === height) {
    return backgroundCache.canvas;
  }

  const canvas = ctx.canvas.ownerDocument.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const bg = canvas.getContext('2d');
  const gradient = bg.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#050611');
  gradient.addColorStop(0.45, '#10132c');
  gradient.addColorStop(1, '#05030a');
  bg.fillStyle = gradient;
  bg.fillRect(0, 0, width, height);

  bg.save();
  bg.globalCompositeOperation = 'lighter';
  drawNebula(bg, width * 0.18, height * 0.22, width * 0.34, '#4df8ff', 0.08);
  drawNebula(bg, width * 0.74, height * 0.72, width * 0.38, '#ff4fd8', 0.08);
  drawNebula(bg, width * 0.54, height * 0.38, width * 0.26, '#ffd166', 0.035);
  bg.restore();

  backgroundCache = { canvas, width, height };
  return canvas;
}

function drawNebula(ctx, x, y, radius, color, alpha) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, state) {
  const player = state.player;
  const flicker = player.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0;
  if (flicker) ctx.globalAlpha = 0.48;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = 'lighter';
  const flame = 24 + Math.sin(state.time * 34) * 8;
  ctx.fillStyle = '#4df8ff';
  ctx.shadowColor = '#4df8ff';
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.moveTo(-18, -9);
  ctx.lineTo(-18 - flame, 0);
  ctx.lineTo(-18, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = '#4df8ff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#eaffff';
  ctx.beginPath();
  ctx.moveTo(31, 0);
  ctx.lineTo(-14, -19);
  ctx.lineTo(-4, -5);
  ctx.lineTo(-26, -2);
  ctx.lineTo(-26, 2);
  ctx.lineTo(-4, 5);
  ctx.lineTo(-14, 19);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff4fd8';
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = 1;
}

function drawEnemies(ctx, state) {
  for (const enemy of state.enemies) {
    if (enemy.kind === 'boss') {
      drawBoss(ctx, enemy, state.time);
    } else {
      drawEnemy(ctx, enemy, state.time);
    }
  }
}

function drawEnemy(ctx, enemy, time) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.sin(time * 2 + enemy.moveSeed) * 0.08);
  ctx.fillStyle = enemy.kind === 'scout' ? '#ff4fd8' : enemy.kind === 'rammer' ? '#ff3d5a' : '#ffd166';
  ctx.beginPath();
  ctx.moveTo(-enemy.r, 0);
  ctx.lineTo(enemy.r * 0.72, -enemy.r * 0.72);
  ctx.lineTo(enemy.r * 0.36, 0);
  ctx.lineTo(enemy.r * 0.72, enemy.r * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#050611';
  ctx.globalAlpha = 0.45;
  ctx.fillRect(-enemy.r * 0.08, -enemy.r * 0.34, enemy.r * 0.52, enemy.r * 0.68);
  ctx.globalAlpha = 1;
  drawHealthNib(ctx, enemy);
  ctx.restore();
}

function drawBoss(ctx, boss, time) {
  const palette = getBossPalette(boss);
  const pulse = Math.sin(time * 4) * 5;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 34;

  ctx.fillStyle = palette.hull;
  drawBossHull(ctx, boss);

  ctx.fillStyle = palette.core;
  if (boss.tier === 'seraph') {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(-12 + i * 28, Math.sin(time * 3 + i) * 7, 9, 17, Math.PI / 2.8, 0, TAU);
      ctx.fill();
    }
  } else if (boss.tier === 'leviathan') {
    for (let i = 0; i < 6; i++) {
      const angle = time * 1.6 + i * (TAU / 6);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 42 - 10, Math.sin(angle) * 28, 10, 0, TAU);
      ctx.fill();
    }
  } else if (boss.tier === 'overlord') {
    for (let i = 0; i < 8; i++) {
      const angle = time * 1.2 + i * (TAU / 8);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 52 - 8, Math.sin(angle) * 42, i % 2 ? 8 : 12, 0, TAU);
      ctx.fill();
    }
  } else {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(-22 + i * 42, Math.sin(time * 3 + i) * 6, 13, 0, TAU);
      ctx.fill();
    }
  }

  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-6, 0, boss.r * 0.62 + pulse, 0.2, TAU - 0.2);
  ctx.stroke();
  drawHealthNib(ctx, boss, boss.r * 1.65);
  ctx.restore();
}

function drawBossHull(ctx, boss) {
  if (boss.tier === 'seraph') {
    ctx.beginPath();
    ctx.moveTo(-boss.r * 1.12, 0);
    ctx.lineTo(-boss.r * 0.34, -boss.r * 0.9);
    ctx.lineTo(boss.r * 0.92, -boss.r * 0.58);
    ctx.lineTo(boss.r * 0.5, 0);
    ctx.lineTo(boss.r * 0.92, boss.r * 0.58);
    ctx.lineTo(-boss.r * 0.34, boss.r * 0.9);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (boss.tier === 'leviathan') {
    ctx.beginPath();
    ctx.ellipse(-8, 0, boss.r * 1.08, boss.r * 0.64, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-boss.r * 1.22, -boss.r * 0.28);
    ctx.lineTo(-boss.r * 1.62, 0);
    ctx.lineTo(-boss.r * 1.22, boss.r * 0.28);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (boss.tier === 'overlord') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI + i * (TAU / 10);
      const radius = boss.r * (i % 2 ? 0.82 : 1.16);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(-boss.r * 1.14, 0);
  ctx.lineTo(-boss.r * 0.38, -boss.r * 0.9);
  ctx.lineTo(boss.r * 0.88, -boss.r * 0.58);
  ctx.lineTo(boss.r * 1.1, 0);
  ctx.lineTo(boss.r * 0.88, boss.r * 0.58);
  ctx.lineTo(-boss.r * 0.38, boss.r * 0.9);
  ctx.closePath();
  ctx.fill();
}

function getBossPalette(boss) {
  if (boss.tier === 'seraph') {
    return { hull: '#4a184f', core: '#ffd166', ring: '#4df8ff', glow: '#ffd166' };
  }
  if (boss.tier === 'leviathan') {
    return { hull: '#151a62', core: '#4df8ff', ring: '#ff4fd8', glow: '#4df8ff' };
  }
  if (boss.tier === 'overlord') {
    return { hull: '#4d1030', core: '#ff3d5a', ring: '#ffd166', glow: '#ff3d5a' };
  }
  return { hull: '#35104b', core: '#ff4fd8', ring: '#ffd166', glow: '#ff4fd8' };
}

function drawHealthNib(ctx, enemy, width = enemy.r * 2) {
  const pct = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-width / 2, enemy.r + 10, width, 4);
  ctx.fillStyle = pct > 0.38 ? '#4df8ff' : '#ff3d5a';
  ctx.fillRect(-width / 2, enemy.r + 10, width * pct, 4);
}

function drawBullets(ctx, bullets, friendly) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = friendly ? 10 : 8;
  ctx.lineCap = 'round';
  ctx.lineWidth = friendly ? 5 : 4;

  for (const color of ['#4df8ff', '#ffd166', '#ff4fd8', '#ff3d5a', '#ffffff']) {
    ctx.beginPath();
    let hasColor = false;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    for (const bullet of bullets) {
      if (bullet.color !== color) continue;
      const trail = friendly ? 18 : 10;
      hasColor = true;
      ctx.moveTo(bullet.x - Math.sign(bullet.vx) * trail, bullet.y);
      ctx.lineTo(bullet.x, bullet.y);
    }
    if (hasColor) ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  for (const bullet of bullets) {
    const size = friendly ? 3.5 : 4.5;
    ctx.fillRect(bullet.x - size / 2, bullet.y - size / 2, size, size);
  }
  ctx.restore();
}

function drawDrops(ctx, drops, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const drop of drops) {
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(time * 4);
    ctx.strokeStyle = drop.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = drop.color;
    ctx.beginPath();
    ctx.rect(-drop.r, -drop.r, drop.r * 2, drop.r * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / (particle.maxLife || 1));
    ctx.globalAlpha = particle.type === 'ember' ? alpha * 0.55 : alpha;
    ctx.fillStyle = particle.color;
    if (particle.type === 'ray') {
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = Math.max(2, particle.r * 0.55);
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(
        particle.x - Math.cos(particle.angle) * particle.length * alpha,
        particle.y - Math.sin(particle.angle) * particle.length * alpha,
      );
      ctx.stroke();
    } else {
      const size = particle.type === 'ember' ? particle.r * (1.4 - alpha * 0.35) : particle.r;
      ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawShockwaves(ctx, shockwaves) {
  if (!shockwaves.length) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const wave of shockwaves) {
    const alpha = Math.max(0, wave.life / wave.maxLife);
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = Math.max(1, wave.lineWidth * alpha);
    ctx.shadowColor = wave.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.min(wave.radius, wave.maxRadius), 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.32;
    ctx.lineWidth = Math.max(1, wave.lineWidth * 0.45 * alpha);
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.min(wave.radius * 0.62, wave.maxRadius), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawImpactPulses(ctx, state) {
  if (!state.impactPulses.length) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const pulse of state.impactPulses) {
    const alpha = Math.max(0, pulse.life / pulse.maxLife);
    const radius = Math.min(pulse.radius, pulse.maxRadius);
    const glow = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, Math.max(1, radius));
    glow.addColorStop(0, pulse.color);
    glow.addColorStop(0.22, pulse.color);
    glow.addColorStop(1, 'transparent');

    ctx.globalAlpha = alpha * 0.22 * pulse.force;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.globalAlpha = alpha * 0.74;
    ctx.strokeStyle = pulse.color;
    ctx.shadowColor = pulse.color;
    ctx.shadowBlur = 22 * pulse.force;
    ctx.lineWidth = Math.max(2, 14 * alpha * pulse.force);
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.34;
    ctx.lineWidth = Math.max(1, 4 * pulse.force);
    for (let i = 0; i < 10; i++) {
      const angle = state.time * 3.2 + i * (TAU / 10);
      const inner = radius * 0.24;
      const outer = radius * (0.84 + pulse.force * 0.12);
      ctx.beginPath();
      ctx.moveTo(pulse.x + Math.cos(angle) * inner, pulse.y + Math.sin(angle) * inner);
      ctx.lineTo(pulse.x + Math.cos(angle) * outer, pulse.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawScreenParticles(ctx, particles) {
  if (!particles.length) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.globalAlpha = particle.type === 'confetti' ? alpha * 0.72 : alpha;
    ctx.strokeStyle = particle.color;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.type === 'slash' ? 24 : 12;

    if (particle.type === 'slash') {
      ctx.lineWidth = Math.max(2, particle.r * 0.75);
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(
        particle.x - Math.cos(particle.angle) * particle.length * (0.35 + alpha),
        particle.y - Math.sin(particle.angle) * particle.length * (0.35 + alpha),
      );
      ctx.stroke();
      continue;
    }

    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.angle);
    if (particle.type === 'streak') {
      ctx.lineWidth = Math.max(2, particle.r * 0.45);
      ctx.beginPath();
      ctx.moveTo(-particle.length * 0.5, 0);
      ctx.lineTo(particle.length * 0.5, 0);
      ctx.stroke();
    } else {
      ctx.fillRect(-particle.r * 0.5, -particle.r * 0.5, particle.r, particle.r);
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawMessage(ctx, state) {
  if (state.message.timer <= 0) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, state.message.timer);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.min(74, state.width * 0.09)}px ui-sans-serif, system-ui`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = state.message.text === 'WARNING' ? '#ff3d5a' : '#4df8ff';
  ctx.shadowBlur = 30;
  ctx.fillText(state.message.text, state.width * 0.5, state.height * 0.42);
  ctx.restore();
}
