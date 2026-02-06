# GenBa Note 新機能実装計画（Milestone 16〜23）

## Context

GenBa Noteは建設業向けの書類管理アプリ（Expo SDK 54 + TypeScript + React Native 0.81）。
現在の実装状況:
- **スキーマバージョン: 6**（Milestone 1〜15完了）
- 実装済み機能: 見積書・請求書の作成/PDF出力/顧客管理/収支管理/施工ログ/単価マスタ
- テンプレート: 見積書用1種（FORMAL_STANDARD）、請求書用2種（ACCOUNTING / SIMPLE）
- タブ構成: 書類・単価表・顧客・収支・設定（5タブ）
- テスト: 60ファイル、TDD（RED→GREEN→REFACTOR）

ユーザー要望に基づき、PDF書類のカスタマイズ強化、業務管理機能（カンバン・カレンダー）を追加する。

**優先順位（ユーザー確認済み）:**
- Phase 1: PDF・書類系（Milestone 16〜21）
- Phase 2: カンバンボード + カレンダー（Milestone 22〜23）
- Phase 3: 商品リサーチ（後回し・本計画外）

---

## 依存関係グラフ

```
M16 ─┬──> M17（印鑑サイズ: SealSize型が必要）
     ├──> M18（プレビュー縦横: PreviewOrientation型が必要）
     ├──> M20（背景デザイン: BackgroundDesign型が必要）
     └──> M21（5種テンプレート: DocumentTemplateId型 + M17 + M20が前提）

M19（ファイル名変更: 完全独立、いつでも可）

M22（カンバン: 完全独立、いつでも可）
M23（カレンダー + v8: react-native-calendarsインストール必要、M22の後推奨）
```

**推奨実行順序:** M16 → M17 → M18 → M19 → M20 → M21 → M22 → M23

---

## Milestone 16: データモデル変更 & マイグレーション v7

### スコープ
PDF カスタマイズ機能に必要な型定義を追加し、マイグレーション v7 で AppSettings に新フィールドをデフォルト値で追加する。既存の `invoiceTemplateType` は後方互換性のため残存させつつ、見積用・請求書用それぞれのテンプレートID（`defaultEstimateTemplateId` / `defaultInvoiceTemplateId`）を導入する。

### 受入基準
1. `SealSize`, `BackgroundDesign`, `DocumentTemplateId`, `PreviewOrientation` 型が定義済み
2. `AppSettings` に `sealSize`, `backgroundDesign`, `defaultEstimateTemplateId`, `defaultInvoiceTemplateId` が追加済み
3. `invoiceTemplateType` は `@deprecated` JSDoc付きで残存（既存コードが壊れない）
4. マイグレーション v7 が既存 settings にデフォルト値を追加する
5. v7 が `invoiceTemplateType` を `defaultInvoiceTemplateId` にマッピング（ACCOUNTING→ACCOUNTING, SIMPLE→SIMPLE）
6. `mergeSettingsWithDefaults()` の `defaultInvoiceTemplateId` 処理: 値が未設定の場合は `invoiceTemplateType` から導出（フォールバック）。`defaultEstimateTemplateId` は 'FORMAL_STANDARD' をデフォルト
7. `CURRENT_SCHEMA_VERSION = 7` に更新
8. 既存テスト全パス + マイグレーションテスト追加
9. v6設定データ（`invoiceTemplateType`のみ保持）でも既存テンプレートが維持されるテストを含む

### 追加する型（pdf/types.ts）

```typescript
// 印鑑サイズ
type SealSize = 'SMALL' | 'MEDIUM' | 'LARGE';

// 印鑑サイズ → px値マッピング（テンプレートごとに異なる）
//
// | テンプレート           | SMALL | MEDIUM（現状維持） | LARGE |
// |------------------------|-------|--------------------|-------|
// | FORMAL_STANDARD        |  45px |  70px              | 100px |
// | ACCOUNTING             |  45px |  70px              | 100px |
// | SIMPLE                 |  30px |  50px              |  70px |
// | MODERN                 |  45px |  70px              | 100px |
// | CLASSIC                |  45px |  70px              | 100px |
//
// 解決関数: getSealSizePx(sealSize: SealSize, templateId: DocumentTemplateId): number

// 背景デザイン（CSS パターン、画像不要）
type BackgroundDesign = 'NONE' | 'STRIPE' | 'WAVE' | 'GRID' | 'DOTS';

// テンプレートID（5種類）
type DocumentTemplateId = 'FORMAL_STANDARD' | 'ACCOUNTING' | 'SIMPLE' | 'MODERN' | 'CLASSIC';

// プレビュー向き
type PreviewOrientation = 'PORTRAIT' | 'LANDSCAPE';
```

### AppSettings 追加フィールド
- `sealSize: SealSize` (default: `'MEDIUM'`)
- `backgroundDesign: BackgroundDesign` (default: `'NONE'`)
- `defaultEstimateTemplateId: DocumentTemplateId` (default: `'FORMAL_STANDARD'`) — 見積書用テンプレート
- `defaultInvoiceTemplateId: DocumentTemplateId` (default: `'ACCOUNTING'`) — 請求書用テンプレート（現行デフォルトと一致）

### PdfTemplateInput 拡張方針
テンプレートへのカスタマイズ値受け渡しは `PdfTemplateInput` を段階的に拡張する:
```typescript
interface PdfTemplateInput {
  // ...既存フィールド...
  templateId?: DocumentTemplateId; // M16で追加。PDF出力時のみ使用（screenモードでは無視）
  sealSize?: SealSize;           // M17で追加
  backgroundDesign?: BackgroundDesign; // M20で追加
}
```

### テンプレートID伝搬設計（PDF生成パイプライン）
```
AppSettings → pdfGenerationService → PdfTemplateInput → generateHtmlTemplate → templateRegistry
```
1. `pdfGenerationService.generateAndSharePdf()` が `getSettings()` から `defaultEstimateTemplateId` / `defaultInvoiceTemplateId` を読込
2. `resolveTemplateId(doc.type, rawId)` で正規化（未知ID→安全なデフォルト）
3. `PdfTemplateInput.templateId` にセット
4. `generateHtmlTemplate()` 内で `mode === 'pdf'` かつ `templateId` が指定済みなら `templateRegistry` 経由で生成
5. `mode === 'screen'` の場合は従来通りの `generateScreenTemplate()` を使用（`templateId` は無視）

