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
