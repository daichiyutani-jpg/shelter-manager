// 総合評価と振り返り。評価基準は data/config.js。
import { CATEGORIES, RANKS, IMPROVEMENT_HINTS } from '../data/config.js';
import { evaluateMissions } from './missions.js';
import { needsSummary } from './needs.js';

export function categoryScores(state) {
  return CATEGORIES.map((c) => ({ id: c.id, label: c.label, weight: c.weight, score: Math.round(state.metrics[c.id]) }));
}

export function totalScore(state) {
  const cats = categoryScores(state);
  const wsum = cats.reduce((s, c) => s + c.weight, 0);
  return Math.round(cats.reduce((s, c) => s + c.score * c.weight, 0) / wsum);
}

export function rankOf(total) {
  return RANKS.find((r) => total >= r.min);
}

export function finalReport(state, scenario, grid) {
  const categories = categoryScores(state).map((c) => {
    const hint = IMPROVEMENT_HINTS[c.id];
    return { ...c, hint: hint && c.score < hint.threshold ? hint.text : null };
  });
  const total = totalScore(state);
  const missions = evaluateMissions(state, scenario, grid);
  const events = state.resolvedEvents.map((r) => {
    const ev = scenario.events.find((e) => e.id === r.id);
    const choice = ev.choices.find((c) => c.id === r.choiceId);
    return { id: r.id, title: ev.title, turn: r.turn, choiceLabel: choice.label, result: choice.result, knowledge: ev.knowledge, sourceIds: ev.sourceIds || [], timedOut: r.timedOut, isGameAssumption: ev.isGameAssumption };
  });
  const needs = needsSummary(state, grid);
  return {
    total,
    rank: rankOf(total),
    categories,
    missions,
    achieved: missions.filter((m) => m.achieved),
    unachieved: missions.filter((m) => !m.achieved),
    problems: state.log.filter((l) => l.kind === 'problem'),
    goods: state.log.filter((l) => l.kind === 'good'),
    improvements: categories.filter((c) => c.hint).map((c) => ({ category: c.label, text: c.hint })),
    events,
    needs,
  };
}
