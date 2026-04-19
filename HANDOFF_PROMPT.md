# ポチッと事務 v2 方針転換 引き継ぎプロンプト

**作成日**: 2026-04-19
**引き継ぎ元**: 前セッション（PIVOT_PLAN_v2.md v9 Codex review ok:true 到達時点）

---

## 🎯 このプロンプトの使い方

新しい Claude Code セッションを開始し、以下の全文をコピペしてください。Claude がこれまでの文脈を読み込んで実装着手から継続できます。

---

# 以下、新セッション用プロンプト（コピペ）

```
【引き継ぎ】ポチッと事務 v2 方針転換プロジェクトの続き

## プロジェクト
- パス: /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/
- アプリ名: ポチッと事務（公式）、内部フォルダ名: genba-note
- Expo React Native、建設業向け見積書・請求書アプリ
- App Store リリース済み (v1.0.0)、過去90日で 3DL / 0課金 / ¥0収益

## 必読ファイル（まずこの順で読んで）
1. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/PIVOT_PLAN_v2.md
   — 本プロジェクトの ExecPlan v9（Codex review ok:true 到達済み）
2. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/CLAUDE.md
   — 本プロジェクトの開発ルール（TDD 必須、Codex review ゲート、.env 読み取り禁止）
3. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/PLANS.md
   — ExecPlan 規約（Progress / Surprises & Discoveries / Decision Log / Outcomes & Retrospective 必須）
4. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/SPEC_GENBANOTE.md
   — プロジェクト仕様
5. /Users/yuma/.claude/CLAUDE.md
   — Yuma のグローバル開発ルール（セキュリティ、TDD、破壊操作の確認）
6. /Users/yuma/.claude/projects/-Users-yuma/memory/MEMORY.md
   — Yuma のメモリインデックス

## 前セッションの成果

### 今日判明した重要な出来事（2026-04-18〜19）
- Supabase project が1週間無活動で自動停止 → DNS NXDOMAIN
- 障害復旧に半日（project再開 / Anonymous sign-in有効化 / Edge Functions再デプロイ / JWT signing key ES256 → HS256 legacy 切替）
- 材料リサーチ機能は1週間使われていなかった = 実使用なし
- App Store 実績: 3DL / 0課金 / ¥0収益（過去90日）

### 方針転換の決定
完全無料化 + 書類レイアウト自由配置を新しい売りに。理由:
- Yuma の目標: 親友（1人親方）が仕事仲間に推薦できるクオリティ（黒字化は副次的）
- 親友の直接要望「書類の配置を変えたい」「画像透過が納得いかない」
- 3DL段階では ship-and-see 哲学で進める（M0 検証ゲートは削除）

### 確定した仕様
- レイアウト自由度: 9マス配置（上/中/下 × 左/中央/右）
- 入力方式: プリセット選択 + 9マス微調整
- インボイス厳密度: (a) 書類タイプで分岐（適格請求書は法定必須欠落時ブロック + 「一般請求書として出力」escape hatch）
- M3 Preview 対象テンプレ: CONSTRUCTION / SIMPLE / FORMAL_STANDARD の3つ
- 初期プリセット3種: 建設業定番 / 振込先強調 / シンプル
- アプリ名: ポチッと事務 継続

### ペルソナ（親友 = First User）
- 最近独立した1人親方
- 元の会社の知人・友人から仕事を受ける
- 適格請求書発行事業者 登録済み（T+13桁）
- 現在ジムー見積書アプリ併用、ポチッと事務は感想くれてる段階（本格利用まだ）
- 要望: 書類の配置を自由に変えたい、画像透過機能の改善

### 親友ファースト順序
1. M1 (v1.0.1): クリーンアップ（材料リサーチ / Pro tier / Supabase 全削除）
2. M3 Preview (v1.1.0): 主要3要素 × 3テンプレの9マス配置（親友先行体験）
3. M2 + M3 Full (v1.2.0): 書類タイプ3種拡張 + 全要素9マス + 画像透過改善
4. M4: マーケ刷新（Sora + Meta Ads + Apple Search Ads）

### 削除対象 / 保持対象
詳細は PIVOT_PLAN_v2.md §3 参照。
- 削除: src/domain/materialResearch/, src/subscription/, src/domain/auth/, supabase/, app/paywall.tsx 等
- 保持: src/domain/document/, src/domain/customer/, src/pdf/templates/, expo-secure-store (invoice番号/銀行情報で使用)
- .env は Yuma 手動対応（Claude は値を読まない）、.env.example のみ Claude 対応

### Codex review 履歴
9回の反復で ok:true に到達:
- v1: 7 blocking
- v2-v3: 3 blocking
- v4-v5: 2 blocking
- v6-v8: 1 blocking
- v9: 0 blocking（Codex review ok:true、2026-04-19 夜）

## 現在の状態

### Git
- 現在のブランチ: main（本 pivot 用の feature branch はまだ作っていない）
- main は origin より 1コミット ahead（4edb217 = App Store 版のコミット）
- stash@{0}: paywall-wip before material-research env fix（M1 で paywall 消えるため破棄予定、要 Yuma 承認）
- fix/material-research-env-vars ブランチ: 存在（M1 で preflight 消えるため破棄予定、要 Yuma 承認）

### インフラ
- Supabase project: 稼働中（M1 で停止 → 30日後削除予定）
- RevenueCat offering: 稼働中（M1 で無効化 → 30日後削除予定）
- App Store Connect IAP: 稼働中（M1 リリース時に Remove from Sale 予定）
- EAS environments に EXPO_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY 登録済み（M1 で削除予定）

### Yuma からの未完了承認
- OQ1: stash@{0} の内容確認 → backup branch 作成 → 破棄
- OQ2: fix/material-research-env-vars ブランチの内容確認 → backup → 破棄
- OQ3: M1 着手タイミング確定

## 次のアクション（タスクの順序）

このセッションでやるべきこと:

### Step 1: Yuma に最終確認（必須）
以下を Yuma に確認してから着手:
- PIVOT_PLAN_v2.md v9 の内容を承認するか？
- OQ1（paywall stash）の扱いは？破棄OK？
- OQ2（fix/material-research-env-vars ブランチ）の扱いは？破棄OK？
- M1 着手タイミング（今すぐ? 明日? 来週?）

### Step 2: Yuma 承認後、M1 着手
PIVOT_PLAN_v2.md §M1 の手順に従って:
1. OQ1, OQ2 の破壊操作を Yuma 承認ステップ踏んで実行（git stash show / git log で内容確認 → backup branch 作成 → 削除）
2. feature branch `refactor/m1-cleanup` 作成（main から）
3. §4 の削除対象に対して `rg -l 'supabase|RevenueCat|Purchases|isPro|dailyUsage|materialResearch|Rakuten|gemini-search|paywall' genba-note/src genba-note/app genba-note/__tests__` で完全棚卸し実行、6区分（UI / domain / storage / pdf-export / docs / tests）に分類
4. コミット1〜10 の順で削除・修正実施（PIVOT_PLAN_v2.md §M1 コミット粒度参照）
5. TDD RED → GREEN → REFACTOR（§7 M1 テスト参照）
6. 各コミット後: `cd genba-note && npm test && npm run lint && npx tsc --noEmit`
7. Codex review ゲート: コミット3完了時 / コミット6完了時 / M1完了時（ok:true まで反復）
8. App Store Connect メタデータ更新 (§9 参照)
9. Supabase project 停止 / RevenueCat offering 無効化 / IAP Remove from Sale

### Step 3: M1 リリース後、M3 Preview 着手
（M1 リリース後に改めて Yuma と相談して着手）

## 重要な制約（必ず守る）

### .env 取扱い
- .env は Yuma の個人ファイル、Claude は**値を読まない、開かない、編集しない**
- 必要な変更は Yuma 手動で実施してもらう
- Claude は .env.example のみ編集可能

### 破壊的操作
- `git stash drop`, `git branch -D`, `git reset --hard`, `git push --force`, `rm -rf` は **Yuma 明示承認必須**
- 承認前に必ず `git stash show -p`, `git log`, `git diff` で内容確認
- backup branch 作成を前置ステップとする

### TDD
- RED → GREEN → REFACTOR を必ず踏む
- 新規実装はテスト先行、失敗を確認してから実装
- CLAUDE.md の TDD ルール遵守

### Codex review ゲート
- 主要変更（≥5ファイル、infra/config 変更、public API 変更）後に実施
- M1 コミット3完了 / コミット6完了 / M1完了 の3回（最低）
- ok:true になるまで修正→再review 最大5回反復
- 収束しない場合は scope 見直しを Yuma と相談

### Secret 管理
- APIキー、トークン、パスワード、秘密鍵をコード/テスト/ログにハードコード禁止
- シークレットは環境変数経由のみ
- Claude はシークレット値を出力しない

### 本番影響操作
- App Store 関連操作（IAP Remove from Sale, 審査申請 等）は Yuma 承認必須
- Supabase project 停止 / 削除 は Yuma 承認必須
- RevenueCat 変更は Yuma 承認必須

## メモリ活用
関連するメモリ:
- /Users/yuma/.claude/projects/-Users-yuma/memory/feedback_eas_env_vars.md
  — EAS 公開 env 変数は project environment 経由で管理
- /Users/yuma/.claude/projects/-Users-yuma/memory/feedback_gmail_real_name.md
  — Gmail 登録は本名必須
- /Users/yuma/.claude/projects/-Users-yuma/memory/feedback_context_handoff.md
  — 重いコンテキストで自動ハンドオフ

## 引き継ぎ確認の一言

まず `PIVOT_PLAN_v2.md` を読んで Progress セクションで現状確認し、Yuma に「v9 plan 承認する？OQ1/OQ2 どうする？M1 着手タイミングは？」と確認して、承認後に M1 着手してください。
```

---

## 📝 Yuma への連絡事項

- 上記のコードブロック全体（``` で囲まれてる部分）を新しいチャットの最初の入力にコピペすれば引き継ぎ完了
- メモリ `feedback_context_handoff.md` に「重いコンテキストで自動ハンドオフ」のルールが登録済み
- 今後のセッションでコンテキストが重くなったら、Claude は自律的に停止してこの形式のプロンプトを出力します
