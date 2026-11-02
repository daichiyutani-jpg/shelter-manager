// アンケート回答の保存形式と CSV 出力。外部への送信は行わない。
export const SURVEY_KEY = 'shelter-manager:surveys:v1';

export function buildResponse({ answers, questions, play, now = new Date().toISOString(), id }) {
  const clean = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (q.type === 'scale') clean[q.id] = Number.isInteger(v) && v >= q.min && v <= q.max ? v : null;
    else if (q.type === 'choice') clean[q.id] = q.options.includes(v) ? v : null;
    else clean[q.id] = typeof v === 'string' ? v.trim().slice(0, 2000) : '';
  }
  return {
    id: id || `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    answeredAt: now,
    playId: play?.playId ?? '',
    scenarioId: play?.scenarioId ?? '',
    difficultyId: play?.difficultyId ?? '',
    totalScore: play?.totalScore ?? '',
    rank: play?.rank ?? '',
    answers: clean,
  };
}

function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  // 表計算ソフトで数式として解釈されないようにする
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCSV(responses, questions) {
  const head = ['回答ID', '回答日時', 'プレイID', 'シナリオ', '難易度', '総合得点', 'ランク', ...questions.map((q) => q.label)];
  const rows = responses.map((r) => [
    r.id, r.answeredAt, r.playId, r.scenarioId, r.difficultyId, r.totalScore, r.rank,
    ...questions.map((q) => r.answers[q.id]),
  ]);
  // 先頭の BOM で Excel でも文字化けしない
  return '﻿' + [head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function loadResponses(storage) {
  try {
    const arr = JSON.parse(storage.getItem(SURVEY_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveResponse(storage, response) {
  const list = loadResponses(storage);
  list.push(response);
  storage.setItem(SURVEY_KEY, JSON.stringify(list));
  return list;
}

export function clearResponses(storage) {
  storage.removeItem(SURVEY_KEY);
}
