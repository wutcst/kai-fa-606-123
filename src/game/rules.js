export function createPlayerStats() {
  return {
    maxHp: 100,
    hp: 100,
    power: 0,
    spread: 1,
    fireInterval: 0.15,
    bombCharge: 0,
    speed: 440,
  };
}

export function getAutoFireShots(delta, fireInterval, currentTimer) {
  const total = currentTimer + delta;
  const shots = Math.floor(total / fireInterval);
  return {
    shots,
    nextTimer: total - shots * fireInterval,
  };
}

export function updateCombo(combo, delta, didKill) {
  if (didKill) {
    return {
      value: combo.value + 1,
      timer: 2.4,
    };
  }

  const timer = Math.max(0, combo.timer - delta);
  return timer === 0 ? { value: 0, timer: 0 } : { value: combo.value, timer };
}

export function applyKillReward(state, enemyScore) {
  const combo = state.combo + 1;
  return {
    ...state,
    combo,
    comboTimer: 2.4,
    score: state.score + enemyScore * combo,
    bombCharge: Math.min(1, state.bombCharge + 0.12),
  };
}

export function collectPowerDrop(player, amount) {
  player.power = Math.min(3, player.power + amount);
  player.fireInterval = Math.max(0.075, 0.15 - player.power * 0.025);
  player.spread = Math.min(4, 1 + Math.floor(player.power));
  return player;
}

export function getBossPhase(timeSeconds) {
  const cycle = Math.floor(timeSeconds / 30);
  if (cycle < 1) return null;

  return {
    cycle,
    hp: 600 + cycle * 300,
    score: 2000 + cycle * 800,
  };
}
