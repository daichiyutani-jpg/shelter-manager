// ゲームの状態と操作（reducer）。すべての操作は reduce(state, action) を通る。
// 将来の複数人プレイでは、この action を端末間で共有すれば同期できる構造にしている。
import { CATEGORIES, DIFFICULTIES, DISTRIBUTIONS, INITIAL_METRIC, SUPPORTS, TOILET, TURN_CHECKS } from '../data/config.js';
import { FACILITIES } from '../data/facilities.js';
import { getScenario } from '../data/scenarios/index.js';
import { choiceAvailability, evalTrigger } from './events.js';
import {
  canPlaceZone, capacity, fixedCells, livingWithoutAisle, occupancy, parseFacility,
  personsPresent, residentialLoad, toiletUnits, zoneById,
} from './layout.js';
import { needsSummary } from './needs.js';

export const SCHEMA_VERSION = 1;

export class GameError extends Error {}

export function getContext(state) {
  const scenario = getScenario(state.scenarioId);
  const facility = FACILITIES[scenario.facilityId];
  return { scenario, facility, grid: parseFacility(facility), difficulty: getDifficulty(state.difficultyId) };
}

export function getDifficulty(id) {
  const d = DIFFICULTIES.find((x) => x.id === id);
  if (!d) throw new GameError(`不明な難易度: ${id}`);
  return d;
}

