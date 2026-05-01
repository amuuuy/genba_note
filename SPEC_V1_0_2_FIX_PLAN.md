# v1.0.2 SPEC 修正計画 (codex-review 反復ログ)

**起案日:** 2026-04-29
**目的:** SPEC_V1_0_2.md の codex-review 反復履歴と各 iter で受けた blocking / advisory の解消ログ。SPEC 確定後の実装フェーズでも振り返り資料として利用。
**関連ファイル:** `SPEC_V1_0_2.md`（仕様本体）

---

## 反復履歴サマリ

| iter | 結果 | blocking | advisory | 主な指摘 |
|---|---|---|---|---|
| iter 1 | ❌ ok:false | 5 | 0 | freeText データモデル未定義 / 1px 不変が現行 DOM と不整合 / 経路別保存方針未定義 / preview 二重実装 / テスト戦略不足 |
| iter 2 | ❌ ok:false | 2 | 3 | §5.2 テンプレデフォルト暫定値 / shared HTML generation path 不在 / parity test 正規化対象 / 性能 SLO 二重化 / convert 無言リセット |
| iter 3 | ❌ ok:false | 2 | 1 | preview.tsx 再利用部品でない / §7.1 ファイル過不足（migrationRunner / previewDataValidator） / §3.4 サンプル API 不一致 |
| iter 4 | ❌ ok:false | 6 | 1 | §4.1 schema 場所誤記 / hook 契約不足 / convert partial override 不足 / プリセット 2 つ同一 / 新規時 UX 未定義 / useDocumentEdit 漏れ / 文言残存 |
| iter 5 | ❌ ok:false | 2 | 1 | hook 契約に PreviewOrientation 不一致 + sealSize 等の preview 可変依存抜け / legacy データの null 正規化点が SPEC に落ちてない / convert テスト期待値の fixture 由来表現 |
| iter 6 | ✅ **ok:true** | 0 | 2 | hook signature 拡張・読込正規化・fixture 由来テスト全 OK。advisory 2 件は文言整合（同セッションで清掃済） |

---

## iter 1 指摘と対応（v1 → v2）

### Blocking 1: `freeText` データモデル未定義
**Codex 指摘**: 位置情報だけ追加するが本文フィールド（`Document.freeText`）が存在しない。入力 UI / hidden semantics / serialize / rollback test が未定義。
**対応 (v2)**: `freeText` ブロックを v1.0.2 から削除。可動ブロックは **3 種**（振込口座 / 印影 / 備考）に絞る。`freeText` は v1.0.3 送り（§13）。

### Blocking 2: 6 マス独立配置で 1px 不変は実現困難
**Codex 指摘**: 現行 6 テンプレで bank/seal/notes は独立ブロックではなく info-block / issuer-block 内に内包。6 マス分解では現行 DOM・余白・行送りを再現できない。
**対応 (v2)**: §5 を新設し、テンプレ別 DOM 抽出マッピング + §5.4 pixel diff 検証手順を SPEC に追加。

### Blocking 3: 保存方針が「更新」だけ定義
**Codex 指摘**: createDocument / duplicateDocument / convertEstimateToInvoice / rollback resave の挙動が未定義。schema version は `@genba_schemaVersion` と `AppSettings.schemaVersion` の 2 系統で曖昧。
**対応 (v2)**: §3.3 に各経路の挙動を表で明記。§4.1 で 2 系統の schema version を明示。

### Blocking 4: preview 二重実装リスク
**Codex 指摘**: 既に `app/document/preview.tsx` が WebView + `generateHtmlTemplate({mode:'pdf'})` を使用中。SPEC の `.html` 前提で別経路を作ると二重化。
**対応 (v2)**: §6.3 で既存 `preview.tsx` 経路を source of truth として再利用する方針に変更。

### Blocking 5: テスト戦略不足
**Codex 指摘**: 単一ブロック前提、multi-block / invalid enum / rollback resave / duplicate / convert / parity が抜けてる。
**対応 (v2)**: §8 を Tier 1/2/3 + migration / rollback / duplicate / convert / preview-print parity に強化。

---

## iter 2 指摘と対応（v2 → v3）

