// シナリオ一覧。新しい災害は scenarios/ にファイルを追加し、ここに登録する。
// ready: false のものは選択画面に「準備中」と表示され、選べない。
import { EARTHQUAKE } from './earthquake.js';

export const SCENARIOS = [
  { ...EARTHQUAKE, ready: true },
  { id: 'flood', hazard: 'flood', title: '水害', summary: '大雨による浸水を想定したシナリオ（準備中）', ready: false },
  { id: 'tsunami', hazard: 'tsunami', title: '津波', summary: '津波警報下での開設を想定したシナリオ（準備中）', ready: false },
  { id: 'typhoon', hazard: 'typhoon', title: '台風', summary: '事前避難から始まるシナリオ（準備中）', ready: false },
  { id: 'compound', hazard: 'compound', title: '複合災害', summary: '地震と大雨が重なる想定のシナリオ（準備中）', ready: false },
];

export function getScenario(id) {
  const s = SCENARIOS.find((x) => x.id === id);
  if (!s) throw new Error(`シナリオが見つかりません: ${id}`);
  return s;
}
