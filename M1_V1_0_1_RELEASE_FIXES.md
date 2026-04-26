# M1 v1.0.1 リリース前 残タスク

> Phase 1 codex-review (arch) で検出された blocking / advisory の追跡
> 検出日: 2026-04-21（Codex exec session `019db6fe-2c70-79b0-b0e8-8256c24ab4ea`）
> 対応開始: 2026-04-23

## 背景

`refactor/m1-cleanup` ブランチ（main から +26 commits、139 files, +897/-16337）に対する
最終 codex-review Phase 1 (arch) で、コード本体の整合性は OK だが **公開ドキュメント** と
**アプリ内説明画面** に v1.0.1 完全無料化方針との矛盾が残存していることが判明。

ストアメタデータ (`docs/store-metadata-ja.md`) と実装 (`src/monitoring/sentryService.ts` 他) は
既に整合済み。残る不整合は下記 3 点 + 1 advisory。

## Blocking 3 件（リリース前に必ず修正）

### [B1] docs/privacy/index.html — プライバシーポリシー
- **場所**: `docs/privacy/index.html:100-156`
- **公開先**: https://genba-note.app/privacy (GitHub Pages)
- **問題**: 外部送信先に Supabase / RevenueCat / Gemini / 楽天 API を列挙中。v1.0.1 実装では Sentry のみ。三者（実装・ストアメタ・ポリシー）不整合
- **App Store 審査リスク**: プライバシーラベル整合性チェックでリジェクトされる可能性
- **対応**:
  - 施行日: 2026年3月1日 → 2026年4月23日
  - 2.2 外部サービス表: Sentry のみに縮小（Supabase/RevenueCat/Gemini/楽天の4行削除）
  - 6. 保持期間: Supabase / RevenueCat / 検索クエリ の項目削除
  - 7. データ削除: RevenueCat サブスク解約案内段落を削除
  - v1.0.1 での変更経緯を注記として追記
- **担当**: Claude 草案 → Yuma codex-review で検証

### [B2] docs/terms/index.html — 利用規約
- **場所**: `docs/terms/index.html:58-78`
- **公開先**: https://genba-note.app/terms (GitHub Pages)
- **問題**: 第3条（サブスクリプション）全体と第4条3号（AI資材検索免責）が v1.0.1 で存在しない機能を規定
- **対応**:
  - 施行日: 2026年3月1日 → 2026年4月23日
  - 第3条 全削除
  - 第4条3号 削除、残り項目の番号詰め
  - 第5〜9条を第4〜8条にリナンバリング
  - アプリ説明を「完全無料」に更新
- **担当**: Claude 草案 → Yuma codex-review で検証

### [B3] genba-note/app/data-handling.tsx — アプリ内データ取扱説明画面
- **場所**: `genba-note/app/data-handling.tsx:10-14`
- **問題**: 「外部サーバーへの送信機能はありません」と断定。実際は Sentry に crash report 送信あり
- **対応**: Sentry crash-only を明記した正確な文言に差し替え
- **担当**: Claude 判断で修正可（法的文言ではなく説明文）

## Advisory 1 件（今日 skip、M2 送り）

### [A1] src/storage/migrationRunner.ts — 旧 Pro SecureStore キー cleanup
- **場所**: `genba-note/src/storage/migrationRunner.ts:16-31`
- **問題**: v1.0.0 で保存された `entitlement_active` / `entitlement_expiration` / `last_verified_at` / `last_verified_uptime` が SecureStore に残存。現行コードは参照しないため app は壊れないが、dead data
- **対応方針**: M2 以降で v10 migration 追加（今日の v1.0.1 リリースは skip）
- **理由**: 親友のみ使用で影響最小、今日のリリース目標優先、破壊リスクなし

## iter 4 で追加検出された blocking 2 件（2026-04-26）

### [B8] SecureStore に書類別 issuer snapshot も保存される（公開記述漏れ）
- **場所**: `docs/privacy/index.html:87-90`、`genba-note/app/data-handling.tsx`
- **問題**: privacy 2.1 (b) と data-handling.tsx は SecureStore 保存対象を「現在の発行者設定値（invoiceNumber + bankAccount）」のみと書いていたが、実装では `secureStorageService.ts:169-245` が `issuer_snapshot_{documentId}` キーで書類別の機密スナップショットも保存している（`documentService.ts:131-167`、`types/document.ts:75-76,105-107`）
- **対応方針**: privacy 2.1 (b) と data-handling.tsx に「書類ごとの機密スナップショット（書類削除と連動して削除）」を追記
- **担当**: Claude 判断で修正可（実装事実のドキュメント整合）