### 後方互換性戦略
`invoiceTemplateType` フィールドは `AppSettings` に残存させる。

**mergeSettingsWithDefaults() の処理:**
- `defaultEstimateTemplateId`: 未設定なら `'FORMAL_STANDARD'`（新フィールド、デフォルト埋め安全）
- `defaultInvoiceTemplateId`: 未設定の場合は `invoiceTemplateType` から導出（ACCOUNTING→ACCOUNTING, SIMPLE→SIMPLE）。`invoiceTemplateType` も未設定なら `'ACCOUNTING'`

**PDF生成時のテンプレートID取得:**
```typescript
const templateId = doc.type === 'estimate'
  ? settings.defaultEstimateTemplateId
  : settings.defaultInvoiceTemplateId;
```

これにより:
- v6→v7マイグレーション失敗時: `mergeSettingsWithDefaults()`が`invoiceTemplateType`からフォールバック
- 新規インストール: 見積=FORMAL_STANDARD、請求=ACCOUNTING（現行動作と一致）
- 既存ユーザー: v7マイグレーションで`invoiceTemplateType`の値が`defaultInvoiceTemplateId`にコピー

### テンプレート適用範囲
**テンプレート選択はPDF出力時のみ適用される。** プレビュー画面（`preview.tsx`）は現行のscreenモード（カラフル表示）を維持し、テンプレートIDによる表示切替は行わない。これは意図的な設計判断であり、プレビューは「内容確認」、PDFは「正式書類」として役割を分離する。

### ロールバック
v7 はフィールド追加のみ（既存データの変更・削除なし）。失敗時は既存の `migrationRunner.ts` のread-onlyモードが有効化され、データ破損を防止する。

### 新規ファイル
- `genba-note/src/storage/migrations/v7-add-pdf-customization.ts`
- `genba-note/__tests__/storage/migrations/v7-add-pdf-customization.test.ts`

### 変更ファイル
- `genba-note/src/pdf/types.ts` — 新型追加 + `getSealSizePx()` 関数 + `PdfTemplateInput` に `templateId?: DocumentTemplateId` 追加
- `genba-note/src/types/settings.ts` — AppSettings拡張 + DEFAULT_APP_SETTINGS更新
- `genba-note/src/storage/asyncStorageService.ts` — `mergeSettingsWithDefaults()` 更新
- `genba-note/src/storage/migrationRunner.ts` — `CURRENT_SCHEMA_VERSION = 7`
- `genba-note/src/storage/migrations/index.ts` — v7 登録

### TDD
- **RED:** v7マイグレーションが新フィールドを追加するテスト、ACCOUNTING/SIMPLEマッピングテスト、invoiceTemplateType未設定時のデフォルトテスト
- **GREEN:** マイグレーション実装
- **REFACTOR:** 共通マイグレーションパターン抽出（必要に応じて）

### 検証
- `npm test` 全パス
- マイグレーションテストで before/after 状態を確認

---

## Milestone 17: 印鑑サイズ選択（大・中・小）

### スコープ
設定画面に「印鑑サイズ」セクション（SMALL/MEDIUM/LARGE ラジオ3択）を追加。全PDFテンプレートが `getSealSizePx()` で算出した動的px値を使用する。

### 依存: M16（SealSize 型、AppSettings フィールド）

### 受入基準
1. 設定画面に「印鑑サイズ」ラジオボタン3択が表示される
2. 各テンプレートが `getSealSizePx()` の返却値に基づいてCSSを生成する
3. MEDIUM選択時の表示が現行と完全一致（見積書=70px、請求書ACCOUNTING=70px、請求書SIMPLE=50px）
4. `getSealSizePx()` の全組み合わせがテスト済み

### 新規ファイル
- `genba-note/src/components/settings/SealSizeSection.tsx` — ラジオ3択UI（`InvoiceTemplateSection` パターン踏襲）
- `genba-note/__tests__/pdf/sealSize.test.ts` — `getSealSizePx()` + CSS注入テスト

### 変更ファイル
- `genba-note/src/pdf/types.ts` — `getSealSizePx()` 関数追加（M16で型のみ定義した場合）
- `genba-note/src/pdf/pdfTemplateService.ts` — `sealSize` パラメータ受取、`.seal-image` / `.issuer-seal` CSSを動的注入（見積書formal: L1528付近、請求書SIMPLE: L1044付近）
- `genba-note/src/pdf/invoiceAccountingTemplate.ts` — `sealSize` パラメータ受取、`.seal-image` CSS動的注入（L470付近）
- `genba-note/src/pdf/pdfGenerationService.ts` — settings から `sealSize` 読込 → テンプレートへ渡す
- `genba-note/app/(tabs)/settings.tsx` — `SealSizeSection` 追加
- `genba-note/src/hooks/useSettingsEdit.ts` — `UPDATE_SEAL_SIZE` アクション追加
- `genba-note/src/domain/settings/types.ts` — `SettingsFormValues` に `sealSize` 追加

### TDD
- **RED:** `getSealSizePx('SMALL', 'FORMAL_STANDARD')` = 45、`getSealSizePx('MEDIUM', 'SIMPLE')` = 50、生成HTMLの `.seal-image` が正しいpx値を含む
- **GREEN:** 関数実装 + CSS注入
- **REFACTOR:** テンプレート間で共通化できるCSS生成を抽出

### 検証
- `npm test` 全パス
- iOSシミュレータ: 各サイズ × 見積書/請求書 のPDFプレビューで印鑑サイズが正しく表示

---

## Milestone 18: プレビュー縦横切替

### スコープ
書類プレビュー画面に縦/横切替トグルボタンを追加。横向き時はCSS `@page { size: A4 landscape }` を適用し、PDF出力時は A4横寸法（842×595pt）を指定する。

### 依存: M16（PreviewOrientation 型定義）

### 受入基準
1. プレビュー画面に縦⇔横の切替アイコンボタンがある
2. 横向き切替でHTMLに `@page { size: A4 landscape }` が注入される
3. 横向きPDF出力が `Print.printToFileAsync({ width: 842, height: 595 })` で A4横サイズになる
4. デフォルトは縦向き（現行動作と同一）
5. WebView内のコンテンツが横向きで適切に表示される

