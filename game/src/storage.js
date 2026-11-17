// Best score, kept in this browser when storage is allowed (and silently skipped when it is not).
const KEY = 'gumdrop-gauntlet-best';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(KEY, String(score));
  } catch {
    // Storage blocked: the best score lasts for this visit only.
  }
}
