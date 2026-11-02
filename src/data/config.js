// ゲーム全体の設定。文章と数値を変えるだけでバランスを調整できる。
// ここにある数値はすべて「ゲーム用の仮設定」であり、行政の正式な基準ではない。

export const APP = {
  workingTitle: '避難所マネージャー',
  titleNote: '開発用の仮称です（正式名称ではありません）',
  version: '0.1.0-prototype',
};

// 評価の6分類。weight は総合得点への重み。
export const CATEGORIES = [
  { id: 'safety', label: '安全性', weight: 1.2 },
  { id: 'hygiene', label: '衛生', weight: 1.0 },
  { id: 'supply', label: '物資管理', weight: 1.0 },
  { id: 'care', label: '避難者への配慮', weight: 1.2 },
  { id: 'operations', label: '運営体制', weight: 1.0 },
  { id: 'info', label: '情報共有', weight: 0.8 },
];

export const INITIAL_METRIC = 60;

// 総合ランク（上から順に判定）。
export const RANKS = [
  { min: 85, label: 'S', comment: '状況の変化に先回りして手を打てていました。' },
  { min: 70, label: 'A', comment: '大きな混乱なく運営できていました。' },
  { min: 55, label: 'B', comment: '基本はできています。いくつかの場面で改善の余地があります。' },
  { min: 40, label: 'C', comment: '後手に回った場面がありました。振り返りで原因を確認しましょう。' },
  { min: 0, label: 'D', comment: '多くの課題が残りました。チュートリアルと振り返りを見直してみましょう。' },
];

// 分類ごとの得点が threshold 未満のときに出す改善のヒント。
export const IMPROVEMENT_HINTS = {
  safety: { threshold: 65, text: '受け入れ前に建物内部を点検し、居住スペースは必ず通路に面するように配置しましょう。夜間の照明も安全に直結します。' },
  hygiene: { threshold: 65, text: '断水時のトイレの使い方を早めに決めて掲示し、トイレの数と避難者数の釣り合いを確認しましょう。' },
  supply: { threshold: 65, text: '配布のたびに残りの数量を確認し、不足しそうな品目は早めに本部へ要請しましょう。' },
  care: { threshold: 65, text: '配慮が必要な世帯のニーズ（通路・トイレまでの距離・間仕切り・個別の情報伝達）を一つずつ確認しましょう。' },
  operations: { threshold: 65, text: '開設時の役割分担と、受付・運営本部の設置が運営の土台になります。' },
  info: { threshold: 65, text: '掲示・情報コーナーを設け、ルールや物資の見込みを全員に伝える仕組みを作りましょう。' },
};

// 難易度。
export const DIFFICULTIES = [
  { id: 'easy', label: 'やさしい', description: '準備ポイントと運営ポイントが多め。時間制限なし。', openingPoints: 7, opsPointsPerTurn: 5, supplyMultiplier: 1.2, timeLimits: false },
  { id: 'normal', label: 'ふつう', description: '標準の設定。一部のイベントに時間制限あり。', openingPoints: 6, opsPointsPerTurn: 4, supplyMultiplier: 1.0, timeLimits: true },
  { id: 'hard', label: 'むずかしい', description: '物資が少なめで、時間制限も短い。', openingPoints: 5, opsPointsPerTurn: 3, supplyMultiplier: 0.8, timeLimits: true, timeLimitFactor: 0.66 },
];

// 平面図に置けるゾーン。tiles は置ける床の種類（facilities.js の凡例）。
export const ZONES = [
  { id: 'reception', label: '受付', short: '受', tiles: ['e', 'f', 'o'], color: 'zone-reception' },
  { id: 'living', label: '居住スペース', short: '居', tiles: ['f'], capacity: 4, color: 'zone-living' },
  { id: 'care', label: '要配慮者スペース', short: '配', tiles: ['f'], capacity: 4, color: 'zone-care' },
  { id: 'aisle', label: '通路', short: '通', tiles: ['f', 'e'], color: 'zone-aisle' },
  { id: 'storage', label: '物資保管', short: '物', tiles: ['f', 's'], color: 'zone-storage' },
  { id: 'toilet', label: '仮設トイレ', short: 'ト', tiles: ['o'], toiletUnits: 1, color: 'zone-toilet' },
  { id: 'staff', label: '運営本部', short: '本', tiles: ['f', 'e'], color: 'zone-staff' },
  { id: 'info', label: '掲示・情報コーナー', short: '掲', tiles: ['f', 'e'], color: 'zone-info' },
  { id: 'pet', label: 'ペット飼育スペース', short: 'ペ', tiles: ['o'], color: 'zone-pet' },
];

