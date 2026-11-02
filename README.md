# 避難所マネージャー（開発用仮称）— 試作版 0.1.0

避難所の開設・運営を学ぶ、スマートフォン向けのシミュレーションゲームの試作版です。
防災訓練・避難所運営研修での利用を想定し、まずボランティアの試用者から意見を集めるために作りました。

> - 「避難所マネージャー」は**開発用の仮称**です。正式名称は商標調査のあとで決めます（`docs/IP_REVIEW.md` §5）。
> - ゲームの数値・評価・展開は**学習用の仮定**です。行政の正式な基準ではありません。

## できること（試作版の範囲）
- 地震シナリオを1人で最初から最後まで（開設準備＋6ターン）プレイ
- 開設準備（建物点検・役割分担など）→ 平面図のレイアウト（固定／自由配置）→ 受け入れ・配置 → 物資配布 → 8種類のイベント対応 → ミッション判定 → 6分類の総合評価 → 振り返り → アンケート
- 自動保存と「続きから」
- アンケートの端末内保存と CSV／JSON 出力
- オフライン動作（PWA。ホーム画面に追加可能）

---

## 1. 起動方法・ローカルでの実行方法

必要なもの：Node.js 18 以上（開発用サーバーとテストにだけ使います。**npm install は不要**、依存パッケージはありません）

```bash
cd shelter-manager
node tools/serve.mjs
```
ブラウザで http://localhost:8790/ を開きます。ポートを変えるときは `node tools/serve.mjs 9000`。

**スマートフォンで試すとき**
- 同じ Wi-Fi のスマホから試す場合：`HOST=0.0.0.0 node tools/serve.mjs`（PowerShell では `$env:HOST='0.0.0.0'; node tools/serve.mjs`）で起動し、PCのIPアドレス（例 `http://192.168.1.10:8790/`）を開きます。この場合、ゲームは動きますが、**オフライン機能（Service Worker）は https か localhost でしか有効になりません**。
- 試用者に配るときは、静的ファイルをそのまま置ける https のホスティング（GitHub Pages など）に `shelter-manager/` の中身を置いてください。サーバー側の処理はありません。

**ホーム画面に追加（PWA）**
- iPhone（Safari）：共有ボタン →「ホーム画面に追加」
- Android（Chrome）：メニュー →「ホーム画面に追加」／「アプリをインストール」
- 一度開いたあとは、機内モードでも遊べます。

> PowerShell で `npm` が動かない環境では、`node` コマンドを直接使ってください（上記のとおり npm は不要です）。

## 2. 設定データの変更方法

文章と数値は `src/data/` のファイルだけを編集すれば変わります（プログラムの変更は不要）。編集後はブラウザを再読み込みしてください。

| 変えたいもの | ファイル | 場所 |
|---|---|---|
| 災害シナリオの一覧・追加 | `src/data/scenarios/index.js` | `SCENARIOS`。`ready: false` は「準備中」で選べない |
| 地震シナリオ本体 | `src/data/scenarios/earthquake.js` | 下記の各項目 |
| 避難者の属性と人数 | 同上 `groups` | `size`（1〜4）、`ages`、`family`、`infants`、`needs`、`pet`、`note`、`arriveTurn` |
| 初期物資の数量 | 同上 `supplies` | 難易度の `supplyMultiplier` が掛かる |
| 支援物資の到着予定 | 同上 `deliveries` | `turn`、`items` |
| 開設準備の作業 | 同上 `openingTasks` | `cost`（準備ポイント）、`effects` |
| イベントの文章・条件 | 同上 `events` | 下の「イベントの書き方」 |
| ミッション | 同上 `missions` | 下の「ミッションの書き方」 |
| ターン数・時間帯 | 同上 `turns` | `flags: ['meal']` で食事、`['night']` で夜 |
| 避難所の設備・平面図 | `src/data/facilities.js` | `grid`（1文字1マス）、`hazards`、`damagedToilets`、`fixedLayout` |
| ゾーン（受付など）と定員 | `src/data/config.js` | `ZONES` |
| 評価基準（6分類・重み・ランク・ヒント） | `src/data/config.js` | `CATEGORIES`、`RANKS`、`IMPROVEMENT_HINTS` |
| ターン終了時の判定 | `src/data/config.js` | `TURN_CHECKS`（条件ごとの点数の増減と文言） |
| ニーズの判定ルール | `src/data/config.js` | `NEEDS` |
| 物資の配布・個別支援 | `src/data/config.js` | `DISTRIBUTIONS`、`SUPPORTS`、`TOILET` |
| 難易度 | `src/data/config.js` | `DIFFICULTIES`（準備pt、運営pt、物資倍率、時間制限） |
| チュートリアルの文章 | `src/data/tutorial.js` | |
| アンケート項目 | `src/data/survey.js` | `type: scale / choice / text` |
| 参考資料 | `src/data/sources.js` | イベントの `sourceIds` から参照 |

### イベントの書き方（`events`）
```js
{
  id: 'ev_xxx', title: '見出し',
  trigger: { turn: 3 },                 // 発生条件（下表）。複数キーは AND
  timing: '表示用の発生タイミング',
  timeLimitSec: 60, defaultChoiceId: 'wait', // 任意：時間制限と時間切れ時の選択肢
  situation: '状況説明',
  choices: [
    { id: 'a', label: '選択肢', cost: { points: 1, supplies: { partition: 2 } },
      requiresFlag: 'checked_power', requiresText: '選べない理由',   // 任意
      effects: { metrics: { care: 5 }, supplies: { food: 30 }, flags: { x: true },
                 addGroups: ['x01'], delayDelivery: { id: 'd1', toTurn: 6 } },
      result: '対応後の変化の文章' },
  ],
  knowledge: '関連する防災知識（独自の要約）',
  sourceIds: ['cao_shelter_guideline'],  // src/data/sources.js の id
  isGameAssumption: true,                // ゲーム上の仮定かどうか
}
```
発生条件 `trigger` で使えるキー：`turn`、`minTurn`、`maxTurn`、`flag`、`notFlag`、`supplyBelowPerPerson: { item: 1人あたり量 }`、`toiletLoadAbove: 人数`、`all: [...]`、`any: [...]`。
各イベントには、費用なしで選べる選択肢を最低1つ入れてください（テストで確認しています）。