export function createGame({ scenarioId, difficultyId = 'normal', layoutMode = 'fixed', playId, now = new Date().toISOString() }) {
  const scenario = getScenario(scenarioId);
  if (!scenario.ready) throw new GameError('このシナリオは準備中です');
  const difficulty = getDifficulty(difficultyId);
  const grid = parseFacility(FACILITIES[scenario.facilityId]);
  const supplies = {};
  for (const [k, v] of Object.entries(scenario.supplies)) supplies[k] = Math.floor(v * difficulty.supplyMultiplier);
  return {
    schemaVersion: SCHEMA_VERSION,
    playId: playId || `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    startedAt: now,
    scenarioId,
    difficultyId,
    layoutMode,
    phase: 'opening',
    turn: 0,
    openingPointsLeft: difficulty.openingPoints,
    openingDone: [],
    opsPointsBonus: 0,
    opsPoints: 0,
    cells: new Array(grid.tiles.length).fill(null),
    blockedCells: [],
    groups: scenario.groups.map((g) => ({ ...g, arrived: false, cell: null, support: [] })),
    supplies,
    initialSupplies: { ...supplies },
    metrics: Object.fromEntries(CATEGORIES.map((c) => [c.id, INITIAL_METRIC])),
    flags: {},
    firedEvents: [],
    pendingEvents: [],
    resolvedEvents: [],
    deliveryTurns: Object.fromEntries((scenario.deliveries || []).map((d) => [d.id, d.turn])),
    receivedDeliveries: [],
    distributedThisTurn: {},
    distributedEver: {},
    ranOut: {},
    firedChecks: [],
    log: [],
    history: [],
  };
}

const clamp = (n) => Math.max(0, Math.min(100, n));

function addLog(state, entry) {
  state.log.push({ turn: state.turn, kind: 'info', ...entry });
}

function applyMetrics(state, delta = {}) {
  for (const [k, v] of Object.entries(delta)) state.metrics[k] = clamp(state.metrics[k] + v);
}

function addSupplies(state, delta = {}) {
  for (const [k, v] of Object.entries(delta)) state.supplies[k] = Math.max(0, (state.supplies[k] || 0) + v);
}

function applyEffects(state, effects = {}, ctx) {
  applyMetrics(state, effects.metrics);
  addSupplies(state, effects.supplies);
  Object.assign(state.flags, effects.flags || {});
  if (effects.opsPointsBonus) state.opsPointsBonus += effects.opsPointsBonus;
  for (const gid of effects.addGroups || []) {
    const g = state.groups.find((x) => x.id === gid);
    if (g && !g.arrived) { g.arrived = true; g.arrivedTurn = state.turn; }
  }
  if (effects.delayDelivery) state.deliveryTurns[effects.delayDelivery.id] = effects.delayDelivery.toTurn;
  if (effects.flags && ctx) revealFromFlags(state, ctx);
}

function revealFromFlags(state, ctx) {
  for (const hz of ctx.grid.hazards) {
    if (state.openingDone.includes(hz.revealedBy)) {
      for (const i of hz.indices) {
        if (!state.blockedCells.includes(i)) state.blockedCells.push(i);
      }
    }
  }
}

function clearBlockedCells(state) {
  for (const i of state.blockedCells) {
    state.cells[i] = null;
    for (const g of state.groups) if (g.cell === i) g.cell = null;
  }
}

export function opsPointsPerTurn(state) {
  return getDifficulty(state.difficultyId).opsPointsPerTurn + state.opsPointsBonus;
}

export function currentTurnInfo(state, scenario) {
  return scenario.turns.find((t) => t.n === state.turn) || null;
}

function beginTurn(state, ctx) {
  const { scenario, grid } = ctx;
  state.opsPoints = opsPointsPerTurn(state);
  state.distributedThisTurn = {};
  for (const g of state.groups) {
    if (!g.arrived && g.arriveTurn === state.turn) { g.arrived = true; g.arrivedTurn = state.turn; }
  }
  const arrivedNow = state.groups.filter((g) => g.arrivedTurn === state.turn);
  if (arrivedNow.length) {
    addLog(state, { text: `${arrivedNow.length}世帯（${arrivedNow.reduce((s, g) => s + g.size, 0)}人）が到着した` });
  }
  for (const d of scenario.deliveries || []) {
    if (state.receivedDeliveries.includes(d.id)) continue;
    if (state.deliveryTurns[d.id] === state.turn) {
      addSupplies(state, d.items);
      state.receivedDeliveries.push(d.id);
      addLog(state, { kind: 'good', text: `${d.label}が届いた` });
    }
  }
  for (const ev of scenario.events) {
    if (state.firedEvents.includes(ev.id)) continue;
    if (evalTrigger(ev.trigger, state, grid)) {
      state.firedEvents.push(ev.id);
      state.pendingEvents.push(ev.id);
    }
  }
}

function needCount(state, d) {
  if (d.perGroup) return state.groups.filter((g) => g.arrived).length * d.perGroup;
  let per = d.perPerson;
  if (d.item === 'food' && state.flags.food_rationed) per *= 0.5;
  return Math.ceil(personsPresent(state) * per);
}

export function distributionStatus(state, scenario, d) {
  const turn = currentTurnInfo(state, scenario);
  if (state.phase !== 'operating') return { ok: false, reason: '運営中のみ配布できます' };
  if (d.onlyFlag && !(turn && turn.flags.includes(d.onlyFlag))) {
    return { ok: false, reason: d.onlyFlag === 'meal' ? '食事の時間ではありません' : '夜の時間帯に配ります' };
  }
  if (d.oncePerGame && state.distributedEver[d.id]) return { ok: false, reason: '配布済みです' };
  if (state.distributedThisTurn[d.id]) return { ok: false, reason: 'このターンは配布済みです' };
  if (state.opsPoints < d.points) return { ok: false, reason: '運営ポイントが足りません' };
  if ((state.supplies[d.item] || 0) <= 0) return { ok: false, reason: '在庫がありません' };
  return { ok: true, need: needCount(state, d) };
}

function evaluateTurnCheck(check, state, ctx) {
  const { grid, scenario } = ctx;
  const turn = currentTurnInfo(state, scenario);
  const persons = personsPresent(state);
  switch (check.when) {
    case 'unplacedGroups': {
      const n = state.groups.filter((g) => g.arrived && g.cell === null).length;
      return n > 0 ? n : 0;
    }
    case 'missingZone': return state.cells.includes(check.zone) ? 0 : 1;
    case 'livingWithoutAisle': return livingWithoutAisle(state, grid);
    case 'crowded': return residentialLoad(state).ratio > check.ratio ? 1 : 0;
    case 'toiletLoad': {
      if (!persons) return 0;
      const units = toiletUnits(state, grid);
      const load = units ? persons / units : Infinity;
      return load > check.above ? (units ? Math.round(load) : persons) : 0;
    }
    case 'toiletLoadAtMost': {
      const units = toiletUnits(state, grid);
      return persons && units && persons / units <= check.atMost ? 1 : 0;
    }
    case 'missedDistribution': {
      const d = DISTRIBUTIONS.find((x) => x.id === check.distribution);
      if (!turn || !turn.flags.includes(d.onlyFlag)) return 0;
      const done = d.oncePerGame ? state.distributedEver[d.id] : state.distributedThisTurn[d.id];
      return done ? 0 : 1;
    }
    case 'unmetNeeds': return needsSummary(state, grid).unmet.length;
    case 'allNeedsMet': {
      const s = needsSummary(state, grid);
      return s.total > 0 && s.unmet.length === 0 ? 1 : 0;
    }
    case 'uninspectedDamagedToilet':
      return !state.flags.inspected_toilet && persons > 0 && grid.damagedToilets.length ? 1 : 0;
    case 'hazardOccupied':
      return grid.hazards.some((hz) => !state.openingDone.includes(hz.revealedBy)
        && hz.indices.some((i) => occupancy(state, i) > 0)) ? 1 : 0;
    default: throw new GameError(`不明なターンチェック: ${check.when}`);
  }
}

function runTurnChecks(state, ctx) {
  for (const check of TURN_CHECKS) {
    if (check.once && state.firedChecks.includes(check.id)) continue;
    const n = evaluateTurnCheck(check, state, ctx);
    if (!n) continue;
    const units = check.perUnit ? Math.min(n, check.maxUnits || n) : 1;
    const delta = Object.fromEntries(Object.entries(check.effects).map(([k, v]) => [k, v * units]));
    applyMetrics(state, delta);
    if (check.once) state.firedChecks.push(check.id);
    addLog(state, { kind: check.kind, checkId: check.id, text: check.text.replace('{n}', String(n)), delta });
  }
}

function consumeToiletKits(state) {
  const f = state.flags;
  if (!f.outage_water || f.building_toilet_closed || f.toilet_misused) return;
  const need = Math.ceil(personsPresent(state) * TOILET.kitsPerPersonPerTurn);
  if (state.supplies.toilet_kit < need) {
    state.supplies.toilet_kit = 0;
    state.ranOut.toilet_kit = true;
    applyMetrics(state, { hygiene: -6 });
    addLog(state, { kind: 'problem', text: '携帯トイレが足りなくなった' });
  } else {
    state.supplies.toilet_kit -= need;
  }
}

// 外部から呼ぶ唯一の更新口。元の state は変更せず、新しい state を返す。
export function reduce(prev, action) {
  const state = structuredClone(prev);
  const ctx = getContext(state);
  const { scenario, grid } = ctx;
  const fail = (msg) => { throw new GameError(msg); };

  switch (action.type) {
    case 'OPENING_TASK': {
      if (state.phase !== 'opening') fail('開設準備は終わっています');
      const task = scenario.openingTasks.find((t) => t.id === action.taskId) || fail('不明な作業です');
      if (state.openingDone.includes(task.id)) fail('実施済みです');
      if (task.cost > state.openingPointsLeft) fail('準備ポイントが足りません');
      state.openingPointsLeft -= task.cost;
      state.openingDone.push(task.id);
      applyEffects(state, task.effects, ctx);
      addLog(state, { kind: 'good', text: `【開設準備】${task.result}` });
      return state;
    }
    case 'FINISH_OPENING': {
      if (state.phase !== 'opening') fail('開設準備は終わっています');
      revealFromFlags(state, ctx);
      if (state.layoutMode === 'fixed') state.cells = fixedCells(ctx.facility);
      clearBlockedCells(state);
      state.phase = 'layout';
      return state;
    }
    case 'SET_ZONE': {
      if (!['layout', 'operating'].includes(state.phase)) fail('今はレイアウトを変更できません');
      if (state.layoutMode === 'fixed') fail('固定レイアウトでは配置を変更できません');
      const zone = action.zone ?? null;
      const chk = canPlaceZone(state, grid, action.cell, zone);
      if (!chk.ok) fail(chk.reason);
      state.cells[action.cell] = zone;
      const residential = zone === 'living' || zone === 'care';
      for (const g of state.groups) if (g.cell === action.cell && !residential) g.cell = null;
      return state;
    }
    case 'START_OPERATION': {
      if (state.phase !== 'layout') fail('レイアウトの段階ではありません');
      if (!state.cells.includes('reception')) fail('受付を1マス以上置いてください');
      if (!state.cells.some((z) => z === 'living' || z === 'care')) fail('居住スペースを置いてください');
      state.phase = 'operating';
      state.turn = 1;
      beginTurn(state, ctx);
      return state;
    }
    case 'PLACE_GROUP': {
      if (state.phase !== 'operating') fail('運営中のみ配置できます');
      const g = state.groups.find((x) => x.id === action.groupId) || fail('不明な世帯です');
      if (!g.arrived) fail('まだ到着していません');
      if (action.cell === null) { g.cell = null; return state; }
      const z = state.cells[action.cell];
      if (z !== 'living' && z !== 'care') fail('居住スペースか要配慮者スペースを選んでください');
      const used = occupancy(state, action.cell) - (g.cell === action.cell ? g.size : 0);
      if (used + g.size > capacity(state, action.cell)) fail(`このマスは定員（${capacity(state, action.cell)}人）を超えます`);
      g.cell = action.cell;
      return state;
    }
    case 'SUPPORT': {
      if (state.phase !== 'operating') fail('運営中のみ支援できます');
      const g = state.groups.find((x) => x.id === action.groupId) || fail('不明な世帯です');
      const s = SUPPORTS.find((x) => x.id === action.support) || fail('不明な支援です');
      if (!g.arrived) fail('まだ到着していません');
      if (g.support.includes(s.id)) fail('実施済みです');
      if (s.points > state.opsPoints) fail('運営ポイントが足りません');
      if (s.item && (state.supplies[s.item] || 0) < s.amount) fail('在庫が足りません');
      state.opsPoints -= s.points;
      if (s.item) state.supplies[s.item] -= s.amount;
      g.support.push(s.id);
      return state;
    }
    case 'DISTRIBUTE': {
      const d = DISTRIBUTIONS.find((x) => x.id === action.distribution) || fail('不明な配布です');
      const st = distributionStatus(state, scenario, d);
      if (!st.ok) fail(st.reason);
      state.opsPoints -= d.points;
      state.distributedThisTurn[d.id] = true;
      state.distributedEver[d.id] = true;
      const have = state.supplies[d.item];
      const label = d.label.replace(/（.*）/, '');
      if (have < st.need) {
        state.supplies[d.item] = 0;
        state.ranOut[d.item] = true;
        applyMetrics(state, { supply: -6, care: -3 });
        addLog(state, { kind: 'problem', text: `${label}：必要数${st.need}に対し${have}しかなく、全員には行き渡らなかった` });
      } else {
        state.supplies[d.item] -= st.need;
        applyMetrics(state, d.gain);
        addLog(state, { kind: 'good', text: `${label}（${st.need}使用）` });
      }
      return state;
    }
    case 'CHOOSE_EVENT': {
      if (!state.pendingEvents.includes(action.eventId)) fail('このイベントは対応済みです');
      const ev = scenario.events.find((e) => e.id === action.eventId);
      const timedOut = !!action.timedOut;
      const choiceId = timedOut ? ev.defaultChoiceId : action.choiceId;
      const choice = ev.choices.find((c) => c.id === choiceId) || fail('不明な選択肢です');
      if (!timedOut) {
        const av = choiceAvailability(choice, state);
        if (!av.ok) fail(av.reason);
        state.opsPoints -= choice.cost?.points || 0;
        for (const [item, n] of Object.entries(choice.cost?.supplies || {})) state.supplies[item] -= n;
      }
      applyEffects(state, choice.effects, ctx);
      state.pendingEvents = state.pendingEvents.filter((id) => id !== ev.id);
      state.resolvedEvents.push({ id: ev.id, choiceId, turn: state.turn, timedOut });
      const net = Object.values(choice.effects.metrics || {}).reduce((s, v) => s + v, 0);
      addLog(state, { kind: net < 0 ? 'problem' : 'good', eventId: ev.id, text: `【${ev.title}】${timedOut ? '（時間切れ）' : ''}${choice.result}` });
      return state;
    }
    case 'END_TURN': {
      if (state.phase !== 'operating') fail('運営中ではありません');
      if (state.pendingEvents.length) fail('未対応のイベントがあります');
      consumeToiletKits(state);
      runTurnChecks(state, ctx);
      state.history.push({ turn: state.turn, metrics: { ...state.metrics }, supplies: { ...state.supplies }, persons: personsPresent(state) });
      if (state.turn >= scenario.turns.length) {
        state.phase = 'finished';
        state.finishedAt = action.now || new Date().toISOString();
      } else {
        state.turn += 1;
        beginTurn(state, ctx);
      }
      return state;
    }
    default:
      fail(`不明な操作: ${action.type}`);
  }
  return state;
}

export { zoneById };