// 床の種類の凡例（施設データで使う1文字）。
export const TILES = {
  f: { label: '屋内の床', walkable: true },
  e: { label: '出入口', walkable: true },
  o: { label: '屋外', walkable: true },
  s: { label: 'ステージ', walkable: true },
  w: { label: '建物のトイレ', walkable: true, toiletUnits: 3 },
  x: { label: '壁・使えない場所', walkable: false },
};

// トイレ1基あたりの人数の目安（ゲーム上の仮定）。
export const TOILET = {
  goodPeoplePerUnit: 20,
  badPeoplePerUnit: 50,
  kitsPerPersonPerTurn: 1, // 断水中に1人が1ターンで使う携帯トイレの数（仮定）
};

// 物資の表示名と単位。
export const SUPPLY_ITEMS = [
  { id: 'food', label: '食料', unit: '食' },
  { id: 'water', label: '飲料水', unit: 'L' },
  { id: 'toilet_kit', label: '携帯トイレ', unit: '回分' },
  { id: 'cot', label: '簡易ベッド', unit: '台' },
  { id: 'partition', label: '間仕切り', unit: '組' },
  { id: 'hygiene', label: '衛生用品', unit: 'セット' },
  { id: 'blanket', label: '毛布', unit: '枚' },
  { id: 'light', label: 'ライト・ランタン', unit: '個' },
];

// 配布アクション。perPerson × 在所人数 を消費する。
export const DISTRIBUTIONS = [
  { id: 'food', item: 'food', label: '食事を配る', perPerson: 1, points: 1, onlyFlag: 'meal', category: 'supply', gain: { supply: 4, care: 2 } },
  { id: 'water', item: 'water', label: '飲料水を配る', perPerson: 1, points: 1, onlyFlag: 'meal', category: 'supply', gain: { supply: 4, care: 2 } },
  { id: 'blanket', item: 'blanket', label: '毛布を配る', perPerson: 1, points: 1, onlyFlag: 'night', category: 'care', gain: { care: 5 }, oncePerGame: true },
  { id: 'hygiene', item: 'hygiene', label: '衛生用品を配る（1世帯1セット）', perGroup: 1, points: 1, category: 'hygiene', gain: { hygiene: 8 }, oncePerGame: true },
];

// 世帯ごとの個別支援。
export const SUPPORTS = [
  { id: 'cot', label: '簡易ベッドを用意する', item: 'cot', amount: 1, points: 0 },
  { id: 'partition', label: '間仕切りを設ける', item: 'partition', amount: 1, points: 0 },
  { id: 'personal_info', label: '個別に情報を伝える担当を決める', points: 1 },
];

