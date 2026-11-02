// ゲームエンジンの自動テスト。実行: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce, getContext, GameError, distributionStatus } from '../src/engine/game.js';
import { DISTRIBUTIONS } from '../src/data/config.js';
import { evaluateGroupNeeds } from '../src/engine/needs.js';
import { evaluateMissions } from '../src/engine/missions.js';
import { finalReport } from '../src/engine/scoring.js';
import { serialize, deserialize, saveGame, loadGame, SAVE_KEY } from '../src/engine/save.js';
import { buildResponse, toCSV, saveResponse, loadResponses } from '../src/engine/survey.js';
import { SURVEY_QUESTIONS } from '../src/data/survey.js';
import { SCENARIOS } from '../src/data/scenarios/index.js';
import { play } from '../tools/playthrough.mjs';

const NOW = '2026-11-02T00:00:00Z';
const newGame = (o = {}) => createGame({ scenarioId: 'earthquake_basic', playId: 't', now: NOW, ...o });
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const operating = (o) => {
  let s = newGame(o);
  s = reduce(s, { type: 'FINISH_OPENING' });
  return reduce(s, { type: 'START_OPERATION' });
};
const firstCell = (s, zone) => s.cells.indexOf(zone);

test('ゲームを開始できる（開設→レイアウト→運営1ターン目）', () => {
  const s = operating();
  assert.equal(s.phase, 'operating');
  assert.equal(s.turn, 1);
  assert.ok(s.groups.some((g) => g.arrived));
});

test('準備中のシナリオは開始できない', () => {
  assert.throws(() => createGame({ scenarioId: 'flood' }), GameError);
});

test('開設準備：ポイントが減り、点検で危険箇所が使用不可になる', () => {
  let s = newGame();
  s = reduce(s, { type: 'OPENING_TASK', taskId: 'op_interior' });
  assert.equal(s.openingPointsLeft, 6 - 2);
  assert.equal(s.blockedCells.length, 2);
  s = reduce(s, { type: 'FINISH_OPENING' });
  for (const i of s.blockedCells) assert.equal(s.cells[i], null, '使用不可マスにゾーンが残らない');
  assert.throws(() => reduce(s, { type: 'OPENING_TASK', taskId: 'op_power' }), /終わっています/);
});

test('準備ポイントを超える作業はできない', () => {
  let s = newGame({ difficultyId: 'hard' }); // 5pt
  s = reduce(s, { type: 'OPENING_TASK', taskId: 'op_interior' });
  s = reduce(s, { type: 'OPENING_TASK', taskId: 'op_toilet' });
  s = reduce(s, { type: 'OPENING_TASK', taskId: 'op_staff' });
  s = reduce(s, { type: 'OPENING_TASK', taskId: 'op_rules' });
  assert.throws(() => reduce(s, { type: 'OPENING_TASK', taskId: 'op_power' }), /足りません/);
});

test('受付がないと受け入れを開始できない（自由配置）', () => {
  let s = reduce(newGame({ layoutMode: 'free' }), { type: 'FINISH_OPENING' });
  assert.throws(() => reduce(s, { type: 'START_OPERATION' }), /受付/);
  s = reduce(s, { type: 'SET_ZONE', cell: 19, zone: 'reception' });
  s = reduce(s, { type: 'SET_ZONE', cell: 32, zone: 'living' });
  assert.equal(reduce(s, { type: 'START_OPERATION' }).phase, 'operating');
});

test('ゾーンは置ける床にしか置けない', () => {
  const s = reduce(newGame({ layoutMode: 'free' }), { type: 'FINISH_OPENING' });
  assert.throws(() => reduce(s, { type: 'SET_ZONE', cell: 0, zone: 'living' }), /置けません/); // 屋外に居住
  assert.throws(() => reduce(s, { type: 'SET_ZONE', cell: 40, zone: 'pet' }), /置けません/); // 屋内にペット
  assert.throws(() => reduce(newGame(), { type: 'SET_ZONE', cell: 40, zone: 'living' }), /変更できません|今は/);
});

test('避難者を配置でき、定員を超えると配置できない', () => {
  let s = operating();
  const living = firstCell(s, 'living');
  const g4 = s.groups.filter((g) => g.arrived && g.size === 4);
  s = reduce(s, { type: 'PLACE_GROUP', groupId: g4[0].id, cell: living });
  assert.equal(s.groups.find((g) => g.id === g4[0].id).cell, living);
  assert.throws(() => reduce(s, { type: 'PLACE_GROUP', groupId: g4[1].id, cell: living }), /定員/);
  assert.throws(() => reduce(s, { type: 'PLACE_GROUP', groupId: g4[1].id, cell: firstCell(s, 'aisle') }), /居住スペース/);
  const notYet = s.groups.find((g) => !g.arrived);
  assert.throws(() => reduce(s, { type: 'PLACE_GROUP', groupId: notYet.id, cell: living }), /到着/);
});

