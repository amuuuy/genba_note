# GenBa Note リリースロードマップ

> 作成日: 2026-02-22
> 基盤: ISSUES.md（MS1〜MS7）を含む全工程を網羅
> 詳細な Issue 定義・完了条件は [ISSUES.md](ISSUES.md) を参照

## 凡例

| タグ | 担当 |
|------|------|
| `[Claude]` | Claude Code で実装可能 |
| `[Human]` | 人手が必要（アカウント登録、手動テスト、外部サービス操作） |
| `[Both]` | Claude が下書き → 人がレビュー・最終判断 |

---

## 依存関係

```
MS1 ──┬──→ MS2 ──┐
      └──→ MS3 ──┼──→ MS5 ──┐
MS4 ──────────────┘          ├──→ MS7 ──→ SUBMIT ──→ MS8
MS6 ─────────────────────────┘
```

| MS | 前提 | 並行可能 |
|----|------|---------|
| MS1 | なし | MS4, MS6 と並行可 |
| MS2 | MS1 | — |
| MS3 | MS1 | MS2 と並行可 |
| MS4 | なし | MS1, MS6 と並行可 |
| MS5 | MS2, MS3, MS4 | — |
| MS6 | なし | MS1, MS4 と並行可 |
| MS7 | MS5, MS6 | — |
| MS8 | ストア公開後 | — |

---

## MS1: コード品質 & クイックフィックス

> ISSUES.md 準拠 — 外部依存なし・TDD で即着手可能

| # | Issue | 内容 | 担当 |
|---|-------|------|------|
| 1 | H-5 | Rakuten レートリミッタ Map 無制限成長修正 | `[Claude]` |
| 2 | H-3 | 写真削除エラー握りつぶし → `__DEV__` ガード付き warn | `[Claude]` |
| 3 | M-1 | `_layout.tsx` L72, `customer/[id].tsx` L268 に `__DEV__` ガード追加 | `[Claude]` |
| 4 | M-8 | rakuten-search エラーログのサニタイズ | `[Claude]` |
| 5 | M-2 | placeholder ProGateReason にテスト専用コメント追加 | `[Claude]` |
| 6 | M-11 | CORS ヘッダー削除（ネイティブアプリには不要） | `[Claude]` |

**完了条件**: ISSUES.md MS1 の auto_gate / manual_gate 参照

---

## MS2: Edge Function セキュリティ基盤

> ISSUES.md 準拠 — H-4（Supabase Auth 導入）が最大の変更

| # | Issue | 内容 | 依存 | 担当 |
|---|-------|------|------|------|
| 1 | H-4 | Supabase Auth 導入 → anon key → ユーザー JWT | — | `[Both]` |
| 2 | M-7 | Edge Function デプロイ設定を IaC/CI 管理 | — | `[Claude]` |
| 3 | H-1 | AI 検索 server-side 日次制限（`auth.uid` ベース） | H-4 | `[Claude]` |
| 4 | M-6 | 楽天検索 server-side Free 回数制限 | H-4 | `[Claude]` |
| 5 | M-10 | IP 偽装耐性改善（`auth.uid` 主体化で補助対策に移行） | H-4 | `[Claude]` |

**完了条件**: ISSUES.md MS2 の auto_gate / manual_gate 参照

---

## MS3: ビジネス・Free Tier 最適化

> ISSUES.md 準拠 — 意思決定が必要な項目

| # | Issue | 内容 | 担当 |
|---|-------|------|------|
| 1 | H-2 | 書類の累計制限見直し（A:保持数制限 / B:引き上げ / C:月間制限） | `[Both]` |
| 2 | M-3 | テンプレート Pro 差別化（MODERN/CLASSIC/CONSTRUCTION → Pro 限定） | `[Both]` |
| 3 | M-4 | 顧客登録上限 3件 → 5件 に引き上げ | `[Claude]` |

**完了条件**: ISSUES.md MS3 の auto_gate / manual_gate 参照

---

## MS4: リリースインフラ & 外部サービス設定

> ISSUES.md 準拠 + 追加項目あり

### 4.1 アカウント登録（ISSUES.md 外）

- [ ] **Apple Developer Program 登録** `[Human]`
  - developer.apple.com で登録（$99/年）
  - App Store Connect でアプリ作成 → App ID 取得
  - C-2（EAS Submit 設定）の前提条件

- [ ] **Google Play Developer 登録** `[Human]`
  - play.google.com/console で登録（$25 一回）
  - アプリ作成 → サービスアカウント JSON 生成
  - C-2（EAS Submit 設定）の前提条件

### 4.2 ドメイン & ホスティング（ISSUES.md 外）

