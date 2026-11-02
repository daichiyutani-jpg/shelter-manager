// 画面の描画。ゲームのルールは engine/ にあり、ここは表示と操作の受け付けだけを行う。
import { h, meter, download, toast } from './dom.js';
import { APP, CATEGORIES, DIFFICULTIES, DISTRIBUTIONS, NEEDS, SUPPLY_ITEMS, SUPPORTS, TILES, ZONES } from '../data/config.js';
import { SCENARIOS } from '../data/scenarios/index.js';
import { TUTORIAL } from '../data/tutorial.js';
import { SURVEY_QUESTIONS } from '../data/survey.js';
import { SOURCES, DISCLAIMER } from '../data/sources.js';
import { getContext, currentTurnInfo, distributionStatus, opsPointsPerTurn } from '../engine/game.js';
import { capacity, occupancy, personsPresent, toiletUnits, zoneById, toXY } from '../engine/layout.js';
import { evaluateGroupNeeds, needsSummary } from '../engine/needs.js';
import { choiceAvailability, effectiveTimeLimit } from '../engine/events.js';
import { evaluateMissions } from '../engine/missions.js';
import { finalReport, totalScore, rankOf } from '../engine/scoring.js';
import { buildResponse, toCSV, loadResponses, saveResponse, clearResponses } from '../engine/survey.js';

const supplyLabel = Object.fromEntries(SUPPLY_ITEMS.map((s) => [s.id, s]));
const categoryLabel = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
const sourceById = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

function screen(title, ...body) {
  return h('main', { class: 'screen' }, title ? h('h1', { class: 'screen-title' }, title) : null, ...body);
}

function btn(label, onclick, cls = 'primary', extra = {}) {
  return h('button', { type: 'button', class: `btn ${cls}`, onclick, ...extra }, label);
}

function deltaText(delta = {}) {
  return Object.entries(delta).filter(([, v]) => v).map(([k, v]) => `${categoryLabel[k] || supplyLabel[k]?.label || k}${v > 0 ? '+' : ''}${v}`).join('　');
}

function costText(cost = {}) {
  const parts = [];
  if (cost.points) parts.push(`運営pt ${cost.points}`);
  for (const [k, v] of Object.entries(cost.supplies || {})) parts.push(`${supplyLabel[k].label} ${v}${supplyLabel[k].unit}`);
  return parts.length ? `必要：${parts.join('・')}` : '必要：なし';
}

function sourceLinks(ids) {
  return ids.map((id) => sourceById[id]).filter(Boolean).map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title), `（${s.publisher}）`));
}

// ───────── 1. タイトル ─────────
export function titleScreen(app) {
  const saved = app.savedGame();
  return screen(null,
    h('div', { class: 'title-hero' },
      h('div', { class: 'title-mark', 'aria-hidden': 'true' }, h('span', {}, '避')),
      h('h1', { class: 'title-name' }, APP.workingTitle),
      h('p', { class: 'title-sub' }, '避難所の開設・運営を学ぶシミュレーション'),
      h('p', { class: 'title-note' }, `${APP.titleNote}／試作版 ${APP.version}`)),
    h('div', { class: 'stack' },
      btn('はじめから', () => app.go('scenarios')),
      saved ? btn(`続きから（${saved.state.phase === 'finished' ? '評価' : saved.state.turn ? `${saved.state.turn}ターン目` : '開設準備'}・${new Date(saved.savedAt).toLocaleString('ja-JP')}）`, () => app.resume(), 'secondary') : null,
      btn('アンケート結果の確認・出力', () => app.go('surveyResults'), 'ghost'),
      btn('参考資料と注意事項', () => app.go('sources'), 'ghost')),
    h('p', { class: 'fine' }, DISCLAIMER[0]));
}

// ───────── 2. シナリオ選択 ─────────
export function scenarioScreen(app) {
  const ui = app.ui;
  ui.pick ??= { scenarioId: 'earthquake_basic', difficultyId: 'normal', layoutMode: 'fixed' };
  const radio = (name, value, label, desc, disabled = false) => h('label', { class: `choice-card ${ui.pick[name] === value ? 'selected' : ''} ${disabled ? 'disabled' : ''}` },
    h('input', { type: 'radio', name, value, checked: ui.pick[name] === value, disabled, onchange: () => { ui.pick[name] = value; app.render(); } }),
    h('strong', {}, label), desc ? h('span', { class: 'desc' }, desc) : null);
  return screen('シナリオ選択',
    h('section', {}, h('h2', {}, '災害'),
      ...SCENARIOS.map((s) => radio('scenarioId', s.id, s.ready ? s.title : `${s.title}（準備中）`, s.summary, !s.ready))),
    h('section', {}, h('h2', {}, '難易度'), ...DIFFICULTIES.map((d) => radio('difficultyId', d.id, d.label, d.description))),
    h('section', {}, h('h2', {}, 'レイアウト'),
      radio('layoutMode', 'fixed', '固定レイアウト（初心者向け）', '見本の配置で始めます。ゾーンの変更はできません。'),
      radio('layoutMode', 'free', '自由配置', 'マスをタップして、受付や居住スペースを自分で置きます。')),
    h('section', {}, h('h2', {}, 'プレイ形式'),
      h('p', {}, '1人プレイ'),
      h('p', { class: 'fine' }, '複数人での協力プレイ・防災訓練モード・自治体別のカスタマイズは未実装です（今後の検討項目）。')),
    h('div', { class: 'stack' },
      btn('この設定で始める', () => app.newGame(ui.pick)),
      btn('戻る', () => app.go('title'), 'ghost')));
}