// ニーズの充足判定ルール。mode: all=全部満たす / any=どれか1つ。
export const NEEDS = {
  mobility: {
    label: '移動に支援が必要',
    mode: 'all',
    requirements: [
      { type: 'adjacentZone', zone: 'aisle', label: '通路に面している' },
      { type: 'nearToilet', maxDist: 3, label: 'トイレまで3マス以内' },
      { type: 'support', support: 'cot', label: '簡易ベッドがある（起き上がりやすい）' },
    ],
  },
  infant: {
    label: '乳幼児がいる',
    mode: 'all',
    requirements: [
      { type: 'inZone', zones: ['care'], label: '要配慮者スペースにいる' },
      { type: 'support', support: 'partition', label: '間仕切りで授乳・おむつ替えの場所がある' },
    ],
  },
  info: {
    label: '情報伝達上の配慮',
    mode: 'any',
    requirements: [
      { type: 'nearZone', zone: 'info', maxDist: 2, label: '掲示・情報コーナーの近く' },
      { type: 'support', support: 'personal_info', label: '個別に伝える担当がいる' },
    ],
  },
  health: {
    label: '健康上の支援',
    mode: 'all',
    requirements: [
      { type: 'inZone', zones: ['care'], label: '要配慮者スペースにいる' },
      { type: 'nearZone', zone: 'staff', maxDist: 3, label: '運営本部から見守れる距離' },
      { type: 'support', support: 'cot', label: '簡易ベッドがある' },
    ],
  },
  pet: {
    label: 'ペットと避難',
    mode: 'all',
    requirements: [
      { type: 'zoneExists', zone: 'pet', label: 'ペット飼育スペースがある' },
      { type: 'inZone', zones: ['living'], label: '一般の居住スペースにいる（ペットは別の場所）' },
    ],
  },
};

// ターン終了時のチェック。条件に当てはまると指標が変化し、記録に残る。
export const TURN_CHECKS = [
  { id: 'unplaced', when: 'unplacedGroups', effects: { care: -6, operations: -4 }, kind: 'problem', text: '居場所が決まらないまま待たされた世帯があった（{n}世帯）' },
  { id: 'no_reception', when: 'missingZone', zone: 'reception', effects: { operations: -10 }, kind: 'problem', text: '受付がなく、誰が避難しているか把握できない' },
  { id: 'no_staff', when: 'missingZone', zone: 'staff', effects: { operations: -4 }, kind: 'problem', text: '運営本部の場所が決まっていない' },
  { id: 'no_info', when: 'missingZone', zone: 'info', effects: { info: -5 }, kind: 'problem', text: '掲示・情報コーナーがなく、情報が伝わりにくい' },
  { id: 'aisle', when: 'livingWithoutAisle', effects: { safety: -3 }, perUnit: true, maxUnits: 4, kind: 'problem', text: '通路に面していない居住スペースがある（{n}マス）。避難経路が確保できない' },
  { id: 'crowded', when: 'crowded', ratio: 0.9, effects: { hygiene: -4, care: -2 }, kind: 'problem', text: '居住スペースが定員の9割を超えて混み合っている' },
  { id: 'toilet_load', when: 'toiletLoad', above: 50, effects: { hygiene: -8 }, kind: 'problem', text: 'トイレ1基あたりの人数が多すぎる（約{n}人／基）' },
  { id: 'toilet_ok', when: 'toiletLoadAtMost', atMost: 20, effects: { hygiene: 2 }, kind: 'good', text: 'トイレの数が避難者数に見合っている' },
  { id: 'meal_missed', when: 'missedDistribution', distribution: 'food', effects: { supply: -8, care: -5 }, kind: 'problem', text: '食事の時間に配布ができなかった' },
  { id: 'water_missed', when: 'missedDistribution', distribution: 'water', effects: { supply: -8, care: -5 }, kind: 'problem', text: '飲料水を配布できなかった' },
  { id: 'night_blanket', when: 'missedDistribution', distribution: 'blanket', effects: { care: -5 }, kind: 'problem', text: '夜になっても毛布が配られていない' },
  { id: 'needs_unmet', when: 'unmetNeeds', effects: { care: -3 }, perUnit: true, maxUnits: 5, kind: 'problem', text: 'ニーズが満たされていない世帯がある（{n}件）' },
  { id: 'needs_met', when: 'allNeedsMet', effects: { care: 3 }, kind: 'good', text: '配慮が必要な世帯のニーズをすべて満たしている' },
  { id: 'broken_toilet', when: 'uninspectedDamagedToilet', effects: { hygiene: -6 }, once: true, kind: 'problem', text: '点検していなかったトイレが故障しており、使った人が出て床が汚れた' },
  { id: 'hazard', when: 'hazardOccupied', effects: { safety: -15, care: -5 }, once: true, kind: 'problem', text: '点検していない場所で天井の部材が落ち、居住スペースの人が軽いけがをした' },
];
