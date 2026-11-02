// イベントの発生条件と選択肢の判定。
import { personsPresent, toiletUnits } from './layout.js';

// trigger は条件オブジェクト。1つのオブジェクトに複数のキーがあれば AND。
export function evalTrigger(trigger, state, grid) {
  if (!trigger) return false;
  const persons = personsPresent(state);
  const checks = Object.entries(trigger).map(([key, val]) => {
    switch (key) {
      case 'turn': return state.turn === val;
      case 'minTurn': return state.turn >= val;
      case 'maxTurn': return state.turn <= val;
      case 'flag': return !!state.flags[val];
      case 'notFlag': return !state.flags[val];
      case 'all': return val.every((t) => evalTrigger(t, state, grid));
      case 'any': return val.some((t) => evalTrigger(t, state, grid));
      case 'supplyBelowPerPerson':
        return persons > 0 && Object.entries(val).some(([item, per]) => (state.supplies[item] || 0) < persons * per);
      case 'toiletLoadAbove': {
        const units = toiletUnits(state, grid);
        return persons > 0 && (units === 0 || persons / units > val);
      }
      default: throw new Error(`不明な発生条件: ${key}`);
    }
  });
  return checks.every(Boolean);
}

export function choiceAvailability(choice, state) {
  const cost = choice.cost || {};
  if (choice.requiresFlag && !state.flags[choice.requiresFlag]) {
    return { ok: false, reason: choice.requiresText || '条件を満たしていません' };
  }
  if ((cost.points || 0) > state.opsPoints) return { ok: false, reason: '運営ポイントが足りません' };
  for (const [item, n] of Object.entries(cost.supplies || {})) {
    if ((state.supplies[item] || 0) < n) return { ok: false, reason: '必要な物資が足りません' };
  }
  return { ok: true };
}

export function effectiveTimeLimit(event, difficulty) {
  if (!event.timeLimitSec || !difficulty.timeLimits) return 0;
  return Math.round(event.timeLimitSec * (difficulty.timeLimitFactor || 1));
}