// ───────── 3. ゲーム説明 ─────────
export function howtoScreen(app) {
  const { scenario } = getContext(app.state);
  return screen('ゲームの説明',
    h('section', { class: 'card briefing' }, h('h2', {}, scenario.title), ...scenario.briefing.map((p) => h('p', {}, p))),
    ...TUTORIAL.map((t) => h('section', { class: 'card' }, h('h3', {}, t.title), h('p', {}, t.body))),
    h('p', { class: 'fine' }, DISCLAIMER.join(' ')),
    h('div', { class: 'stack' }, btn('避難所の開設へ', () => app.go('opening'))));
}

// ───────── 4. 避難所開設 ─────────
export function openingScreen(app) {
  const s = app.state;
  const { scenario, grid } = getContext(s);
  return screen('避難所の開設準備',
    h('p', {}, '施設の管理者・市の職員と一緒に、受け入れの前にやることを選びます。全部はできません。'),
    h('div', { class: 'pill-row' }, h('span', { class: 'pill big' }, `準備ポイント 残り ${s.openingPointsLeft}`)),
    h('div', { class: 'stack' }, ...scenario.openingTasks.map((t) => {
      const done = s.openingDone.includes(t.id);
      const can = !done && t.cost <= s.openingPointsLeft;
      return h('div', { class: `task ${done ? 'done' : ''}` },
        h('div', { class: 'task-head' }, h('strong', {}, t.label), h('span', { class: 'pill' }, `${t.cost}pt`)),
        done ? h('p', { class: 'result' }, t.result) : null,
        done ? null : btn(can ? '実施する' : 'ポイント不足', () => app.dispatch({ type: 'OPENING_TASK', taskId: t.id }), 'secondary small', { disabled: !can }));
    })),
    s.openingDone.length && grid.hazards.some((hz) => s.openingDone.includes(hz.revealedBy))
      ? h('p', { class: 'notice' }, '点検で見つかった危険な場所は、平面図で使用不可になります。') : null,
    h('div', { class: 'stack' }, btn('開設準備を終えて、レイアウトへ', () => {
      if (s.openingPointsLeft > 0 && !confirm('準備ポイントが残っています。開設準備を終えますか？')) return;
      if (app.dispatch({ type: 'FINISH_OPENING' })) app.go('layout');
    })));
}

// ───────── 平面図（レイアウト・配置で共通） ─────────
function facilityGrid(app, { onCell }) {
  const s = app.state;
  const { grid } = getContext(s);
  const selected = app.ui.selectedGroupId ? s.groups.find((g) => g.id === app.ui.selectedGroupId) : null;
  const revealedDamaged = grid.damagedToilets.filter((d) => s.openingDone.includes(d.revealedBy)).map((d) => d.index);
  const cells = grid.tiles.map((tile, i) => {
    const zone = s.cells[i] ? zoneById[s.cells[i]] : null;
    const blocked = s.blockedCells.includes(i);
    const occ = occupancy(s, i);
    const cap = capacity(s, i);
    let label = '';
    let sub = '';
    if (blocked) label = '危';
    else if (tile === 'w') { label = 'WC'; if (revealedDamaged.includes(i)) sub = '故障'; }
    else if (tile === 'x') label = '';
    else if (zone) { label = zone.short; if (cap) sub = `${occ}/${cap}`; }
    const fits = selected && cap && occ + selected.size - (selected.cell === i ? selected.size : 0) <= cap;
    const cls = ['cell', `tile-${tile}`, zone ? zone.color : '', blocked ? 'blocked' : '', fits ? 'fits' : '', selected && selected.cell === i ? 'current' : ''].join(' ');
    const [x, y] = toXY(i, grid.w);
    const aria = `${x + 1}列${y + 1}行 ${TILES[tile].label}${zone ? `・${zone.label}` : ''}${cap ? `・${occ}/${cap}人` : ''}${blocked ? '・使用不可' : ''}`;
    return h('button', { type: 'button', class: cls, 'aria-label': aria, disabled: tile === 'x', onclick: () => onCell(i) },
      h('span', { class: 'cell-label' }, label), sub ? h('span', { class: 'cell-sub' }, sub) : null);
  });
  return h('div', { class: 'facility', style: { gridTemplateColumns: `repeat(${grid.w}, 1fr)` } }, ...cells);
}

