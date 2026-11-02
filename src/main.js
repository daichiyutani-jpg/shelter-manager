// 起動・画面切替・自動保存。
import { createGame, reduce, GameError } from './engine/game.js';
import { saveGame, loadGame } from './engine/save.js';
import { toast } from './ui/dom.js';
import * as S from './ui/screens.js';

const ROUTES = {
  title: S.titleScreen,
  scenarios: S.scenarioScreen,
  howto: S.howtoScreen,
  opening: S.openingScreen,
  layout: S.layoutScreen,
  play: S.playScreen,
  event: S.eventScreen,
  result: S.resultScreen,
  review: S.reviewScreen,
  survey: S.surveyScreen,
  surveyResults: S.surveyResultsScreen,
  sources: S.sourcesScreen,
};

// localStorage が使えない環境（プライベートモード等）でも動くようにする
function safeStorage() {
  try {
    const k = '__sm_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map();
    toast('この端末では保存ができません。ページを閉じると進行状況は消えます。', 'bad');
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  }
}

const root = document.getElementById('app');
let timer = null;

const app = {
  state: null,
  route: 'title',
  ui: {},
  storage: safeStorage(),

  render() {
    const view = (ROUTES[app.route] || S.titleScreen)(app);
    root.replaceChildren(view);
  },
  go(route) {
    if (route !== 'event') app.stopTimer();
    app.route = route;
    app.render();
    window.scrollTo(0, 0);
  },
  dispatch(action) {
    try {
      app.state = reduce(app.state, action);
      saveGame(app.storage, app.state);
      app.render();
      return true;
    } catch (e) {
      if (e instanceof GameError) { toast(e.message, 'bad'); return false; }
      console.error(e);
      toast('エラーが発生しました。もう一度お試しください。', 'bad');
      return false;
    }
  },
  newGame(opts) {
    if (loadGame(app.storage) && !confirm('保存されている途中のゲームは上書きされます。はじめから始めますか？')) return;
    app.state = createGame(opts);
    app.ui = { pick: app.ui.pick };
    saveGame(app.storage, app.state);
    app.go('howto');
  },
  savedGame() {
    return loadGame(app.storage);
  },
  resume() {
    const saved = loadGame(app.storage);
    if (!saved) { toast('セーブデータを読み込めませんでした', 'bad'); return; }
    app.state = saved.state;
    app.ui = {};
    const route = { opening: 'opening', layout: 'layout', operating: 'play', finished: 'result' }[app.state.phase] || 'title';
    toast('続きから再開します');
    app.go(route);
  },

  // イベントの時間制限。画面を再描画しても残り時間が続くよう、締切は ui に保持する。
  startTimer(eventId, seconds, onExpire) {
    app.ui.deadlines ??= {};
    app.ui.deadlines[eventId] ??= Date.now() + seconds * 1000;
    clearInterval(timer);
    timer = setInterval(() => {
      const left = app.timerLeft(eventId, seconds);
      const el = document.getElementById('timer-sec');
      if (el) el.textContent = String(left);
      if (left <= 0) { clearInterval(timer); timer = null; onExpire(); }
    }, 250);
  },
  timerLeft(eventId, seconds) {
    const dl = app.ui.deadlines?.[eventId];
    return dl ? Math.max(0, Math.ceil((dl - Date.now()) / 1000)) : seconds;
  },
  stopTimer() {
    clearInterval(timer);
    timer = null;
  },
};

app.render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* オフライン非対応の環境ではそのまま動かす */ });
  });
}

// 開発・テスト用に参照できるようにしておく
window.__shelterApp = app;