### expo-print WebKit互換性の注意
`@page { size: landscape }` のWebKit対応は環境依存。以下の検証手順で動作確認が必須:
1. 横向きPDFを生成しページ寸法（842×595pt）を確認
2. `@page` が効かない場合は `printToFileAsync` の `width/height` のみで制御（CSSはフォールバック）

### 新規ファイル
- `genba-note/src/components/document/OrientationToggle.tsx` — アイコンボタン（縦⇔横切替）

### 変更ファイル
- `genba-note/app/document/preview.tsx` — orientation state追加、CSS注入、ボタンバーにトグル追加
- `genba-note/src/pdf/pdfGenerationService.ts` — `orientation?: PreviewOrientation` パラメータ追加、横向き時の`printToFileAsync`引数変更

### TDD
- **RED:** 横向きCSS文字列に `@page { size: A4 landscape }` が含まれるテスト、縦向きには含まれないテスト
- **GREEN:** CSS注入実装
- **REFACTOR:** なし（シンプルな機能）

### 検証
- `npm test` 全パス
- iOSシミュレータ: 縦↔横トグルで表示確認 + 横向きPDF出力でA4横寸法を確認

---

## Milestone 19: PDFファイル名変更

### スコープ
「PDFで共有」ボタン押下時にファイル名編集モーダルを表示し、ユーザーがPDFファイル名をカスタマイズできるようにする。

### 依存: なし（独立機能）

### 受入基準
1. 「PDFで共有」ボタンでファイル名編集モーダルが表示される
2. デフォルト名は現行パターン（`{documentNo}_{見積書|請求書}`）でプリセット
3. ファイル名サニタイズ: `/\?*<>|":` 除去、100文字制限、空時はデフォルト名にフォールバック。`.pdf` 拡張子は自動付与（入力に含まれれば維持、なければ追加）
4. `sanitizeFilename()` は純関数でテスト済み（拡張子維持テスト含む）
5. カスタム名でPDFが共有される
6. 同名ファイル衝突なし（毎回一時ディレクトリに新規生成→リネーム→共有→削除のライフサイクル）

### 新規ファイル
- `genba-note/src/components/document/FilenameEditModal.tsx` — TextInput付きモーダル
- `genba-note/src/utils/filenameUtils.ts` — `sanitizeFilename()` ユーティリティ
- `genba-note/__tests__/utils/filenameUtils.test.ts`

### 変更ファイル
- `genba-note/src/pdf/pdfGenerationService.ts` — `options?: { customFilename?: string }` 追加、PDF生成後 `FileSystem.moveAsync()` でリネームしてからシェア
- `genba-note/app/document/preview.tsx` — 共有ボタン押下→FilenameEditModal表示→確定後に `generateAndSharePdf` 呼出

### 実装方針
`expo-print` の `printToFileAsync` はファイル名指定不可（ランダム名で一時ディレクトリに生成）。手順:
1. `printToFileAsync()` でPDF生成（一時パス）
2. `FileSystem.moveAsync({ from: tempUri, to: newUri })` でリネーム
3. `Sharing.shareAsync(newUri)` で共有
4. 共有後に `FileSystem.deleteAsync(newUri)` でクリーンアップ

### TDD
- **RED:** `sanitizeFilename('test/file:name')` = `'testfilename.pdf'`、`sanitizeFilename('')` = デフォルト名（`.pdf`付き）、`sanitizeFilename('a'.repeat(200))` = 100文字（`.pdf`付き）、`sanitizeFilename('report.pdf')` = `'report.pdf'`（拡張子維持）、`sanitizeFilename('report')` = `'report.pdf'`（拡張子自動付与）
- **GREEN:** サニタイズ関数実装
- **REFACTOR:** なし

### 検証
- `npm test` 全パス
- iOSシミュレータ: カスタムファイル名でPDF共有し、受信側でファイル名を確認

---

## Milestone 20: 書類背景デザイン

### スコープ
PDFに純CSS背景パターン（STRIPE/WAVE/GRID/DOTS + NONE）を適用する機能。設定画面にプレビュー付き選択UIを追加。

### 依存: M16（BackgroundDesign 型、AppSettings フィールド）

### 受入基準
1. 設定画面に「背景デザイン」セクション（プレビュー付きグリッド選択）が表示される
2. 各パターンが純CSS（base64画像不使用）で生成される
3. 背景は `body::before` + `position: fixed` + `z-index: -1` で適用
4. NONE選択時は背景なし（現行動作と同一）
5. expo-print WebKit で正常に描画される（手動検証必須）
6. テキストの可読性を阻害しない（控えめなデザイン）

### expo-print WebKit CSS互換性
以下のCSSプロパティは WebKit で安定動作確認済み:
- `repeating-linear-gradient` — 安全
- `radial-gradient` — 安全
- `position: fixed` + `z-index: -1` — 印刷コンテキストで安全
- `::before` 疑似要素 — 安全

**使用禁止**: `conic-gradient`（部分対応）、`backdrop-filter`（印刷非対応）、CSS Houdini

### 4つのCSSパターン（+ NONE）
- **STRIPE:** `repeating-linear-gradient(45deg, ...)` 斜めストライプ
- **WAVE:** `radial-gradient` ベースの波模様
- **GRID:** `linear-gradient` の細かいグリッド
- **DOTS:** `radial-gradient` のドットパターン

### 新規ファイル
- `genba-note/src/pdf/backgroundDesigns.ts` — 純CSS背景パターン生成関数
- `genba-note/src/components/settings/BackgroundDesignSection.tsx` — プレビュー付きグリッド選択
- `genba-note/__tests__/pdf/backgroundDesigns.test.ts`

### 変更ファイル
- `genba-note/src/pdf/pdfTemplateService.ts` — `backgroundDesign` パラメータ受取、背景CSSをHTMLに注入
- `genba-note/src/pdf/invoiceAccountingTemplate.ts` — 同上
- `genba-note/src/pdf/pdfGenerationService.ts` — settings から `backgroundDesign` 読込
- `genba-note/app/(tabs)/settings.tsx` — `BackgroundDesignSection` 追加
- `genba-note/src/hooks/useSettingsEdit.ts` — `UPDATE_BACKGROUND_DESIGN` アクション追加
- `genba-note/src/domain/settings/types.ts` — `SettingsFormValues` に `backgroundDesign` 追加