function legend() {
  return h('details', { class: 'legend' }, h('summary', {}, '凡例'),
    h('div', { class: 'legend-grid' },
      ...ZONES.map((z) => h('span', { class: `legend-item ${z.color}` }, `${z.short}：${z.label}${z.capacity ? `（${z.capacity}人/マス）` : ''}`)),
      h('span', { class: 'legend-item tile-o' }, '屋外'), h('span', { class: 'legend-item tile-s' }, 'ステージ'),
      h('span', { class: 'legend-item tile-w' }, 'WC：建物のトイレ'), h('span', { class: 'legend-item blocked' }, '危：点検で使用不可')),
    h('p', { class: 'fine' }, '1マスは約3m四方、定員はゲーム上の仮定です。上が北（校庭）、下が南（ステージ）です。'));
}

function zonePalette(app) {
  const tools = [...ZONES.map((z) => ({ id: z.id, label: z.label, cls: z.color })), { id: 'erase', label: '消す', cls: 'zone-erase' }];
  return h('div', { class: 'palette', role: 'toolbar', 'aria-label': '置くものを選ぶ' }, ...tools.map((t) => h('button', {
    type: 'button', class: `tool ${t.cls} ${app.ui.zoneTool === t.id ? 'active' : ''}`, 'aria-pressed': app.ui.zoneTool === t.id ? 'true' : 'false',
    onclick: () => { app.ui.zoneTool = t.id; app.ui.selectedGroupId = null; app.render(); },
  }, t.label)));
}

// ───────── 5. 避難所レイアウト ─────────
export function layoutScreen(app) {
  const s = app.state;
  const editable = s.layoutMode === 'free';
  app.ui.zoneTool ??= 'living';
  const onCell = (i) => {
    if (!editable) { cellInfo(app, i); return; }
    app.dispatch({ type: 'SET_ZONE', cell: i, zone: app.ui.zoneTool === 'erase' ? null : app.ui.zoneTool });
  };
  const counts = Object.fromEntries(ZONES.map((z) => [z.id, s.cells.filter((c) => c === z.id).length]));
  const capTotal = s.cells.reduce((n, z, i) => n + capacity(s, i), 0);
  return screen('避難所のレイアウト',
    h('p', {}, editable ? '下のボタンで置くものを選び、マスをタップします。受付は出入口のそばがおすすめです。' : '固定レイアウトです。配置を確認して受け入れを始めましょう。'),
    editable ? zonePalette(app) : null,
    facilityGrid(app, { onCell }),
    legend(),
    h('div', { class: 'pill-row' },
      h('span', { class: 'pill' }, `受付 ${counts.reception}`), h('span', { class: 'pill' }, `居住 ${counts.living}`), h('span', { class: 'pill' }, `要配慮 ${counts.care}`),
      h('span', { class: 'pill' }, `通路 ${counts.aisle}`), h('span', { class: 'pill' }, `定員 計${capTotal}人`)),
    h('div', { class: 'stack' }, btn('受け入れを開始する', () => {
      if (app.dispatch({ type: 'START_OPERATION' })) { app.ui.tab = 'status'; app.go('play'); }
    })));
}

function cellInfo(app, i) {
  const s = app.state;
  const groups = s.groups.filter((g) => g.cell === i);
  const zone = s.cells[i] ? zoneById[s.cells[i]].label : 'なし';
  toast(groups.length ? `${zone}：${groups.map((g) => g.label).join('、')}` : `${zone}（避難者なし）`);
}

// ───────── 運営中のハブ（下タブ） ─────────
export function playScreen(app) {
  const s = app.state;
  if (s.phase === 'finished') { app.go('result'); return h('div'); }
  const { scenario, grid } = getContext(s);
  const turn = currentTurnInfo(s, scenario);
  const unplaced = s.groups.filter((g) => g.arrived && g.cell === null).length;
  const tabs = [
    { id: 'status', label: '状況', badge: s.pendingEvents.length },
    { id: 'layout', label: '配置', badge: 0 },
    { id: 'groups', label: '避難者', badge: unplaced },
    { id: 'supplies', label: '物資', badge: 0 },
    { id: 'missions', label: 'ミッション', badge: 0 },
  ];
  const tab = app.ui.tab || 'status';
  const body = { status: statusTab, layout: placementTab, groups: groupsTab, supplies: suppliesTab, missions: missionsTab }[tab](app, { scenario, grid, turn });
  return h('div', { class: 'play' },
    h('header', { class: 'hud' },
      h('div', { class: 'hud-turn' }, h('strong', {}, `${s.turn}/${scenario.turns.length}ターン`), h('span', {}, turn?.label)),
      h('div', { class: 'hud-stats' },
        h('span', { class: 'pill' }, `運営pt ${s.opsPoints}/${opsPointsPerTurn(s)}`),
        h('span', { class: 'pill' }, `在所 ${personsPresent(s)}人`),
        h('span', { class: 'pill' }, `トイレ ${toiletUnits(s, grid)}基`))),
    h('div', { class: 'play-body' }, body),
    h('nav', { class: 'tabbar', 'aria-label': '運営メニュー' }, ...tabs.map((t) => h('button', {
      type: 'button', class: `tab ${tab === t.id ? 'active' : ''}`, 'aria-current': tab === t.id ? 'page' : null,
      onclick: () => { app.ui.tab = t.id; app.render(); window.scrollTo(0, 0); },
    }, t.label, t.badge ? h('span', { class: 'badge' }, String(t.badge)) : null))));
}