test('ニーズは配置と支援で満たされる（属性だけでは判定しない）', () => {
  let s = operating();
  const { grid } = getContext(s);
  const infant = s.groups.find((g) => g.id === 'g03');
  let r = evaluateGroupNeeds(s, grid, infant)[0];
  assert.equal(r.met, false);
  s = reduce(s, { type: 'PLACE_GROUP', groupId: 'g03', cell: firstCell(s, 'care') });
  s = reduce(s, { type: 'SUPPORT', groupId: 'g03', support: 'partition' });
  r = evaluateGroupNeeds(s, grid, s.groups.find((g) => g.id === 'g03'))[0];
  assert.equal(r.met, true);
  assert.equal(s.supplies.partition, s.initialSupplies.partition - 1);
});

test('物資：配布で在所人数分だけ減り、同じターンに二度は配れない', () => {
  let s = operating();
  s = reduce(s, { type: 'END_TURN' }); // 2ターン目＝食事の時間
  const ctx = getContext(s);
  for (const id of [...s.pendingEvents]) s = reduce(s, { type: 'CHOOSE_EVENT', eventId: id, choiceId: 'kits' });
  const persons = s.groups.filter((g) => g.arrived).reduce((n, g) => n + g.size, 0);
  const before = s.supplies.food;
  s = reduce(s, { type: 'DISTRIBUTE', distribution: 'food' });
  assert.equal(s.supplies.food, before - persons);
  assert.throws(() => reduce(s, { type: 'DISTRIBUTE', distribution: 'food' }), /配布済み/);
  const blanket = DISTRIBUTIONS.find((d) => d.id === 'blanket');
  assert.equal(distributionStatus(s, ctx.scenario, blanket).ok, false, '夜でなければ毛布は配れない');
});

test('物資：在庫が足りないと配れた分だけ配り「切れた」記録が残る', () => {
  let s = operating();
  s = reduce(s, { type: 'END_TURN' });
  for (const id of [...s.pendingEvents]) s = reduce(s, { type: 'CHOOSE_EVENT', eventId: id, choiceId: 'kits' });
  s = { ...s, supplies: { ...s.supplies, water: 5 } };
  s = reduce(s, { type: 'DISTRIBUTE', distribution: 'water' });
  assert.equal(s.supplies.water, 0);
  assert.equal(s.ranOut.water, true);
});

test('断水中はターン終了時に携帯トイレが在所人数分減る', () => {
  let s = operating();
  s = reduce(s, { type: 'END_TURN' });
  s = reduce(s, { type: 'CHOOSE_EVENT', eventId: 'ev_water_outage', choiceId: 'kits' });
  const persons = s.groups.filter((g) => g.arrived).reduce((n, g) => n + g.size, 0);
  const before = s.supplies.toilet_kit;
  s = reduce(s, { type: 'END_TURN' });
  assert.equal(s.supplies.toilet_kit, before - persons);
});

test('イベント：対応結果が指標・フラグ・物資・到着に反映される', () => {
  let s = operating();
  s = reduce(s, { type: 'END_TURN' });
  assert.deepEqual(s.pendingEvents, ['ev_water_outage']);
  assert.throws(() => reduce(s, { type: 'END_TURN' }), /未対応/);
  const hyg = s.metrics.hygiene;
  const pts = s.opsPoints;
  s = reduce(s, { type: 'CHOOSE_EVENT', eventId: 'ev_water_outage', choiceId: 'kits' });
  assert.equal(s.metrics.hygiene, hyg + 8);
  assert.equal(s.opsPoints, pts - 1);
  assert.equal(s.flags.outage_water, true);
  s = reduce(s, { type: 'END_TURN' }); // 3ターン目：追加到着
  const before = s.groups.filter((g) => g.arrived).length;
  s = reduce(s, { type: 'CHOOSE_EVENT', eventId: 'ev_extra_arrivals', choiceId: 'interview' });
  assert.equal(s.groups.filter((g) => g.arrived).length, before + 4);
});