### Blocking 1: §5.2 default 配置が暫定値
**Codex 指摘**: 「実装で確定」のままで SPEC で固定されてない。`SIMPLE` の `companyStamp = hidden` 暫定値は現行実装と矛盾。
**対応 (v3)**: codex に 6 テンプレ実 DOM 監査を依頼 → 全 6 × 3 = 18 セル確定値を §5.2 に埋め込み。テンプレ別 rationale も追加。

**確定値（codex 監査結果）**:
| | 振込口座 | 印影 | 備考 |
|---|---|---|---|
| FORMAL | top-center | top-right | bottom-center |
| ACCOUNTING | top-center | top-right | bottom-center |
| SIMPLE | top-center | top-right | bottom-center |
| MODERN | bottom-center | top-right | bottom-center |
| CLASSIC | top-center | top-right | bottom-center |
| CONSTRUCTION | bottom-center | top-right | bottom-center |

**観察**: 印影は全テンプレ `top-right`、備考は全テンプレ `bottom-center` で統一。振込口座のみ 4:2 で分かれる。

### Blocking 2: shared HTML generation path 不在
**Codex 指摘**: §7.1 影響箇所が `pdfGenerationService.ts` と `preview.tsx` だけで、共通経路 `generateHtmlTemplate()` 内で resolver を呼ぶ shared path 設計が SPEC 上繋がってない。print に反映されて preview に反映されない実装分岐リスク。
**対応 (v3)**: §3.4 / §3.4.1 / §6.3 / §7.1 を `generateHtmlTemplate()` 内で `resolveBlockPlacements()` を呼ぶ shared path に書き換え。`PdfTemplateInput.blockPlacements`（解決前）と `TemplateOptions.blockPlacements`（解決済み）の役割分担を表で明記。`src/pdf/pdfTemplateService.ts` を §7.1 に追加。

### Advisory: parity test 正規化対象不明確
**対応 (v3)**: §8.5 で正規化対象 5 種（CSP / viewport / landscape CSS / single-page CSS / single-page script）を表で明文化、`normalizeForParity()` ヘルパ仕様を確定。

### Advisory: 性能目標 100ms / 200ms 二重化
**対応 (v3)**: 200ms 統一、測定条件（production build + Hermes + iPhone 14 Pro 以上 / 5 サンプル中央値）追加。

### Advisory: convert 無言リセット
**対応 (v3)**: §3.3 に Alert 通知追記（後に v4 で UX 改修により override コピーに方針変更、v5 で full resolve copy に進化）。

---

## iter 3 指摘と対応（v3 → v4）

### Blocking 1: preview.tsx は再利用可能な部品ではない
**Codex 指摘**: 画面コンポーネント全体（route params / settings / sensitiveSnapshot 解決 / CSP / display HTML 生成）。BlockPlacementModal から埋め込めない。
**対応 (v4)**: `src/hooks/useDocumentPreviewHtml.ts` を新設して shared hook 抽出方針に変更。preview.tsx と BlockPlacementModal 両方で使う設計。

### Blocking 2: §7.1 ファイル過不足
**Codex 指摘**: `CURRENT_SCHEMA_VERSION` の場所が `src/utils/constants.ts` 誤記、実は `src/storage/migrationRunner.ts`。`src/utils/previewDataValidator.ts` 漏れ。
**対応 (v4)**: §7.1 を訂正し追加。

### Advisory: §3.4 サンプル API 不一致
**Codex 指摘**: `generateHtmlTemplate()` は string ではなく `PdfTemplateResult` 戻り値、`resolveTemplateId(doc.type, rawTemplateId)` 形式、`TemplateOptions` 所在は `src/pdf/templates/templateRegistry.ts`。
**対応 (v4)**: 「擬似コード」と注記、本文に実 API シグネチャを追記。

---

## iter 3 → iter 4 ユーザーファースト改修（Yuma 指示）

`/Users/yuma/genba-note-build/SPEC_V1_0_2.md` を「親友がストレスなく使える」観点で見直し：

| 改修ポイント | Before | After |
|---|---|---|
| モーダル UI | 6 マス × 3 ブロック いきなり | プリセット 3 ボタン + 詳細設定で 6 マス（二段階 UX） |
| convert 時挙動 | null リセット + Alert | override コピー（無言で引き継ぎ） |
| ボタン構成 | 適用 / デフォルト / 閉じる の 3 ボタン | × 閉じるのみ、変更は即保存、「最初の配置に戻す」リンク |
| ネーミング | カスタマイズ / デフォルト | 見た目を整える / 最初の配置 |