// ───────── 9′. 状況（運営状況の確認） ─────────
function statusTab(app, { scenario, turn }) {
  const s = app.state;
  const turnLog = s.log.filter((l) => l.turn === s.turn);
  const prevLog = s.log.filter((l) => l.turn === s.turn - 1 && l.checkId);
  return h('div', { class: 'stack' },
    h('section', { class: 'card' }, h('h2', {}, turn?.label), h('p', {}, turn?.narrative),
      turn?.flags.includes('meal') ? h('p', { class: 'notice' }, '食事の時間です。「物資」タブで食料と飲料水を配りましょう。') : null,
      turn?.flags.includes('night') && !s.distributedEver.blanket ? h('p', { class: 'notice' }, '夜です。毛布の配布を検討しましょう。') : null),
    s.pendingEvents.length ? h('section', { class: 'card alert' }, h('h2', {}, `対応が必要なイベント（${s.pendingEvents.length}件）`),
      ...s.pendingEvents.map((id) => {
        const ev = scenario.events.find((e) => e.id === id);
        return btn(`${ev.title}${ev.timeLimitSec && getContext(s).difficulty.timeLimits ? '（時間制限あり）' : ''}`, () => { app.ui.eventId = id; app.ui.eventResult = null; app.go('event'); }, 'warn');
      })) : null,
    h('section', { class: 'card' }, h('h2', {}, '運営状況'), ...CATEGORIES.map((c) => meter(c.label, Math.round(s.metrics[c.id])))),
    prevLog.length ? h('section', { class: 'card' }, h('h2', {}, '前のターンの結果'), h('ul', { class: 'log' }, ...prevLog.map(logItem))) : null,
    turnLog.length ? h('section', { class: 'card' }, h('h2', {}, 'このターンの出来事'), h('ul', { class: 'log' }, ...turnLog.map(logItem))) : null,
    btn(s.turn >= scenario.turns.length ? '最終ターンを終えて評価へ' : 'ターン終了', () => {
      const unplaced = s.groups.filter((g) => g.arrived && g.cell === null).length;
      if (unplaced && !confirm(`居場所が決まっていない世帯が${unplaced}世帯あります。ターンを終えますか？`)) return;
      if (app.dispatch({ type: 'END_TURN' })) {
        app.ui.selectedGroupId = null;
        if (app.state.phase === 'finished') app.go('result');
        else { toast(`${app.state.turn}ターン目になりました`); app.render(); window.scrollTo(0, 0); }
      }
    }, 'primary', { disabled: s.pendingEvents.length > 0 }),
    s.pendingEvents.length ? h('p', { class: 'fine center' }, '未対応のイベントがあるとターンを終了できません。') : null);
}

function logItem(l) {
  return h('li', { class: `log-${l.kind}` }, l.text, l.delta ? h('span', { class: 'delta' }, ` ${deltaText(l.delta)}`) : null);
}

