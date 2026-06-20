import { getBeatGrid, quantizeToNextBeat } from './audioRules.js';

export function createBeatAudio({ bpm = 150 } = {}) {
  const grid = getBeatGrid(bpm);
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let nextStepTime = 0;
  let step = 0;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = 0.24;
    master.connect(context.destination);
    noiseBuffer = createNoiseBuffer(context);
    nextStepTime = context.currentTime + 0.04;
    unlocked = true;
    context.resume();
  }

  function update(events) {
    if (!unlocked || !context || !master) return;
    if (context.state === 'suspended') context.resume();

    const now = context.currentTime;
    while (nextStepTime < now + 0.18) {
      scheduleBeatStep(nextStepTime, step);
      nextStepTime += grid.halfBeatSeconds;
      step += 1;
    }

    for (const event of events) {
      scheduleGameEvent(event, now);
    }
  }

  function scheduleBeatStep(time, stepIndex) {
    scheduleHat(time, stepIndex % 2 === 0 ? 0.055 : 0.034);
    if (stepIndex % 2 === 0) scheduleBass(time, stepIndex);
    if (stepIndex % 4 === 0) scheduleKick(time);
    if (stepIndex % 4 === 2) scheduleSnare(time);
  }

  function scheduleGameEvent(event, now) {
    const beatTime = quantizeToNextBeat(now + 0.015, bpm);
    const intensity = Math.max(0.2, Math.min(1.8, event.intensity || 1));

    if (event.type === 'bomb') {
      scheduleImpact(now + 0.01, 72, 0.48, 0.44 * intensity);
      scheduleRiser(beatTime, 180, 820, 0.28, 0.2);
      scheduleImpact(beatTime + grid.halfBeatSeconds, 48, 0.62, 0.32 * intensity);
      return;
    }

    if (event.type === 'boss') {
      scheduleRiser(beatTime, 65, 190, 0.8, 0.18);
      scheduleImpact(beatTime + grid.beatSeconds, 42, 0.72, 0.28);
      return;
    }

    if (event.type === 'bossKill') {
      scheduleImpact(now + 0.01, 38, 0.7, 0.5);
      scheduleChord(beatTime, [220, 330, 440], 0.28, 0.16);
      scheduleRiser(beatTime + grid.halfBeatSeconds, 260, 980, 0.35, 0.2);
      return;
    }

    if (event.type === 'kill') {
      scheduleBlip(beatTime, 560 + intensity * 90, 0.11, 0.12 * intensity);
      scheduleImpact(beatTime, 120, 0.12, 0.08 * intensity);
      return;
    }

    if (event.type === 'power' || event.type === 'charge' || event.type === 'heal') {
      scheduleChord(beatTime, event.type === 'heal' ? [440, 660] : [520, 780], 0.12, 0.08);
      return;
    }

    if (event.type === 'damage') {
      scheduleImpact(now + 0.01, 90, 0.22, 0.22);
      scheduleBlip(now + 0.02, 150, 0.12, 0.08, 'sawtooth');
    }
  }

  function scheduleKick(time) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(118, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.32, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  function scheduleSnare(time) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1700;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
    source.stop(time + 0.12);
  }

  function scheduleHat(time, amount) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = 5200;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
    source.stop(time + 0.055);
  }

  function scheduleBass(time, stepIndex) {
    const notes = [82.41, 98, 110, 98];
    scheduleBlip(time, notes[(stepIndex / 2) % notes.length | 0], 0.16, 0.08, 'triangle');
  }

  function scheduleBlip(time, frequency, duration, amount, type = 'square') {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function scheduleChord(time, frequencies, duration, amount) {
    for (const frequency of frequencies) {
      scheduleBlip(time, frequency, duration, amount / frequencies.length, 'triangle');
    }
  }

  function scheduleRiser(time, startFrequency, endFrequency, duration, amount) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFrequency, time);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(amount, time + duration * 0.38);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function scheduleImpact(time, frequency, duration, amount) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * 0.45), time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  return { unlock, update };
}

function createNoiseBuffer(context) {
  const length = Math.floor(context.sampleRate * 0.35);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
