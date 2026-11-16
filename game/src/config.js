// Bloom Rush — tuning, palette and copy. One place for every number the
// game balances on, so a play-test can retune the game by editing this file.
export const CANVAS_W = 1280;
export const CANVAS_H = 800;

// Garden layout: 4 columns x 3 rows of soil plots.
export const GRID_COLS = 4;
export const GRID_ROWS = 3;
export const GRID_X = 190;
export const GRID_Y = 250;
export const PLOT_W = 220;
export const PLOT_H = 150;
export const PLOT_GAP_X = 14;
export const PLOT_GAP_Y = 16;

// Flower growth, in seconds. A bloom left unpicked wilts after RIPE_TTL.
export const GROW_SEED = 3.0;
export const GROW_SPROUT = 4.0;
export const GROW_BUD = 4.0;
export const RIPE_TTL = 10.0;
export const WATER_BOOST = 2.2; // growth speed while watered
export const WATER_TTL = 6.0;

// A day lasts this long. Quota grows by QUOTA_STEP each new day.
export const DAY_SECONDS = 90;
export const DAY1_QUOTA = 12;
export const QUOTA_STEP = 6;
export const HEARTS = 3;

// Aphids: first one arrives after this delay, then one every interval.
// Each day the interval shrinks and the walkers get faster.
export const APHID_FIRST_SPAWN = 9.0;
export const APHID_INTERVAL_DAY1 = 6.0;
export const APHID_INTERVAL_MIN = 2.6;
export const APHID_INTERVAL_STEP = 0.7;
export const APHID_SPEED_DAY1 = 34; // pixels per second
export const APHID_SPEED_STEP = 6;
export const APHID_SPEED_MAX = 78;

// Scoring. Harvests inside COMBO_WINDOW seconds of the previous harvest
// raise the combo; the combo multiplies the harvest value.
export const HARVEST_POINTS = 100;
export const SQUISH_POINTS = 25;
export const WATER_POINTS = 5;
export const COMBO_WINDOW = 3.0;
export const COMBO_MAX = 8;

// Bloom colours, one per flower kind. The HUD legend uses the same list.
export const BLOOM_COLORS = [
  { name: 'Ember Rose', petal: '#ff5d8f', core: '#ffd166', stem: '#3f9e4d' },
  { name: 'Sun Marigold', petal: '#ffb703', core: '#fb8500', stem: '#3f9e4d' },
  { name: 'Sky Bell', petal: '#4cc9f0', core: '#f1fa8c', stem: '#2a9d8f' },
  { name: 'Violet Aster', petal: '#b5179e', core: '#ffea00', stem: '#3f9e4d' },
];

export const PALETTE = {
  skyTop: '#2b1a4d',
  skyMid: '#7b2f8b',
  skyLow: '#ff8c5a',
  soil: '#5a3a28',
  soilDark: '#452c1e',
  soilLight: '#7a5238',
  grass: '#2f7d32',
  grassDark: '#256b29',
  hudPanel: 'rgba(20, 10, 40, 0.72)',
  hudStroke: 'rgba(255, 255, 255, 0.25)',
  text: '#fff8e7',
  textDim: '#e8d9b8',
  gold: '#ffd166',
  danger: '#ff4d6d',
  good: '#06d6a0',
};

export const COPY = {
  title: 'BLOOM RUSH',
  subtitle: 'a garden-defense arcade',
  howTo:
    'Flowers grow in the beds — click a glowing bloom to harvest it before it wilts. ' +
    'Click a plot to water it and grow faster. Squish the aphids before they eat your blooms!',
  goal:
    'Harvest the day\u2019s quota before the sun sets. Lose 3 blooms and the day is ruined.',
  startButton: 'START DAY 1',
  nextDayButton: 'NEXT DAY',
  againButton: 'PLAY AGAIN',
  paused: 'PAUSED',
  dayClear: 'DAY COMPLETE!',
  gameOver: 'THE GARDEN FADED…',
  quotaLabel: 'QUOTA',
  scoreLabel: 'SCORE',
  dayLabel: 'DAY',
  bestLabel: 'BEST',
};
