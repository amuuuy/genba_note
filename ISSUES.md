# GenBa Note 本番リリース前 問題点リスト

> 作成日: 2026-02-22
> テスト: 2478/2478 通過 | TypeScript: エラー 0件
> パス基準: リポジトリルート相対（`genba-note/...` = アプリコード、`supabase/...` = Edge Functions）

---

## CRITICAL — リリースブロッカー

### C-1. 利用規約・プライバシーポリシー URL 未設定
- **対象**: `genba-note/app/paywall.tsx` L34-36
- **現状**: `TODO` コメント付きのプレースホルダー URL
  ```
  TERMS_OF_SERVICE_URL = 'https://genba-note.app/terms'
  PRIVACY_POLICY_URL = 'https://genba-note.app/privacy'
  ```
- **影響**: App Store / Play Store 審査で確実にリジェクト
- **対応**:
  - [ ] 利用規約ページ作成・公開
  - [ ] プライバシーポリシーページ作成・公開
  - [ ] コード内 URL 差し替え & TODO 削除

### C-2. EAS Submit 設定が空
- **対象**: `genba-note/eas.json` L29-39
- **現状**: `appleId`, `ascAppId`, `appleTeamId`, `serviceAccountKeyPath` が全て空
- **影響**: ストア提出不可
- **対応**:
  - [ ] Apple Developer 登録 → 各 ID 取得・記入
  - [ ] Google Play サービスアカウント JSON 作成 → パス記入

### C-3. RevenueCat Public Key 未設定
- **対象**: `genba-note/.env` L13
- **現状**: `EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY=` が空
- **影響**: 本番ビルドで課金が一切動かない
- **対応**:
  - [ ] RevenueCat プロジェクト作成
  - [ ] Entitlement `pro` 作成 + Offering 設定
  - [ ] Public Key を `.env` と EAS Secrets に設定
- **完了条件**: EAS 本番環境変数設定済み + 実機本番ビルドで RevenueCat 購入/復元動作確認（シークレット値そのものは文書化しない）

---

## HIGH — 本番運用で問題になる

### H-1. Free ユーザーの AI 検索にコスト制限がない
- **対象**: `supabase/functions/gemini-search/index.ts`, `genba-note/src/domain/materialResearch/`
- **現状**: IP レート制限（5回/分）のみ。1日の総回数制限なし
- **影響**: Free ユーザーの大量利用で Gemini API コストが膨張
- **対応**（server-side 必須、client-side は UX 補助）:
  - [ ] **[必須]** Edge Function 側にユーザー単位の日次制限を実装（H-4 の認証改善後）
  - [ ] **[補助]** クライアント側に日次回数制限 UI を追加（Free: 3回/日、Pro: 無制限 など）
  - [ ] `genba-note/src/subscription/freeTierLimitsService.ts` に `FREE_AI_SEARCH_DAILY_LIMIT` を追加
  - ⚠️ クライアント側制限のみでは改変・再ビルドで回避可能。server-side が本命

### H-2. 書類の累計制限（5件）が厳しすぎる
- **対象**: `genba-note/src/subscription/freeTierLimitsService.ts` — `FREE_DOCUMENT_LIMIT = 5`
- **現状**: 削除しても復活しない累計カウント。1〜2案件で使い切る
- **影響**: ユーザーが価値を感じる前に壁 → 課金せずアンインストール
- **対応案** (いずれか選択):
  - [ ] A. 保持数制限に変更（削除すれば枠が空く）
  - [ ] B. 累計数を 10〜15 に引き上げ
  - [ ] C. 月間制限に変更（月3件、毎月リセット）

### H-3. 写真削除エラーの握りつぶし
- **対象**: `genba-note/src/domain/customer/customerPhotoService.ts` L278
- **現状**: `.catch(() => {})` でエラーを完全にサイレント
- **影響**: ストレージ容量逼迫時にゴミファイルが蓄積
- **対応**:
  - [ ] `catch` 内で `__DEV__` ガード付き `console.warn` を追加