### TDD
- **RED:** `getBackgroundCss('NONE')` = 空文字列、`getBackgroundCss('STRIPE')` に `repeating-linear-gradient` が含まれる、全5パターンが有効なCSSを生成
- **GREEN:** CSS生成関数実装
- **REFACTOR:** パターンの透明度定数を抽出

### 検証
- `npm test` 全パス
- iOSシミュレータ: 各パターンをプレビューWebViewで表示確認
- 横向き + 背景パターンの組み合わせテスト
- PDF出力で背景が正常に印刷されることを確認

---

## Milestone 21: 5種テンプレート

### スコープ
テンプレートレジストリを導入し、既存3テンプレート（FORMAL_STANDARD / ACCOUNTING / SIMPLE）を統一インターフェースで管理。新規2テンプレート（MODERN / CLASSIC）を追加。全5テンプレートが見積書・請求書の両方で動作するようにする。

### 依存: M16（DocumentTemplateId 型）、M17（sealSize 対応済み）、M20（backgroundDesign 対応済み）

### 受入基準
1. テンプレートレジストリが5テンプレートIDを管理
2. 全5テンプレートが `estimate` / `invoice` 両方で動作
3. テンプレート内で `doc.type` に応じて下記ラベルマッピングに従い全項目を切替
4. `InvoiceTemplateSection` が `TemplateSelectionSection`（見積用5択 + 請求用5択）に置換される
5. 設定は `defaultEstimateTemplateId` / `defaultInvoiceTemplateId` に保存される
6. 既存ドキュメントが正しく表示される（後方互換性）
7. MODERN / CLASSIC テンプレートが新規実装される
8. **セキュリティ**: 全テンプレートでユーザー入力は `escapeHtml()` でエスケープ必須。印鑑画像は `isValidImageDataUri()` で検証済みのもののみ許可。WebViewの `javaScriptEnabled={false}` を維持
9. **テンプレート適用範囲**: テンプレート選択はPDF出力時のみ。プレビューは現行screenモードを維持（M16で定義済みの設計判断）
10. **未知テンプレートID正規化**: ストレージ破損等で未知のテンプレートIDが入った場合、`resolveTemplateId(docType, rawId)` 正規化関数がdoc.typeに応じた安全な既定にフォールバックする（見積: FORMAL_STANDARD、請求: ACCOUNTING）。この関数は `pdfGenerationService` でのテンプレート取得前に必ず呼ばれる。テストで未知ID×doc.typeの2パターンを検証

### 見積書 / 請求書 ラベルマッピング（doc.type 分岐ルール）

全テンプレートは `doc.type` に応じて以下の項目を切替える:

| 項目 | 見積書 (`estimate`) | 請求書 (`invoice`) |
|---|---|---|
| **タイトル** | テンプレートごとに定義（上記テーブル参照） | テンプレートごとに定義（上記テーブル参照） |
| **発行日ラベル** | 見積日 | 請求日 |
| **番号ラベル** | 見積書番号 | 請求書番号 |
| **期限フィールド** | 見積有効期限（`validUntil`） | 支払期限（`dueDate`） |
| **挨拶文** | 「下記の通り御見積申し上げます」 | 「下記の通り御請求申し上げます」 |
| **銀行情報** | 非表示 | 表示（`sensitiveSnapshot` から読込） |
| **適格請求書番号** | 非表示 | 表示（`sensitiveSnapshot.invoiceNumber`） |

**実装方針**: 各テンプレートジェネレータ内で `doc.type === 'estimate'` を判定し、ラベル文字列・表示フィールド・表示/非表示セクションを分岐する。共通の分岐ロジックはユーティリティ関数（例: `getDocumentLabels(docType)`）として抽出し、全テンプレートで再利用する。

### テンプレートアーキテクチャ

**現状の問題:** 見積書と請求書は完全に異なるコードパスで生成される
- 見積書: `pdfTemplateService.ts` 内の `generateFormalPdfTemplate()` 内インラインテンプレート（L1344-1734）
- 請求書ACCOUNTING: `invoiceAccountingTemplate.ts` の `generateInvoiceAccountingTemplate()`
- 請求書SIMPLE: `pdfTemplateService.ts` 内の `generateInvoiceFormalTemplate()`

**改善:** テンプレートレジストリで統一
```typescript
type TemplateGenerator = (
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: { sealSize: SealSize; backgroundDesign: BackgroundDesign }
) => string;

// レジストリ: DocumentTemplateId → TemplateGenerator
const templateRegistry: Record<DocumentTemplateId, TemplateGenerator>;
```

既存の `generateFormalPdfTemplate()` のルーティングロジック（L1328-1341）をレジストリルックアップに置換する。

### 5テンプレートの特徴（各テンプレートは明確に異なるデザイン）

| ID | 名前 | 見積書タイトル | 請求書タイトル |
|---|---|---|---|
| FORMAL_STANDARD | フォーマル | 見　積　書 | 請　求　書 |
| ACCOUNTING | 会計帳票型 | 見　積　書 | 請　求　書 |
| SIMPLE | シンプル | 見　積　書 | 請　求　書 |
| MODERN | モダン | 見積書 | 請求書 |
| CLASSIC | 和風クラシック | 御見積書 | 御請求書 |

---

#### 1. FORMAL_STANDARD — 正統派ビジネス文書（既存・見積書テンプレ）

**差別化ポイント: 2カラムヘッダー + 印鑑がヘッダー横配置 + 点線区切りの合計テーブル**