// ───────── 8. イベント対応 ─────────
export function eventScreen(app) {
  const s = app.state;
  const { scenario, difficulty } = getContext(s);
  const ev = scenario.events.find((e) => e.id === app.ui.eventId);
  if (!ev) { app.go('play'); return h('div'); }
  const res = app.ui.eventResult;
  if (res) {
    const choice = ev.choices.find((c) => c.id === res.choiceId);
    return screen(ev.title,
      h('section', { class: 'card' }, h('h2', {}, res.timedOut ? '時間切れ：対応が遅れました' : 'あなたの対応'), h('p', {}, choice.label),
        h('p', { class: 'result' }, choice.result), h('p', { class: 'delta' }, deltaText({ ...choice.effects.metrics, ...choice.effects.supplies }))),
      h('section', { class: 'card knowledge' }, h('h2', {}, '関連する防災知識'), h('p', {}, ev.knowledge),
        ev.isGameAssumption ? h('p', { class: 'fine' }, 'このイベントの発生タイミングや数値はゲーム上の仮定です。') : null,
        h('ul', { class: 'sources' }, ...sourceLinks(ev.sourceIds || []))),
      btn('状況に戻る', () => { app.ui.eventId = null; app.ui.eventResult = null; app.ui.tab = 'status'; app.go('play'); }));
  }
  if (!s.pendingEvents.includes(ev.id)) { app.go('play'); return h('div'); }
  const limit = effectiveTimeLimit(ev, difficulty);
  const choose = (choiceId, timedOut = false) => {
    app.stopTimer();
    // dispatch の中で再描画されるため、結果表示用の情報を先に入れておく
    app.ui.eventResult = { choiceId: timedOut ? ev.defaultChoiceId : choiceId, timedOut };
    if (!app.dispatch({ type: 'CHOOSE_EVENT', eventId: ev.id, choiceId, timedOut })) {
      app.ui.eventResult = null;
      app.render();
    }
  };
  if (limit) app.startTimer(ev.id, limit, () => choose(null, true));
  return screen(ev.title,
    h('p', { class: 'fine' }, `発生：${ev.timing}`),
    limit ? h('div', { class: 'timer', role: 'timer', 'aria-live': 'off' }, '残り ', h('strong', { id: 'timer-sec' }, String(app.timerLeft(ev.id, limit))), ' 秒（時間切れになると対応が遅れます）') : null,
    h('section', { class: 'card alert' }, h('p', {}, ev.situation)),
    h('div', { class: 'stack' }, ...ev.choices.map((c) => {
      const av = choiceAvailability(c, s);
      return h('div', { class: `choice ${av.ok ? '' : 'disabled'}` },
        h('button', { type: 'button', class: 'btn choice-btn', disabled: !av.ok, onclick: () => choose(c.id) }, c.label),
        h('span', { class: 'fine' }, av.ok ? costText(c.cost) : av.reason));
    })),
    h('p', { class: 'fine' }, `運営ポイント 残り${s.opsPoints}`));
}

// ───────── 5′/6. 配置（運営中のレイアウト） ─────────
function placementTab(app) {
  const s = app.state;
  const selected = app.ui.selectedGroupId ? s.groups.find((g) => g.id === app.ui.selectedGroupId) : null;
  const editing = s.layoutMode === 'free' && app.ui.editLayout;
  const onCell = (i) => {
    if (selected) {
      if (app.dispatch({ type: 'PLACE_GROUP', groupId: selected.id, cell: i })) {
        toast(`${selected.label}を配置しました`, 'good');
        app.ui.selectedGroupId = null;
        app.ui.tab = 'groups';
        app.render();
        window.scrollTo(0, 0);
      }
    } else if (editing) {
      app.dispatch({ type: 'SET_ZONE', cell: i, zone: app.ui.zoneTool === 'erase' ? null : app.ui.zoneTool });
    } else cellInfo(app, i);
  };
  return h('div', { class: 'stack' },
    selected
      ? h('div', { class: 'card select-banner' }, h('strong', {}, `${selected.label}（${selected.size}人）`), h('span', {}, 'を置くマスをタップ（緑の枠が空きのあるマス）'),
        btn('選択をやめる', () => { app.ui.selectedGroupId = null; app.render(); }, 'ghost small'))
      : h('p', {}, '「避難者」タブで世帯を選ぶと、ここで配置できます。マスをタップすると、いる人が分かります。'),
    s.layoutMode === 'free' && !selected ? h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: !!app.ui.editLayout, onchange: (e) => { app.ui.editLayout = e.target.checked; app.ui.zoneTool ??= 'aisle'; app.render(); } }), ' レイアウトを編集する') : null,
    editing ? zonePalette(app) : null,
    facilityGrid(app, { onCell }),
    legend());
}

// ───────── 6. 避難者管理 ─────────
function groupsTab(app, { grid }) {
  const s = app.state;
  const arrived = s.groups.filter((g) => g.arrived).sort((a, b) => (a.cell === null ? 0 : 1) - (b.cell === null ? 0 : 1));
  const ns = needsSummary(s, grid);
  return h('div', { class: 'stack' },
    h('div', { class: 'pill-row' },
      h('span', { class: 'pill' }, `到着 ${arrived.length}世帯`),
      h('span', { class: 'pill' }, `未配置 ${arrived.filter((g) => g.cell === null).length}`),
      h('span', { class: 'pill' }, `ニーズ充足 ${ns.met}/${ns.total}`)),
    ...arrived.map((g) => groupCard(app, g, grid)),
    arrived.length ? null : h('p', {}, 'まだ到着した世帯はありません。'));
}

