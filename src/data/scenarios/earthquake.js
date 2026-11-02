// 地震シナリオ（すべて独自に作成した架空の設定）。
// 数値（人数・物資・発生ターンなど）はゲーム用の仮設定であり、実際の必要量の基準ではない。

export const EARTHQUAKE = {
  id: 'earthquake_basic',
  hazard: 'earthquake',
  title: '地震：平日夕方の発災',
  summary: '平日の夕方に大きな地震が起きた想定。体育館を避難所として開設し、翌日の昼まで運営する。',
  facilityId: 'model_gym',
  briefing: [
    '平日の17時20分ごろ、大きな地震が発生しました（架空の想定です）。',
    'あなたは地域の避難所運営に協力するボランティアとして、モデル体育館に駆けつけました。施設の管理者と市の職員も到着しています。',
    'これから避難所を開設し、翌日の昼まで運営します。限られた時間と物資で、安全で過ごしやすい避難所を目指してください。',
  ],

  // ターンの区切り。flags: meal=食事の時間 / night=夜間
  turns: [
    { n: 1, label: '発災直後（18:00ごろ）', flags: [], narrative: '最初の避難者が体育館の前に集まり始めた。' },
    { n: 2, label: '発災から2時間（19:30ごろ）', flags: ['meal'], narrative: '外は暗くなってきた。夕食の時間が近い。' },
    { n: 3, label: '夜（22:00ごろ）', flags: ['night'], narrative: '気温が下がってきた。眠れずにいる人も多い。' },
    { n: 4, label: '深夜（2:00ごろ）', flags: ['night'], narrative: '体育館は静まり返っている。見回りの時間だ。' },
    { n: 5, label: '早朝（6:30ごろ）', flags: ['meal'], narrative: '夜が明けた。朝食の準備が必要だ。' },
    { n: 6, label: '翌日の昼（12:00ごろ）', flags: ['meal'], narrative: '運営の引き継ぎに向けて、状況をまとめる時間だ。' },
  ],

  // 開設準備の作業。cost は準備ポイント。
  openingTasks: [
    { id: 'op_exterior', label: '建物の外観と周囲の危険を確認する', cost: 1, effects: { metrics: { safety: 5 }, flags: { inspected_exterior: true } }, result: '外壁のひび割れやガラスの破損は見当たらなかった。' },
    { id: 'op_interior', label: '体育館の内部（天井・照明・床）を点検する', cost: 2, effects: { metrics: { safety: 10 }, flags: { inspected_building: true } }, result: '天井の照明器具の一部が外れかけていた。その下は使用禁止にする。' },
    { id: 'op_toilet', label: 'トイレと給排水の状態を確認する', cost: 1, effects: { metrics: { hygiene: 5 }, flags: { inspected_toilet: true } }, result: '西側のトイレは排水管が破損していた。使用禁止の貼り紙をした。' },
    { id: 'op_power', label: '電気・照明・非常用電源の場所を確認する', cost: 1, effects: { metrics: { safety: 2 }, flags: { checked_power: true } }, result: '非常用電源と延長コードの保管場所を確認した。' },
    { id: 'op_staff', label: '運営スタッフの役割分担を決める', cost: 1, effects: { metrics: { operations: 10 }, flags: { roles_assigned: true }, opsPointsBonus: 1 }, result: '受付・配置・物資・見回りの担当を決めた。毎ターンの運営ポイントが1増える。' },
    { id: 'op_supplies', label: '備蓄品の数量と保管場所を確認する', cost: 1, effects: { metrics: { supply: 10 }, flags: { supplies_checked: true } }, result: '備蓄品の一覧を作り、数量を本部に報告した。' },
    { id: 'op_rules', label: '避難所の利用ルールと案内表示を準備する', cost: 1, effects: { metrics: { info: 10 }, flags: { rules_posted: true } }, result: '土足禁止の場所、トイレ、消灯時間などの案内を作った。' },
    { id: 'op_reception', label: '受付の用具（名簿用紙・筆記具・案内札）を用意する', cost: 1, effects: { metrics: { operations: 5, info: 3 }, flags: { reception_ready: true } }, result: '受付で記入してもらう用紙と、配慮が必要なことを聞く欄を用意した。' },
  ],

  // 初期物資（難易度の supplyMultiplier を掛ける。間仕切りなどは整数に切り捨て）。
  supplies: { food: 90, water: 150, toilet_kit: 300, cot: 6, partition: 6, hygiene: 30, blanket: 70, light: 4 },

  // 予定されている支援物資の到着。
  deliveries: [
    { id: 'd1', label: '市からの支援物資', turn: 5, items: { food: 80, water: 120, toilet_kit: 200, hygiene: 20 } },
  ],

  // 避難者（世帯・グループ単位）。arriveTurn が null のものはイベントで到着する。
  // needs のキーは config.js の NEEDS。年齢などの属性だけで問題は起きない。
  groups: [
    { id: 'g01', label: '会社員（単身）', size: 1, ages: { adult: 1 }, family: '単身', infants: 0, needs: [], pet: null, note: '帰宅できず職場の近くから来た。', arriveTurn: 1 },
    { id: 'g02', label: '高齢の夫婦', size: 2, ages: { senior: 2 }, family: '夫婦', infants: 0, needs: ['mobility'], pet: null, note: '夫は杖を使って歩く。床から立ち上がるのがつらい。', arriveTurn: 1 },
    { id: 'g03', label: '親子3人', size: 3, ages: { adult: 2, child: 1 }, family: '親子', infants: 1, needs: ['infant'], pet: null, note: '生後6か月の子がいる。ミルクとおむつは少しだけ持ってきた。', arriveTurn: 1 },
    { id: 'g04', label: '近所の友人同士', size: 3, ages: { adult: 3 }, family: '友人', infants: 0, needs: [], pet: null, note: '運営の手伝いを申し出てくれた。', arriveTurn: 1 },
    { id: 'g05', label: '4人家族', size: 4, ages: { adult: 2, child: 2 }, family: '親子', infants: 0, needs: [], pet: null, note: '子どもは小学生。', arriveTurn: 1 },
    { id: 'g06', label: '一人暮らしの高齢女性', size: 1, ages: { senior: 1 }, family: '単身', infants: 0, needs: ['info'], pet: null, note: '耳が聞こえにくく、館内放送が聞き取りにくい。', arriveTurn: 1 },
    { id: 'g07', label: '夫婦と小型犬', size: 2, ages: { adult: 2 }, family: '夫婦', infants: 0, needs: ['pet'], pet: '小型犬1匹（ケージあり）', note: '犬は吠えることがあり、周りに気をつかっている。', arriveTurn: 1 },
    { id: 'g08', label: '大学生の兄弟', size: 2, ages: { adult: 2 }, family: '兄弟', infants: 0, needs: [], pet: null, note: '', arriveTurn: 1 },
    { id: 'g09', label: '三世代の家族', size: 4, ages: { senior: 1, adult: 2, child: 1 }, family: '三世代', infants: 0, needs: [], pet: null, note: '', arriveTurn: 1 },
    { id: 'g10', label: '留学生2人', size: 2, ages: { adult: 2 }, family: '友人', infants: 0, needs: ['info'], pet: null, note: '日本語の読み書きは少しだけ。やさしい日本語なら分かる。', arriveTurn: 1 },
    { id: 'g11', label: '持病のある男性と妻', size: 2, ages: { senior: 2 }, family: '夫婦', infants: 0, needs: ['health'], pet: null, note: '心臓の持病があり、薬は3日分持っている。', arriveTurn: 2 },
    { id: 'g12', label: '母と子ども2人', size: 3, ages: { adult: 1, child: 2 }, family: '親子', infants: 0, needs: [], pet: null, note: '', arriveTurn: 2 },
    { id: 'g13', label: '車いすを使う人と家族', size: 3, ages: { adult: 3 }, family: '親子', infants: 0, needs: ['mobility'], pet: null, note: '段差があると一人では移動できない。', arriveTurn: 2 },
    { id: 'g14', label: '会社員（単身）', size: 1, ages: { adult: 1 }, family: '単身', infants: 0, needs: [], pet: null, note: '', arriveTurn: 2 },
    { id: 'g15', label: '4人家族', size: 4, ages: { adult: 2, child: 2 }, family: '親子', infants: 0, needs: [], pet: null, note: '', arriveTurn: 2 },
    { id: 'g16', label: '夫婦と猫', size: 2, ages: { adult: 2 }, family: '夫婦', infants: 0, needs: ['pet'], pet: '猫1匹（キャリーあり）', note: '', arriveTurn: 2 },
    { id: 'g17', label: '妊娠中の人とパートナー', size: 2, ages: { adult: 2 }, family: '夫婦', infants: 0, needs: ['health'], pet: null, note: '妊娠8か月。長い時間床に座っているのがつらい。', arriveTurn: 2 },
    { id: 'g18', label: '会社帰りの同僚', size: 4, ages: { adult: 4 }, family: '同僚', infants: 0, needs: [], pet: null, note: '', arriveTurn: 3 },
    { id: 'g19', label: '視覚に障害のある人と家族', size: 2, ages: { adult: 1, senior: 1 }, family: '親子', infants: 0, needs: ['info'], pet: null, note: '掲示物は読めない。声での案内が頼り。', arriveTurn: 3 },
    { id: 'g20', label: '親子2人', size: 2, ages: { adult: 1, child: 1 }, family: '親子', infants: 1, needs: ['infant'], pet: null, note: '1歳の子がいる。', arriveTurn: 3 },
    // 追加到着イベントで来るグループ
    { id: 'x01', label: '公民館から来た4人家族', size: 4, ages: { adult: 2, child: 2 }, family: '親子', infants: 0, needs: [], pet: null, note: '', arriveTurn: null },
    { id: 'x02', label: '公民館から来た高齢の男性', size: 1, ages: { senior: 1 }, family: '単身', infants: 0, needs: ['mobility'], pet: null, note: '歩行器を使っている。', arriveTurn: null },
    { id: 'x03', label: '公民館から来た親子', size: 3, ages: { adult: 1, child: 2 }, family: '親子', infants: 0, needs: [], pet: null, note: '', arriveTurn: null },
    { id: 'x04', label: '公民館から来た地域の人たち', size: 4, ages: { adult: 3, senior: 1 }, family: '近所', infants: 0, needs: [], pet: null, note: '', arriveTurn: null },
  ],

  // 災害イベント。trigger の書き方は README を参照。
  events: [
    {
      id: 'ev_water_outage',
      title: '断水',
      trigger: { turn: 2 },
      timing: '発災から2時間後',
      situation: '水道の水が急に出なくなった。給水管が地震で傷んだらしい。建物のトイレは水を流せない状態になっている。',
      choices: [
        { id: 'kits', label: '便器に携帯トイレを付けて使う方法に切り替え、使い方を掲示する', cost: { points: 1 }, effects: { flags: { outage_water: true, toilet_rule_posted: true }, metrics: { hygiene: 8, info: 5 } }, result: 'トイレの入口に使い方を貼り出した。便器に袋をかぶせて使い、使用後は決めた場所に集める流れができた。' },
        { id: 'close', label: '建物のトイレを閉鎖し、屋外の仮設トイレだけを使ってもらう', cost: {}, effects: { flags: { outage_water: true, building_toilet_closed: true }, metrics: { hygiene: 2, care: -4 } }, result: '建物のトイレは閉めた。屋外のトイレに行列ができ、夜に行くのをためらう人が出てきた。' },
        { id: 'wait', label: '水がそのうち戻るかもしれないので、しばらく様子を見る', cost: {}, effects: { flags: { outage_water: true, toilet_misused: true }, metrics: { hygiene: -12 } }, result: '水の流れないトイレが使われ続け、すぐに使えない状態になった。' },
      ],
      knowledge: '断水しているときに水洗トイレをそのまま使うと、汚物があふれて衛生状態が一気に悪くなる。発災直後から携帯トイレなどへ切り替える準備と、使い方を全員に伝えることが大切。',
      sourceIds: ['cao_toilet_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_extra_arrivals',
      title: '避難者の追加到着',
      trigger: { turn: 3 },
      timing: '夜',
      situation: '近くの公民館が停電と雨漏りで使えなくなり、そこにいた12人がこちらへ移ってきた。受付の前に列ができている。',
      choices: [
        { id: 'interview', label: '受付で世帯ごとに状況と必要な支援を聞き取ってから、配置を決める', cost: { points: 1 }, effects: { addGroups: ['x01', 'x02', 'x03', 'x04'], metrics: { operations: 5, care: 4 } }, result: '歩行器を使う人がいることが分かり、配置のときに配慮できた。' },
        { id: 'quick', label: 'とにかく空いている場所へ順に入ってもらう', cost: {}, effects: { addGroups: ['x01', 'x02', 'x03', 'x04'], metrics: { operations: -2, care: -4 } }, result: '受け入れは早く済んだが、配慮が必要な人がいるかは分からないままだった。' },
        { id: 'refuse', label: '満員だと伝えて、別の避難所を探してもらう', cost: {}, effects: { metrics: { care: -15, info: -5 } }, result: 'まだ場所は空いていた。行き場を失った人たちは、雨の中で別の避難所を探すことになった。' },
      ],
      knowledge: '避難所は、地域の住民かどうかにかかわらず、避難してきた人を受け入れるのが基本。到着時に必要な配慮を聞き取ると、その後の配置や支援が決めやすくなる。',
      sourceIds: ['cao_shelter_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_care_support',
      title: '要配慮者への追加支援',
      trigger: { turn: 3 },
      timing: '夜',
      situation: '車いすを使っている人から「トイレの入口に段差があって、一人では入れない」と相談があった。付き添いの家族は夜の介助に疲れてきている。',
      choices: [
        { id: 'booth', label: '要配慮者スペースの近くに、間仕切りで携帯トイレ用の個室をつくる', cost: { points: 1, supplies: { partition: 2 } }, effects: { flags: { accessible_toilet: true }, metrics: { care: 10, hygiene: 3 } }, result: '段差のない個室ができ、家族の負担も軽くなった。' },
        { id: 'helper', label: '介助を手伝える人を避難者の中から募り、当番表をつくる', cost: { points: 1 }, effects: { metrics: { care: 6, operations: 4 } }, result: '近所の友人同士のグループが手を挙げてくれた。' },
        { id: 'family', label: '家族でなんとかしてもらう', cost: {}, effects: { metrics: { care: -8 } }, result: '家族は一晩中ほとんど眠れなかった。' },
      ],
      knowledge: '要配慮者の困りごとは、本人や家族から直接聞き取らないと見えにくい。段差のないトイレや介助の担い手を確保することが、本人と家族の両方を支える。',
      sourceIds: ['cao_shelter_guideline', 'cao_welfare_shelter_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_power_outage',
      title: '停電',
      trigger: { turn: 4 },
      timing: '深夜',
      situation: '午前2時、体育館の照明が消えた。地域一帯が停電したようだ。真っ暗な中、トイレへ向かう人の足音が聞こえる。',
      choices: [
        { id: 'lights', label: 'ライトを通路とトイレの出入口に置き、夜間の見回り当番を決める', cost: { points: 1, supplies: { light: 3 } }, effects: { metrics: { safety: 8, care: 3 } }, result: '足元が見えるようになり、トイレへの行き来が落ち着いた。' },
        { id: 'generator', label: '非常用電源を使い、本部の照明と連絡手段を確保する', cost: { points: 1 }, requiresFlag: 'checked_power', requiresText: '開設時に電源の場所を確認していないため選べません', effects: { metrics: { operations: 6, info: 4, safety: 3 } }, result: '本部に明かりがつき、市との連絡も続けられた。' },
        { id: 'wait', label: '朝まで待ってもらう', cost: {}, effects: { metrics: { safety: -10 } }, result: '暗がりで段差につまずいた人が出た。' },
      ],
      knowledge: '夜間の停電では、通路やトイレまでの明かりが転倒や防犯上のトラブルを防ぐ。開設時に電源や照明器具の場所を確認しておくと、すぐに対応できる。',
      sourceIds: ['cao_shelter_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_night_sick',
      title: '夜間の体調不良者',
      trigger: { turn: 4 },
      timing: '深夜（時間制限あり）',
      timeLimitSec: 60,
      defaultChoiceId: 'wait',
      situation: '深夜、体育館の隅で高齢の男性が「胸が苦しい」と訴えている。顔色が悪く、汗をかいている。',
      choices: [
        { id: 'call', label: 'すぐに119番に通報し、本部で経過を記録して家族に知らせる', cost: { points: 1 }, effects: { metrics: { safety: 10, care: 5, operations: 3 } }, result: '救急隊に引き継いだ。記録を残したので、朝の引き継ぎもスムーズだった。' },
        { id: 'nurse', label: '119番に通報すると同時に、医療や看護の経験がある人がいないか呼びかける', cost: { points: 1 }, effects: { metrics: { safety: 8, care: 6, info: 2 } }, result: '看護師の経験がある避難者が付き添い、救急隊への説明も助けてくれた。' },
        { id: 'wait', label: '朝まで様子を見て、明るくなってから相談する', cost: {}, effects: { metrics: { safety: -15, care: -10 } }, result: '朝になって容体が悪化し、搬送が遅れた。' },
      ],
      knowledge: '命に関わるかもしれない症状のときは、迷わず救急要請をする。夜間に誰が判断し、誰が記録するかを決めておくと、対応が早くなる。',
      sourceIds: ['cao_shelter_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_delivery_delay',
      title: '物資の到着遅延',
      trigger: { turn: 4 },
      timing: '深夜',
      situation: '市の災害対策本部から連絡があった。朝に届く予定だった支援物資のトラックが、道路の寸断で遅れている。到着の見込みは分からない。',
      choices: [
        { id: 'priority', label: '在所人数と不足しそうな品目を本部に伝え、優先して届けてもらう', cost: { points: 1 }, effects: { delayDelivery: { id: 'd1', toTurn: 6 }, metrics: { operations: 5, info: 3, supply: 4 } }, result: '昼には届く見込みになった。' },
        { id: 'local', label: '地域の商店や自治会に、食料と水の協力を呼びかける', cost: { points: 1 }, effects: { delayDelivery: { id: 'd1', toTurn: null }, supplies: { food: 30, water: 40 }, metrics: { info: 2, supply: 3 } }, result: '近所の商店からパンと水が届いた。市の物資はいつ届くか分からないままだ。' },
        { id: 'wait', label: '連絡が来るのを待つ', cost: {}, effects: { delayDelivery: { id: 'd1', toTurn: null }, metrics: { supply: -4 } }, result: '翌日の昼になっても物資は届かなかった。' },
      ],
      knowledge: '支援物資は、避難所から必要な品目と数量を伝えないと届きにくい。在所人数を正しく把握して報告することが、物資の確保につながる。',
      sourceIds: ['cao_shelter_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_toilet_shortage',
      title: 'トイレ不足',
      trigger: { all: [{ flag: 'outage_water' }, { minTurn: 3 }, { any: [{ toiletLoadAbove: 30 }, { supplyBelowPerPerson: { toilet_kit: 2 } }] }] },
      timing: '断水が続き、携帯トイレが減ったとき',
      situation: '携帯トイレの残りが少なくなってきた。トイレ前の行列も長く、トイレを我慢するために水分を控える人が出てきている。',
      choices: [
        { id: 'request', label: '本部に携帯トイレと仮設トイレの追加を要請する', cost: { points: 1 }, effects: { supplies: { toilet_kit: 120 }, metrics: { hygiene: 6, supply: 2 } }, result: '近くの避難所から携帯トイレを分けてもらえた。' },
        { id: 'rule', label: '清掃当番と使い方のルールを決め、水分を控えないよう呼びかける', cost: { points: 1 }, effects: { metrics: { hygiene: 5, care: 4, info: 3 } }, result: 'トイレがきれいに保たれ、行列も少し落ち着いた。' },
        { id: 'none', label: '我慢してもらう', cost: {}, effects: { metrics: { hygiene: -10, care: -8 } }, result: '水分を控えた人の中から、体調を崩す人が出た。' },
      ],
      knowledge: 'トイレを我慢して水分や食事を控えると、脱水などの体調悪化につながる。トイレの数と衛生の管理は、避難者の健康に直結する。',
      sourceIds: ['cao_toilet_guideline'],
      isGameAssumption: true,
    },
    {
      id: 'ev_food_shortage',
      title: '食料不足',
      trigger: { all: [{ minTurn: 4 }, { supplyBelowPerPerson: { food: 1 } }] },
      timing: '食料が在所人数を下回ったとき',
      situation: '次の食事に必要な数より、残っている食料が少ない。',
      choices: [
        { id: 'priority', label: '乳幼児がいる世帯や持病のある人を優先し、残りは公平に分けて理由を掲示する', cost: { points: 1 }, effects: { flags: { food_rationed: true }, metrics: { care: 6, info: 5 } }, result: '理由を掲示したことで、大きな不満は出なかった。次の食事は半分の量で配る。' },
        { id: 'request', label: '本部に追加の食料を要請する', cost: { points: 1 }, effects: { supplies: { food: 30 }, metrics: { supply: 3 } }, result: '近隣から一部の食料が届いた。' },
        { id: 'first', label: '先着順で配る', cost: {}, effects: { metrics: { care: -10, info: -5, safety: -3 } }, result: '配布場所で口論が起きた。' },
      ],
      knowledge: '食料が足りないときは、配り方のルールと理由を説明すると公平感が保たれ、トラブルを防げる。アレルギーや乳幼児向けの食品にも気を配る。',
      sourceIds: ['cao_living_environment_guideline'],
      isGameAssumption: true,
    },
  ],

  // ミッション。check の書き方は README を参照。
  missions: [
    { id: 'm_inspect', label: '受け入れ前に建物の内部を点検する', check: { type: 'flag', flag: 'inspected_building' } },
    { id: 'm_reception', label: '受付を出入口のそばに設ける', check: { type: 'zoneNearTile', zone: 'reception', tile: 'e', maxDist: 1 } },
    { id: 'm_no_wait', label: 'どのターンでも、居場所が決まらない世帯を残さない', check: { type: 'noLog', checkId: 'unplaced' } },
    { id: 'm_needs', label: 'ニーズが満たされた割合を80%以上にする（最終ターン）', check: { type: 'needsRatio', min: 0.8 } },
    { id: 'm_water', label: '飲料水を最後まで切らさない', check: { type: 'neverRanOut', item: 'water' } },
    { id: 'm_toilet', label: '断水したとき、トイレの使い方をその場で決める', check: { type: 'eventChoiceIn', event: 'ev_water_outage', choices: ['kits', 'close'] } },
    { id: 'm_night', label: '夜間の急病人に、時間内に適切に対応する', check: { type: 'eventChoiceIn', event: 'ev_night_sick', choices: ['call', 'nurse'], notTimedOut: true } },
    { id: 'm_info', label: '掲示・情報コーナーを設け、利用ルールを掲示する', check: { type: 'all', checks: [{ type: 'zoneExists', zone: 'info' }, { type: 'flag', flag: 'rules_posted' }] } },
    { id: 'm_aisle', label: '居住スペースをすべて通路に面して配置する（最終ターン）', check: { type: 'noLivingWithoutAisle' } },
  ],
};