§3.6 で 3 種プリセット（🏗 建設業らしい / 💰 振込先を目立たせる / ✨ シンプル）を新設。

---

## iter 4 指摘と対応（v4 → v5）

### Blocking 1: §4.1 schema 場所が再び誤記
**Codex 指摘**: §4.1 で `src/utils/constants.ts` のままだった（私の v4 直し忘れ、§7.1 のみ修正）。
**対応 (v5)**: §4.1 を `src/storage/migrationRunner.ts` に統一、文言検索で他箇所もクリーンアップ。

### Blocking 2: useDocumentPreviewHtml hook 契約不足
**Codex 指摘**: 現行 preview.tsx は previewData parsing / TemplatePickerModal / PDF 共有用 documentWithTotals/sensitiveSnapshot を持つ。SPEC の hook signature `documentId/templateId/blockPlacementsOverride/orientation` のみでは責務が取り切れない。
**対応 (v5)**: codex に Q1 を相談 → C: hybrid hook 推奨。signature を discriminated union source 対応に拡張。

```typescript
useDocumentPreviewHtml({
  source: { kind: 'documentId'; documentId: string }
        | { kind: 'previewDocument'; document: Document },
  templateIdOverride?: DocumentTemplateId,
  blockPlacementsOverride?: BlockPlacements | null,
  orientation?: 'portrait' | 'landscape',
}) => { webViewHtml, resolvedDocumentWithTotals, sensitiveSnapshot, isLoading, error }
```

責務境界:
- hook 内: 書類読み込み・依存解決・HTML 生成・WebView 用加工
- preview.tsx / BlockPlacementModal 側: TemplatePickerModal の visible state、共有実行 state、モーダル開閉

### Blocking 3: convert 時の partial override copy で template default 差を吸収できない
**Codex 指摘**: estimate template default = `FORMAL_STANDARD`、invoice = `ACCOUNTING` で異なる。partial override コピーすると override してないブロックは別 default が適用され、見た目が変わる。
**対応 (v5)**: codex に Q2 を相談 → A: full resolve copy 推奨。

```typescript
// 新仕様: convertEstimateToInvoice() 内
const sourceTemplateId = resolveTemplateId('estimate', settings.defaultEstimateTemplateId);
const resolved = resolveBlockPlacements(estimate.blockPlacements, sourceTemplateId);
invoice.blockPlacements = resolved; // 解決済み 3 ブロックを full override として保存
```

§8.4 のテスト期待値も「null → null」から「null → full resolve」に書き換え。

### Blocking 4: プリセット 2 つが同じ placements
**Codex 指摘**: 「建設業らしい」と「振込先を目立たせる」が両方 `{ bankAccount: 'top-center', companyStamp: 'top-right', remarks: 'bottom-center' }`。「目立たせる」の「大きく」は placement モデルでは表現不可。
**対応 (v5)**: codex に Q3 を相談 → C: 位置で完全差別化推奨。

```typescript
classic   = { bankAccount: 'top-center',    companyStamp: 'top-right', remarks: 'bottom-center' }
bankFocus = { bankAccount: 'bottom-center', companyStamp: 'top-right', remarks: 'top-left'      }  // 振込先を金額付近、備考を上部に押し上げ
minimal   = { bankAccount: 'hidden',        companyStamp: 'top-right', remarks: 'bottom-center' }
```

説明文も placement-based に修正（「大きく」など size を示唆する表現を排除）。

### Blocking 5: 新規未保存書類での即保存 UX 未定義
**Codex 指摘**: `id='new'` で `updateDocument` 呼べない。
**対応 (v5)**: codex に Q4 を相談 → A: disabled 推奨。§6.7.1 で「`documentId` 未確定時は『見た目』ボタン disabled + ヒント表示」を明記。ローカル永続は v1.0.2 非スコープ。

### Blocking 6: §7.1 に useDocumentEdit.ts 不足、preview.tsx refactor 規模過小評価
**対応 (v5)**: §7.1 に `src/hooks/useDocumentEdit.ts` を追加、`app/document/preview.tsx` の refactor 注釈を追加（責務分解を伴う）。合計 26 ファイル化。

### Advisory: 「デフォルトに戻す」残存表現
**対応 (v5)**: 全箇所検索 → 「最初の配置に戻す」に統一。

