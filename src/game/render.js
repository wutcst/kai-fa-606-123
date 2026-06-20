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
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#ff4fd8';
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#35104b';
  ctx.beginPath();
  ctx.moveTo(-96, 0);
  ctx.lineTo(-32, -74);
  ctx.lineTo(74, -48);
  ctx.lineTo(92, 0);
  ctx.lineTo(74, 48);
  ctx.lineTo(-32, 74);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff4fd8';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(-22 + i * 42, Math.sin(time * 3 + i) * 6, 13, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-6, 0, 54 + Math.sin(time * 4) * 5, 0.2, TAU - 0.2);
  ctx.stroke();
  drawHealthNib(ctx, boss, 130);
  ctx.restore();
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