### H-4. Edge Function の認証がユーザー単位でない（anon key 依存）
- **対象**: `genba-note/src/domain/materialResearch/geminiSearchService.ts` L47-49, `genba-note/src/domain/materialResearch/materialResearchService.ts` L41-43
- **現状**: Edge Function 呼び出しに `EXPO_PUBLIC_SUPABASE_ANON_KEY` を Bearer token として使用。公開キーのためユーザー単位の認証・制限が不可能
- **影響**: anon key が公開情報のため、第三者が直接 Edge Function を呼び出し可能。ユーザー単位の利用制限もできない
- **対応**:
  - [ ] Supabase Auth を導入しユーザーセッション JWT を取得
  - [ ] Edge Function 呼び出しを anon key → ユーザー JWT に変更
  - [ ] Function 側で `auth.uid` ベースの利用制限・監査を実装

### H-5. Rakuten レートリミッタの Map 無制限成長
- **対象**: `supabase/functions/rakuten-search/index.ts` L30-47
- **現状**: gemini 側には `MAX_TRACKED_IPS`（10,000件上限）+ TTL クリーンアップがあるが、rakuten 側にはない。`Map` が無制限に成長する
- **影響**: 大量のユニーク IP アクセスで Edge Function のメモリ圧迫・不安定化
- **対応**:
  - [ ] gemini 側同等の `MAX_TRACKED_IPS` + TTL クリーンアップを導入

---

## MEDIUM — 改善推奨

### M-1. `__DEV__` ガードなしの console 出力
- **対象**:
  - `genba-note/app/_layout.tsx` L72 — `console.error('[Migration Error]', ...)` にガードなし
  - `genba-note/app/customer/[id].tsx` L268 — `console.warn('Failed to delete photo metadata ...')` にガードなし
- **現状**: 本番ビルドでもデバッグ/エラーログが出力される
- **対応**:
  - [ ] 各箇所に `if (__DEV__)` ガードを追加、または削除

### M-2. placeholder 系 ProGateReason が本番コードに残存
- **対象**: `genba-note/src/subscription/types.ts`
- **現状**: `placeholder_always_false` / `placeholder_always_true` がプロダクション型定義に含まれる
- **対応**:
  - [ ] テスト専用であることを明確にコメント or テスト用型に分離

### M-3. テンプレートの Pro 差別化がない
- **対象**: `genba-note/src/pdf/templates/templateRegistry.ts`
- **現状**: 6テンプレート全て Free で使える。Pro の訴求力が「量の制限解除」のみ
- **対応案**:
  - [ ] MODERN / CLASSIC / CONSTRUCTION を Pro 限定にする
  - [ ] FORMAL_STANDARD / ACCOUNTING / SIMPLE は Free のまま

### M-4. 顧客登録上限が少ない
- **対象**: `genba-note/src/subscription/freeTierLimitsService.ts` — `FREE_CUSTOMER_LIMIT = 3`
- **現状**: 建設業は複数の元請・施主と同時取引が普通。3件だとすぐ埋まる
- **対応**:
  - [ ] 3件 → 5件 に引き上げ検討

