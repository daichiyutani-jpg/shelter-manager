// 避難者のニーズの充足判定。
// 属性そのものではなく「ニーズ × 施設の条件 × 支援 × 配置」で判定する。
import { NEEDS } from '../data/config.js';
import { neighbors, nearestDistance, toiletAccessCells, zoneCells } from './layout.js';

function checkRequirement(req, group, state, grid) {
  const cell = group.cell;
  switch (req.type) {
    case 'support':
      return group.support.includes(req.support);
    case 'zoneExists':
      return state.cells.includes(req.zone);
    case 'inZone':
      return cell !== null && req.zones.includes(state.cells[cell]);
    case 'adjacentZone':
      return cell !== null && neighbors(cell, grid.w, grid.h).some((j) => state.cells[j] === req.zone);
    case 'nearZone':
      return cell !== null && nearestDistance(grid, cell, zoneCells(state, req.zone)) <= req.maxDist;
    case 'nearToilet':
      return cell !== null && nearestDistance(grid, cell, toiletAccessCells(state, grid)) <= req.maxDist;
    default:
      throw new Error(`不明な条件: ${req.type}`);
  }
}

export function evaluateGroupNeeds(state, grid, group) {
  return group.needs.map((needId) => {
    const rule = NEEDS[needId];
    const requirements = rule.requirements.map((r) => ({ label: r.label, met: checkRequirement(r, group, state, grid) }));
    const met = rule.mode === 'any' ? requirements.some((r) => r.met) : requirements.every((r) => r.met);
    return { need: needId, label: rule.label, met, requirements };
  });
}

export function needsSummary(state, grid) {
  let total = 0;
  let met = 0;
  const unmet = [];
  for (const g of state.groups) {
    if (!g.arrived) continue;
    for (const r of evaluateGroupNeeds(state, grid, g)) {
      total += 1;
      if (r.met) met += 1;
      else unmet.push({ groupId: g.id, groupLabel: g.label, need: r.label });
    }
  }
  return { total, met, unmet, ratio: total ? met / total : 1 };
}
