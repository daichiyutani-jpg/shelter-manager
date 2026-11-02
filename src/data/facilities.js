// 避難所の平面図（すべて独自に作成した架空の施設）。
// grid の1文字が1マス。凡例は config.js の TILES。
//   f=屋内の床 e=出入口 o=屋外 s=ステージ w=建物のトイレ x=壁・使えない場所
// 1マスは約3m四方を想定（ゲーム上の仮定）。
// 実在施設の図面を登録する場合は、図面の利用許諾・公開範囲を別途確認すること。

export const FACILITIES = {
  model_gym: {
    id: 'model_gym',
    name: 'モデル体育館（架空）',
    description: '架空の市立小学校の体育館。北側に校庭、南側にステージがある。',
    grid: [
      'oooooooo',
      'oooooooo',
      'wxxeexxw',
      'ffffffff',
      'ffffffff',
      'ffffffff',
      'ffffffff',
      'ffffffff',
      'ffffffff',
      'ffffffff',
      'ffffffff',
      'ssssssss',
    ],
    // 点検で見つかる危険箇所（未点検のまま居住スペースにすると事故が起こる）。
    hazards: [
      { id: 'ceiling', cells: [[5, 6], [6, 6]], revealedBy: 'op_interior', text: '天井の照明器具の固定金具が外れかけている（2マス使用不可）' },
    ],
    // 故障しているトイレ（点検で判明）。
    damagedToilets: [
      { cell: [0, 2], revealedBy: 'op_toilet', text: '西側トイレの排水管が破損している（使用不可）' },
    ],
    // 固定レイアウト（初心者向け）。zone の short 文字ではなく id で指定。
    // '.' は何も置かない。
    fixedLayout: [
      'tt....pp',
      '........',
      '...rr...',
      'iaaaaaah',
      'lallacca',
      'lallacca',
      'lallalla',
      'lallalla',
      'aaaaaaaa',
      'lallalla',
      'lallalla',
      'ssss....',
    ],
    fixedLegend: { t: 'toilet', p: 'pet', r: 'reception', c: 'care', a: 'aisle', i: 'info', s: 'storage', l: 'living', h: 'staff' },
  },
};