- [ ] **`genba-note.app` ドメイン取得** `[Human]`
- [ ] **静的ホスティング設定** `[Human]`
  - GitHub Pages / Vercel / Cloudflare Pages 等
  - C-1（利用規約・プライバシーポリシー URL）の前提条件

### 4.3 IAP 商品登録 & 価格設定（ISSUES.md 外）

- [ ] **サブスクリプション価格決定** `[Human]`
  - 月額・年額の価格設定（例: 月額 ¥480 / 年額 ¥4,800）
- [ ] **App Store Connect でサブスク商品作成** `[Human]`
  - 自動更新サブスクリプショングループ作成
  - 月額・年額プランを登録
- [ ] **Google Play Console でサブスク商品作成** `[Human]`
  - 定期購入アイテム登録
- [ ] **RevenueCat に商品を紐付け** `[Human]`
  - Entitlement `pro` に Apple/Google 商品をリンク
  - Offering 設定（monthly / annual パッケージ）

### 4.4 ISSUES.md 既存項目

| # | Issue | 内容 | 依存 | 担当 |
|---|-------|------|------|------|
| 1 | C-2 | EAS Submit 設定（Apple/Google ID 記入） | 4.1 完了 | `[Human]` |
| 2 | C-3 | RevenueCat 設定 + EAS Secrets | C-2, 4.3 完了 | `[Human]` |
| 3 | M-5 | Rakuten API RAKUTEN_APP_ID 登録確認 | — | `[Human]` |
| 4 | M-9 | Gemini API GEMINI_API_KEY 登録確認 | — | `[Human]` |
| 5 | M-12 | Sentry（クラッシュレポート）導入（Claude: 実装 / Human: DSN設定・受信確認） | — | `[Both]` |
| 6 | — | TestFlight / 内部テスト配信 | C-2, C-3 | `[Human]` |

**完了条件**: ISSUES.md MS4 の auto_gate / manual_gate 参照 + 上記追加項目のチェックボックス全完了

---

## MS5: ストア申請準備

> ISSUES.md MS5「ストア申請」の準備工程に対応 + 追加項目あり
> ※ ISSUES.md を同期更新済み: MS5 を「ストア申請準備」に限定、MS6（CI/CD）・MS7（最終検証 & 提出）を正式追加。

### 5.1 利用規約・プライバシーポリシー（ISSUES.md C-1 拡張）

- [ ] **プライバシーポリシー作成** `[Both]`
  - ローカルデータ保存（AsyncStorage, SecureStore）の説明
  - 外部送信データの開示:
    - RevenueCat: 購入情報（匿名 ID）
    - Gemini API: 検索クエリ（Google へ送信）
    - Rakuten API: 検索クエリ（楽天へ送信）
    - Sentry: クラッシュレポート（匿名）
  - サーバーにユーザーアカウント・個人データは保存しない旨
  - 個人情報保護法（日本）への準拠
- [ ] **利用規約作成** `[Both]`
  - 自動更新サブスクリプション条項（Apple/Google 必須要件）
  - 解約方法の説明
  - 見積書・請求書の金額精度に関する免責
- [ ] **URL 公開 & コード内 URL 差し替え** `[Both]`
  - `genba-note/app/paywall.tsx` の TODO URL を本番 URL に変更

### 5.2 App Privacy Labels — Apple（ISSUES.md 外）

- [ ] **データ収集の申告** `[Human]`
  - 収集するデータ:
    - 購入情報: サブスクリプション状態（RevenueCat 経由、ユーザーに紐付け）
    - 診断データ: クラッシュレポート（Sentry 経由、ユーザーに紐付けなし）
  - 収集しないデータ:
    - 連絡先情報、位置情報、ユーザーコンテンツ（全てローカル保存）

### 5.3 Data Safety — Google Play（ISSUES.md 外）

- [ ] **データセーフティフォーム記入** `[Human]`
  - データ暗号化（転送時）: はい（TLS）
  - データ削除リクエスト: 該当なし（サーバーにユーザーデータなし）
  - 共有するデータ: 購入情報（RevenueCat）、診断データ（Sentry）

### 5.4 メタデータ & スクリーンショット（ISSUES.md M-13 拡張）

- [ ] **スクリーンショット撮影** `[Human]`
  - iPhone 6.7"（必須）
  - iPhone 6.5"（必須）
  - iPad 12.9"（`supportsTablet: true` のため必須）
  - Android スマートフォン
  - 最低 5 枚: 書類一覧 → 書類作成 → PDF プレビュー → 課金画面 → 資材検索
- [ ] **説明文・キーワード作成** `[Both]`
  - 日本語・英語の両方を作成（ISSUES.md M-13 準拠）
  - キーワード候補: 見積書, 請求書, 建設業, 施工, 現場, 工事, PDF, 見積アプリ

