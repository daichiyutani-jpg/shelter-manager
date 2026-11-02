// 地震シナリオを自動で最後までプレイし、評価まで到達するかを確かめる。
// 使い方: node tools/playthrough.mjs [fixed|free] [easy|normal|hard] [good|passive]
import { createGame, reduce, getContext, distributionStatus } from '../src/engine/game.js';
import { DISTRIBUTIONS } from '../src/data/config.js';
import { capacity, occupancy, nearestDistance, zoneCells } from '../src/engine/layout.js';
import { evaluateGroupNeeds } from '../src/engine/needs.js';
import { choiceAvailability } from '../src/engine/events.js';
import { finalReport } from '../src/engine/scoring.js';

const FREE_LAYOUT = [
  'tt....pp',
  '........',
  '...rr...',
  'iaaaaaah',
  'lallacca',
  'lallacca',
  'lallalla',
  'lallalla',
  'aaaaaaaa',
  'lallalla',
  'lallalla',
  'ssss....',
];
const LEGEND = { t: 'toilet', p: 'pet', r: 'reception', c: 'care', a: 'aisle', i: 'info', s: 'storage', l: 'living', h: 'staff' };

function tryDo(state, action) {
  try { return reduce(state, action); } catch { return state; }
}

// 世帯に合いそうなマスを選ぶ（good 戦略）
function pickCell(state, grid, g) {
  const needsCare = g.needs.some((n) => ['infant', 'health', 'mobility'].includes(n));
  const zones = needsCare ? ['care', 'living'] : ['living'];
  const infoCells = zoneCells(state, 'info');
  for (const z of zones) {
    const cands = zoneCells(state, z).filter((i) => occupancy(state, i) + g.size <= capacity(state, i));
    if (!cands.length) continue;
    if (g.needs.includes('info')) cands.sort((a, b) => nearestDistance(grid, a, infoCells) - nearestDistance(grid, b, infoCells));
    // 試しに置いてニーズが最も満たされるマスを選ぶ
    let best = cands[0];
    let bestScore = -1;
    for (const c of cands) {
      const trial = tryDo(state, { type: 'PLACE_GROUP', groupId: g.id, cell: c });
      const score = evaluateGroupNeeds(trial, grid, trial.groups.find((x) => x.id === g.id)).flatMap((r) => r.requirements).filter((r) => r.met).length;
      if (score > bestScore) { best = c; bestScore = score; }
    }
    return best;
  }
  return null;
}

export function play({ layoutMode = 'fixed', difficultyId = 'normal', strategy = 'good' } = {}) {
  let s = createGame({ scenarioId: 'earthquake_basic', difficultyId, layoutMode, playId: 'test', now: '2026-11-02T00:00:00Z' });
  const { grid } = getContext(s);
  const opening = strategy === 'good' ? ['op_interior', 'op_toilet', 'op_staff', 'op_rules', 'op_power', 'op_reception'] : [];
  for (const id of opening) s = tryDo(s, { type: 'OPENING_TASK', taskId: id });
  s = reduce(s, { type: 'FINISH_OPENING' });
  if (layoutMode === 'free') {
    FREE_LAYOUT.join('').split('').forEach((ch, i) => { if (LEGEND[ch]) s = tryDo(s, { type: 'SET_ZONE', cell: i, zone: LEGEND[ch] }); });
  }
  s = reduce(s, { type: 'START_OPERATION' });
  while (s.phase === 'operating') {
    // 配布はイベントより先（運営ポイントを食事に優先して使う）
    if (strategy === 'good') {
      for (const d of DISTRIBUTIONS) if (distributionStatus(s, getContext(s).scenario, d).ok) s = reduce(s, { type: 'DISTRIBUTE', distribution: d.id });
    }
    for (const evId of [...s.pendingEvents]) {
      const ev = getContext(s).scenario.events.find((e) => e.id === evId);
      const choice = strategy === 'good'
        ? ev.choices.find((c) => choiceAvailability(c, s).ok)
        : ev.choices[ev.choices.length - 1];
      s = reduce(s, { type: 'CHOOSE_EVENT', eventId: evId, choiceId: choice.id });
    }
    if (strategy === 'good') {
      for (const g of s.groups.filter((x) => x.arrived && x.cell === null)) {
        const c = pickCell(s, grid, g);
        if (c !== null) s = reduce(s, { type: 'PLACE_GROUP', groupId: g.id, cell: c });
      }
      for (const g of s.groups.filter((x) => x.arrived)) {
        if (g.needs.some((n) => n === 'mobility' || n === 'health')) s = tryDo(s, { type: 'SUPPORT', groupId: g.id, support: 'cot' });
        if (g.needs.includes('infant')) s = tryDo(s, { type: 'SUPPORT', groupId: g.id, support: 'partition' });
        if (g.needs.includes('info')) {
          const r = evaluateGroupNeeds(s, grid, g).find((x) => x.need === 'info');
          if (r && !r.met) s = tryDo(s, { type: 'SUPPORT', groupId: g.id, support: 'personal_info' });
        }
      }
    }
    s = reduce(s, { type: 'END_TURN', now: '2026-11-02T01:00:00Z' });
  }
  return { state: s, report: finalReport(s, getContext(s).scenario, grid) };
}

if (process.argv[1]?.endsWith('playthrough.mjs')) {
  const [layoutMode = 'fixed', difficultyId = 'normal', strategy = 'good'] = process.argv.slice(2);
  const { state, report } = play({ layoutMode, difficultyId, strategy });
  console.log(`layout=${layoutMode} difficulty=${difficultyId} strategy=${strategy}`);
  console.log(`phase=${state.phase} turn=${state.turn} 総合=${report.total} ランク=${report.rank.label}`);
  console.log('分類:', report.categories.map((c) => `${c.label}${c.score}`).join(' / '));
  console.log('ミッション達成:', report.achieved.length, '/', report.missions.length, report.unachieved.map((m) => m.label));
  console.log('イベント:', report.events.map((e) => `${e.title}(T${e.turn}:${e.choiceLabel.slice(0, 12)})`).join(', '));
  console.log('ニーズ充足:', `${report.needs.met}/${report.needs.total}`);
  console.log('物資残:', JSON.stringify(state.supplies));
  console.log('問題:', report.problems.length, report.problems.slice(0, 8).map((p) => `T${p.turn}:${p.text}`));
}
