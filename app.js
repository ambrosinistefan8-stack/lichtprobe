'use strict';

const model = window.releaseModel;
const byId = (id) => document.getElementById(id);
const ui = Object.fromEntries(['scenario', 'stage', 'scene-source', 'scene-step', 'scene-title',
  'timeline', 'run-counter', 'status', 'run', 'approve', 'export', 'file', 'music'].map(id => [id, byId(id)]));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const colors = { pass: '#87efdb', blocked: '#ffa298', waiting: '#f3c88c', idle: '#8aa8fe' };
const statusText = { pass: 'OK', blocked: 'BLOCKIERT', waiting: 'OFFEN', idle: 'BEREIT' };
let input = model.presets.ready;
let source = 'Synthetischer Prüflauf';
let report = model.inspect(input);
let completed = 0;
let selected = 0;
let playing = false;
let timer;

function render() {
  ui['scene-source'].textContent = source;
  ui['run-counter'].textContent = `${completed} / ${model.steps.length}`;
  ui['scene-step'].textContent = model.steps[selected].toLocaleUpperCase('de-CH');
  ui['scene-title'].textContent = selected < completed ? report.stages[selected].detail : 'Bereit für den Test';
  ui.approve.disabled = playing || completed !== model.steps.length || !report.isReady || report.isApproved;
  ui.export.disabled = completed !== model.steps.length || playing;
  ui.timeline.replaceChildren(...model.steps.map((name, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    if (index === selected) button.setAttribute('aria-current', 'step');
    const state = index < completed ? report.stages[index].status : 'idle';
    button.dataset.state = state;
    const number = document.createElement('span');
    number.className = 'index';
    number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.textContent = name;
    const status = document.createElement('b');
    status.textContent = statusText[state];
    button.append(number, label, status);
    button.addEventListener('click', () => {
      selected = index;
      render();
      ui.timeline.children[index].querySelector('button').focus();
    });
    item.append(button);
    return item;
  }));
}

function prepare(next, nextSource) {
  clearTimeout(timer);
  input = model.validate(next);
  source = nextSource;
  report = model.inspect(input);
  completed = 0;
  selected = 0;
  playing = false;
  ui.run.disabled = false;
  ui.status.textContent = `${input.name} ist geladen.`;
  render();
}

function advance() {
  selected = completed;
  completed += 1;
  playing = completed < model.steps.length;
  ui.run.disabled = playing;
  render();
  if (playing) {
    timer = setTimeout(advance, 610);
  } else {
    ui.status.textContent = report.isReady ? 'Alle Prüfpunkte erfüllt. Deine Freigabe ist möglich.' : 'Freigabe gesperrt. Wähle einen Prüfschritt für Details.';
  }
}

ui.scenario.addEventListener('change', () => prepare(model.presets[ui.scenario.value], 'Synthetischer Prüflauf'));
ui.run.addEventListener('click', () => {
  prepare(input, source);
  ui.status.textContent = 'Prüflauf läuft …';
  if (reducedMotion.matches) completed = model.steps.length - 1;
  advance();
});
ui.approve.addEventListener('click', () => {
  report = model.inspect(input, true);
  selected = model.steps.length - 1;
  render();
  ui.status.textContent = 'Im Labor freigegeben. Der Prüfbericht kann gespeichert werden.';
});
ui.file.addEventListener('change', async () => {
  const [file] = ui.file.files;
  if (!file) return;
  try {
    if (file.size > 128 * 1024) throw new Error('Die Prüfdatei darf höchstens 128 KiB gross sein.');
    prepare(JSON.parse(await file.text()), 'Lokal importierte Prüfdaten');
  } catch (error) {
    ui.status.textContent = error instanceof SyntaxError ? 'Die Datei enthält kein gültiges JSON.' : error.message;
  } finally {
    ui.file.value = '';
  }
});
ui.export.addEventListener('click', () => {
  const output = { source, savedAt: new Date().toISOString(), ...report };
  const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lichtprobe-pruefbericht.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

let audio, pulse;
const phrases = [[130.81, 196, 329.63], [146.83, 220, 261.63], [110, 164.81, 261.63], [98, 146.83, 293.66]];
let chordIndex = 0;
function playChord() {
  const now = audio.currentTime;
  const chord = phrases[chordIndex++ % phrases.length];
  chord.forEach((frequency, index) => {
    const osc = audio.createOscillator();
    const envelope = audio.createGain();
    const start = now + index * 0.12;
    osc.type = 'sine';
    osc.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.035, start + 0.55);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 3.4);
    osc.connect(envelope).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 3.5);
  });
}
ui.music.addEventListener('click', async () => {
  try {
    const playingMusic = ui.music.getAttribute('aria-pressed') === 'true';
    if (playingMusic) {
      clearInterval(pulse);
      await audio.close();
      audio = undefined;
    } else {
      audio = new AudioContext();
      await audio.resume();
      playChord();
      pulse = setInterval(playChord, 3390);
    }
    ui.music.setAttribute('aria-pressed', String(!playingMusic));
    ui.music.textContent = playingMusic ? '♫ Musik aus' : '♫ Musik an';
  } catch {
    ui.status.textContent = 'Ton ist in diesem Browser gerade nicht verfügbar.';
  }
});