### ミッションの書き方（`missions`）
`check.type`：`flag`、`zoneExists`、`zoneNearTile`、`noLog`（ターンチェックIDが一度も出ていない）、`needsRatio`、`neverRanOut`、`eventChoiceIn`、`noLivingWithoutAisle`、`all`。

### 新しい災害を追加するには
1. `src/data/scenarios/earthquake.js` をコピーして `flood.js` などを作り、内容を書き換える
2. `src/data/scenarios/index.js` で読み込み、`ready: true` にする
3. `sw.js` の `FILES` に新しいファイルを足し、`CACHE` の版を上げる（オフライン対応のため）
4. `node --test tests/*.test.mjs` で整合性チェック

## 3. セーブデータの仕様
- 保存先：ブラウザの `localStorage`（端末内のみ。外部送信なし）
- キー：`shelter-manager:save:v1`（1件。新しく始めると上書き確認のあと置き換え）
- 保存タイミング：操作のたびに自動保存
- 形式（JSON）：
  ```json
  { "app": "shelter-manager", "schemaVersion": 1, "savedAt": "ISO日時", "state": { ... } }
  ```
  `state` の主な項目は `docs/DESIGN.md` §3.1。`schemaVersion` が違う・壊れているデータは読み込まず、タイトル画面に「続きから」を出しません。
- イベントの時間制限の残り時間は保存しません（再開すると制限時間がやり直しになります）。
- 消し方：ブラウザの「サイトデータの削除」。

## 4. アンケートの保存・出力方法
- ゲーム終了後の「アンケートに答える」から回答（8問。氏名・連絡先は聞きません）
- 保存先：`localStorage` のキー `shelter-manager:surveys:v1`（端末内のみ、自動送信なし）
- タイトル →「アンケート結果の確認・出力」で、件数・平均・選択肢の集計と回答一覧を確認
- **CSVで保存**：Excel で文字化けしないよう BOM 付き UTF-8。改行・カンマ・引用符を含む回答も1セルに収まります。`=` などで始まる回答は数式として実行されないよう先頭に `'` を付けます
- **JSONで保存**：全項目をそのまま出力
- **すべて削除**：確認のあと、端末内の回答を消去（元に戻せません。先に CSV を保存してください）

## 5. テスト
```bash
node --test tests/*.test.mjs        # 自動テスト（25件）
node tools/playthrough.mjs fixed normal good     # 通しプレイ（よい対応）
node tools/playthrough.mjs fixed normal passive  # 通しプレイ（消極的な対応）
```
結果は `docs/TEST_REPORT.md`。

## 6. 未実装機能の一覧
| 機能 | 状態 |
|---|---|
| 地震以外のシナリオ（水害・津波・台風・複合災害） | 未実装（選択画面に「準備中」と表示。データを追加すれば拡張できる構造） |
| 複数人協力プレイ | 未実装（操作がすべて `reduce(state, action)` を通る構造のみ用意） |
| 防災訓練モード | 未実装 |
| 自治体別カスタマイズ（施設図面の登録画面など） | 未実装（`facilities.js` を書き換えれば図面は差し替え可能） |
| アンケートのサーバー送信 | 意図的に未実装（端末内保存のみ） |
| 効果音・BGM・イラスト | なし |
| 英語・やさしい日本語などの多言語対応 | 未実装 |
| 実際の災害情報・実在施設との連携、開設可否の判定、鍵の管理 | **対象外**（権利・安全性の確認が必要なため） |

## 7. 今後の改善候補
- 平面図のマスが1辺約40pxと、推奨の44pxより少し小さい（細い指では押し間違いの可能性）→ 拡大表示モード
- イベントが4ターン目に集中しやすい（運営ポイントが足りなくなる）→ 試用者の意見を見て配分を調整
- 世帯の人数が4人までの制約（大家族は2世帯に分けて登録）→ 複数マスにまたがる配置
- 避難者の到着時の聞き取り（受付）をミニゲームにする
- 振り返り画面からの「同じ場面をやり直す」
- 読み上げ（スクリーンリーダー）での平面図操作の改善
- 試用者アンケートの項目に「立場（運営経験の有無など）」を任意・選択式で追加するか検討（個人特定につながらない範囲で）

## 8. ドキュメント
| ファイル | 内容 |
|---|---|
| `docs/DESIGN.md` | 技術構成・ディレクトリ・データ設計・画面遷移・実装手順・テスト方法 |
| `docs/TEST_REPORT.md` | テスト結果 |
| `docs/TRIAL_GUIDE.md` | ボランティア試用者向け操作説明書 |
| `docs/FEEDBACK_CHECKLIST.md` | 試用者向け意見収集チェックリスト |
| `docs/IP_REVIEW.md` | 知的財産権の確認レポート（予備調査） |
| `docs/ASSET_REGISTER.md` | 素材台帳 |
| `docs/COMMERCIALIZATION_CHECKLIST.md` | 商用化前チェックリスト |

## ライセンス
未定（`package.json` は `UNLICENSED`）。権利の帰属は契約で決めてください。
