// Screenshot setups: scripted, mid-action garden states for the entry's
// screenshots. Each one starts a real day and then arranges plots, aphids,
// score and timer into a moment worth showing — the game then renders
// exactly that state. `?shot=start` needs no setup (the title screen).
import { BLOOM_COLORS, CANVAS_W, GRID_COLS } from './config.js';
import { plotCenter } from './world.js';

function setPlot(world, col, row, stage, colorIdx, ripeTtl) {
  const plot = world.plots[row * GRID_COLS + col];
  plot.stage = stage;
  plot.t = 0;
  plot.colorIdx = colorIdx % BLOOM_COLORS.length;
  plot.watered = 0;
  plot.ripeTtl = ripeTtl ?? 9;
  return plot;
}

function placeAphid(world, x, y, targetCol, targetRow) {
  const target = targetRow * GRID_COLS + targetCol;
  world.aphids.push({ x, y, target, bob: 1.2, alive: true, size: 17 });
}

export function setupShot(world, name) {
  world.startDay(1);
  if (name === 'play') {
    // A busy mid-day garden: ripe blooms glowing, buds on the way, aphids
    // closing in, a combo running.
    setPlot(world, 0, 0, 'bloom', 0);
    setPlot(world, 1, 0, 'bloom', 1);
    setPlot(world, 2, 0, 'bud', 2);
    setPlot(world, 3, 0, 'sprout', 3);
    setPlot(world, 0, 1, 'bud', 2);
    setPlot(world, 1, 1, 'bloom', 3, 8);
    setPlot(world, 2, 1, 'bloom', 0, 6);
    setPlot(world, 3, 1, 'seed', 1);
    setPlot(world, 0, 2, 'sprout', 3);
    setPlot(world, 1, 2, 'bloom', 2, 9);
    setPlot(world, 2, 2, 'bud', 1);
    setPlot(world, 3, 2, 'bloom', 1, 3);
    const c = plotCenter(1, 1);
    world.plots[1 * GRID_COLS + 1].watered = 4;
    placeAphid(world, 120, 330, 0, 0);
    placeAphid(world, CANVAS_W - 130, 470, 2, 1);
    placeAphid(world, 640, 210, 1, 0);
    world.score = 1250;
    world.harvested = 7;
    world.combo = 3;
    world.comboTimer = 2.4;
    world.timeLeft = 47;
    world.particles.petals(c.x, c.y - 30, BLOOM_COLORS[3].petal);
    world.particles.floatText(c.x, c.y - 56, '+300  x3', '#ffd166', true);
    return;
  }
  if (name === 'combo') {
    // The payoff moment: a big combo, petals everywhere, an aphid just
    // squished, one heart already lost to keep the stakes visible.
    for (let col = 0; col < 4; col++) {
      setPlot(world, col, 0, 'bloom', col, 8);
      setPlot(world, col, 1, 'bloom', (col + 1) % 4, 7);
      setPlot(world, col, 2, 'bud', (col + 2) % 4);
    }
    setPlot(world, 1, 2, 'bloom', 2, 5);
    setPlot(world, 3, 2, 'bloom', 0, 4);
    placeAphid(world, 210, 430, 0, 1);
    placeAphid(world, CANVAS_W - 200, 300, 3, 0);
    world.score = 4200;
    world.harvested = 10;
    world.combo = 6;
    world.comboTimer = 2.8;
    world.heartsLost = 1;
    world.timeLeft = 31;
    const c1 = plotCenter(1, 1);
    const c2 = plotCenter(2, 0);
    world.particles.petals(c1.x, c1.y - 30, BLOOM_COLORS[2].petal);
    world.particles.petals(c2.x, c2.y - 30, BLOOM_COLORS[1].petal);
    world.particles.splat(980, 560);
    world.particles.floatText(c1.x, c1.y - 56, '+600  x6', '#ffd166', true);
    world.particles.floatText(980, 530, '+25', '#b7ff7a', false);
    return;
  }
  if (name === 'win') {
    // The day is won: quota met, three stars, the next-day button waiting.
    for (let col = 0; col < 4; col++) {
      setPlot(world, col, 0, 'bloom', col);
      setPlot(world, col, 2, 'sprout', (col + 2) % 4);
    }
    setPlot(world, 1, 1, 'bloom', 1);
    setPlot(world, 2, 1, 'bloom', 3);
    world.score = 3800;
    world.harvested = 12;
    world.timeLeft = 18;
    world.status = 'dayclear';
    world.stars = 3;
    const c = plotCenter(2, 1);
    world.particles.sparkle(c.x, c.y - 40, '#ffd166');
    world.particles.floatText(1080, 650, '+180', '#ffd166', false);
    return;
  }
}