### 5.5 審査リジェクト対策（ISSUES.md 外）

- [ ] **サブスク UI コンプライアンス確認** `[Both]`
  - Apple Guideline 3.1.2: 購入画面に価格・期間・解約方法を明記
  - `paywall.tsx` の訴求テキストが要件を満たしているか確認
- [ ] **審査用メモ準備** `[Both]`
  - アプリの機能説明（建設業向け見積書・請求書作成アプリ）
  - デモアカウント: 不要（ユーザー認証なし）
  - Pro 機能の説明（テンプレート・書類数・AI検索の制限解除）

**完了条件（MS5 = 準備完了まで。ストア提出は MS7 で実施）**:
- ISSUES.md MS5 の auto_gate（URL疎通・テスト・型検査）を満たすこと
- ISSUES.md MS5 の manual_gate（実機フロー確認）を満たすこと
- 上記追加項目のチェックボックス全完了

---

## MS6: CI/CD パイプライン（新規）

> ISSUES.md 同期済み — 必須フェーズ。MS1 と並行着手可能。
> MS7 の前提条件かつ最終ゲートに含まれるため必須。

### 6.1 GitHub Actions: テスト & 型検査

- [ ] **`.github/workflows/test.yml` 作成** `[Claude]`
  - トリガー: push to main, PR
  - ステップ: checkout → node setup → install → `npx tsc --noEmit` → `npx jest`
  - node_modules キャッシュ有効化

### 6.2 GitHub Actions: EAS ビルド

- [ ] **`.github/workflows/eas-build.yml` 作成** `[Claude]`
  - トリガー: タグ push（`v*`）
  - `expo-github-action` で EAS ビルド実行
  - production プロファイル使用

### 6.3 ブランチ保護ルール

- [ ] **main ブランチ保護設定** `[Human]`
  - PR レビュー必須
  - ステータスチェック（test workflow）パス必須

**完了条件**: ISSUES.md MS6 の auto_gate / manual_gate 参照
- auto_gate: `.github/workflows/test.yml` と `.github/workflows/eas-build.yml` がリポジトリに存在する
- manual_gate: PR 作成時に test workflow が自動実行され、パスすることを確認

---

## MS7: リリース前最終検証（新規）

> MS5, MS6 完了後に着手

### 7.1 OTA アップデート基盤 ⚠️ OBSOLETE（2026-04-26 M1/C13 で廃止）

> **方針変更**: M1 v1.0.1 で Option A を採択し OTA を無効化。`expo-updates` 依存は残置するが `app.json` の `updates` ブロックは削除済み。詳細は `M1_V1_0_1_RELEASE_FIXES.md` の B7 参照。
> 再導入する場合はプライバシー申告（privacy.html / store-metadata-ja.md / data-handling.tsx）の「Sentry のみ」記述も同時に更新すること。

- [~] **expo-updates インストール** `[Claude]` — OBSOLETE
  - 旧手順: `npx expo install expo-updates` + `app.json` に updates 設定
  - 現状: 依存は残置、updates 設定は削除済み（M1/C13）

### 7.2 本番ビルド

- [ ] **iOS / Android 本番ビルド** `[Human]`
  - `eas build --profile production --platform all`
  - ビルド成功を確認

### 7.3 サンドボックス課金テスト

- [ ] **iOS サンドボックステスト** `[Human]`
  - Apple Sandbox テスターアカウント作成
  - テスト項目: 月額購入 → 復元 → 解約 → 年額購入
  - RevenueCat ダッシュボードでイベント受信確認
- [ ] **Android テストトラック** `[Human]`
  - Google Play ライセンステスター設定
  - 同様のテスト項目を実施

### 7.4 TestFlight / 内部テスト配信

- [ ] **iOS: TestFlight 配信** `[Human]`
- [ ] **Android: 内部テストトラック配信** `[Human]`
- [ ] **実機フルフロー確認** `[Human]`
  - 書類作成 → 編集 → PDF プレビュー → PDF 共有
  - 顧客登録 → 写真添付
  - 資材検索（AI / 楽天）
  - 課金 → Pro 機能解放 → 復元
  - カレンダー（予定管理）
  - 収支管理
  - 設定（発行者情報・テンプレート選択・背景デザイン）

### 7.5 最終回帰テスト

- [ ] **自動テスト全パス** `[Claude]`
  - `cd genba-note && npx jest` → 0 failures
  - `cd genba-note && npx tsc --noEmit` → exit code 0
- [ ] **手動 E2E 確認** `[Human]`
  - 7.4 の実機フロー確認が問題なし

### 7.6 ストア提出

- [ ] **App Store 審査提出** `[Human]`
  - `eas submit --platform ios`