function groupCard(app, g, grid) {
  const s = app.state;
  const needs = evaluateGroupNeeds(s, grid, g);
  const ages = Object.entries(g.ages).map(([k, v]) => `${{ child: '子ども', adult: '大人', senior: '高齢者' }[k]}${v}`).join('・');
  const where = g.cell === null ? '未配置' : `${zoneById[s.cells[g.cell]].label}（${toXY(g.cell, grid.w).map((n) => n + 1).join('-')}）`;
  const relevantSupports = SUPPORTS.filter((sp) => needs.some((n) => NEEDS[n.need].requirements.some((r) => r.support === sp.id)));
  return h('article', { class: `card group ${g.cell === null ? 'unplaced' : ''}` },
    h('div', { class: 'task-head' }, h('strong', {}, g.label), h('span', { class: 'pill' }, `${g.size}人`)),
    h('p', { class: 'fine' }, `${g.family}／${ages}${g.infants ? `／乳幼児${g.infants}` : ''}${g.pet ? `／${g.pet}` : ''}`),
    g.note ? h('p', {}, g.note) : null,
    h('p', {}, '居場所：', h('strong', {}, where)),
    ...needs.map((n) => h('div', { class: `need ${n.met ? 'met' : 'unmet'}` },
      h('strong', {}, `${n.met ? '◯' : '△'} ${n.label}`), h('span', { class: 'fine' }, NEEDS[n.need].mode === 'any' ? '（どれか1つ）' : '（すべて）'),
      h('ul', {}, ...n.requirements.map((r) => h('li', { class: r.met ? 'ok' : 'ng' }, `${r.met ? '✓' : '・'} ${r.label}`))))),
    h('div', { class: 'btn-row' },
      btn(g.cell === null ? '配置する' : '場所を変える', () => { app.ui.selectedGroupId = g.id; app.ui.tab = 'layout'; app.render(); window.scrollTo(0, 0); }, 'secondary small'),
      g.cell !== null ? btn('配置を外す', () => app.dispatch({ type: 'PLACE_GROUP', groupId: g.id, cell: null }), 'ghost small') : null,
      ...relevantSupports.map((sp) => {
        const done = g.support.includes(sp.id);
        const costs = [sp.item ? `${supplyLabel[sp.item].label}${sp.amount}` : null, sp.points ? `運営pt${sp.points}` : null].filter(Boolean).join('・');
        return btn(done ? `${sp.label}（済）` : `${sp.label}（${costs}）`, () => app.dispatch({ type: 'SUPPORT', groupId: g.id, support: sp.id }), 'ghost small', { disabled: done });
      })));
}

// ───────── 7. 物資管理 ─────────
function suppliesTab(app, { scenario }) {
  const s = app.state;
  const pending = (scenario.deliveries || []).filter((d) => !s.receivedDeliveries.includes(d.id));
  return h('div', { class: 'stack' },
    h('section', { class: 'card' }, h('h2', {}, '在庫'),
      h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}, '品目'), h('th', {}, '現在'), h('th', {}, '開始時'))),
        h('tbody', {}, ...SUPPLY_ITEMS.map((it) => h('tr', { class: s.ranOut[it.id] ? 'ranout' : '' },
          h('td', {}, it.label), h('td', {}, `${s.supplies[it.id] ?? 0}${it.unit}`), h('td', { class: 'fine' }, `${s.initialSupplies[it.id] ?? 0}`))))),
      h('p', { class: 'fine' }, '初期数量・消費量はゲーム用の仮設定です。断水中は1人1ターンに携帯トイレを1回分使います（仮定）。実際の必要量は参考資料を確認してください。')),
    h('section', { class: 'card' }, h('h2', {}, '配布'),
      ...DISTRIBUTIONS.map((d) => {
        const st = distributionStatus(s, scenario, d);
        return h('div', { class: 'choice' },
          btn(d.label, () => app.dispatch({ type: 'DISTRIBUTE', distribution: d.id }), 'secondary', { disabled: !st.ok }),
          h('span', { class: 'fine' }, st.ok ? `使用予定 ${st.need}${supplyLabel[d.item].unit}・運営pt${d.points}${st.need > s.supplies[d.item] ? '（足りません）' : ''}` : st.reason));
      })),
    h('section', { class: 'card' }, h('h2', {}, '支援物資の予定'),
      pending.length ? h('ul', {}, ...pending.map((d) => {
        const t = s.deliveryTurns[d.id];
        return h('li', {}, `${d.label}：${t ? `${t}ターン目に到着予定` : '到着の見込みが立っていない'}（${Object.entries(d.items).map(([k, v]) => `${supplyLabel[k].label}${v}`).join('・')}）`);
      })) : h('p', {}, '予定されている物資はありません。')));
}

// ───────── 9. ミッション確認 ─────────
function missionsTab(app, { scenario, grid }) {
  const ms = evaluateMissions(app.state, scenario, grid);
  return h('div', { class: 'stack' },
    h('p', {}, '現時点の判定です。「最終ターン」と書かれたものは、最後のターン終了時の状態で判定します。'),
    ...ms.map((m) => h('div', { class: `mission ${m.achieved ? 'ok' : ''}` }, h('span', { class: 'mark' }, m.achieved ? '達成' : '未達成'), m.label)));
}

