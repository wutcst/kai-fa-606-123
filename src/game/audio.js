import { getBeatGrid, getMetalGrooveStep, quantizeToNextBeat } from './audioRules.js';

export function createBeatAudio({ bpm = 174 } = {}) {
  const grid = getBeatGrid(bpm);
  let context = null;
  let cleanBus = null;
  let metalBus = null;
  let noiseBuffer = null;
  let nextStepTime = 0;
  let step = 0;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    context = new AudioContextClass();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.11;

    const master = context.createGain();
    master.gain.value = 0.2;
    master.connect(compressor).connect(context.destination);

    cleanBus = context.createGain();
    cleanBus.gain.value = 0.95;
    cleanBus.connect(master);

    const distortion = context.createWaveShaper();
    distortion.curve = createDistortionCurve(520);
    distortion.oversample = '4x';

    const tone = context.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 4100;
    tone.Q.value = 0.7;

    metalBus = context.createGain();
    metalBus.gain.value = 0.78;
    metalBus.connect(distortion).connect(tone).connect(master);

    noiseBuffer = createNoiseBuffer(context);
    nextStepTime = context.currentTime + 0.035;
    unlocked = true;
    context.resume();
  }

  function update(events) {
    if (!unlocked || !context || !cleanBus || !metalBus) return;
    if (context.state === 'suspended') context.resume();

    const now = context.currentTime;
    while (nextStepTime < now + 0.2) {
      scheduleBeatStep(nextStepTime, step);
      nextStepTime += grid.quarterBeatSeconds;
      step += 1;
    }

    for (const event of events) {
      scheduleGameEvent(event, now);
    }
  }

  function scheduleBeatStep(time, stepIndex) {
    const groove = getMetalGrooveStep(stepIndex);
    scheduleHat(time, groove.accent ? 0.058 : 0.036);
    if (groove.crash) scheduleCrash(time, 0.18);
    if (groove.kick) scheduleKick(time, groove.accent);
    if (groove.snare) scheduleSnare(time, groove.accent);
    if (groove.riffFrequency) scheduleChug(time, groove.riffFrequency, groove.accent);
  }

  function scheduleGameEvent(event, now) {
    const beatTime = quantizeToNextBeat(now + 0.012, bpm);
    const intensity = Math.max(0.25, Math.min(2.2, event.intensity || 1));

    if (event.type === 'bomb') {
      scheduleKick(now + 0.005, true, 1.45 * intensity);
      scheduleCrash(now + 0.012, 0.38 * intensity);
      scheduleImpact(now + 0.01, 48, 0.72, 0.46 * intensity);
      scheduleRiser(beatTime, 95, 1380, 0.38, 0.18);
      scheduleBreakdownFill(beatTime + grid.halfBeatSeconds);
      return;
    }

    if (event.type === 'boss') {
      scheduleCrash(beatTime, 0.24);
      scheduleDoomSiren(beatTime, 62, 118, 1.1, 0.18);
      scheduleImpact(beatTime + grid.beatSeconds, 38, 0.85, 0.34);
      return;
    }

    if (event.type === 'bossKill') {
      scheduleKick(now + 0.005, true, 1.6);
      scheduleCrash(now + 0.01, 0.48);
      scheduleImpact(now + 0.01, 36, 0.9, 0.58);
      schedulePowerChord(beatTime, [82.41, 110, 164.81], 0.5, 0.2);
      scheduleBreakdownFill(beatTime + grid.halfBeatSeconds);
      return;
    }

    if (event.type === 'kill') {
      schedulePickScrape(beatTime, 0.1 * intensity);
      scheduleImpact(beatTime, 112, 0.1, 0.08 * intensity);
      return;
    }

    if (event.type === 'hit') {
      scheduleImpact(now + 0.003, 132, 0.08, 0.1 * intensity);
      schedulePickScrape(now + 0.006, 0.08 * intensity);
      if (intensity > 1) scheduleKick(now + 0.004, false, 0.42 * intensity);
      return;
    }

    if (event.type === 'weapon') {
      schedulePowerChord(beatTime, [220, 329.63, 440], 0.18, 0.1 * intensity);
      schedulePickScrape(beatTime, 0.09 * intensity);
      return;
    }

    if (event.type === 'laser') {
      schedulePickScrape(now + 0.004, 0.12 * intensity);
      scheduleBlip(now + 0.006, 980, 0.06, 0.045 * intensity, 'sawtooth', metalBus);
      return;
    }

    if (event.type === 'missile') {
      scheduleKick(now + 0.004, true, 1.25 * intensity);
      scheduleCrash(now + 0.01, 0.24 * intensity);
      scheduleImpact(now + 0.006, 54, 0.42, 0.32 * intensity);
      return;
    }

    if (event.type === 'power' || event.type === 'charge' || event.type === 'heal') {
      const notes = event.type === 'heal' ? [329.63, 440] : [246.94, 329.63];
      schedulePowerChord(beatTime, notes, 0.13, 0.07);
      return;
    }

    if (event.type === 'damage') {
      scheduleImpact(now + 0.005, 74, 0.25, 0.26);
      schedulePickScrape(now + 0.012, 0.16);
    }
  }

  function scheduleKick(time, accent = false, boost = 1) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 142 : 128, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime((accent ? 0.46 : 0.34) * boost, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain).connect(cleanBus);
    osc.start(time);
    osc.stop(time + 0.2);

    const click = context.createBufferSource();
    const clickGain = context.createGain();
    const filter = context.createBiquadFilter();
    click.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    clickGain.gain.setValueAtTime(0.001, time);
    clickGain.gain.exponentialRampToValueAtTime((accent ? 0.1 : 0.07) * boost, time + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    click.connect(filter).connect(clickGain).connect(metalBus);
    click.start(time);
    click.stop(time + 0.035);
  }

  function scheduleSnare(time, accent = false) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = accent ? 1850 : 1550;
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.2 : 0.15, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    source.connect(filter).connect(gain).connect(cleanBus);
    source.start(time);
    source.stop(time + 0.14);

    scheduleBlip(time, 190, 0.07, accent ? 0.08 : 0.055, 'square', cleanBus);
  }

  function scheduleHat(time, amount) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = 6800;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    source.connect(filter).connect(gain).connect(cleanBus);
    source.start(time);
    source.stop(time + 0.045);
  }

  function scheduleCrash(time, amount) {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = 3600;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.34);
    source.connect(filter).connect(gain).connect(cleanBus);
    source.start(time);
    source.stop(time + 0.38);
  }

  function scheduleChug(time, frequency, accent = false) {
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = accent ? 760 : 640;
    filter.Q.value = 1.1;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.15, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.105);

    for (const [type, detune] of [
      ['sawtooth', -8],
      ['square', 7],
    ]) {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, time);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + 0.13);
    }

    filter.connect(gain).connect(metalBus);
  }

  function scheduleBreakdownFill(time) {
    for (let i = 0; i < 4; i += 1) {
      scheduleKick(time + i * grid.quarterBeatSeconds, i === 0, 1.15);
      if (i % 2 === 1) scheduleSnare(time + i * grid.quarterBeatSeconds, true);
      scheduleChug(time + i * grid.quarterBeatSeconds, i % 2 === 0 ? 41.2 : 55, i === 0);
    }
  }

  function schedulePickScrape(time, amount) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(260, time + 0.08);
    filter.type = 'highpass';
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(filter).connect(gain).connect(metalBus);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  function schedulePowerChord(time, frequencies, duration, amount) {
    for (const frequency of frequencies) {
      scheduleBlip(time, frequency, duration, amount / frequencies.length, 'sawtooth', metalBus);
    }
  }

  function scheduleBlip(time, frequency, duration, amount, type = 'square', destination = metalBus) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function scheduleRiser(time, startFrequency, endFrequency, duration, amount) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFrequency, time);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(amount, time + duration * 0.36);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(metalBus);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function scheduleDoomSiren(time, startFrequency, endFrequency, duration, amount) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFrequency, time);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, time + duration * 0.5);
    osc.frequency.exponentialRampToValueAtTime(startFrequency * 0.72, time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(amount, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(metalBus);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function scheduleImpact(time, frequency, duration, amount) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, frequency * 0.38), time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(amount, time + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(cleanBus);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  return { unlock, update };
}

function createNoiseBuffer(context) {
  const length = Math.floor(context.sampleRate * 0.42);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createDistortionCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}