### [B9] OTA 廃止が内部ドキュメントに反映されていない
- **場所**: `UNIMPLEMENTED.md:50,156,173-177,510`、`RODOAPPU.md:240-245,306-317`、`ISSUES.md:360`
- **問題**: B7 で OTA を廃止したが、これらの内部計画ドキュメントには旧前提（OTA 導入予定 / 完了）が残存。repo 全体で Option A 一貫性が未達
- **対応方針**: 各該当箇所に OBSOLETE マーカー + M1_V1_0_1_RELEASE_FIXES.md B7 への参照を追記。本格的な書き直しは M2 以降
- **担当**: Claude 判断で修正可（履歴文書の obsolete 化）

## iter 3 で追加検出された blocking 2 件（2026-04-26）

### [B6] 画像ファイルの保存先記述が AsyncStorage と混在
- **場所**: `docs/privacy/index.html:83-94, 133-136`、`genba-note/app/data-handling.tsx`
- **問題**: privacy 2.1 (a) AsyncStorage に「印影画像」を含めていたが、実装では AsyncStorage に保存されるのは URI/メタデータのみで、画像ファイル本体は `Paths.document/{seal_images,background_images,...}` 配下（アプリ専用ディレクトリ）に保存される（`genba-note/src/utils/imageUtils.ts:91-99,124-131,316-325,464-473`）。同じ粒度のずれが「作業写真」にも発生
- **対応方針**: AsyncStorage = 「設定/URI/写真メタデータ」、アプリ専用ディレクトリ = 「印影画像・背景画像・顧客写真・領収書写真の実ファイル」と粒度を揃える
- **担当**: Claude 判断で修正可（実装事実のドキュメント整合）

### [B7] Expo Updates (OTA) の通信が公開文言で未開示
- **場所**: `genba-note/app.json:59-62`（`updates.enabled: true`）、ストア申告全般
- **問題**: 「外部通信は Sentry のみ」と公開しているが、`expo-updates` 経由で `u.expo.dev/...` への OTA 確認通信が発生する
- **決定（2026-04-26）: Option A — OTA を無効化**
  - 理由:
    1. 親友のみ運用で OTA の恩恵が小さい（24-48h の審査ロスは許容可）
    2. プライバシー申告がシンプル（「Sentry のみ」を維持できる）
    3. `update:preview` / `update:production` スクリプトは EAS environment 未設定で事実上動作していなかった
    4. runtime コード（src/, app/）に `expo-updates` 参照ゼロ → 無効化しても挙動変化なし
  - 実装変更:
    - `app.json` の `updates` ブロック削除
    - `runtimeVersion` は EAS Build で使用するため残す
    - `eas.json` の `preview` / `production` 内 `channel` 削除（OTA 無効化で inert）
    - `package.json` の `update:preview` / `update:production` スクリプト削除
    - `expo-updates` パッケージ依存は残す（peer で管理、削除リスクあり）
  - 文書側は変更なし（「Sentry のみ」が引き続き正確）
- **担当**: Claude 判断で実装＆修正

## iter 2 で追加検出された blocking 2 件（2026-04-24）

### [B4] Sentry 送信スコープと公開文言の不整合
- **場所**: `genba-note/app/_layout.tsx:107-124`（ErrorBoundary の `handleErrorBoundaryError` が `captureException` で Sentry 送信）
- **問題**: ErrorBoundary は React render error を捕捉してフォールバック UI を表示する（＝アプリは終了しない）。しかし privacy / data-handling / store metadata は「クラッシュレポートのみ」と明記していた
- **決定**: 実装は維持（エラー観測性を失わないため）、公開文言を「予期しないエラー／エラーレポート」に広げる方向で統一
- **修正対象**: privacy.html 2.2 / 6 / 7、data-handling.tsx のセクション名＋本文、store-metadata-ja.md の説明・プライバシーラベル・Review Notes・Google Play データセーフティ

### [B5] プライバシーポリシーの SecureStore 記述が実装と不整合
- **場所**: `docs/privacy/index.html:84-85,124-125`
- **問題**: 発行者情報（社名、住所、電話番号、メール等）を SecureStore に保存すると記載していたが、実装（`settingsPersistenceService.ts:118-129,147-158`、`types/settings.ts:95-109`）では AsyncStorage に保存されており、SecureStore に入るのは **適格請求書発行事業者番号（invoiceNumber）** と **銀行口座情報（bankAccount）** のみ
- **修正対象**: privacy.html 2.1 をストレージ種別で (a)通常 / (b)セキュア / (c)アプリ専用ディレクトリ の3分割に書き直し、4. を同粒度の概要に更新。data-handling.tsx の「機密情報の扱い」セクションも同様に実装整合

## リリース手順（修正後）

1. [B1] [B2] [B3] [B4] [B5] 修正
2. arch review iter 3 で修正内容を検証（blocker 解消）
3. Phase 2 codex-review (diff) で残差確認
4. Phase 3 cross-check で全体整合性確認
5. すべて ok:true 後、commit
6. PR `refactor/m1-cleanup` → `main`
7. EAS build production iOS + submit v1.0.1