const canvas = ui.stage;
const context = canvas.getContext('2d');
const tau = 2 * Math.PI;

function draw(now) {
  if (!context) return;
  const { width, height } = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  const time = reducedMotion.matches ? 0.9 : now / 1000;
  const scale = Math.min(width, height) * 0.23;
  const centerX = width * 0.51;
  const centerY = height * 0.54;
  const tint = colors[selected < completed ? report.stages[selected].status : 'idle'];

  function project(x, y, z) {
    const yaw = time * 0.38;
    const rotatedX = x * Math.cos(yaw) - y * Math.sin(yaw);
    const rotatedY = x * Math.sin(yaw) + y * Math.cos(yaw);
    const depth = 4.6 / (4.6 - rotatedY * 0.45 + z * 0.17);
    return [centerX + rotatedX * scale * depth, centerY + (rotatedY * 0.43 - z * 0.91) * scale * depth];
  }

  function path(points, color, widthPx = 1, fill = false, glow = 0) {
    context.beginPath();
    points.forEach((point, index) => {
      const [x, y] = project(...point);
      if (index) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    context.lineWidth = widthPx;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = glow;
    if (fill) {
      context.closePath();
      context.fillStyle = color + '18';
      context.fill();
    }
    context.stroke();
    context.shadowBlur = 0;
  }

  const halo = context.createRadialGradient(centerX, centerY, 3, centerX, centerY, scale * 2.1);
  halo.addColorStop(0, tint + '45');
  halo.addColorStop(0.5, tint + '14');
  halo.addColorStop(1, tint + '00');
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);

  for (let line = -8; line <= 8; line++) {
    const offset = line * 0.29;
    path([[-2.32, offset, -1.02], [2.32, offset, -1.02]], '#36636762');
    path([[offset, -2.32, -1.02], [offset, 2.32, -1.02]], '#36636762');
  }
  const ring = (radius, level, segments) => Array.from({ length: segments + 1 }, (_, index) => {
    const angle = tau * index / segments;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, level];
  });
  path(ring(1.65, -0.96, 48), tint + '88', 1.3, false, 12);
  path(ring(1.32, -0.89, 48), tint + '55');
  path(ring(1.48 + Math.sin(time * 2) * 0.025, -0.94, 48), tint + '38');

  for (let tier = 0; tier < model.steps.length; tier++) {
    const level = -0.65 + tier * 0.44;
    const radius = 1.1 - tier * 0.12;
    const steps = ring(radius, level + Math.sin(time + tier) * 0.025, 6);
    const completedStage = tier < completed ? report.stages[tier].status : 'idle';
    const layerColor = tier === selected ? tint : colors[completedStage] + (tier < completed ? '93' : '4f');
    path(steps, layerColor, tier === selected ? 2 : 1.05, tier === selected, tier === selected ? 17 : 0);
    if (tier) {
      for (let edge = 0; edge < 6; edge++) {
        const angle = tau * edge / 6;
        path([steps[edge], [Math.cos(angle) * (radius + 0.12), Math.sin(angle) * (radius + 0.12), level - 0.44]], tint + '30');
      }
    }
  }

  for (let index = 0; index < 46; index++) {
    const angle = index * 2.39996 + time * 0.21;
    const radius = 1.25 + (index % 9) * 0.070;
    const level = -0.8 + ((index % 13) / 13) * 1.9 + Math.sin(time * 1.3 + index) * 0.13;
    const [x, y] = project(Math.cos(angle) * radius, Math.sin(angle) * radius, level);
    context.fillStyle = index % 5 ? tint + '80' : '#e7fffa';
    context.fillRect(x, y, index % 5 ? 1.1 : 2, index % 5 ? 1.1 : 2);
  }
  window.requestAnimationFrame(draw);
}

render();
window.requestAnimationFrame(draw);