test('イベント：条件を満たさない選択肢は選べない／時間切れは既定の選択肢になる', () => {
  let s = operating();
  for (let t = 0; t < 3; t++) {
    for (const id of [...s.pendingEvents]) {
      const ev = getContext(s).scenario.events.find((e) => e.id === id);
      s = reduce(s, { type: 'CHOOSE_EVENT', eventId: id, choiceId: ev.choices.at(-1).id });
    }
    s = reduce(s, { type: 'END_TURN' });
  }
  assert.equal(s.turn, 4);
  assert.throws(() => reduce(s, { type: 'CHOOSE_EVENT', eventId: 'ev_power_outage', choiceId: 'generator' }), /電源/);
  s = reduce(s, { type: 'CHOOSE_EVENT', eventId: 'ev_night_sick', timedOut: true });
  const r = s.resolvedEvents.find((e) => e.id === 'ev_night_sick');
  assert.equal(r.choiceId, 'wait');
  assert.equal(r.timedOut, true);
});

test('物資の到着遅延：対応しだいで支援物資の到着ターンが変わる', () => {
  const run = (choice) => {
    let s = operating();
    while (s.phase === 'operating') {
      for (const id of [...s.pendingEvents]) {
        const ev = getContext(s).scenario.events.find((e) => e.id === id);
        const c = id === 'ev_delivery_delay' ? choice : ev.choices.at(-1).id;
        s = reduce(s, { type: 'CHOOSE_EVENT', eventId: id, choiceId: c });
      }
      s = reduce(s, { type: 'END_TURN' });
    }
    return s;
  };
  assert.deepEqual(run('priority').receivedDeliveries, ['d1']);
  assert.deepEqual(run('wait').receivedDeliveries, []);
});

test('ミッション判定：点検・受付位置・断水対応', () => {
  let s = newGame();
  s = reduce(s, { type: 'OPENING_TASK', taskId: 'op_interior' });
  s = reduce(s, { type: 'FINISH_OPENING' });
  s = reduce(s, { type: 'START_OPERATION' });
  s = reduce(s, { type: 'END_TURN' });
  s = reduce(s, { type: 'CHOOSE_EVENT', eventId: 'ev_water_outage', choiceId: 'wait' });
  const { scenario, grid } = getContext(s);
  const m = Object.fromEntries(evaluateMissions(s, scenario, grid).map((x) => [x.id, x.achieved]));
  assert.equal(m.m_inspect, true);
  assert.equal(m.m_reception, true);
  assert.equal(m.m_toilet, false);
  assert.equal(m.m_no_wait, false, '1ターン目に未配置のまま終えたので未達成');
});

test('未点検の危険箇所に人を置くと事故が起きる', () => {
  let s = operating(); // 点検なし・固定レイアウト
  const { grid } = getContext(s);
  const hazard = grid.hazards[0].indices[0];
  assert.equal(s.cells[hazard], 'living');
  const g = s.groups.find((x) => x.arrived && x.size <= 4);
  s = reduce(s, { type: 'PLACE_GROUP', groupId: g.id, cell: hazard });
  const safety = s.metrics.safety;
  s = reduce(s, { type: 'END_TURN' });
  assert.ok(s.log.some((l) => l.checkId === 'hazard'));
  assert.ok(s.metrics.safety < safety);
});

test('地震シナリオを最後までプレイでき、総合評価が出る（固定・自由・3難易度）', () => {
  for (const layoutMode of ['fixed', 'free']) {
    for (const difficultyId of ['easy', 'normal', 'hard']) {
      const { state, report } = play({ layoutMode, difficultyId, strategy: 'good' });
      assert.equal(state.phase, 'finished');
      assert.equal(state.history.length, 6);
      assert.ok(report.total >= 0 && report.total <= 100);
      assert.equal(report.categories.length, 6);
      assert.ok(report.rank.label);
    }
  }
});

test('よい対応と消極的な対応で評価に差が出る', () => {
  const good = play({ strategy: 'good' }).report;
  const passive = play({ strategy: 'passive' }).report;
  assert.ok(good.total > passive.total + 30, `${good.total} vs ${passive.total}`);
  assert.ok(good.achieved.length > passive.achieved.length);
  assert.ok(passive.problems.length > good.problems.length);
  assert.ok(passive.improvements.length > 0);
});

