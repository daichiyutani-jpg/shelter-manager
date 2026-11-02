// 防災情報の参照資料。ゲーム内の「関連する防災知識」は、これらを参考に独自の文章で要約したもの。
// 資料の文章・図表はゲームに複製していない。
// checkedOn は公開URLと発行情報をWebで確認した日。status: verified=表紙等で確認 / partial=一部のみ確認
// 二次利用条件（図表の転載可否など）はいずれも未確認（docs/IP_REVIEW.md 参照）。

export const SOURCES = [
  {
    id: 'cao_shelter_guideline',
    title: '避難所運営等避難生活支援のためのガイドライン（チェックリスト）（旧称：避難所運営ガイドライン）',
    publisher: '内閣府（防災担当）',
    url: 'https://www.bousai.go.jp/taisaku/hinanjo/pdf/2412hinanjo_guideline.pdf',
    published: '平成28年4月（初版）／令和6年12月（最新改定）',
    checkedOn: '2026-11-02',
    status: 'verified',
    usedFor: '開設から運営までの段階の考え方、受付での聞き取り、運営体制、要配慮者への配慮、夜間の対応',
  },
  {
    id: 'cao_toilet_guideline',
    title: '避難所におけるトイレの確保・管理ガイドライン',
    publisher: '内閣府（防災担当）',
    url: 'https://www.bousai.go.jp/taisaku/hinanjo/pdf/2412hinanjo_toilet_guideline.pdf',
    published: '平成28年4月（初版）／令和6年12月（最新改定）',
    checkedOn: '2026-11-02',
    status: 'verified',
    usedFor: '断水時の携帯トイレへの切り替え、トイレ1基あたりの人数の目安（発災当初は約50人、長期化したら約20人に1基）',
  },
  {
    id: 'cao_living_environment_guideline',
    title: '避難生活における良好な生活環境の確保に向けた取組指針（旧称：避難所における良好な生活環境の確保に向けた取組指針）',
    publisher: '内閣府（防災担当）',
    url: 'https://www.bousai.go.jp/taisaku/hinanjo/pdf/2412kankyokakuho.pdf',
    published: '平成25年8月（初版）／令和6年12月（最新改定）',
    checkedOn: '2026-11-02',
    status: 'verified',
    usedFor: '居住スペースの広さの考え方、簡易ベッド・間仕切りの活用、食料配布の配慮',
  },
  {
    id: 'cao_welfare_shelter_guideline',
    title: '福祉避難所の確保・運営ガイドライン',
    publisher: '内閣府（防災担当）',
    url: 'https://www.bousai.go.jp/taisaku/hinanjo/r3_guideline.html',
    published: '令和3年5月（改定）',
    checkedOn: '2026-11-02',
    status: 'partial',
    usedFor: '要配慮者への支援の考え方（本文の詳細は未確認）',
  },
  {
    id: 'env_pet_guideline',
    title: '人とペットの災害対策ガイドライン',
    publisher: '環境省 自然環境局',
    url: 'https://www.env.go.jp/nature/dobutsu/aigo/2_data/pamph/h3002.html',
    published: '平成30年3月（改訂案のパブリックコメントが2026年6月に実施。改訂版の公表は未確認）',
    checkedOn: '2026-11-02',
    status: 'partial',
    usedFor: 'ペットとの同行避難と、避難所での飼育場所の考え方',
  },
  {
    id: 'sphere_handbook_ja',
    title: 'スフィアハンドブック 2018年版 日本語版',
    publisher: '支援の質とアカウンタビリティ向上ネットワーク（JQAN）',
    url: 'https://jqan.info/sphere_handbook_2018/',
    published: '原版 2018年（日本語版の発行日は未確認）',
    checkedOn: '2026-11-02',
    status: 'partial',
    usedFor: '居住面積・トイレ数・給水量の国際的な最低基準の考え方（数値の要約のみ参照）',
  },
];

export const DISCLAIMER = [
  'このゲームの数値・評価・展開は、学習のためのゲーム上の仮定です。行政の正式な基準や、実際の必要量を示すものではありません。',
  '実際の避難所運営は、自治体の計画、施設の条件、災害の状況などによって対応が異なります。必ずお住まいの自治体の計画や公的資料を確認してください。',
];
