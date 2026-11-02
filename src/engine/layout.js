// 平面図（グリッド）の計算。画面に依存しない。
import { ZONES, TILES } from '../data/config.js';

export const zoneById = Object.fromEntries(ZONES.map((z) => [z.id, z]));

export function parseFacility(facility) {
  const h = facility.grid.length;
  const w = facility.grid[0].length;
  const tiles = facility.grid.join('').split('');
  const idx = ([x, y]) => y * w + x;
  return {
    w, h, tiles,
    hazards: (facility.hazards || []).map((hz) => ({ ...hz, indices: hz.cells.map(idx) })),
    damagedToilets: (facility.damagedToilets || []).map((d) => ({ ...d, index: idx(d.cell) })),
  };
}

export const toXY = (i, w) => [i % w, Math.floor(i / w)];

export function manhattan(a, b, w) {
  const [ax, ay] = toXY(a, w);
  const [bx, by] = toXY(b, w);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function neighbors(i, w, h) {
  const [x, y] = toXY(i, w);
  const out = [];
  if (x > 0) out.push(i - 1);
  if (x < w - 1) out.push(i + 1);
  if (y > 0) out.push(i - w);
  if (y < h - 1) out.push(i + w);
  return out;
}

// 固定レイアウトを cells 配列に展開する。
export function fixedCells(facility) {
  const legend = facility.fixedLegend || {};
  return facility.fixedLayout.join('').split('').map((ch) => legend[ch] || null);
}

export function canPlaceZone(state, grid, i, zoneId) {
  if (i < 0 || i >= grid.tiles.length) return { ok: false, reason: '範囲外のマスです' };
  if (state.blockedCells.includes(i)) return { ok: false, reason: '点検で使用不可になったマスです' };
  if (zoneId === null) return { ok: true };
  const zone = zoneById[zoneId];
  if (!zone) return { ok: false, reason: `不明なゾーン: ${zoneId}` };
  const tile = grid.tiles[i];
  if (!zone.tiles.includes(tile)) {
    return { ok: false, reason: `${zone.label}は「${TILES[tile].label}」には置けません` };
  }
  return { ok: true };
}

export function occupancy(state, i) {
  return state.groups.filter((g) => g.cell === i).reduce((s, g) => s + g.size, 0);
}

export function capacity(state, i) {
  const z = state.cells[i];
  return z ? zoneById[z].capacity || 0 : 0;
}

export function arrivedGroups(state) {
  return state.groups.filter((g) => g.arrived);
}

export function personsPresent(state) {
  return arrivedGroups(state).reduce((s, g) => s + g.size, 0);
}

function buildingToiletUsable(state, grid, i) {
  if (grid.damagedToilets.some((d) => d.index === i)) return false;
  const f = state.flags;
  if (f.outage_water) {
    if (f.building_toilet_closed || f.toilet_misused) return false;
    if (!f.toilet_rule_posted) return false;
    if ((state.supplies.toilet_kit || 0) <= 0) return false;
  }
  return true;
}

// 使えるトイレのマス一覧（建物のトイレ＋仮設トイレゾーン）。
export function usableToiletCells(state, grid) {
  const out = [];
  grid.tiles.forEach((t, i) => {
    if (t === 'w' && buildingToiletUsable(state, grid, i)) out.push(i);
    else if (state.cells[i] === 'toilet') out.push(i);
  });
  return out;
}

// ニーズ判定用：トイレまでの距離の起点になるマス。
// 要配慮者スペースのそばに個室トイレを設けた場合は、そのスペース自体を起点に含める。
export function toiletAccessCells(state, grid) {
  const cells = usableToiletCells(state, grid);
  return state.flags.accessible_toilet ? [...cells, ...zoneCells(state, 'care')] : cells;
}

export function toiletUnits(state, grid) {
  let units = 0;
  for (const i of usableToiletCells(state, grid)) {
    units += grid.tiles[i] === 'w' ? TILES.w.toiletUnits : zoneById.toilet.toiletUnits;
  }
  if (state.flags.accessible_toilet) units += 1;
  return units;
}

export function nearestDistance(grid, from, targets) {
  let best = Infinity;
  for (const t of targets) best = Math.min(best, manhattan(from, t, grid.w));
  return best;
}

export function zoneCells(state, zoneId) {
  const out = [];
  state.cells.forEach((z, i) => { if (z === zoneId) out.push(i); });
  return out;
}

const RESIDENTIAL = ['living', 'care'];

export function livingWithoutAisle(state, grid) {
  return state.cells.reduce((n, z, i) => {
    if (!RESIDENTIAL.includes(z)) return n;
    const ok = neighbors(i, grid.w, grid.h).some((j) => state.cells[j] === 'aisle');
    return ok ? n : n + 1;
  }, 0);
}

export function residentialLoad(state) {
  let cap = 0;
  state.cells.forEach((z, i) => { if (RESIDENTIAL.includes(z)) cap += capacity(state, i); });
  const placed = state.groups.filter((g) => g.cell !== null).reduce((s, g) => s + g.size, 0);
  return { cap, placed, ratio: cap ? placed / cap : (placed ? Infinity : 0) };
}
