// The garden itself: plots, flowers, aphids, the day timer and the score.
// No drawing here — render.js reads this state — and no input handling
// beyond "a click landed at (x, y)". The world reports big moments
// (bloom lost, day cleared, day failed) through its `status` field.
import {
  APHID_FIRST_SPAWN,
  APHID_INTERVAL_DAY1,
  APHID_INTERVAL_MIN,
  APHID_INTERVAL_STEP,
  APHID_SPEED_DAY1,
  APHID_SPEED_MAX,
  APHID_SPEED_STEP,
  BLOOM_COLORS,
  CANVAS_H,
  CANVAS_W,
  COMBO_MAX,
  COMBO_WINDOW,
  DAY1_QUOTA,
  DAY_SECONDS,
  GRID_COLS,
  GRID_ROWS,
  GRID_X,
  GRID_Y,
  GROW_BUD,
  GROW_SEED,
  GROW_SPROUT,
  HARVEST_POINTS,
  HEARTS,
  PLOT_GAP_X,
  PLOT_GAP_Y,
  PLOT_H,
  PLOT_W,
  QUOTA_STEP,
  RIPE_TTL,
  SQUISH_POINTS,
  WATER_BOOST,
  WATER_POINTS,
  WATER_TTL,
} from './config.js';
import { clamp, pick, range } from './random.js';

export function plotCenter(col, row) {
  return {
    x: GRID_X + col * (PLOT_W + PLOT_GAP_X) + PLOT_W / 2,
    y: GRID_Y + row * (PLOT_H + PLOT_GAP_Y) + PLOT_H / 2,
  };
}

export function plotAt(x, y) {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const px = GRID_X + col * (PLOT_W + PLOT_GAP_X);
      const py = GRID_Y + row * (PLOT_H + PLOT_GAP_Y);
      if (x >= px - 6 && x <= px + PLOT_W + 6 && y >= py - 6 && y <= py + PLOT_H + 6) {
        return { col, row };
      }
    }
  }
  return null;
}

export class World {
  constructor(rng, sounds, particles) {
    this.rng = rng;
    this.sounds = sounds;
    this.particles = particles;
    this.day = 1;
    this.score = 0;
    this.best = 0;
    this.status = 'playing'; // playing | dayclear | over
    this.overReason = '';
    this.plots = [];
    this.aphids = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.harvested = 0;
    this.quota = DAY1_QUOTA;
    this.heartsLost = 0;
    this.timeLeft = DAY_SECONDS;
    this.elapsed = 0;
    this.spawnTimer = APHID_FIRST_SPAWN;
    this.shake = 0;
    this.flash = 0;
    this.stars = 0;
    try {
      this.best = Number(window.localStorage.getItem('bloom-rush-best') || 0) || 0;
    } catch {
      this.best = 0;
    }
    this.startDay(1);
  }

