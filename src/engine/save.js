// セーブデータの直列化と復元。保存先は端末内（localStorage）のみ。
import { SCHEMA_VERSION } from './game.js';
import { SCENARIOS } from '../data/scenarios/index.js';

export const SAVE_KEY = 'shelter-manager:save:v1';

export function serialize(state, now = new Date().toISOString()) {
  return JSON.stringify({ app: 'shelter-manager', schemaVersion: SCHEMA_VERSION, savedAt: now, state });
}

export function deserialize(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('セーブデータを読み込めません（形式が壊れています）'); }
  if (!data || data.app !== 'shelter-manager') throw new Error('このゲームのセーブデータではありません');
  if (data.schemaVersion !== SCHEMA_VERSION) throw new Error(`セーブデータの版が違います（${data.schemaVersion}）`);
  const s = data.state;
  if (!s || !SCENARIOS.some((x) => x.id === s.scenarioId && x.ready)) throw new Error('シナリオが見つかりません');
  return { savedAt: data.savedAt, state: s };
}

// storage は localStorage 互換のオブジェクト。使えない環境でも落ちないようにする。
export function saveGame(storage, state) {
  try { storage.setItem(SAVE_KEY, serialize(state)); return true; } catch { return false; }
}

export function loadGame(storage) {
  let text = null;
  try { text = storage.getItem(SAVE_KEY); } catch { return null; }
  if (!text) return null;
  try { return deserialize(text); } catch { return null; }
}

export function clearGame(storage) {
  try { storage.removeItem(SAVE_KEY); } catch { /* 何もしない */ }
}
