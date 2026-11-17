# gumdrop-gauntlet

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/volxayz/gumdrop-gauntlet/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/volxayz/gumdrop-gauntlet/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Gumdrop Gauntlet** is a bright candy-arena shooter for desktop browsers. You are Gummo, a blue gumdrop with a candy blaster. Pop seven waves of sour critters, pick an upgrade card after each wave, then take on Queen Sourbelle, a three-phase boss.

- **Controls:** W A S D to move, the mouse to aim, hold left click to shoot, Space to dash (you can't be hit while dashing). 1/2/3 or a click picks an upgrade, P pauses and M mutes.
- **Critters:** Jellybobs hop toward you. Sprinkler donuts fire spreads. Gobstoppers split into three when popped. Licorice Zippers show a red line before they charge.
- **Upgrades that change how you play:** Split Shot fans, Bouncy Gum ricochets, orbiting Mint Moons, a burning Syrup Dash trail, piercing Rock Candy, homing Fizz Seekers, chain-exploding Pop Rocks and a Caramel Shell, plus stat cards.
- **Boss phases:** *Lemon Waltz* fires bullet rings. *Sour Storm* fires spirals and summons critters. *Sugar Crash* adds telegraphed charges and shockwave bursts.
- **Feel:** screen shake, hit-stop, particles, combo multipliers and floating score. Sound effects and three background tracks are all synthesised with Web Audio. On-screen hints teach the controls during the first wave, and the run ends on a results screen with a rank, stats, your best score and one-click restart.

Everything is plain static files in `game/` (no build step, no network, no libraries).

## Run it

```sh
node serve.ts            # then open http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand-in output (game/, screenshots/, dossier.json)
node tools/shoot.mjs     # re-take the screenshots in headless Chrome
node tools/simulate.mjs  # autopilot balance runs in Node
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=2tek684y&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
