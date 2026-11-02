// プレイ後アンケートの項目。type: scale(1〜5) / choice / text
// 個人を特定する情報（氏名・連絡先・所属など）は聞かない。
export const SURVEY_QUESTIONS = [
  { id: 'q1_realism', type: 'scale', label: '実際の避難所運営に近いと感じましたか', min: 1, max: 5, minLabel: '近くない', maxLabel: 'とても近い' },
  { id: 'q2_differences', type: 'text', label: '現実と違うと感じた点を教えてください' },
  { id: 'q3_usability', type: 'scale', label: '操作は分かりやすかったですか', min: 1, max: 5, minLabel: '分かりにくい', maxLabel: 'とても分かりやすい' },
  { id: 'q4_hesitation', type: 'text', label: '判断に迷った場面はどこでしたか' },
  { id: 'q5_features', type: 'text', label: '追加してほしい機能はありますか' },
  { id: 'q6_events', type: 'text', label: '追加してほしい災害やイベントはありますか' },
  { id: 'q7_training', type: 'choice', label: '防災訓練で利用できると思いますか', options: ['利用できる', '工夫すれば利用できる', '利用は難しい', 'わからない'] },
  { id: 'q8_other', type: 'text', label: 'その他、自由にご意見をお書きください' },
];