### 追加: UpdateDocumentInput.blockPlacements の tri-state
**Codex 推奨**: reset と no-op が衝突しないよう 3 状態を明示。
**対応 (v5)**: §3.3.1 を新設。

| 値 | 意味 |
|---|---|
| `undefined` | 変更なし |
| `null` | 最初の配置に戻す |
| object | 設定 |

---

## v1 → v5 の主要設計変更まとめ

| 項目 | v1 | v5 確定 |
|---|---|---|
| 可動ブロック | 4 種（含む freeText） | **3 種**（振込口座 / 印影 / 備考） |
| プリセット | なし | **3 種**（🏗 / 💰 / ✨）位置で完全差別化 |
| テンプレデフォルト | 暫定値 | **codex 監査確定値**（18 セル） |
| 保存方針 | 部分的 | **各経路の挙動を表で明記**、`UpdateDocumentInput` tri-state |
| convert 時 | 未定義 → null リセット → override コピー | **full resolve copy**（template default 差吸収） |
| preview 統合 | 独自経路 | **shared hybrid hook**（discriminated union source、責務境界明確） |
| 新規時 UX | 未定義 | **disabled + ヒント**、ローカル永続は非スコープ |
| プレビュー方式 | 別経路 | **既存 `generateHtmlTemplate({mode:'pdf'})` 再利用** |
| Schema | 単一 | **`@genba_schemaVersion` v9→v10** + `AppSettings.schemaVersion` 別系統 |
| Migration | 不明 | **no-op v10**（既存書類は触らない、lazy default） |
| テスト | 単純 snapshot | **Tier 1 (1px 不変 30 ケース) + Tier 2 (smoke 42 ケース) + Tier 3 (multi-block) + migration / rollback / duplicate / convert / parity** |
| 性能 SLO | 100ms / 200ms 二重 | **200ms 統一**、測定条件明記 |
| 影響ファイル | 16 ファイル | **26 ファイル**（large 規模） |

---

## 実装フェーズ計画（v5 確定）

| Phase | 内容 | ゲート |
|---|---|---|
| **P0** | SPEC レビュー（iter ok:true） | iter 5 結果次第 |
| **P1** | 型定義 + プリセット定数 + テンプレデフォルト table を §5.4 検証で確定 | pixel diff = 0 |
| **P2** | ドメイン拡張 + migration v10 + convert full resolve copy 実装 | unit test pass |
| **P3** | shared hook `useDocumentPreviewHtml` 抽出 + preview.tsx 責務分解 refactor | 既存挙動変化なし |
| **P4** | PDF 生成側更新（6 テンプレに grid ラッパー導入） | snapshot Tier 1 pass |
| **P5** | UI 実装（「見た目を整える」モーダル + プリセット 3 + 詳細設定 + プレビュー統合 + 新規時 disabled） | E2E + 親友タッチ&フィール |
| **P6** | テスト網羅 + codex-review iter | iter ok:true |
| **P7** | EAS Build → TestFlight 実機確認 → ASC 提出 | 提出完了 |

**合計 17 日**

---

## 親友フィードバック計画

P5 完了直後に TestFlight で実ユーザ（親友）に触ってもらう：
- プリセット 3 ボタンで完結できるか
- 「詳細設定」を開く必要があるか
- ネーミング（「見た目を整える」「最初の配置に戻す」「振込先を目立たせる」）が違和感ないか
- 新規時 disabled の振る舞いが理解できるか

フィードバックで重大な体験問題があれば P6 に反映してから提出。

---

## M2 残タスク同梱

v1.0.2 PR でクリーンアップ：
- EAS production env vars 削除（`EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_SUPABASE_URL`）
- `APP_STORE_SUBMISSION_TODO.md` を `_v1_0_0_ARCHIVE.md` にリネーム
- iPhone / iPad スクショの並び順最適化

---

## v1.0.3 以降の残課題

- **自由テキストブロック** (`Document.freeText` 新設、入力 UI、空状態、serialize/deserialize、rollback test)
- 6 → 9 プリセット拡張（3×3）の必要性検討
- 完全ドラッグ＆ドロップ
- 用紙サイズ変更（A4 / A3 / Letter）
- ユーザがプリセットを保存する機能（自分用テンプレ）