- [ ] **Play Store 審査提出** `[Human]`
  - `eas submit --platform android`
- [ ] **審査対応** `[Human]`
  - リジェクト時の修正・再提出（1〜3 回は想定）

---

## MS8: リリース後運用（新規）

> ストア公開後に継続的に実施

### 8.1 監視 & モニタリング

- [ ] **Sentry 監視開始** `[Human]`
  - クラッシュ率目標: < 1%
  - エラースパイクのアラート設定
  - 公開後 48 時間のクラッシュレポート確認

### 8.2 OTA アップデート運用 ⚠️ OBSOLETE（2026-04-26 M1/C13 で廃止）

> v1.0.1 以降は OTA を採用しない方針（M1_V1_0_1_RELEASE_FIXES.md B7 参照）。すべての更新は App Store/Play Store 審査経由で配信。

- [~] **OTA vs バイナリアップデートの判断基準を文書化** `[Both]` — OBSOLETE
  - OTA 対象: JS のみの変更（バグ修正、UI 微調整）
  - バイナリ対象: ネイティブモジュール変更、SDK アップデート
  - コマンド: `eas update --branch production`

### 8.3 ホットフィックスプロセス

- [ ] **緊急修正フロー文書化** `[Both]`
  1. ブランチ作成 → 修正 → テスト
  2. JS のみ → `eas update`（審査不要、即時反映）
  3. ネイティブ変更あり → `eas build` → `eas submit`（審査あり）

### 8.4 App Store Optimization (ASO)

- [ ] **キーワードランキング確認** `[Human]`
- [ ] **レビュー対応** `[Human]`
  - ストアレビューへの返信
  - フィードバックを v1.1 計画に反映
- [ ] **スクリーンショット A/B テスト**（データ蓄積後） `[Human]`

### 8.5 アナリティクス検討

- [ ] **分析基盤導入の検討** `[Both]`
  - 候補: Firebase Analytics / PostHog / expo-analytics
  - トラッキング対象: 書類作成数、PDF 出力数、課金コンバージョン率、検索利用頻度
  - プライバシーポリシーへの追記が必要
  - v1.1 での導入も可

### 8.6 v1.1 計画

- [ ] **ユーザーフィードバック収集** `[Human]`
- [ ] **機能優先度付け** `[Both]`
- [ ] **v1.1 ロードマップ作成** `[Both]`

---

## タイムライン概要（6〜8 週間）

```
Week 1:  MS1（クイックフィックス）+ MS6（CI/CD）+ MS4 開始（アカウント登録）
Week 2:  MS2（セキュリティ基盤 — H-4 が最大工数）+ MS4 続行（ドメイン, IAP）
Week 3:  MS2 完了 + MS3（ビジネス最適化）+ MS4 完了
Week 4:  MS5（法務文書, メタデータ, プライバシーラベル）
Week 5:  MS7（本番ビルド, 課金テスト, TestFlight）
Week 6:  MS7 継続（ストア審査提出）
Week 7-8: 審査バッファ（リジェクト対応 1〜3 回想定）→ 公開後 MS8 開始
```

### 並行トラック

| トラック | 担当 | 内容 |
|---------|------|------|
| A（コード） | `[Claude]` | MS1 → MS2 → MS3 → MS5 コード変更 → MS7 テスト |
| B（インフラ） | `[Human]` | MS4 アカウント登録 → IAP → MS5 法務 → MS7 実機テスト |
| C（CI/CD） | `[Claude]` | MS6（独立、Week 1 から着手可能） |

---

## 最終ゲートチェックリスト

ストア提出前に全て ✅ であること:

- [ ] `cd genba-note && npx jest` → 0 failures
- [ ] `cd genba-note && npx tsc --noEmit` → exit code 0
- [ ] `deno check supabase/functions/gemini-search/index.ts supabase/functions/rakuten-search/index.ts` → exit code 0
- [ ] EAS Submit 設定（`eas.json`）の全フィールドが非空
- [ ] RevenueCat で Pro Entitlement + Offering が設定済み
- [ ] サンドボックスで課金フロー（購入・復元・解約）が動作確認済み
- [ ] `https://genba-note.app/terms` → HTTP 200
- [ ] `https://genba-note.app/privacy` → HTTP 200
- [ ] App Privacy Labels（Apple）提出済み
- [ ] Data Safety（Google Play）提出済み
- [ ] Sentry でテストクラッシュイベント受信確認済み
- [ ] TestFlight / 内部テストで全主要フロー動作確認済み
- [ ] `.github/workflows/test.yml` がリポジトリに存在する（MS6）
- [ ] `.github/workflows/eas-build.yml` がリポジトリに存在する（MS6）
- [ ] PR 作成時に test workflow が自動実行・パスしている（MS6）
