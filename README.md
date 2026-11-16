# Bloom Rush

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/joyrichh/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/joyrichh/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Bloom Rush is a garden-defense arcade game. Flowers grow in the beds — click a glowing bloom to harvest it before it wilts, water plots to grow faster, and squish the aphids before they eat your blooms. Harvest the day's quota before the sun sets; lose 3 blooms and the day is ruined. Each new day brings a bigger quota and faster aphids. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network — every file the game loads lives under `game/`, and all sound is synthesized live with WebAudio.

## Controls

- **Mouse:** click a plot to water it · click a glowing bloom to harvest · click an aphid to squish it
- **Space:** pause · **R:** restart · **M:** mute · **Enter:** start / continue

## How it works

- `game/index.html` — the page shell (one canvas, 1280×800)
- `game/src/main.js` — bootstrap, screen state machine, game loop
- `game/src/config.js` — tuning, palette and copy
- `game/src/world.js` — garden state: growth, aphids, scoring, day flow
- `game/src/render.js` — all canvas drawing: sky, garden, HUD, screens
- `game/src/input.js` — mouse + keyboard
- `game/src/audio.js` — synthesized WebAudio sound effects
- `game/src/particles.js` — particles and floating score text
- `game/src/random.js` — seeded RNG
- `game/src/shots.js` — scripted screenshot setups (`?shot=start|play|combo|win`)

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