// ───────── 10. 総合評価 ─────────
export function resultScreen(app) {
  const s = app.state;
  const { scenario, grid } = getContext(s);
  const r = finalReport(s, scenario, grid);
  return screen('総合評価',
    h('section', { class: 'card score' }, h('div', { class: 'rank' }, r.rank.label), h('div', {}, h('div', { class: 'total' }, `${r.total}点`), h('p', {}, r.rank.comment))),
    h('p', { class: 'notice' }, 'この評価はゲーム上の評価です。行政の正式な基準や、実際の避難所の良し悪しを示すものではありません。'),
    h('section', { class: 'card' }, h('h2', {}, '6つの分類'), ...r.categories.map((c) => meter(c.label, c.score))),
    h('section', { class: 'card' }, h('h2', {}, `ミッション（${r.achieved.length}/${r.missions.length}達成）`),
      ...r.missions.map((m) => h('div', { class: `mission ${m.achieved ? 'ok' : ''}` }, h('span', { class: 'mark' }, m.achieved ? '達成' : '未達成'), m.label))),
    h('div', { class: 'stack' }, btn('振り返りへ', () => app.go('review'))));
}

// ───────── 11. 振り返り ─────────
export function reviewScreen(app) {
  const s = app.state;
  const { scenario, grid } = getContext(s);
  const r = finalReport(s, scenario, grid);
  return screen('振り返り',
    h('section', { class: 'card' }, h('h2', {}, '改善点'),
      r.improvements.length ? h('ul', {}, ...r.improvements.map((i) => h('li', {}, h('strong', {}, `${i.category}：`), i.text))) : h('p', {}, '大きな改善点はありませんでした。別の難易度や自由配置でも試してみましょう。')),
    h('section', { class: 'card' }, h('h2', {}, `未達成の課題（${r.unachieved.length}）`),
      r.unachieved.length ? h('ul', {}, ...r.unachieved.map((m) => h('li', {}, m.label))) : h('p', {}, 'すべてのミッションを達成しました。')),
    h('section', { class: 'card' }, h('h2', {}, `発生した問題（${r.problems.length}）`),
      r.problems.length ? h('ul', { class: 'log' }, ...r.problems.map((l) => h('li', { class: 'log-problem' }, `${l.turn}T：${l.text}`))) : h('p', {}, '記録された問題はありません。')),
    h('section', { class: 'card' }, h('h2', {}, `満たせなかったニーズ（${r.needs.unmet.length}）`),
      r.needs.unmet.length ? h('ul', {}, ...r.needs.unmet.map((u) => h('li', {}, `${u.groupLabel}：${u.need}`))) : h('p', {}, '最終ターンの時点で、すべてのニーズを満たしていました。')),
    h('section', { class: 'card' }, h('h2', {}, 'イベントへの対応と防災知識'),
      ...r.events.map((e) => h('details', { class: 'review-event' }, h('summary', {}, `${e.turn}T ${e.title}${e.timedOut ? '（時間切れ）' : ''}`),
        h('p', {}, h('strong', {}, '対応：'), e.choiceLabel), h('p', {}, e.result), h('p', { class: 'knowledge' }, e.knowledge),
        h('ul', { class: 'sources' }, ...sourceLinks(e.sourceIds))))),
    h('section', { class: 'card' }, h('h2', {}, 'ターンごとの推移'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'T'), ...CATEGORIES.map((c) => h('th', {}, c.label.slice(0, 2))), h('th', {}, '人数'))),
        h('tbody', {}, ...s.history.map((row) => h('tr', {}, h('td', {}, row.turn), ...CATEGORIES.map((c) => h('td', {}, Math.round(row.metrics[c.id]))), h('td', {}, row.persons))))))),
    h('p', { class: 'fine' }, DISCLAIMER[1]),
    h('div', { class: 'stack' }, btn('アンケートに答える', () => app.go('survey')), btn('タイトルへ', () => app.go('title'), 'ghost')));
}

