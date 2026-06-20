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

const BOSS_TIERS = [
  {
    tier: 'warden',
    name: 'Pulse Warden',
    hp: 900,
    score: 2800,
    radius: 74,
    pattern: 'fan',
  },
  {
    tier: 'seraph',
    name: 'Blade Seraph',
    hp: 1260,
    score: 3800,
    radius: 84,
    pattern: 'crossfire',
  },
  {
    tier: 'leviathan',
    name: 'Void Leviathan',
    hp: 1680,
    score: 5200,
    radius: 96,
    pattern: 'spiral',
  },
  {
    tier: 'overlord',
    name: 'Nova Overlord',
    hp: 2160,
    score: 7000,
    radius: 108,
    pattern: 'storm',
  },
];

export function getBossPhase(timeSeconds) {
  const cycle = Math.floor(timeSeconds / 30);
  if (cycle < 1) return null;

  const tier = BOSS_TIERS[Math.min(cycle - 1, BOSS_TIERS.length - 1)];
  const repeatScale = Math.max(0, cycle - BOSS_TIERS.length);
  return {
    cycle,
    tier: tier.tier,
    name: tier.name,
    hp: tier.hp + repeatScale * 480,
    score: tier.score + repeatScale * 1200,
    radius: tier.radius,
    pattern: tier.pattern,
  };
}