  startDay(day) {
    this.day = day;
    this.status = 'playing';
    this.overReason = '';
    this.quota = DAY1_QUOTA + (day - 1) * QUOTA_STEP;
    this.harvested = 0;
    this.heartsLost = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.timeLeft = DAY_SECONDS;
    this.elapsed = 0;
    this.spawnTimer = APHID_FIRST_SPAWN;
    this.aphids = [];
    this.shake = 0;
    this.flash = 0;
    this.stars = 0;
    this.plots = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        // Stagger the first growth so the garden fills in waves, not all at once.
        const stagger = (col + row * GRID_COLS) * 0.55 + range(this.rng, 0, 0.8);
        this.plots.push({
          col,
          row,
          stage: 'seed',
          t: -stagger,
          colorIdx: Math.floor(this.rng() * BLOOM_COLORS.length),
          watered: 0,
          ripeTtl: RIPE_TTL,
        });
      }
    }
  }

  get aphidInterval() {
    return Math.max(
      APHID_INTERVAL_MIN,
      APHID_INTERVAL_DAY1 - (this.day - 1) * APHID_INTERVAL_STEP,
    );
  }

  get aphidSpeed() {
    return Math.min(
      APHID_SPEED_MAX,
      APHID_SPEED_DAY1 + (this.day - 1) * APHID_SPEED_STEP,
    );
  }

  update(dt) {
    if (this.status !== 'playing') return;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    for (const plot of this.plots) this.updatePlot(plot, dt);
    this.updateAphids(dt);

    if (this.timeLeft <= 0) {
      if (this.harvested >= this.quota) this.clearDay();
      else this.failDay('The sun set before the quota was met.');
    }
  }

  updatePlot(plot, dt) {
    if (plot.watered > 0) plot.watered -= dt;
    const rate = plot.watered > 0 ? WATER_BOOST : 1;
    plot.t += dt * rate;
    if (plot.stage === 'seed' && plot.t >= GROW_SEED) {
      plot.stage = 'sprout';
      plot.t = 0;
      this.sounds.sprout();
    } else if (plot.stage === 'sprout' && plot.t >= GROW_SPROUT) {
      plot.stage = 'bud';
      plot.t = 0;
    } else if (plot.stage === 'bud' && plot.t >= GROW_BUD) {
      plot.stage = 'bloom';
      plot.t = 0;
      plot.ripeTtl = RIPE_TTL;
      const c = plotCenter(plot.col, plot.row);
      this.particles.sparkle(c.x, c.y - 34, BLOOM_COLORS[plot.colorIdx].petal);
    } else if (plot.stage === 'bloom') {
      plot.ripeTtl -= dt;
      if (plot.ripeTtl <= 0) this.wilt(plot, 'It wilted unpicked.');
    } else if (plot.stage === 'wilted') {
      if (plot.t >= 2.5) {
        plot.stage = 'empty';
        plot.t = 0;
      }
    } else if (plot.stage === 'empty') {
      if (plot.t >= 1.6) {
        plot.stage = 'seed';
        plot.t = 0;
        plot.colorIdx = Math.floor(this.rng() * BLOOM_COLORS.length);
      }
    }
  }

  wilt(plot, why) {
    plot.stage = 'wilted';
    plot.t = 0;
    this.loseBloom(why);
  }

  loseBloom(why) {
    this.heartsLost += 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 0.6;
    this.flash = 0.8;
    this.sounds.lost();
    if (this.heartsLost >= HEARTS) {
      this.failDay(why);
    }
  }

  failDay(reason) {
    if (this.status !== 'playing') return;
    this.status = 'over';
    this.overReason = reason;
    this.sounds.gameOver();
    this.saveBest();
  }

  clearDay() {
    if (this.status !== 'playing') return;
    this.status = 'dayclear';
    // Stars: 1 for meeting the quota, 1 for no bloom lost, 1 for a fast finish.
    this.stars = 1 + (this.heartsLost === 0 ? 1 : 0) + (this.timeLeft >= 20 ? 1 : 0);
    this.score += Math.round(this.timeLeft) * 10;
    this.sounds.dayClear();
    this.saveBest();
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('bloom-rush-best', String(this.best));
      } catch {
        // Private mode: the best score just lives for this session.
      }
    }
  }

  updateAphids(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.aphidInterval * range(this.rng, 0.85, 1.2);
      this.spawnAphid();
    }
    for (const a of this.aphids) {
      a.bob += dt * 9;
      if (!a.target) {
        a.target = this.nearestEdible(a);
        if (!a.target) {
          // Nothing worth eating yet: drift toward the garden and wait.
          a.x += (CANVAS_W / 2 - a.x) * 0.25 * dt;
          continue;
        }
      }
      const target = this.plots[a.target];
      if (!target || (target.stage !== 'bloom' && target.stage !== 'bud')) {
        a.target = null;
        continue;
      }
      const c = plotCenter(target.col, target.row);
      const dx = c.x - a.x;
      const dy = c.y - 8 - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 26) {
        this.eat(a, target);
      } else {
        a.x += (dx / d) * this.aphidSpeed * dt;
        a.y += (dy / d) * this.aphidSpeed * dt;
      }
    }
    this.aphids = this.aphids.filter((a) => a.alive);
  }

  spawnAphid() {
    const fromLeft = this.rng() < 0.5;
    const row = Math.floor(this.rng() * GRID_ROWS);
    const c = plotCenter(0, row);
    this.aphids.push({
      x: fromLeft ? -24 : CANVAS_W + 24,
      y: c.y + range(this.rng, -40, 40),
      target: null,
      bob: this.rng() * 6,
      alive: true,
      size: range(this.rng, 15, 19),
    });
  }

  nearestEdible(a) {
    let bestIdx = null;
    let bestD = Infinity;
    for (let i = 0; i < this.plots.length; i++) {
      const p = this.plots[i];
      if (p.stage !== 'bloom' && p.stage !== 'bud') continue;
      const c = plotCenter(p.col, p.row);
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  eat(aphid, plot) {
    aphid.alive = false;
    const c = plotCenter(plot.col, plot.row);
    this.particles.burst(c.x, c.y - 20, '#8ac926', 10, 120, 0.6, 5, 300);
    if (plot.stage === 'bloom' || plot.stage === 'bud') {
      plot.stage = 'empty';
      plot.t = 0;
      this.loseBloom('An aphid ate a bloom.');
    }
  }

  handleClick(x, y) {
    if (this.status !== 'playing') return false;
    // Aphids first: they are small and sit on top of the plots.
    for (const a of this.aphids) {
      if (!a.alive) continue;
      if (Math.hypot(x - a.x, y - a.y) <= 30) {
        a.alive = false;
        this.score += SQUISH_POINTS;
        this.sounds.squish();
        this.particles.splat(a.x, a.y);
        this.particles.floatText(a.x, a.y - 18, `+${SQUISH_POINTS}`, '#b7ff7a', false);
        return true;
      }
    }
    const hit = plotAt(x, y);
    if (!hit) return false;
    const plot = this.plots[hit.row * GRID_COLS + hit.col];
    const c = plotCenter(plot.col, plot.row);
    if (plot.stage === 'bloom') {
      this.combo = this.comboTimer > 0 ? Math.min(this.combo + 1, COMBO_MAX) : 1;
      this.comboTimer = COMBO_WINDOW;
      const pts = HARVEST_POINTS * this.combo;
      this.score += pts;
      this.harvested += 1;
      this.sounds.harvest(this.combo);
      this.particles.petals(c.x, c.y - 30, BLOOM_COLORS[plot.colorIdx].petal);
      this.particles.floatText(
        c.x,
        c.y - 56,
        `+${pts}${this.combo > 1 ? `  x${this.combo}` : ''}`,
        '#ffd166',
        this.combo >= 3,
      );
      plot.stage = 'empty';
      plot.t = 0;
      return true;
    }
    if (plot.stage === 'seed' || plot.stage === 'sprout' || plot.stage === 'bud') {
      if (plot.watered <= 0) {
        this.score += WATER_POINTS;
        this.sounds.water();
        this.particles.splash(c.x, c.y + 10);
        this.particles.floatText(c.x, c.y - 40, `+${WATER_POINTS}`, '#4cc9f0', false);
      }
      plot.watered = WATER_TTL;
      return true;
    }
    return false;
  }
}
