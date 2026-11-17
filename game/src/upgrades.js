// The upgrade cards offered after every wave. Most change how you play, not just a number.

export const UPGRADES = [
  { id: 'split', name: 'SPLIT SHOT', text: 'Fire a 3-way fan of gumdrops', color: '#29c6ff', icon: '⋔', max: 2, kind: 'play' },
  { id: 'bounce', name: 'BOUNCY GUM', text: 'Shots ricochet off the walls', color: '#3ee07a', icon: '↯', max: 3, kind: 'play' },
  { id: 'orbit', name: 'MINT MOONS', text: 'Two mints orbit and smash foes', color: '#7ff5e1', icon: '◎', max: 3, kind: 'play' },
  { id: 'trail', name: 'SYRUP DASH', text: 'Dashing leaves a burning syrup trail', color: '#ff9b2f', icon: '≋', max: 2, kind: 'play' },
  { id: 'pierce', name: 'ROCK CANDY', text: 'Shots pierce through enemies', color: '#c3a6ff', icon: '➶', max: 2, kind: 'play' },
  { id: 'homing', name: 'FIZZ SEEKERS', text: 'Shots curve toward the nearest foe', color: '#ff5fb2', icon: '☄', max: 1, kind: 'play' },
  { id: 'poprocks', name: 'POP ROCKS', text: 'Popped foes explode and chain', color: '#ff3b5c', icon: '✸', max: 2, kind: 'play' },
  { id: 'shield', name: 'CARAMEL SHELL', text: 'Block one hit, recharges in 8s', color: '#ffd23d', icon: '⬡', max: 1, kind: 'play' },
  { id: 'rapid', name: 'SUGAR RUSH', text: 'Fire 35% faster', color: '#ffffff', icon: '»', max: 3, kind: 'stat' },
  { id: 'heart', name: 'BIG HEART', text: '+1 max heart and heal fully', color: '#ff3b5c', icon: '♥', max: 3, kind: 'stat' },
];

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id);
}

/** How many times the player has taken an upgrade. */
export function level(state, id) {
  return state.upgrades[id] ?? 0;
}

/** Three different cards the player can still take, play-changers favoured. */
export function rollChoices(state) {
  const open = UPGRADES.filter((u) => level(state, u.id) < u.max);
  const choices = [];
  while (choices.length < 3 && open.length > 0) {
    const weights = open.map((u) => (u.kind === 'play' ? 3 : 2));
    let roll = state.rng.next() * weights.reduce((a, b) => a + b, 0);
    let index = 0;
    while (roll > weights[index]) { roll -= weights[index]; index += 1; }
    choices.push(open[index].id);
    open.splice(index, 1);
  }
  return choices;
}

/** Take a card: record it and apply its immediate effect. */
export function applyUpgrade(state, id) {
  state.upgrades[id] = level(state, id) + 1;
  const player = state.player;
  if (id === 'heart') {
    player.maxHp += 1;
    player.hp = player.maxHp;
  }
  if (id === 'shield') player.shieldReady = true;
  if (id === 'orbit') player.orbitAngle = 0;
}