test('セーブデータを保存・復元でき、復元後も続きをプレイできる', () => {
  const storage = memStorage();
  let s = operating();
  s = reduce(s, { type: 'END_TURN' });
  assert.equal(saveGame(storage, s), true);
  const loaded = loadGame(storage);
  assert.deepEqual(loaded.state, s);
  const next = reduce(loaded.state, { type: 'CHOOSE_EVENT', eventId: 'ev_water_outage', choiceId: 'kits' });
  assert.equal(next.pendingEvents.length, 0);
});

test('壊れた・別アプリのセーブデータは読み込まない', () => {
  assert.throws(() => deserialize('{broken'), /形式/);
  assert.throws(() => deserialize(JSON.stringify({ app: 'other', schemaVersion: 1 })), /このゲーム/);
  const s = newGame();
  assert.throws(() => deserialize(serialize({ ...s, scenarioId: 'nope' })), /シナリオ/);
  const storage = memStorage();
  storage.setItem(SAVE_KEY, 'garbage');
  assert.equal(loadGame(storage), null);
});

test('アンケート：端末内に保存し、CSVで出力できる（Excel向けBOM・引用・数式化防止）', () => {
  const storage = memStorage();
  const r = buildResponse({
    answers: { q1_realism: 4, q2_differences: 'トイレ, "行列"\n長い', q3_usability: 9, q7_training: '利用できる', q8_other: '=HYPERLINK("x")' },
    questions: SURVEY_QUESTIONS, play: { playId: 'p1', scenarioId: 'earthquake_basic', difficultyId: 'normal', totalScore: 80, rank: 'A' }, now: NOW, id: 'r1',
  });
  assert.equal(r.answers.q3_usability, null, '範囲外の値は保存しない');
  saveResponse(storage, r);
  assert.equal(loadResponses(storage).length, 1);
  const csv = toCSV(loadResponses(storage), SURVEY_QUESTIONS);
  assert.ok(csv.startsWith('﻿回答ID,'));
  assert.ok(csv.includes('"トイレ, ""行列""\n長い"'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.equal(csv.trim().split('\r\n').length, 2);
});

test('アンケート項目は8問で、個人情報を聞く項目がない', () => {
  assert.equal(SURVEY_QUESTIONS.length, 8);
  for (const q of SURVEY_QUESTIONS) assert.doesNotMatch(q.label, /氏名|名前|電話|メール|住所|所属/);
});

test('シナリオデータの整合性（イベント選択肢・参照資料・ミッション）', async () => {
  const { SOURCES } = await import('../src/data/sources.js');
  const ids = new Set(SOURCES.map((x) => x.id));
  for (const sc of SCENARIOS.filter((x) => x.ready)) {
    for (const ev of sc.events) {
      assert.ok(ev.choices.length >= 2, ev.id);
      assert.ok(ev.choices.some((c) => !c.cost?.points && !c.cost?.supplies && !c.requiresFlag), `${ev.id} に費用なしの選択肢がない`);
      if (ev.timeLimitSec) assert.ok(ev.choices.some((c) => c.id === ev.defaultChoiceId), `${ev.id} の既定選択肢`);
      for (const sid of ev.sourceIds || []) assert.ok(ids.has(sid), `${ev.id} の参照資料 ${sid}`);
      assert.equal(typeof ev.isGameAssumption, 'boolean');
    }
    const required = ['ev_extra_arrivals', 'ev_water_outage', 'ev_power_outage', 'ev_toilet_shortage', 'ev_food_shortage', 'ev_delivery_delay', 'ev_care_support', 'ev_night_sick'];
    for (const id of required) assert.ok(sc.events.some((e) => e.id === id), id);
    for (const g of sc.groups) assert.ok(g.size >= 1 && g.size <= 4, `${g.id} は1マスに入る人数`);
  }
});

test('トイレ不足・食料不足イベントは条件を満たしたときに発生する', () => {
  const { state } = play({ difficultyId: 'hard', strategy: 'good' });
  assert.ok(state.firedEvents.includes('ev_toilet_shortage'));
  assert.ok(state.firedEvents.includes('ev_food_shortage'));
  const easy = play({ difficultyId: 'easy', strategy: 'good' }).state;
  assert.ok(!easy.firedEvents.includes('ev_food_shortage'), '物資が足りていれば発生しない');
});

test('評価の内訳：振り返り用の情報がそろっている', () => {
  const { state } = play({ strategy: 'passive' });
  const { scenario, grid } = getContext(state);
  const r = finalReport(state, scenario, grid);
  assert.ok(r.events.every((e) => e.knowledge && e.choiceLabel));
  assert.ok(r.unachieved.length > 0);
  assert.ok(r.problems.length > 0);
});
