// Everything the player sees, drawn on one canvas. render.js reads the
// world and the screen state and draws them; it never changes the world.
// Buttons are drawn here and their rectangles are exported so main.js can
// route clicks to them.
import {
  BLOOM_COLORS,
  CANVAS_H,
  CANVAS_W,
  COPY,
  DAY_SECONDS,
  GRID_COLS,
  GRID_ROWS,
  GRID_X,
  GRID_Y,
  HEARTS,
  PALETTE,
  PLOT_GAP_X,
  PLOT_GAP_Y,
  PLOT_H,
  PLOT_W,
  RIPE_TTL,
} from './config.js';
import { clamp, lerp } from './random.js';
import { plotCenter } from './world.js';

const FONT = 'Trebuchet MS, Verdana, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight, align) {
  ctx.font = `${weight || 800} ${size}px ${FONT}`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 7);
  ctx.strokeStyle = 'rgba(25, 8, 45, 0.85)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function hexLerp(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`;
}

// Button geometry, shared with main.js for click routing.
export function screenButtons(screen) {
  const cx = CANVAS_W / 2;
  if (screen === 'title') {
    return [
      { id: 'start', x: cx - 190, y: 592, w: 380, h: 76, label: COPY.startButton },
      { id: 'mute', x: CANVAS_W - 76, y: 24, w: 52, h: 52, label: '♪' },
    ];
  }
  if (screen === 'dayclear') {
    return [{ id: 'next', x: cx - 190, y: 560, w: 380, h: 76, label: COPY.nextDayButton }];
  }
  if (screen === 'over') {
    return [{ id: 'again', x: cx - 190, y: 580, w: 380, h: 76, label: COPY.againButton }];
  }
  if (screen === 'paused') {
    return [
      { id: 'resume', x: cx - 190, y: 380, w: 380, h: 76, label: 'RESUME' },
      { id: 'restart', x: cx - 190, y: 476, w: 380, h: 64, label: 'RESTART DAY' },
    ];
  }
  return [{ id: 'mute', x: CANVAS_W - 76, y: 24, w: 52, h: 52, label: '♪' }];
}

