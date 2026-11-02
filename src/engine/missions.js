// ミッションの判定。check.type ごとに1つの判定を持つ。
import { livingWithoutAisle, manhattan, zoneCells } from './layout.js';
import { needsSummary } from './needs.js';

export function checkMission(check, state, grid) {
  switch (check.type) {
    case 'flag': return !!state.flags[check.flag];
    case 'zoneExists': return state.cells.includes(check.zone);
    case 'zoneNearTile': {
      const tiles = [];
      grid.tiles.forEach((t, i) => { if (t === check.tile) tiles.push(i); });
      return zoneCells(state, check.zone).some((c) => tiles.some((t) => manhattan(c, t, grid.w) <= check.maxDist));
    }
    case 'noLog': return !state.log.some((l) => l.checkId === check.checkId);
    case 'needsRatio': return needsSummary(state, grid).ratio >= check.min;
    case 'neverRanOut': return !state.ranOut[check.item];
    case 'eventChoiceIn': {
      const r = state.resolvedEvents.find((e) => e.id === check.event);
      if (!r) return false;
      if (check.notTimedOut && r.timedOut) return false;
      return check.choices.includes(r.choiceId);
    }
    case 'noLivingWithoutAisle': return livingWithoutAisle(state, grid) === 0;
    case 'all': return check.checks.every((c) => checkMission(c, state, grid));
    default: throw new Error(`不明なミッション判定: ${check.type}`);
  }
}

export function evaluateMissions(state, scenario, grid) {
  return scenario.missions.map((m) => ({ id: m.id, label: m.label, achieved: checkMission(m.check, state, grid) }));
}