// ───────── 12. アンケート ─────────
export function surveyScreen(app) {
  app.ui.answers ??= {};
  const a = app.ui.answers;
  const field = (q) => {
    if (q.type === 'scale') {
      return h('div', { class: 'scale', role: 'radiogroup', 'aria-label': q.label },
        h('span', { class: 'fine' }, q.minLabel),
        ...Array.from({ length: q.max - q.min + 1 }, (_, k) => q.min + k).map((v) => h('label', { class: `scale-opt ${a[q.id] === v ? 'selected' : ''}` },
          h('input', { type: 'radio', name: q.id, value: v, checked: a[q.id] === v, onchange: () => { a[q.id] = v; app.render(); } }), String(v))),
        h('span', { class: 'fine' }, q.maxLabel));
    }
    if (q.type === 'choice') {
      return h('div', { class: 'stack tight' }, ...q.options.map((o) => h('label', { class: `choice-card ${a[q.id] === o ? 'selected' : ''}` },
        h('input', { type: 'radio', name: q.id, value: o, checked: a[q.id] === o, onchange: () => { a[q.id] = o; app.render(); } }), o)));
    }
    return h('textarea', { rows: 3, 'aria-label': q.label, oninput: (e) => { a[q.id] = e.target.value; } }, a[q.id] || '');
  };
  return screen('アンケート',
    h('p', {}, '今後の改善のため、ご意見をお聞かせください。回答はこの端末の中だけに保存され、自動で送信されることはありません。お名前や連絡先は書かないでください。'),
    ...SURVEY_QUESTIONS.map((q, i) => h('section', { class: 'card' }, h('h2', { class: 'q' }, `${i + 1}. ${q.label}`), field(q))),
    h('div', { class: 'stack' },
      btn('回答を保存する', () => {
        const s = app.state;
        const play = s ? { playId: s.playId, scenarioId: s.scenarioId, difficultyId: s.difficultyId, totalScore: s.phase === 'finished' ? totalScore(s) : '', rank: s.phase === 'finished' ? rankOf(totalScore(s)).label : '' } : null;
        try {
          saveResponse(app.storage, buildResponse({ answers: a, questions: SURVEY_QUESTIONS, play }));
        } catch { toast('保存できませんでした（端末の保存領域を確認してください）', 'bad'); return; }
        app.ui.answers = {};
        toast('回答を保存しました。ご協力ありがとうございました。', 'good');
        app.go('surveyResults');
      }),
      btn('回答せずにタイトルへ', () => app.go('title'), 'ghost')));
}

// ───────── 13. アンケート結果の確認・エクスポート ─────────
export function surveyResultsScreen(app) {
  const list = loadResponses(app.storage);
  const stamp = () => new Date().toISOString().slice(0, 10);
  const avg = (id) => {
    const vals = list.map((r) => r.answers[id]).filter((v) => typeof v === 'number');
    return vals.length ? (vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(1) : '—';
  };
  return screen('アンケート結果',
    h('p', {}, `この端末に保存されている回答：${list.length}件`),
    list.length ? h('section', { class: 'card' }, h('h2', {}, '集計'),
      ...SURVEY_QUESTIONS.filter((q) => q.type === 'scale').map((q) => h('p', {}, `${q.label}：平均 ${avg(q.id)}`)),
      ...SURVEY_QUESTIONS.filter((q) => q.type === 'choice').map((q) => h('div', {}, h('p', {}, q.label),
        h('ul', {}, ...q.options.map((o) => h('li', {}, `${o}：${list.filter((r) => r.answers[q.id] === o).length}件`)))))) : null,
    ...list.slice().reverse().slice(0, 20).map((r) => h('details', { class: 'card' }, h('summary', {}, `${new Date(r.answeredAt).toLocaleString('ja-JP')}　${r.rank ? `ランク${r.rank}` : ''}`),
      ...SURVEY_QUESTIONS.map((q) => h('p', {}, h('strong', {}, `${q.label}：`), r.answers[q.id] === null || r.answers[q.id] === '' ? '（未回答）' : String(r.answers[q.id]))))),
    h('div', { class: 'stack' },
      btn('CSVで保存（Excel対応）', () => download(`shelter-survey-${stamp()}.csv`, toCSV(list, SURVEY_QUESTIONS), 'text/csv;charset=utf-8'), 'primary', { disabled: !list.length }),
      btn('JSONで保存', () => download(`shelter-survey-${stamp()}.json`, JSON.stringify(list, null, 2), 'application/json'), 'secondary', { disabled: !list.length }),
      btn('この端末の回答をすべて削除', () => {
        if (!confirm(`この端末に保存された回答${list.length}件をすべて削除します。元に戻せません。先にCSVで保存しましたか？`)) return;
        clearResponses(app.storage);
        toast('削除しました');
        app.render();
      }, 'danger', { disabled: !list.length }),
      btn('タイトルへ', () => app.go('title'), 'ghost')));
}

// ───────── 参考資料 ─────────
export function sourcesScreen(app) {
  return screen('参考資料と注意事項',
    ...DISCLAIMER.map((d) => h('p', { class: 'notice' }, d)),
    h('p', {}, 'ゲーム内の「関連する防災知識」は、以下の公的資料などを参考に、このゲームのために独自の文章で要約したものです。資料の文章や図表は複製していません。'),
    ...SOURCES.map((s) => h('section', { class: 'card' }, h('h2', { class: 'q' }, s.title),
      h('p', { class: 'fine' }, `${s.publisher}／${s.published}／確認日 ${s.checkedOn}${s.status === 'partial' ? '（一部のみ確認）' : ''}`),
      h('p', {}, `参照した内容：${s.usedFor}`),
      h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.url))),
    h('p', { class: 'fine' }, 'このゲームの文章・平面図・避難者の設定・イベントはすべて独自に作成した架空のものです。実在の人物・団体・施設とは関係ありません。'),
    h('div', { class: 'stack' }, btn('戻る', () => app.go('title'), 'ghost')));
}