- **配色**: 完全モノクロ（#333テキスト、#000ボーダー）。アクセントカラーなし
- **フォント**: ゴシック体、12px基準、タイトル26px letter-spacing: 0.3em
- **ヘッダー構造**: **2カラム**（左: 顧客名+住所+挨拶文、右: メタ情報+発行者+印鑑が横並び）
- **印鑑位置**: 発行者情報の右隣（flexbox横配置）— 他テンプレートにない配置
- **テーブル**: ヘッダー黒背景白文字、交互行#f5f5f5、下線ボーダー
- **合計セクション**: 右寄せテーブル形式、**行間は点線（dotted）ボーダー**、最終行は2px実線上下+#f5f5f5背景
- **備考欄**: グレー(#f0f0f0)ヘッダー + 1px solid #999枠
- **全体の印象**: オフィシャルで硬め。典型的な日本のビジネス見積書フォーマット

#### 2. ACCOUNTING — 会計帳票型（既存・請求書テンプレ）

**差別化ポイント: 黒ラベルブロック多用 + 2トーン合計ブロック + 税率別内訳表示**

- **配色**: モノクロ、**黒背景+白文字のラベルブロック**が随所（件名・支払期限・振込先・合計・備考）
- **フォント**: ゴシック体、**11px基準**（他より小さく情報密度が高い）
- **ヘッダー構造**: タイトル中央+右メタ → 発行者ブロック（右寄せ縦積み）→ 顧客名 → 挨拶文
- **印鑑位置**: TELの下（発行者情報の縦積み内）
- **情報ブロック**: 件名・支払期限・振込先を**黒ラベルテーブル**で表示（左セル黒背景、右セル白背景）
- **合計セクション**: **2トーンブロック**（左: 黒背景に白文字「合計」、右: 白背景に22px太字金額）、2px border
- **税率内訳**: 税率ごとの小計+消費税を右寄せテーブルで詳細表示
- **備考欄**: **黒ヘッダー**(#000背景)付きボックス、2px border — FORMAL_STANDARDのグレーヘッダーと異なる
- **全体の印象**: 会計事務所の帳票。情報密度が高く、黒ラベルで項目が強調される

#### 3. SIMPLE — シンプル・ミニマル（既存・請求書テンプレ）

**差別化ポイント: 印鑑が小さい(50px) + 情報ブロックは最小限 + ACCOUNTINGより軽い印象**

- **配色**: モノクロ、ACCOUNTINGと同じ黒ラベル構造だが**使用箇所が少ない**
- **フォント**: ゴシック体、12px基準（ACCOUNTINGの11pxより大きく読みやすい）
- **ヘッダー構造**: タイトル中央 → 2カラム（左:顧客、右:メタ+発行者縦積み）
- **印鑑位置**: TELの下、**50×50px**（他テンプレートの70pxより小さい）— SIMPLEの控えめさを象徴
- **情報ブロック**: 件名・支払期限・振込先の黒ラベルテーブル（ACCOUNTINGと同構造だが全体のトーンが軽い）
- **合計セクション**: ACCOUNTINGと同じ2トーンブロックだが、**税率別内訳表示なし**（合計のみ）
- **全体の印象**: ACCOUNTINGの簡易版。小規模事業者向け

#### 4. MODERN — モダン・クリーンデザイン（**新規**）

**差別化ポイント: アクセントカラー + ボーダーレステーブル + カード型セクション + 余白重視**

既存3テンプレートがすべてモノクロ・黒ボーダー中心なのに対し、MODERNは**色を使い、枠線を最小限にした現代的デザイン**。

- **配色**:
  - アクセントカラー: `#2563EB`（ブルー）— ページ左端に4pxの縦アクセントバー
  - テキスト: `#1F2937`（ダークグレー）
  - サブテキスト: `#6B7280`
  - セクション区切り: `#E5E7EB`（薄グレー線）
  - 合計背景: `#EFF6FF`（薄ブルー）
- **フォント**: ゴシック体、**13px基準**（既存より大きめ）、行間1.7（ゆったり）
- **ヘッダー構造**: **1カラムフロー**（上から順に: タイトル左寄せ → メタ情報 → 顧客 → 発行者）。2カラム分割なし
- **タイトル**: **左寄せ**、24px、letter-spacingなし、下にアクセントカラーの3px線。「見積書」「請求書」と全角スペースなし
- **印鑑位置**: 発行者セクション右端、70px
- **テーブル**:
  - **ヘッダー**: 背景なし（透明）、アクセントカラーのテキスト、太字、下線3px solid アクセントカラー
  - **行区切り**: 1px solid #E5E7EB（薄グレー、下線のみ）。垂直線なし
  - **交互行なし**（クリーンな白背景のみ）
  - **セル**: padding 12px 16px（他テンプレートより広い）
- **合計セクション**: **カード型**（角丸8px、`#EFF6FF`薄ブルー背景、ボーダーなし、padding 20px）。金額は24px太字アクセントカラー
- **情報ブロック**: 黒ラベルなし。ラベルはアクセントカラー小文字、値は通常テキスト。セクション間は32pxの余白で区切り
- **備考欄**: 枠なし。上に1px薄グレー線のみ。フォントは薄めグレー
- **印刷色再現（必須）**: expo-printのWebKitでは印刷時に背景色が省略される場合がある。すべてのカラー要素に `print-color-adjust: exact; -webkit-print-color-adjust: exact;` を適用する。左アクセントバーは `background-color` と `border-left` の両方で再現（WebKitが背景を落としてもボーダーは維持される）。合計カードも `border: 1px solid #BFDBFE` のフォールバックを追加し、背景色が消えても視覚的区切りが残るようにする
- **受入基準追加**: iOS/AndroidでPDF出力し、アクセントカラーが正しく表示されることを手動確認
- **全体の印象**: IT企業・デザイン事務所向け。余白が多く、色使いが洗練されている。既存テンプレートとは完全に異なるトーン

#### 5. CLASSIC — 和風クラシック（**新規**）

**差別化ポイント: 明朝体 + 二重罫線外枠 + 全セルボーダー格子 + 「以下余白」 + 御見積書**

既存テンプレートがすべてゴシック体なのに対し、CLASSICは**明朝体＋格子罫線の伝統的和風ビジネス文書**。

- **配色**: モノクロ（他のモノクロテンプレートとは罫線・フォントで差別化）
- **フォント**: **明朝体**（`'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif`）、11px基準
  - **フォント可用性戦略**: expo-printはOS搭載フォントに依存。iOSでは`Hiragino Mincho ProN`がプリインストール済みで確実に利用可能。Androidでは明朝体が未搭載の場合があるため、CSSフォントスタック `'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'Noto Serif JP', serif` で段階フォールバックする。一部Android端末でCJKセリフが欠落する可能性があるが、最終フォールバック `serif` がOS標準のゴシック系になっても和文テキストは表示される（豆腐化はしない）。`@font-face`でのフォント埋め込みはバイナリサイズ増大（1フォント2-5MB）のためPhase 1では行わず、Phase 2で需要があれば検討する。受入基準: iOS=Hiragino Mincho確認、Android=serifフォールバックで和文が正しく表示されることを確認（可能であれば複数OEMで検証）
- **ヘッダー構造**: タイトル中央 → 右寄せメタ → 2カラム（左:顧客 御中、右:発行者+印鑑縦積み）
- **タイトル**: **「御見積書」「御請求書」**（「御」付き）、24px、letter-spacing: 0.5em、下に**二重線**(border-bottom: double 3px #000)
- **印鑑位置**: 発行者情報の下、中央寄せ、70px。印鑑の周りに朱色(#C41E3A)の細い円枠（`border: 1px solid #C41E3A; border-radius: 50%; padding: 3px`）
- **外枠**: ページ全体に**二重罫線**（`border: double 4px #000`、padding内側に1pxの内枠も追加）
- **テーブル**:
  - **全セルにボーダー**（1px solid #333 の完全格子）— MODERNのボーダーレスと真逆
  - **ヘッダー**: 背景#f0f0f0（薄グレー）、明朝太字、全セルボーダー
  - **交互行なし**（格子がすでに視覚的区切りとなるため）
  - **「以下余白」行**: 明細の最後に空行を追加し「以下余白」と中央表示（日本の正式書類慣習）
- **合計セクション**: テーブル内に統合。合計行は**上に二重線**（border-top: double 3px #000）
- **情報ブロック**: シンプルなテーブル形式（全セルボーダー付き格子）。黒ラベルなし
- **備考欄**: 全体外枠に合わせた1px実線枠。タイトル行は#f0f0f0背景
- **「以下余白」**: 明細テーブルの最終行として自動挿入。伝統的な日本のビジネス文書の慣習を再現
- **全体の印象**: 官公庁・伝統的企業向け。格式が高く、フォーマルな和の雰囲気。MODERNとは対極のデザイン

---

#### デザイン差別化マトリクス

| 要素 | FORMAL_STANDARD | ACCOUNTING | SIMPLE | MODERN | CLASSIC |
|---|---|---|---|---|---|
| **フォント** | ゴシック 12px | ゴシック 11px | ゴシック 12px | ゴシック 13px | **明朝** 11px |
| **色** | モノクロ | モノクロ | モノクロ | **アクセントブルー** | モノクロ |
| **テーブル罫線** | 下線のみ | 下線のみ | 下線のみ | **罫線なし** | **全格子** |
| **ヘッダーBG** | #000(黒) | #000(黒) | #000(黒) | **透明**(色テキスト) | #f0f0f0(グレー) |
| **外枠** | なし | なし | なし | **左アクセントバー** | **二重罫線** |
| **合計表現** | 点線テーブル | 2トーンブロック | 2トーンブロック | **カード型**(角丸+色背景) | **二重線区切り** |
| **ラベル方式** | テキスト | **黒ラベル**(黒背景白文字) | 黒ラベル(少) | **色テキスト** | 格子テーブル |
| **印鑑サイズ** | 70px | 70px | **50px** | 70px | 70px+**朱円枠** |
| **印鑑位置** | **ヘッダー横** | 発行者下 | 発行者下 | 発行者右 | 発行者下**中央** |
| **余白** | 標準 | 詰め気味 | 標準 | **広め** | 詰め気味 |
| **「御」付き** | × | × | × | × | **○** |
| **「以下余白」** | × | × | × | × | **○** |
| **交互行色** | ○ | ○ | ○ | **×** | **×** |

### 後方互換性
`pdfGenerationService.ts` のテンプレート読込ロジック（M16で定義済み）:
```typescript
const templateId = doc.type === 'estimate'
  ? settings.defaultEstimateTemplateId   // default: 'FORMAL_STANDARD'
  : settings.defaultInvoiceTemplateId;   // default: 'ACCOUNTING'（invoiceTemplateTypeからフォールバック）
```
`invoiceTemplateType` しか持たない旧データでも `mergeSettingsWithDefaults()` が `defaultInvoiceTemplateId` を導出するため正しく動作する。

### 新規ファイル
- `genba-note/src/pdf/templates/templateRegistry.ts` — ID→生成関数マッピング
- `genba-note/src/pdf/templates/modernTemplate.ts` — MODERNテンプレート
- `genba-note/src/pdf/templates/classicTemplate.ts` — CLASSICテンプレート
- `genba-note/src/components/settings/TemplateSelectionSection.tsx` — 5テンプレート選択UI
- `genba-note/__tests__/pdf/templateRegistry.test.ts`
- `genba-note/__tests__/pdf/modernTemplate.test.ts`
- `genba-note/__tests__/pdf/classicTemplate.test.ts`

### 変更ファイル
- `genba-note/src/pdf/pdfTemplateService.ts` — `generateFormalPdfTemplate()` をレジストリ経由に変更、既存見積書テンプレートをFORMAL_STANDARDジェネレータとして抽出
- `genba-note/src/pdf/invoiceAccountingTemplate.ts` — 見積書対応（`doc.type` でタイトル・挨拶文・銀行情報表示を分岐）
- `genba-note/src/pdf/pdfGenerationService.ts` — `defaultEstimateTemplateId` / `defaultInvoiceTemplateId` を doc.type で分岐読込
- `genba-note/app/(tabs)/settings.tsx` — `InvoiceTemplateSection` → `TemplateSelectionSection` に置換（見積用・請求用それぞれの選択UI）
- `genba-note/src/hooks/useSettingsEdit.ts` — `UPDATE_DEFAULT_ESTIMATE_TEMPLATE_ID` / `UPDATE_DEFAULT_INVOICE_TEMPLATE_ID` アクション追加
- `genba-note/src/domain/settings/types.ts` — `SettingsFormValues` に `defaultEstimateTemplateId` / `defaultInvoiceTemplateId` 追加

### TDD
- **RED（レジストリ・共通）:**
  - `getTemplate('MODERN')` が関数を返す
  - `getTemplate('MODERN')(estimateDoc, null, opts)` がHTMLを返す
  - `resolveTemplateId('estimate', 'UNKNOWN')` → FORMAL_STANDARD
  - `resolveTemplateId('invoice', 'UNKNOWN')` → ACCOUNTING
  - 全5テンプレート×2doc.type=10パターンのHTML生成テスト
  - XSSテスト: `clientName`に`<script>`タグ含むdocでエスケープ確認
  - 不正印鑑URIが拒否されることを確認
- **RED（ラベル分岐 — 全5テンプレート共通）:**
  - ACCOUNTINGで見積書doc → タイトルが「見積書」かつラベルが「見積日」「見積書番号」「見積有効期限」
  - ACCOUNTINGで請求書doc → ラベルが「請求日」「支払期限」かつ銀行情報セクション存在
  - 見積書テンプレートで銀行情報が非表示
  - 全5テンプレート×estimate: `validUntil`表示、`dueDate`非表示
  - 全5テンプレート×invoice: `dueDate`表示、`validUntil`非表示
- **RED（既存3テンプレート差別化確認 — 回帰防止）:**
  - FORMAL_STANDARD: 合計セクションに `dotted` ボーダーが含まれる（点線）
  - FORMAL_STANDARD: ヘッダーが2カラム構造（`flex` or テーブル2列）
  - ACCOUNTING: HTMLに黒ラベルブロック（`background: #000; color: #fff`）が3箇所以上
  - ACCOUNTING: 税率別内訳テーブル（`tax-breakdown`）が存在
  - SIMPLE: 税率別内訳テーブルが**存在しない**（ACCOUNTINGとの差別化確認）
  - SIMPLE: 印鑑サイズが50px（`getSealSizePx('MEDIUM', 'SIMPLE')` = 50）
- **RED（MODERNデザイン固有）:**
  - MODERN HTMLに `#2563EB`（アクセントカラー）が含まれる
  - MODERN HTMLにテーブルヘッダー `background` が`#000`でないことを確認（透明ヘッダー）
  - MODERN HTMLに `border-radius: 8px` の合計カードが含まれる
  - MODERN HTMLに `font-family` が明朝体を含まないことを確認
  - MODERN HTMLに `print-color-adjust: exact` が含まれる（印刷色再現）
  - MODERN HTMLに `-webkit-print-color-adjust: exact` が含まれる（WebKit対応）
  - MODERN HTMLに合計カードの `border` フォールバックが含まれる
- **RED（CLASSICデザイン固有）:**
  - CLASSIC HTMLに `Hiragino Mincho` or `Yu Mincho`（明朝体）が含まれる
  - CLASSIC HTMLに `border: double`（二重罫線）が含まれる
  - CLASSIC 見積書HTMLに `御見積書` が含まれる（「御」付き）
  - CLASSIC 請求書HTMLに `御請求書` が含まれる
  - CLASSIC HTMLに `以下余白` が含まれる
  - CLASSIC HTMLにテーブルセルの完全格子ボーダーが含まれる
- **GREEN:** レジストリ + 新テンプレート実装
- **REFACTOR:** 共通CSS・共通セクションレンダラー抽出（`escapeHtml`/`isValidImageDataUri`の共有を含む）、`getDocumentLabels(docType)` ユーティリティ関数

### 検証
- `npm test` 全パス
- iOSシミュレータ: 5テンプレート × 見積書/請求書 = 10パターンのPDFプレビュー確認
- 既存保存済みドキュメントのプレビューが正常に表示されること

---

## Milestone 22: カンバンボード

### スコープ
書類一覧画面にリスト⇔カンバンの表示切替を追加。既存ステータス（draft/sent/paid/issued）の上にビューレイヤーとして実装。新ステータス追加なし。

### 依存: なし（完全独立。Phase 1と並行実施も可）

### 受入基準
1. 書類一覧画面にリスト/カンバン表示切替ボタンがある
2. カンバンは3カラム構成: 作業中(draft) / 送付済(sent) / 完了(paid, issued)
3. カードをドラッグ＆ドロップでカラム間移動できる（長押し300msで開始）
4. ドロップ時に既存 `statusTransitionService` 経由でステータス変更
5. 無効な遷移はカードがスナップバック（エラー表示）
6. ドメインロジック（カラム振分・遷移マッピング）は純関数でテスト済み

### カラム構成 & ステータス遷移マッピング

| カラム | 含むステータス | 色 |
|---|---|---|
| 作業中 | `draft` | グレー |
| 送付済/入金待ち | `sent` | オレンジ |
| 完了 | `paid`, `issued` | グリーン |

**ドロップ時のステータス遷移（`statusTransitionService` の制約に準拠）:**

| 元ステータス | ドロップ先 | 遷移先ステータス | 備考 |
|---|---|---|---|
| `draft` | 送付済 | `sent` | |
| `draft` | 完了 | `issued` | **draft→paidは禁止**。issuedに遷移 |
| `sent` | 作業中 | `draft` | 差戻し |
| `sent` | 完了 | `paid` | paidAt入力が必要（モーダル表示） |
| `paid` | 送付済 | `sent` | paidAt自動クリア |
| `issued` | 作業中 | `draft` | |

### react-native-gesture-handler 互換性
インストール済み: `"react-native-gesture-handler": "^2.30.0"`
`GestureHandlerRootView` は `app/(tabs)/index.tsx` (L17) で既に使用中。`PanGestureHandler` / `Gesture.Pan()` が利用可能。

### 新規ファイル
- `genba-note/src/types/kanban.ts` — KanbanColumn, KanbanColumnId 型
- `genba-note/src/domain/kanban/kanbanService.ts` — ドキュメント→カラム振分（純関数）
- `genba-note/src/domain/kanban/kanbanTransitionService.ts` — ドロップ先→ステータス遷移マッピング（`statusTransitionService` を内部利用）
- `genba-note/src/hooks/useKanbanBoard.ts` — カンバン状態管理フック
- `genba-note/src/components/kanban/KanbanBoard.tsx` — 横スクロールボード
- `genba-note/src/components/kanban/KanbanColumn.tsx` — カラム（FlatList）
- `genba-note/src/components/kanban/KanbanCard.tsx` — ドラッグ可能カード
- `genba-note/src/components/kanban/KanbanDragProvider.tsx` — ドラッグ状態Context
- `genba-note/__tests__/domain/kanban/kanbanService.test.ts`
- `genba-note/__tests__/domain/kanban/kanbanTransitionService.test.ts`

### 変更ファイル
- `genba-note/app/(tabs)/index.tsx` — リスト/カンバン表示切替state追加、条件付きレンダリング

### TDD
- **RED:** `getKanbanColumn('draft')` = `'working'`、`getKanbanColumn('paid')` = `'completed'`、`resolveDropTransition('draft', 'completed', 'estimate')` = `{ newStatus: 'issued' }`、`resolveDropTransition('draft', 'completed', 'invoice')` = `{ newStatus: 'issued' }`（draft→paid禁止のため）
- **GREEN:** マッピング関数実装
- **REFACTOR:** カラム定義を定数化

### 検証
- `npm test` 全パス
- iOSシミュレータ: カンバン表示切替、カラム内の書類表示確認
- D&D操作: draft→sent、sent→完了(paid)、draft→完了(issued) の各遷移確認
- 無効な遷移（paid→draft）でスナップバック確認

---

## Milestone 23: カレンダー + マイグレーション v8

### スコープ
新しい「予定」タブを追加（6タブ構成）。月表示カレンダー + 日付選択で予定一覧。独自イベント（CalendarEvent）+ 既存データからの仮想イベント（書類期限・作業ログ）を統合表示。`react-native-calendars` を新規インストール。

### 依存: M16完了（マイグレーションパターン確立後が望ましい）

### 受入基準
1. `react-native-calendars` がインストール済み
2. マイグレーション v8 が `CALENDAR_EVENTS` ストレージキーを初期化
3. 「予定」タブが6番目のタブとして表示される（`calendar-outline` アイコン）
4. 月表示カレンダーにイベントマーカーが表示される
5. 日付タップでその日のイベント一覧が表示される
6. CalendarEvent の作成/編集/削除が可能
7. 仮想イベント（書類期限・見積有効期限・作業ログ）がカレンダーに表示される
8. カレンダードメインロジック（集約サービス）がテスト済み

### 新ライブラリインストール手順
```bash
cd genba-note && npx expo install react-native-calendars
```

### マイグレーション v8
- `STORAGE_KEYS.CALENDAR_EVENTS` を追加（`'@genba_calendarEvents'`）
- CalendarEvent コレクション初期化（空配列 `[]`）
- `CURRENT_SCHEMA_VERSION = 8`

### ロールバック
v8 はストレージキー追加のみ。失敗時は read-only モードが有効化。既存データに影響なし。

### CalendarEvent 型
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  date: string;              // 'YYYY-MM-DD'
  startTime: string | null;  // 'HH:MM'（null=終日）
  endTime: string | null;
  type: 'appointment' | 'schedule';
  color: string;
  customerId: string | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}
```

### 仮想イベント（計算で生成、永続化しない）
| ソース | 条件 | マーカー色 |
|---|---|---|
| 請求書 `dueDate` | `dueDate` が非null | オレンジ |
| 見積書 `validUntil` | `validUntil` が非null | グレー |
| 作業ログ `workDate` | `WorkLogEntry` の日付 | パープル |

### 新規ファイル
- `genba-note/src/types/calendarEvent.ts`
- `genba-note/src/storage/calendarEventStorage.ts`
- `genba-note/src/storage/migrations/v8-add-calendar-events.ts`
- `genba-note/src/domain/calendar/calendarService.ts` — イベントCRUD
- `genba-note/src/domain/calendar/calendarAggregationService.ts` — 実イベント＋仮想イベント統合
- `genba-note/src/hooks/useCalendar.ts` — 月ナビゲーション、イベント読込
- `genba-note/src/hooks/useCalendarEventEdit.ts` — イベント作成/編集
- `genba-note/src/components/calendar/CalendarView.tsx` — メイン画面
- `genba-note/src/components/calendar/CalendarMonthView.tsx` — 月グリッド（react-native-calendars ラッパー）
- `genba-note/src/components/calendar/CalendarDayEvents.tsx` — 日のイベントリスト
- `genba-note/src/components/calendar/CalendarEventCard.tsx` — イベントカード
- `genba-note/src/components/calendar/CalendarEventEditModal.tsx` — 作成/編集フォーム
- `genba-note/app/(tabs)/calendar.tsx` — 新タブ画面
- `genba-note/__tests__/domain/calendar/calendarAggregationService.test.ts`
- `genba-note/__tests__/domain/calendar/calendarService.test.ts`
- `genba-note/__tests__/storage/calendarEventStorage.test.ts`
- `genba-note/__tests__/storage/migrations/v8-add-calendar-events.test.ts`

### 変更ファイル
- `genba-note/app/(tabs)/_layout.tsx` — 「予定」タブ追加（6番目、`calendar-outline` アイコン）
- `genba-note/src/utils/constants.ts` — `STORAGE_KEYS.CALENDAR_EVENTS` 追加
- `genba-note/src/storage/migrationRunner.ts` — `CURRENT_SCHEMA_VERSION = 8`
- `genba-note/src/storage/migrations/index.ts` — v8 登録

### TDD
- **RED:** `aggregateEvents(calendarEvents, documents, workLogs, '2026-02')` がマージリストを返す、仮想イベントが正しい色を持つ、v8マイグレーションが空配列を初期化
- **GREEN:** 集約サービス + マイグレーション実装
- **REFACTOR:** 日付範囲フィルタリングユーティリティを抽出

### 検証
- `npm test` 全パス
- iOSシミュレータ: 「予定」タブでカレンダー表示、月ナビゲーション確認
- イベント作成/編集/削除の動作確認
- 仮想イベント（既存書類の期限・作業ログ）のカレンダー表示確認
- 6タブ構成のタブバー表示確認

---

## Phase 3: 商品リサーチ（後回し）

API選定後に詳細計画。商品番号検索→価格比較→原価率ベース価格設定→単価リスト追加のフロー。

---

## テスト戦略（全体）

全機能TDD（RED→GREEN→REFACTOR）で実装。各Milestoneで:
1. **純関数の単体テスト**: テンプレート生成、サニタイズ、カラム振分、印鑑px算出等
2. **サービス層の統合テスト**: PDF生成、ステータス遷移、カレンダー集約
3. **既存テストの保護**: `npm test` 全パスを各Milestone完了条件に含む
4. **テストヘルパー活用**: 既存の `createTestDocument()` / `createTestDocumentWithTotals()` 等のファクトリ関数を再利用

## 検証方法（全体）

- `npm test` で全テストパス確認（各Milestone完了時）
- iOSシミュレータで各テンプレート × 見積書/請求書のPDF出力確認
- 背景CSSパターンが expo-print WebKit で正常描画されることを確認
- 横向きPDFのページ寸法確認（842×595pt）
- カンバンD&Dの操作感をシミュレータで確認
- カレンダーの月ナビ・イベント表示を確認
- 6タブ構成のタブバーUXを確認