### M-5. 楽天 API の RAKUTEN_APP_ID 登録確認
- **対象**: Supabase Edge Function シークレット
- **現状**: 登録状況が不明。未登録なら資材検索が 500 エラー
- **対応**:
  - [ ] `supabase secrets list` で確認
  - [ ] 未登録なら [Rakuten Developers](https://webservice.rakuten.co.jp/) でアプリ登録 → `supabase secrets set`

### M-6. 資材検索（楽天）にも Free 回数制限がない
- **対象**: `genba-note/src/domain/materialResearch/materialResearchService.ts`
- **現状**: Pro/Free 問わず同条件で利用可能
- **対応**:
  - [ ] Free: 1日5回 / Pro: 無制限 など検討

### M-7. Edge Function デプロイ設定が手動依存
- **対象**: `supabase/functions/gemini-search/index.ts` L8-14, `supabase/functions/rakuten-search/index.ts` L8-12
- **現状**: `verify_jwt=true` の有効化がコメント + 手動 `--verify-jwt` フラグ依存。IaC/CI で強制されていない
- **影響**: 誤デプロイで JWT 検証なしの公開エンドポイント化するリスク
- **対応**:
  - [ ] デプロイ設定をリポジトリ管理（`supabase/config.toml` 等）
  - [ ] CI で「JWT 検証有効」をチェックするゲートを追加

### M-8. rakuten-search のエラーログにサニタイズ不足
- **対象**: `supabase/functions/rakuten-search/index.ts` L151-153
- **現状**: 例外時に生の `error` オブジェクトをログ出力。URL クエリ等の機微情報が混入する恐れ
- **対応**:
  - [ ] gemini 関数同様、サニタイズ済みメッセージ/ステータスのみ出力に変更

### M-9. Gemini API の GEMINI_API_KEY 登録確認
- **対象**: Supabase Edge Function シークレット（`supabase/functions/gemini-search/index.ts` が `Deno.env.get('GEMINI_API_KEY')` で参照）
- **現状**: 登録状況が不明。未登録なら AI 検索が 500 エラー
- **対応**:
  - [ ] `supabase secrets list` で `GEMINI_API_KEY` の存在を確認
  - [ ] 未登録なら Google AI Studio でキー取得 → `supabase secrets set GEMINI_API_KEY=<key>`
  - [ ] 本番環境で AI 検索の疎通テストを実施

### M-10. Edge Function レートリミッタの IP 偽装耐性
- **対象**: `supabase/functions/rakuten-search/index.ts`, `supabase/functions/gemini-search/index.ts`
- **現状**: `x-forwarded-for` ヘッダからクライアント IP を取得しており、ヘッダ偽装でレート制限を回避可能
- **影響**: 悪意のあるユーザーが任意の IP を詐称し、レート制限を無効化できる
- **対応**:
  - [ ] Supabase Edge Function のデプロイ環境で信頼できる IP ヘッダ（例: Deno Deploy の `cf-connecting-ip`）を優先使用
  - [ ] H-4 完了後は `auth.uid` ベースの制限が主対策となるため、IP 制限は補助的位置づけに変更

### M-11. CORS ワイルドカード（補助的対策）
- **対象**: `supabase/functions/rakuten-search/index.ts` L20, `supabase/functions/gemini-search/index.ts` L22
- **現状**: `'Access-Control-Allow-Origin': '*'`
- **影響**: ネイティブアプリでは CORS は防御境界にならないため、直接的なセキュリティリスクは低い。ただし Web クライアントからのアクセスは無制限
- **対応**:
  - [ ] H-4 の認証改善が主対策。CORS は補助的に削除または制限（ネイティブアプリは CORS 対象外）
- **補足**: 旧 H-6 から降格。本文記載の通りリスクが低く、H-4 完了で実質解消されるため MEDIUM に分類

### M-12. Sentry（クラッシュレポート）未導入
- **対象**: `genba-note/` 全体
- **現状**: クラッシュレポートサービスが未導入。本番でのクラッシュ情報が取得できない
- **影響**: ユーザーのクラッシュを検知・再現・修正できず、品質改善が遅れる
- **対応**:
  - [ ] `@sentry/react-native` をインストール
  - [ ] `genba-note/app/_layout.tsx` に Sentry 初期化コードを追加
  - [ ] EAS Build に Sentry DSN を環境変数で設定
  - [ ] テストクラッシュでダッシュボード受信確認

### M-13. App Store / Play Store メタデータ未準備
- **対象**: App Store Connect / Google Play Console
- **現状**: スクリーンショット・説明文・キーワードが未作成
- **影響**: ストア申請に必要なアセットがない
- **対応**:
  - [ ] 実機ビルドでスクリーンショット撮影（iPhone 6.7", iPad, Android）
  - [ ] 日本語/英語の説明文・キーワード作成
  - [ ] App Store Connect / Google Play Console にアップロード

---

## 対応外（問題なし確認済み）

> 検証日: 2026-02-22 | 検証ディレクトリ: `cd genba-note && ...`
> 検証コマンド: `npx jest --coverage` / `npx tsc --noEmit`

**注**: 検証コマンドは全てリポジトリルートから実行する前提。

| 項目 | 状態 | 検証コマンド（リポジトリルートから実行） | 期待結果 |
|------|------|----------------------------------------|----------|
| HTML テンプレートの XSS 対策 | `escapeHtml()` で全テンプレート適用済み | `rg -l "escapeHtml" genba-note/src/pdf/templates/ genba-note/src/pdf/invoiceAccountingTemplate.ts` | 6ファイルがヒット（formalStandard, simple, modern, classic, construction + invoiceAccounting） |
| useEffect クリーンアップ | 24箇所中 21箇所は cleanup 済みまたは不要。3箇所は未 cleanup だがリスク許容 | `rg -n "useEffect\(" genba-note/app/ genba-note/src/components/` | 全24箇所を列挙。イベントリスナーは `.remove()` 済み、タイマーは `clearTimeout` 済み、状態リセットのみの useEffect は副作用なしのため cleanup 不要。**例外（未 cleanup の非同期 useEffect 3箇所）**: `app/_layout.tsx:37-49`（configureRevenueCat Promise）、`app/document/[id].tsx:103-107`（checkProStatus Promise）、`app/document/preview.tsx:75-158`（async loadPreview）。いずれも画面マウント時の一回限り初期化であり、頻繁な unmount/remount が発生しないため setState-on-unmounted のリスクは実用上無視可能と判断。React Native の画面遷移は Stack ベースのため、これらの画面は通常アンマウントされず Promise 完了前の unmount は発生しない |
| アクセシビリティ | `accessibilityLabel` / `accessibilityState` 適用済み | `rg -l "accessibilityLabel" genba-note/app/ genba-note/src/components/` | paywall.tsx, document/[id].tsx, customers.tsx 等の操作要素に適用 |
| オフライン課金検証 | 7日猶予 + 時計操作検知 + uptime ロールバック検知 | `cd genba-note && npx jest --testPathPattern subscription` | 該当スイート全テスト通過 |
| パス・トラバーサル対策 | `validatePathSegment()` 実装済み | `cd genba-note && npx jest --testPathPattern imageUtils` | `../`, `..\\`, `%2e%2e` 等の攻撃パターンテスト通過 |
| テスト網羅性 | 123スイート / 2478テスト / 全パス | `cd genba-note && npx jest --coverage` | 0 failures, 0 pending |
| TypeScript 型安全性 | `tsc --noEmit` エラー 0件 | `cd genba-note && npx tsc --noEmit` | exit code 0 |

---

## 実装マイルストーン

### 依存関係一覧

| マイルストーン | 前提 | 理由 |
|---------------|------|------|
| MS1 | なし | 外部依存なし、即着手可能 |
| MS2 | MS1 | MS1 のコード修正（H-5, M-8 等）が基盤コードに影響するため先行完了が望ましい |
| MS3 | MS1 | Free/Pro 制限値変更は MS1 のコード品質修正後に行うのが安全 |
| MS4 | なし | 外部アカウント登録が中心のため MS1 と並行着手可能 |
| MS5 | MS2, MS3, MS4 | 申請準備ゲート（ストア提出は MS7 で実施） |
| MS6 | なし | CI/CD パイプライン。MS1, MS4 と並行着手可能 |
| MS7 | MS5, MS6 | 最終検証 & ストア提出。提出責務はここに一元化 |
| C-3 → C-2 | C-2 完了 | RevenueCat の Offering 設定に Apple/Google アカウント情報（App ID）が必要 |

---

### MS1: コード品質 & クイックフィックス
> 外部依存なし・TDD で即着手可能な小修正

| # | Issue | 内容 | 規模 |
|---|-------|------|------|
| 1 | H-5 | Rakuten レートリミッタ Map 無制限成長修正 | S |
| 2 | H-3 | 写真削除エラー握りつぶし → `__DEV__` ガード付き warn | S |
| 3 | M-1 | `_layout.tsx` L72, `customer/[id].tsx` L268 に `__DEV__` ガード追加 | S |
| 4 | M-8 | rakuten-search エラーログのサニタイズ | S |
| 5 | M-2 | placeholder ProGateReason にテスト専用コメント追加 | S |
| 6 | M-11 | CORS ヘッダー削除（ネイティブアプリには不要） | S |

**完了条件（auto_gate）**:
- `cd genba-note && npx jest` → 0 failures
- `cd genba-note && npx tsc --noEmit` → exit code 0
- `deno check supabase/functions/gemini-search/index.ts supabase/functions/rakuten-search/index.ts` → exit code 0（Edge Function の型検査）

**完了条件（manual_gate）**:
- 各修正（H-5, H-3, M-1, M-8, M-2, M-11）に対応するテストが追加または更新されていることを PR diff で確認

---

### MS2: Edge Function セキュリティ基盤
> H-4 が最大の変更。H-1 / M-6 / M-10 は H-4 完了後に実装

| # | Issue | 内容 | 依存 | 規模 |
|---|-------|------|------|------|
| 1 | H-4 | Supabase Auth 導入 → Edge Function を anon key → ユーザー JWT に変更 | — | L |
| 2 | M-7 | Edge Function デプロイ設定を IaC/CI 管理 | — | M |
| 3 | H-1 | AI 検索 server-side 日次制限（`auth.uid` ベース） | H-4 | M |
| 4 | M-6 | 楽天検索 server-side Free 回数制限 | H-4 | M |
| 5 | M-10 | IP 偽装耐性改善（`auth.uid` 主体化で補助対策に移行） | H-4 | S |

**完了条件（auto_gate）**:
- `cd genba-note && npx jest` → 0 failures
- `cd genba-note && npx tsc --noEmit` → exit code 0
- `git ls-files supabase/config.toml` → ファイルが存在する（IaC 管理済み）

**完了条件（manual_gate）**:
- gemini 認証拒否: `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer <anon_key>" -H "Content-Type: application/json" -d '{"query":"テスト"}' <SUPABASE_URL>/functions/v1/gemini-search` → `401`
- gemini 認証成功: `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer <user_jwt>" -H "Content-Type: application/json" -d '{"query":"テスト"}' <SUPABASE_URL>/functions/v1/gemini-search` → `200`
- rakuten 認証拒否: `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer <anon_key>" -H "Content-Type: application/json" -d '{"keyword":"テスト"}' <SUPABASE_URL>/functions/v1/rakuten-search` → `401`
- rakuten 認証成功: `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer <user_jwt>" -H "Content-Type: application/json" -d '{"keyword":"テスト"}' <SUPABASE_URL>/functions/v1/rakuten-search` → `200`
- Free ユーザー日次制限（gemini）: Free ユーザー JWT を使い、上記 gemini 成功コマンドを日次制限回数+1回繰り返し → 最後のレスポンスが HTTP `429` かつ body に `"error":"daily_limit_exceeded"` を含む（分単位 IP レート制限の `"error":"rate_limit_exceeded"` と区別）
- Free ユーザー日次制限（rakuten）: 同様に rakuten で確認 → HTTP `429` + `"error":"daily_limit_exceeded"`

---

### MS3: ビジネス・Free Tier 最適化
> MS1 完了後着手、MS2 と並行可能。意思決定が必要な項目

| # | Issue | 内容 | 規模 |
|---|-------|------|------|
| 1 | H-2 | 書類の累計制限見直し（A:保持数制限 / B:引き上げ / C:月間制限） | M |
| 2 | M-3 | テンプレート Pro 差別化（MODERN/CLASSIC/CONSTRUCTION → Pro 限定） | M |
| 3 | M-4 | 顧客登録上限 3件 → 5件 に引き上げ | S |

**完了条件（auto_gate）**:
- `cd genba-note && npx jest --testPathPattern subscription` → 0 failures
- `cd genba-note && npx jest --testPathPattern freeTier` → 0 failures
- `cd genba-note && npx tsc --noEmit` → exit code 0

**完了条件（manual_gate）**:
- `genba-note/app/paywall.tsx` の訴求テキスト（制限値・Pro 特典）が変更後の値と一致していることを目視確認

---

### MS4: リリースインフラ & 外部サービス設定
> MS1 と並行着手可能。外部アカウント登録・設定が中心

| # | Issue | 内容 | 依存 | 規模 |
|---|-------|------|------|------|
| 1 | C-2 | EAS Submit 設定（Apple/Google アカウント登録） | — | M |
| 2 | C-3 | RevenueCat 設定 + EAS Secrets 登録 | C-2（Apple App ID が必要） | M |
| 3 | M-5 | Rakuten API RAKUTEN_APP_ID 登録確認 | — | S |
| 4 | M-9 | Gemini API GEMINI_API_KEY 登録確認 | — | S |
| 5 | M-12 | Sentry（クラッシュレポート）導入 | — | M |
| 6 | — | TestFlight / 内部テスト配信 + 実機動作確認 | C-2, C-3 | M |

**完了条件（auto_gate）**:
- `jq '.submit.production.ios | .appleId, .ascAppId, .appleTeamId | select(. == "")' genba-note/eas.json` → 出力なし（全フィールドが非空）
- `jq '.submit.production.android.serviceAccountKeyPath | select(. == "")' genba-note/eas.json` → 出力なし
- `supabase secrets list` の出力に `RAKUTEN_APP_ID` と `GEMINI_API_KEY` が含まれる

**完了条件（manual_gate）**:
- 実機（TestFlight / 内部テスト）で課金フロー（購入・復元）が正常動作
- Sentry ダッシュボードでテストクラッシュイベントの受信を確認

---

### MS5: ストア申請準備
> 全 MS 完了後の申請準備ゲート（ストア提出は MS7 で実施）

| # | Issue | 内容 | 依存 | 規模 |
|---|-------|------|------|------|
| 1 | C-1 | 利用規約・プライバシーポリシー作成 & URL 差し替え | — | L |
| 2 | M-13 | App Store / Play Store メタデータ準備（スクショ・説明文・キーワード） | MS4#6（実機ビルドが必要） | L |
| 3 | — | 最終回帰テスト（全テスト + 実機確認） | 全 MS | M |

**完了条件（auto_gate）**:
- `curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/terms` → `200`
- `curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/privacy` → `200`
- `cd genba-note && npx jest` → 0 failures
- `cd genba-note && npx tsc --noEmit` → exit code 0

**完了条件（manual_gate）**:
- 実機で全主要フロー動作確認: 書類作成 → PDF出力 → 課金 → 復元 → 資材検索（AI/楽天）

---

### MS6: CI/CD パイプライン（新規）
> RODOAPPU.md で追加。MS7 の前提条件かつ最終ゲートに含まれるため必須。

| # | 内容 | 規模 |
|---|------|------|
| 1 | GitHub Actions: テスト & 型検査（push to main, PR トリガー） | M |
| 2 | GitHub Actions: EAS ビルド（タグ push トリガー） | M |
| 3 | main ブランチ保護設定（PR レビュー・ステータスチェック必須） | S |

**完了条件（auto_gate）**:
- `git ls-files .github/workflows/test.yml` → ファイルが存在する
- `git ls-files .github/workflows/eas-build.yml` → ファイルが存在する

**完了条件（manual_gate）**:
- PR 作成時に test workflow が自動実行され、パスすることを確認

---

### MS7: リリース前最終検証 & ストア提出（新規）
> MS5, MS6 完了後に着手。ストア提出責務はここに一元化。

| # | 内容 | 依存 | 規模 |
|---|------|------|------|
| 1 | OTA アップデート基盤（expo-updates） | — | S |
| 2 | 本番ビルド（iOS / Android） | MS5, MS6 | M |
| 3 | サンドボックス課金テスト | MS5 | M |
| 4 | TestFlight / 内部テスト配信 + 実機フルフロー確認 | #2, #3 | M |
| 5 | 最終回帰テスト（自動テスト全パス + 手動 E2E） | #4 | M |
| 6 | ストア提出（App Store + Play Store） | #5 | — |

**完了条件（auto_gate）**:
- `cd genba-note && npx jest` → 0 failures
- `cd genba-note && npx tsc --noEmit` → exit code 0

**完了条件（manual_gate）**:
- サンドボックスで課金フロー（購入・復元・解約）が動作確認済み
- TestFlight / 内部テストで全主要フロー動作確認済み
- App Store Connect / Google Play Console で審査提出完了

---

### タイムライン目安

```
Week 1:  MS1（クイックフィックス）+ MS6（CI/CD）+ MS4 開始（外部登録は並行）
Week 2:  MS2（セキュリティ基盤 — H-4 が最大工数）+ MS4 続行
Week 3:  MS2 完了 + MS3（ビジネス最適化）+ MS4 完了
Week 4:  MS5（ストア申請準備）
Week 5:  MS7（本番ビルド, 課金テスト, TestFlight）
Week 6:  MS7 継続（ストア審査提出）
Week 7-8: 審査バッファ（リジェクト対応 1〜3 回想定）→ 公開後 MS8 開始
```
