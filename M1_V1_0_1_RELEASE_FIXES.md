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

## リリース手順（修正後）

1. [B1] [B2] [B3] 修正
2. Phase 2 codex-review (diff) で修正内容を検証
3. Phase 3 cross-check で全体整合性確認
4. すべて ok:true 後、commit
5. PR `refactor/m1-cleanup` → `main`
6. EAS build production iOS + submit v1.0.1