function drawButton(ctx, b, hover) {
  const over = hover.x >= b.x && hover.x <= b.x + b.w && hover.y >= b.y && hover.y <= b.y + b.h;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  rr(ctx, b.x, b.y, b.w, b.h, 18);
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  if (over) {
    g.addColorStop(0, '#ffe066');
    g.addColorStop(1, '#f77f00');
  } else {
    g.addColorStop(0, '#ffd166');
    g.addColorStop(1, '#ef8354');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.stroke();
  ctx.font = `900 ${b.h > 70 ? 30 : 24}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a1d00';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

function drawSky(ctx, frac, time) {
  // frac: 0 at dawn, 1 at sunset. The sky deepens as the day runs out.
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, hexLerp(PALETTE.skyTop, '#12082e', frac * 0.7));
  g.addColorStop(0.55, hexLerp(PALETTE.skyMid, '#3d1a5e', frac * 0.7));
  g.addColorStop(1, hexLerp(PALETTE.skyLow, '#c94b6d', frac * 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars fade in as dusk approaches.
  if (frac > 0.45) {
    ctx.save();
    ctx.globalAlpha = (frac - 0.45) * 1.4;
    ctx.fillStyle = '#fff8e7';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 173.3) % CANVAS_W;
      const sy = (i * 97.7) % 210;
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + i * 1.7);
      ctx.globalAlpha = (frac - 0.45) * 1.4 * tw;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Drifting clouds.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 235, 220, 0.20)';
  for (let i = 0; i < 3; i++) {
    const cx = ((time * (10 + i * 5) + i * 430) % (CANVAS_W + 320)) - 160;
    const cy = 70 + i * 46;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 90, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 55, cy + 8, 60, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 60, cy + 9, 55, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // The sun rides an arc from left (dawn) to right (sunset), staying
  // below the HUD band at the top of the screen.
  const sunX = lerp(150, CANVAS_W - 150, frac);
  const sunY = 205 - Math.sin(frac * Math.PI) * 65;
  const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 70);
  sg.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  sg.addColorStop(0.35, 'rgba(255, 200, 90, 0.55)');
  sg.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

function drawGardenBed(ctx, time) {
  // Grass band and the fence line behind the plots.
  ctx.fillStyle = PALETTE.grassDark;
  ctx.fillRect(0, 210, CANVAS_W, CANVAS_H - 210);
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 210, CANVAS_W, 26);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  for (let i = 0; i < 60; i++) {
    const gx = (i * 137.5) % CANVAS_W;
    const gy = 216 + ((i * 53) % 560);
    const sway = Math.sin(time * 1.4 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 3 + sway, gy - 9);
    ctx.lineTo(gx + 6, gy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPlot(ctx, plot, time) {
  const x = GRID_X + plot.col * (PLOT_W + PLOT_GAP_X);
  const y = GRID_Y + plot.row * (PLOT_H + PLOT_GAP_Y);
  const cx = x + PLOT_W / 2;
  const baseY = y + PLOT_H - 18;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  rr(ctx, x, y, PLOT_W, PLOT_H, 16);
  ctx.fillStyle = plot.watered > 0 ? '#6b4a33' : PALETTE.soil;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 3;
  for (let i = 1; i <= 3; i++) {
    const fy = y + (PLOT_H / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x + 12, fy);
    ctx.lineTo(x + PLOT_W - 12, fy);
    ctx.stroke();
  }
  ctx.restore();
  if (plot.watered > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(time * 6);
    ctx.fillStyle = '#4cc9f0';
    rr(ctx, x + 6, y + 6, PLOT_W - 12, PLOT_H - 12, 12);
    ctx.fill();
    ctx.restore();
  }
  drawFlower(ctx, plot, cx, baseY, time);
}

function petal(ctx, x, y, len, wid, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -len / 2, wid / 2, len / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFlower(ctx, plot, cx, baseY, time) {
  const kind = BLOOM_COLORS[plot.colorIdx];
  const sway = Math.sin(time * 1.8 + plot.col * 1.3 + plot.row * 2.1) * 0.06;
  if (plot.stage === 'empty') return;
  if (plot.stage === 'seed') {
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.ellipse(cx, baseY - 4, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c98d5f';
    ctx.beginPath();
    ctx.ellipse(cx - 4, baseY - 8, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 5, baseY - 7, 4, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Stem + leaves, shared by sprout / bud / bloom / wilted.
  const h = plot.stage === 'sprout' ? 26 : plot.stage === 'bud' ? 44 : 58;
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.rotate(sway);
  ctx.strokeStyle = plot.stage === 'wilted' ? '#6b7c4a' : kind.stem;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4, -h / 2, 0, -h);
  ctx.stroke();
  ctx.fillStyle = plot.stage === 'wilted' ? '#7a8a55' : '#57b25e';
  ctx.beginPath();
  ctx.ellipse(-13, -h * 0.45, 13, 6, -0.6, 0, Math.PI * 2);
  ctx.ellipse(13, -h * 0.6, 13, 6, 0.6, 0, Math.PI * 2);
  ctx.fill();
  if (plot.stage === 'sprout') {
    ctx.fillStyle = '#7ee787';
    ctx.beginPath();
    ctx.ellipse(-7, -h - 4, 8, 4, -0.7, 0, Math.PI * 2);
    ctx.ellipse(7, -h - 4, 8, 4, 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (plot.stage === 'bud') {
    ctx.fillStyle = kind.petal;
    ctx.beginPath();
    ctx.ellipse(0, -h - 9, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-3, -h - 13, 3, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (plot.stage === 'bloom' || plot.stage === 'wilted') {
    const urgent = plot.stage === 'bloom' && plot.ripeTtl < 4;
    const pulse = plot.stage === 'bloom' ? 1 + 0.1 * Math.sin(time * (urgent ? 9 : 4)) : 1;
    const headY = -h - 14;
    if (plot.stage === 'bloom') {
      const glow = ctx.createRadialGradient(0, headY, 4, 0, headY, 46 * pulse);
      glow.addColorStop(0, 'rgba(255, 240, 160, 0.55)');
      glow.addColorStop(1, 'rgba(255, 240, 160, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, headY, 46 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    const petalColor = plot.stage === 'wilted' ? '#9a8a7a' : kind.petal;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      petal(ctx, 0, headY, 30 * pulse, 17 * pulse, a, petalColor);
    }
    ctx.fillStyle = plot.stage === 'wilted' ? '#6d5c4a' : kind.core;
    ctx.beginPath();
    ctx.arc(0, headY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 20, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(-3.5, headY - 2, 1.8, 0, Math.PI * 2);
    ctx.arc(3.5, headY - 2, 1.8, 0, Math.PI * 2);
    ctx.arc(0, headY + 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    if (urgent) {
      text(ctx, '!', 0, headY - 42, 26, '#ff4d6d', 900);
    }
  }
  ctx.restore();
}

function drawAphid(ctx, a, time) {
  const bobY = Math.sin(a.bob) * 3;
  ctx.save();
  ctx.translate(a.x, a.y + bobY);
  ctx.rotate(Math.sin(a.bob * 0.5) * 0.15);
  ctx.strokeStyle = '#2f5d1f';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const lx = i * 7;
    const swing = Math.sin(a.bob + i * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(lx, 2);
    ctx.lineTo(lx + swing - 5, 10);
    ctx.moveTo(lx, 2);
    ctx.lineTo(lx + swing + 5, 10);
    ctx.stroke();
  }
  ctx.fillStyle = '#7ac74f';
  ctx.beginPath();
  ctx.ellipse(0, 0, a.size * 0.75, a.size * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5da53a';
  ctx.beginPath();
  ctx.ellipse(-a.size * 0.45, -a.size * 0.28, a.size * 0.32, a.size * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d2b12';
  ctx.beginPath();
  ctx.arc(-a.size * 0.55, -a.size * 0.32, 2.2, 0, Math.PI * 2);
  ctx.arc(-a.size * 0.32, -a.size * 0.42, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f5d1f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-a.size * 0.6, -a.size * 0.5);
  ctx.quadraticCurveTo(-a.size * 0.9, -a.size * 0.9, -a.size * 0.7, -a.size * 1.05);
  ctx.moveTo(-a.size * 0.4, -a.size * 0.55);
  ctx.quadraticCurveTo(-a.size * 0.5, -a.size * 1.0, -a.size * 0.25, -a.size * 1.1);
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, x, y, filled, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = filled ? '#ff5d8f' : 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-13, -4, -8, -14, 0, -7);
  ctx.bezierCurveTo(8, -14, 13, -4, 0, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world, time) {
  const top = 18;
  ctx.save();
  // Score panel, top-left.
  rr(ctx, 20, top, 250, 64, 14);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.hudStroke;
  ctx.stroke();
  text(ctx, COPY.scoreLabel, 40, top + 18, 13, PALETTE.textDim, 800, 'left');
  text(ctx, String(world.score), 40, top + 44, 30, PALETTE.text, 900, 'left');
  text(ctx, `${COPY.bestLabel} ${world.best}`, 250, top + 18, 13, PALETTE.textDim, 800, 'right');

  // Combo meter under the score, only while a combo is alive.
  if (world.combo >= 2) {
    const w = 250 * clamp(world.comboTimer / 3, 0, 1);
    rr(ctx, 20, top + 74, 250, 26, 12);
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.fill();
    rr(ctx, 24, top + 78, Math.max(8, w - 8), 18, 8);
    ctx.fillStyle = '#ff9f1c';
    ctx.fill();
    text(ctx, `COMBO x${world.combo}`, 145, top + 87, 14, '#fff8e7', 900);
  }

  // Day + sun timer, top-centre.
  const cx = CANVAS_W / 2;
  rr(ctx, cx - 190, top, 380, 64, 14);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudStroke;
  ctx.stroke();
  text(ctx, `${COPY.dayLabel} ${world.day}`, cx - 168, top + 32, 20, PALETTE.text, 900, 'left');
  const frac = 1 - world.timeLeft / DAY_SECONDS;
  ctx.save();
  rr(ctx, cx - 96, top + 20, 252, 24, 12);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(cx - 96, top + 20, 252, 24);
  const tg = ctx.createLinearGradient(cx - 96, 0, cx + 156, 0);
  tg.addColorStop(0, '#ffd166');
  tg.addColorStop(1, '#ef476f');
  ctx.fillStyle = tg;
  ctx.fillRect(cx - 96, top + 20, 252 * frac, 24);
  ctx.restore();
  const mm = Math.floor(world.timeLeft / 60);
  const ss = Math.floor(world.timeLeft % 60);
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, cx + 168, top + 32, 20, PALETTE.text, 900, 'right');

  // Quota panel, top-right (left of the mute button).
  const qx = CANVAS_W - 20 - 52 - 12 - 300;
  rr(ctx, qx, top, 300, 64, 14);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudStroke;
  ctx.stroke();
  text(ctx, `${COPY.quotaLabel}  ${world.harvested}/${world.quota}`, qx + 16, top + 20, 16, PALETTE.text, 900, 'left');
  for (let i = 0; i < HEARTS; i++) {
    drawHeart(ctx, qx + 292 - i * 34, top + 46, i < HEARTS - world.heartsLost, 1.15);
  }
  // Footer hint, under the garden.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.font = '700 15px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('click a glowing bloom to harvest  ·  click an aphid to squish  ·  space to pause', CANVAS_W / 2, CANVAS_H - 14);
  ctx.restore();
  ctx.restore();
}

function drawTitle(ctx, world, hover, time, muted) {
  drawSky(ctx, 0.12, time);
  drawGardenBed(ctx, time);
  // A few decorative blooms along the bottom for the title.
  for (let i = 0; i < 5; i++) {
    const fake = { col: i, row: 0, stage: 'bloom', t: 0, colorIdx: i % BLOOM_COLORS.length, watered: 0, ripeTtl: 9 };
    drawFlower(ctx, fake, 150 + i * 245, 742, time);
  }
  ctx.save();
  ctx.fillStyle = 'rgba(20, 8, 40, 0.45)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
  text(ctx, COPY.title, CANVAS_W / 2, 190, 96, '#ffd166', 900);
  text(ctx, COPY.subtitle, CANVAS_W / 2, 258, 30, PALETTE.text, 700);
  // How-to card.
  rr(ctx, CANVAS_W / 2 - 420, 300, 840, 150, 18);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.hudStroke;
  ctx.stroke();
  wrapText(ctx, COPY.howTo, CANVAS_W / 2, 330, 780, 26, 22, PALETTE.text);
  wrapText(ctx, COPY.goal, CANVAS_W / 2, 402, 780, 26, 22, '#ffd166');
  text(ctx, 'Mouse: click to water, harvest, squish   ·   Space: pause   ·   R: restart   ·   M: mute', CANVAS_W / 2, 500, 19, PALETTE.textDim, 700);
  text(ctx, `BEST  ${world.best}`, CANVAS_W / 2, 546, 20, PALETTE.gold, 900);
  for (const b of screenButtons('title')) {
    if (b.id === 'mute') {
      drawMute(ctx, b, hover, muted);
    } else {
      drawButton(ctx, b, hover);
    }
  }
}

function drawMute(ctx, b, hover, muted) {
  const over = hover.x >= b.x && hover.x <= b.x + b.w && hover.y >= b.y && hover.y <= b.y + b.h;
  ctx.save();
  rr(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = over ? 'rgba(255,255,255,0.25)' : PALETTE.hudPanel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.hudStroke;
  ctx.stroke();
  ctx.font = '900 26px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = muted ? '#ff4d6d' : PALETTE.text;
  ctx.fillText(muted ? '✕' : '♪', b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

function wrapText(ctx, s, cx, y, maxW, lh, size, color) {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => {
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(25, 8, 45, 0.85)';
    ctx.strokeText(l, cx, y + i * lh);
    ctx.fillStyle = color;
    ctx.fillText(l, cx, y + i * lh);
  });
}

function drawDayClear(ctx, world, hover) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 6, 35, 0.62)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
  text(ctx, COPY.dayClear, CANVAS_W / 2, 210, 64, '#ffd166', 900);
  text(ctx, `Quota met: ${world.harvested} blooms harvested`, CANVAS_W / 2, 292, 26, PALETTE.text, 700);
  for (let i = 0; i < 3; i++) {
    const sx = CANVAS_W / 2 + (i - 1) * 90;
    const earned = i < world.stars;
    ctx.save();
    ctx.translate(sx, 370);
    ctx.scale(earned ? 1 : 0.85, earned ? 1 : 0.85);
    ctx.globalAlpha = earned ? 1 : 0.3;
    drawStar(ctx, 0, 0, 34, '#ffd166');
    ctx.restore();
  }
  text(ctx, `SCORE  ${world.score}`, CANVAS_W / 2, 452, 30, PALETTE.text, 900);
  text(ctx, `Day ${world.day + 1} brings a bigger quota and faster aphids.`, CANVAS_W / 2, 502, 20, PALETTE.textDim, 700);
  for (const b of screenButtons('dayclear')) drawButton(ctx, b, hover);
}

function drawStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGameOver(ctx, world, hover) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 6, 35, 0.66)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
  text(ctx, COPY.gameOver, CANVAS_W / 2, 210, 58, '#ff8fa3', 900);
  text(ctx, world.overReason, CANVAS_W / 2, 282, 24, PALETTE.text, 700);
  text(ctx, `SCORE  ${world.score}`, CANVAS_W / 2, 352, 34, PALETTE.text, 900);
  text(ctx, `BEST  ${world.best}`, CANVAS_W / 2, 400, 22, PALETTE.gold, 900);
  text(ctx, `Day ${world.day}  ·  ${world.harvested} blooms harvested`, CANVAS_W / 2, 448, 20, PALETTE.textDim, 700);
  text(ctx, 'Tip: water buds early — a watered bloom ripens twice as fast.', CANVAS_W / 2, 516, 19, PALETTE.textDim, 700);
  for (const b of screenButtons('over')) drawButton(ctx, b, hover);
}

function drawPaused(ctx, hover) {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 6, 35, 0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
  text(ctx, COPY.paused, CANVAS_W / 2, 300, 64, PALETTE.text, 900);
  text(ctx, 'Space to resume', CANVAS_W / 2, 352, 20, PALETTE.textDim, 700);
  for (const b of screenButtons('paused')) drawButton(ctx, b, hover);
}

// ui: { screen, hover, muted, time }
export function drawScene(ctx, world, ui) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const frac = world.status === 'playing' ? 1 - world.timeLeft / DAY_SECONDS : 0.55;
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 14;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  if (ui.screen === 'title') {
    drawTitle(ctx, world, ui.hover, ui.time, ui.muted);
  } else {
    drawSky(ctx, frac, ui.time);
    drawGardenBed(ctx, ui.time);
    for (const plot of world.plots) drawPlot(ctx, plot, ui.time);
    for (const a of world.aphids) drawAphid(ctx, a, ui.time);
    world.particles.draw(ctx);
    drawHud(ctx, world, ui.time);
    for (const b of screenButtons('playing')) drawMute(ctx, b, ui.hover, ui.muted);
    if (ui.screen === 'dayclear') drawDayClear(ctx, world, ui.hover);
    else if (ui.screen === 'over') drawGameOver(ctx, world, ui.hover);
    else if (ui.screen === 'paused') drawPaused(ctx, ui.hover);
  }
  ctx.restore();
  if (world.flash > 0) {
    ctx.save();
    ctx.globalAlpha = world.flash * 0.28;
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }
}
