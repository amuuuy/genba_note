# ポチッと事務 v1.0.2 仕様書 — カスタマイズブロック配置

**バージョン:** 1.0.2 (確定版)
**起案日:** 2026-04-29
**最終更新:** 2026-04-30 (codex-review iter 6 で ok:true 達成、advisory 2 件清掃済)
**ステータス:** ✅ **SPEC レビューゲート通過、実装着手可能**
**前提:** v1.0.1 が App Store 審査通過後に着手（main HEAD = `ade80cf`、配信無料化済み）
**設計理念:** 親友ファースト（友達向けアプリ、操作の単純さ・親しみやすさ最優先）

---

## 0. 改訂履歴

### iter 1 → iter 2 の変更点
- **`freeText` ブロックを v1.0.2 から削除**（v1.0.3 送り）。可動ブロックは **振込口座 / 印影 / 備考** の 3 種に絞る
- §5 で **既存テンプレ別の DOM 抽出マッピング**を明記（1px 不変 AC を実現するため）
- §3 で **createDocument / duplicateDocument / convertEstimateToInvoice / rollback 各経路の挙動**を明示
- §4 で **`@genba_schemaVersion` (v10) と `AppSettings.schemaVersion` (変更なし) の 2 系統**を明示
- §6 で **既存 `app/document/preview.tsx` + `generateHtmlTemplate({mode:'pdf'})` 経路を source of truth として再利用**する方針に変更
- §8 でテスト戦略を強化（multi-block / invalid enum / rollback resave / duplicate / convert / preview-print parity）

### iter 2 → iter 3 の変更点
- **§5.2 のテンプレデフォルト table を 6 テンプレ実 DOM 監査に基づく確定値に置換**
- §3.4 / §6.3 / §7.1 を **shared path 設計**に変更（`generateHtmlTemplate()` 内で resolver 呼び出し）
- §7.1 影響箇所表に `src/pdf/pdfTemplateService.ts` を追加
- §8.5 で **parity test の正規化対象 5 種を明文化**
- §6.3 と §9 で**性能 SLO を 200ms に統一**

### iter 5 → iter 6 の変更点（iter 5 blocker 解消）
- **§6.3 hook signature 拡張**: `orientation` を `PreviewOrientation`（`PORTRAIT` / `LANDSCAPE` 大文字）に修正、`sealSizeOverride` / `backgroundDesignOverride` / `backgroundImageDataUrlOverride` を入力に追加（現行 preview.tsx の `templateDeps` を完全包含）
- **§4.2 読込正規化を明示**: `getAllDocuments()` で `undefined → null` 正規化を担う設計を追加。§7.1 に `src/storage/asyncStorageService.ts` 追加（`issuerSnapshot.email` 正規化と同レイヤで `blockPlacements` も）
- **§8.4 fixture 由来テスト**: convert テスト期待値を `FORMAL_STANDARD` 固定から fixture の `settings.defaultEstimateTemplateId` 由来に書き換え

### iter 4 → iter 5 の変更点（codex 推奨を全反映）
- **Q2 反映** (§3.3 表): convert 時を `full resolve copy` に変更（template default 差を吸収して見た目完全維持）
- **Q1 反映** (§6.3): hook を **hybrid** に。signature を discriminated union source 対応に拡張: `useDocumentPreviewHtml({ source: { kind: 'documentId', documentId } | { kind: 'previewDocument', document }, templateIdOverride?, blockPlacementsOverride?, orientation? })` → `{ webViewHtml, resolvedDocumentWithTotals, sensitiveSnapshot, isLoading, error }`
- **Q3 反映** (§3.6): 3 プリセットを位置で完全差別化（`classic` / `bankFocus` / `minimal` で実際に異なる placements）、説明文も placement-based に変更
- **Q4 反映** (§6.5 / §6.7): 新規未保存書類では「見た目」ボタン disabled、ローカル永続は v1.0.2 非スコープ
- **iter 3 blocker 残り対応**: §4.1 で `CURRENT_SCHEMA_VERSION` 場所を `src/storage/migrationRunner.ts` に修正（§7.1 と統一）
- **iter 4 advisory 反映**: §3.3 の「デフォルトに戻す」を「最初の配置に戻す」に統一、convert テスト期待値を `null -> null` から `full resolve` に更新
- **追加**: `UpdateDocumentInput.blockPlacements` の tri-state 仕様を §3.3.1 に明記 (`undefined=変更なし / null=最初の配置に戻す / object=設定`)
- **§7.1**: `src/hooks/useDocumentEdit.ts` 追加（edit screen state に blockPlacements 保持）

### iter 3 → iter 4 の変更点（ユーザーファースト改修 + iter 3 blocker 対応）
- **§3.6 を新設**: 3 種プリセット（**🏗 建設業らしい** / **💰 振込先を目立たせる** / **✨ シンプル**）を SPEC で確定
- **§3.3 表**: convert 時を `null` リセット → **override コピー** に変更（親友的に「見積で決めた配置は請求書でも使いたい」が自然）。Alert 通知は撤廃
- **§6.2 モーダル**: 上半分にプリセット 3 ボタン優先、下半分にプレビュー、「詳細設定」を tap で 6 マス開放（二段階 UX）
- **§6.4 適用フロー**: ボタン削減（× 閉じるのみ、変更は即保存）、「最初の配置に戻す」リンク
- **ネーミング刷新**: 「配置をカスタマイズ」→ **「見た目を整える」**、「デフォルトに戻す」→ **「最初の配置に戻す」**
- **§6.3 / §7.1 で iter 3 blocker 対応**:
  - **shared hook `useDocumentPreviewHtml`** を新設（`preview.tsx` と `BlockPlacementModal` で共用）
  - `CURRENT_SCHEMA_VERSION` 更新先を **`src/storage/migrationRunner.ts`** に訂正（`src/utils/constants.ts` ではない）
  - **`src/utils/previewDataValidator.ts`** を影響箇所に追加（`blockPlacements` 受け渡し対応）
  - §3.4 のサンプルコードを「**擬似コード**」と注記（実 API は `PdfTemplateResult` 戻り値、`resolveTemplateId(doc.type, rawTemplateId)` 形式、`TemplateOptions` は `templateRegistry.ts` 所在）

---

## 1. 目的・背景

v1.0.1 で 6 種類のテンプレートを提供しているが、**振込口座・印影・備考**の表示位置はテンプレで固定。親友（ユーザ）から「**書類の配置を変えられるようにしてほしい**」と直接要望あり（PIVOT_PLAN_v2.md §M3 参照）。

### 1.1 設計理念：親友ファースト

このアプリは友達向けアプリ。「自由度を上げる」ことより「迷わず使えて嬉しい体験」を優先する：
- ✨ **3 タップで完結する**: プリセットから 1 つ選ぶだけで終わる
- 🤝 **意図を尊重する**: 見積で決めた配置は請求書でも引き継ぐ
- 📱 **モバイル最優先**: ボタン少なく、タップターゲット大きく
- 💬 **言葉は親しみやすく**: 「カスタマイズ」より「見た目を整える」

完全自由ドラッグ＆ドロップは「見積書として体裁が崩れる」リスクが高いため、**プリセット 3 種 + 詳細設定の二段階 UX**で「自由 × 成立保証 × やさしさ」を両立する。

---

## 2. スコープ

### 2.1 v1.0.2 で対応する範囲

- 可動ブロック **3 種**: 振込口座 / 印影 / 備考
- プリセット位置 **6 択**: top/bottom × left/center/right
- 全 **6 テンプレ**で同じ仕組みを提供（FORMAL / ACCOUNTING / SIMPLE / MODERN / CLASSIC / CONSTRUCTION）
- 設定は**書類単位の override**（テンプレデフォルトに対する部分上書き）
- リアルタイムプレビューは**既存 `app/document/preview.tsx` 経路を再利用**

### 2.2 非スコープ（v1.0.3 以降に送る）

- **自由テキストブロック**（`Document.freeText` データモデル新設、入力 UI、空状態 policy が大規模なため別バージョンで対応）
- 完全ドラッグ＆ドロップによる任意座標配置
- 用紙サイズ変更（A4 固定維持）
- ロゴ画像のサイズ変更

---

## 3. データモデル

### 3.1 新規型

```typescript
// src/types/blockPlacement.ts
export type BlockKind = 'bankAccount' | 'companyStamp' | 'remarks';

export type BlockPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'hidden';

export type BlockPlacements = {
  bankAccount?: BlockPosition;
  companyStamp?: BlockPosition;
  remarks?: BlockPosition;
};
```

### 3.2 既存型の拡張

```typescript
// src/types/document.ts
export interface Document {
  // ... 既存プロパティ全部維持
  blockPlacements: BlockPlacements | null; // 新規、nullable
}

// src/types/template.ts (or 該当箇所)
export interface TemplateOptions {
  // ... 既存（sealSize, backgroundDesign, backgroundImageDataUrl 等）
  blockPlacements: Required<BlockPlacements>; // 解決後の値（必ず全 3 ブロック持つ）
}

// テンプレ定義側: 各テンプレ generator は内部で TEMPLATE_DEFAULT_BLOCK_PLACEMENTS を持つ
```

### 3.3 各操作経路での扱い（必読）

| 経路 | `blockPlacements` の扱い |
|---|---|
| **createDocument** | `null` で初期化 → テンプレデフォルトを適用 |
| **duplicateDocument** | **同種書類なら override をそのままコピー**（`null` も `null` のまま）。issuer は再取得するが配置は引き継ぐ |
| **convertEstimateToInvoice** | **Full resolve copy**（見積の解決済み 3 ブロック配置を full override として請求書に保存）。理由: estimate と invoice で template default が違うため（`FORMAL_STANDARD` vs `ACCOUNTING`）、partial override コピーだと見た目がズレる。full resolve することで「見積で整えた見た目が請求書でも完全に維持」される。実装: `sourceTemplateId = resolveTemplateId('estimate', settings.defaultEstimateTemplateId)` → `resolved = resolveBlockPlacements(estimate.blockPlacements, sourceTemplateId)` → `invoice.blockPlacements = resolved`。estimate が `null` でも convert 後は full override を持つ |
| **updateDocument**（ユーザが UI で変更） | 部分 override を merge。例: 印影だけ変更 → `{ companyStamp: 'bottom-left' }` を保存、他は null のまま（テンプレデフォルト継承） |
| **「最初の配置に戻す」リンク** | `blockPlacements = null` に戻す |
| **v1.0.2 で書いた書類を v1.0.1 で読む（ロールバック）** | v1.0.1 は `blockPlacements` フィールドを知らない → JSON deserialize で無視される。書類は壊れない。**書類を v1.0.1 で再保存すると `blockPlacements` フィールドは消える**（再度 v1.0.2 で開いた時テンプレデフォルトに戻る）。ユーザにはこの挙動を「ダウングレード時は配置がデフォルトに戻る」として alert 表示は出さない（仕様上許容） |

### 3.3.1 UpdateDocumentInput.blockPlacements の tri-state

`updateDocument()` の入力で reset と no-op が衝突しないよう、3 状態を明示する：

| 値 | 意味 |
|---|---|
| `undefined`（プロパティ自体が無い） | **変更なし**（既存の値を維持） |
| `null` | **「最初の配置に戻す」**（テンプレデフォルトに戻す） |
| `BlockPlacements` オブジェクト | **設定**（部分または全 override を保存） |

```typescript
// src/domain/document/documentService.ts （現行 UpdateDocumentInput 定義の所在）
export interface UpdateDocumentInput {
  // ... 既存フィールド
  blockPlacements?: BlockPlacements | null;  // tri-state: undefined / null / object
}
```

### 3.4 配置解決ロジック（shared path に集約）

iter 2 指摘を反映し、**resolver は `src/pdf/pdfTemplateService.ts` の `generateHtmlTemplate()` 内で 1 回だけ呼ぶ**。preview / print 両経路がこの shared path を経由するため、解決ロジックを caller 側に複製しない。

> ⚠️ **以下は擬似コード**：実 API シグネチャは `generateHtmlTemplate(): PdfTemplateResult`、`resolveTemplateId(doc.type, rawTemplateId)` 形式、`TemplateOptions` は `src/pdf/templates/templateRegistry.ts` 所在。実装時は §7.1 のファイルパスを正とする。

```typescript
// src/pdf/pdfTemplateService.ts （擬似コード）
function resolveBlockPlacements(
  raw: BlockPlacements | null | undefined,
  templateId: DocumentTemplateId
): Required<BlockPlacements> {
  const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[templateId];
  const override = raw ?? {};
  return {
    bankAccount: safePosition(override.bankAccount, templateDefault.bankAccount),
    companyStamp: safePosition(override.companyStamp, templateDefault.companyStamp),
    remarks: safePosition(override.remarks, templateDefault.remarks),
  };
}

// generateHtmlTemplate 内（擬似）
// 実コードでは PdfTemplateResult を返し、resolveTemplateId(doc.type, raw) 等の引数形式
export function generateHtmlTemplate(input: PdfTemplateInput): PdfTemplateResult {
  const resolvedId = resolveTemplateId(input.document.type, input.templateId);
  const resolvedBlockPlacements = resolveBlockPlacements(
    input.blockPlacements ?? input.document?.blockPlacements,
    resolvedId
  );
  const generator = getTemplate(resolvedId);
  return generator(input.document, input.sensitiveSnapshot, {
    sealSize: input.sealSize,
    backgroundDesign: input.backgroundDesign,
    backgroundImageDataUrl: input.backgroundImageDataUrl,
    blockPlacements: resolvedBlockPlacements, // Required<BlockPlacements>
  });
}
```

### 3.4.1 PdfTemplateInput / TemplateOptions の役割分担

| 型 | フィールド | 値 |
|---|---|---|
| `PdfTemplateInput` | `blockPlacements?: BlockPlacements \| null` | **解決前** の override（preview の未保存変更 or 保存済 Document の値）。nullable |
| `TemplateOptions` | `blockPlacements: Required<BlockPlacements>` | **解決済み** の値。template generator が直接使う。必ず全 3 ブロック持つ |

caller（`preview.tsx` / `pdfGenerationService.ts`）は generator を直接呼ばず、必ず `generateHtmlTemplate()` を経由する。これにより resolver の重複実装を防ぐ。

### 3.5 invalid enum の取扱い

将来テンプレ追加で position 列挙が拡張された場合、古いアプリで未知の position を読むと defensive fallback：

```typescript
function safePosition(p: string | undefined, fallback: BlockPosition): BlockPosition {
  const valid: BlockPosition[] = ['top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right', 'hidden'];
  return valid.includes(p as BlockPosition) ? (p as BlockPosition) : fallback;
}
```

### 3.6 プリセット定義（親友ファースト UX の核）

ユーザは 6 マスを 3 ブロック分（合計 18 セル）から選ぶのではなく、**3 つのおすすめプリセットから 1 つを選ぶ**だけで配置決定できる。これが標準フロー。「もっと細かく」したい人だけが詳細設定（6 マス × 3 ブロック）に進む。

```typescript
// src/pdf/blockPlacementPresets.ts (新設)
export type BlockPlacementPresetId = 'classic' | 'bankFocus' | 'minimal';

export interface BlockPlacementPreset {
  id: BlockPlacementPresetId;
  emoji: string;
  label: string;       // 親しみやすい日本語
  description: string; // ひと言説明（モーダルで表示）
  placements: Required<BlockPlacements>;
}

export const BLOCK_PLACEMENT_PRESETS: BlockPlacementPreset[] = [
  {
    id: 'classic',
    emoji: '🏗',
    label: '建設業らしい',
    description: '振込先は中央上、印影は右上、備考は下中央。建設業の定番レイアウト',
    placements: { bankAccount: 'top-center', companyStamp: 'top-right', remarks: 'bottom-center' },
  },
  {
    id: 'bankFocus',
    emoji: '💰',
    label: '振込先を目立たせる',
    description: '振込先を請求金額の近く（下中央）に配置。入金を促したい時に気づいてもらえる',
    placements: { bankAccount: 'bottom-center', companyStamp: 'top-right', remarks: 'top-left' },
  },
  {
    id: 'minimal',
    emoji: '✨',
    label: 'シンプル',
    description: '振込先を非表示にして、見た目をすっきり整える',
    placements: { bankAccount: 'hidden', companyStamp: 'top-right', remarks: 'bottom-center' },
  },
];
```

#### プリセットの位置による差別化

| | classic（🏗 建設業らしい） | bankFocus（💰 振込先を目立たせる） | minimal（✨ シンプル） |
|---|---|---|---|
| **振込先** | 上中央 | **下中央**（請求金額の近く） | **非表示** |
| **印影** | 右上 | 右上 | 右上 |
| **備考** | 下中央 | **左上**（金額表に被らないよう移動） | 下中央 |

3 プリセット全てが**異なる位置構成**を持つ。「目立たせる」「シンプル」は placement モデル内で表現可能（サイズ変更や枠強調などモデル外の差別化は使わない）。

#### プリセット選択時の挙動

- 1 つ選ぶと、3 ブロック全部の配置が一括で書類に保存される（書類の `blockPlacements` に partial override として書き込み）
- プリセットを選んだ後でも、詳細設定で個別ブロック調整可能（プリセットからの逸脱が自動的に「カスタム」状態として表示される）

#### v1.0.3 以降の検討事項

- ユーザがプリセットを保存する機能（自分用テンプレ）
- プリセット数の追加（業種別に 5〜7 種類など）

---

## 4. 後方互換性

### 4.1 スキーマバージョン

- **`@genba_schemaVersion`**: v9 → **v10** にインクリメント
  - 場所: **`src/storage/migrationRunner.ts`** の `CURRENT_SCHEMA_VERSION`（`src/utils/constants.ts` ではない、iter 3 指摘の修正点）
  - 対応 migration: `src/storage/migrations/v10-add-block-placements.ts`（**no-op、既存書類に変更を加えない**）
- **`AppSettings.schemaVersion`**: 1 のまま **変更なし**（用途別の独立バージョン管理。Document の構造変化と無関係）

### 4.2 v10 migration ロジック + 読込時の正規化

migration は no-op（既存書類の永続データを書き換えない）だが、**読込時に `undefined → null` 正規化を保証する**ことで以降の経路（duplicate / update / preview / convert）で `null` セマンティクスが一貫する。

```typescript
// v10-add-block-placements.ts
export const v10AddBlockPlacements: Migration = {
  fromVersion: 9,
  toVersion: 10,
  description: 'Add blockPlacements field to Document (no-op, normalization is at read time)',
  migrate: async () => {
    // intentionally empty: documents with missing blockPlacements are
    // normalized to null at read time in asyncStorageService.getAllDocuments()
    return successResult(undefined);
  },
};
```

#### 読込正規化（必須、§7.1 で `asyncStorageService.ts` を影響箇所に追加）

```typescript
// src/storage/asyncStorageService.ts （既存 getAllDocuments() に正規化を追加）
export async function getAllDocuments(): Promise<StorageResult<Document[]>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (data === null) return successResult([]);
    const documents = (JSON.parse(data) as Document[]).map((doc) => ({
      ...doc,
      issuerSnapshot: { ...doc.issuerSnapshot, email: doc.issuerSnapshot?.email ?? null },
      blockPlacements: doc.blockPlacements ?? null, // ← 新規: undefined → null 正規化
    }));
    return successResult(documents);
  } catch { /* ... */ }
}
```

`getDocumentById()`、`validatePreviewDocument()`（`src/utils/previewDataValidator.ts` の現行公開 API）等の他 read 経路でも同様の `?? null` 正規化を施す。これにより SPEC 全体で「書類は `blockPlacements: BlockPlacements | null`」セマンティクスが守られる。

### 4.3 ダウングレード時の挙動

- v10 → v9 ダウングレード（v10 アプリで保存 → v9 アプリで読む）
- v9 アプリは `blockPlacements` フィールドを知らない → JSON deserialize で**サイレント無視**
- 書類は壊れない、ただし v9 で再保存すると `blockPlacements` フィールドが落ちる
- これを **既知の制約として SPEC に明記**、ユーザ向けには「v1.0.2 → v1.0.1 にダウングレードすると配置がデフォルトに戻る」を docs/設定 FAQ に書く

### 4.4 既存書類の見た目不変保証

§5 のテンプレデフォルトを **v1.0.1 の現行 DOM 構造と完全一致**するように定義することで、`blockPlacements: null` の既存書類は v1.0.2 で 1 ピクセルも変わらない。

詳細は §5 のマッピング表参照。

---

## 5. テンプレ別の現行 DOM 抽出マッピング（1px 不変保証の核）

iter 1 で指摘された「6 マス独立配置で v1.0.1 と一致しない」問題への解。**既存 DOM 構造を 6 マスに分解する際の正確な対応**を全 6 テンプレについて定義する。

### 5.1 共通方針

- 既存テンプレで「振込口座 / 印影 / 備考」が物理的にレンダされる位置を、最も近い 6 プリセットの 1 つにマップする
- 「物理位置」のみマップ、内部 DOM 構造（CSS class / margin / line-height）は**変更しない**
- 配置プリセットは**外側ラッパー div の Grid 配置**で表現する：
  ```html
  <div class="layout-grid">
    <div class="cell-top-left">{{...}}</div>
    <div class="cell-top-center">{{...}}</div>
    ...
    <div class="cell-bottom-right">{{...}}</div>
  </div>
  ```
- 既存の `renderInfoBlock()`, `renderIssuerBlock()`, `renderNotesSection()` の内部実装は**そのまま流用**、外側ラッパーだけ追加

### 5.2 各テンプレの defaultBlockPlacements（codex 6 テンプレ DOM 監査による確定値）

iter 2 指摘を反映し、**SPEC 段階で確定**。codex が `src/pdf/templates/*.ts` および `src/pdf/invoiceAccountingTemplate.ts` の DOM 構造を実調査して導出した確定値:

```typescript
// src/pdf/blockPlacementDefaults.ts (新設)
export const TEMPLATE_DEFAULT_BLOCK_PLACEMENTS: Record<
  DocumentTemplateId,
  Required<BlockPlacements>
> = {
  FORMAL_STANDARD:  { bankAccount: 'top-center',    companyStamp: 'top-right', remarks: 'bottom-center' },
  ACCOUNTING:       { bankAccount: 'top-center',    companyStamp: 'top-right', remarks: 'bottom-center' },
  SIMPLE:           { bankAccount: 'top-center',    companyStamp: 'top-right', remarks: 'bottom-center' },
  MODERN:           { bankAccount: 'bottom-center', companyStamp: 'top-right', remarks: 'bottom-center' },
  CLASSIC:          { bankAccount: 'top-center',    companyStamp: 'top-right', remarks: 'bottom-center' },
  CONSTRUCTION:     { bankAccount: 'bottom-center', companyStamp: 'top-right', remarks: 'bottom-center' },
};
```

#### 確定値の根拠（テンプレ別 DOM 監査）

| テンプレ | 振込口座 | 印影 | 備考 |
|---|---|---|---|
| **FORMAL** | `top-center`：`renderInfoBox()` の `info-box-row` がヘッダ直後・明細前の全幅ブロック | `top-right`：`formal-header > header-right > header-issuer-block` 内で `justify-content:flex-end` の右端配置 | `bottom-center`：`renderNotesSection()` が totals 後に全幅 section を描く |
| **ACCOUNTING** | `top-center`：`renderInfoBlock()` の `info-block-table` 内 `tr` が greeting 後・明細前の全幅 | `top-right`：`issuer-section-standalone` 内 `issuer-block` 右寄せ | `bottom-center`：`renderNotesSection()` が grand total 後に独立 section |
| **SIMPLE** | `top-center`：`renderInfoBlock()` の `info-row` がヘッダ直後・明細前の全幅 | `top-right`：`simple-header > header-right > issuer-block` 内、列が右カラム | `bottom-center`：`renderNotesSection()` の `simple-notes-section` が totals 後の全幅 |
| **MODERN** | `bottom-center`：`renderBankInfo()` の `bank-section` が totals card 後・notes 前の全幅 | `top-right`：`issuer-section` の `issuer-block` が `inline-flex` 右寄せ | `bottom-center`：`renderNotes()` の `notes-section` が table/totals 後の全幅 |
| **CLASSIC** | `top-center`：`renderInfoBlock()` の `classic-info-table` 行が issuer 後・明細前の全幅 | `top-right`：`classic-issuer` 内 `classic-seal-container { justify-content:flex-end }` | `bottom-center`：`renderNotesSection()` の `classic-notes` が totals table 後の全幅 |
| **CONSTRUCTION** | `bottom-center`：`renderBankInfoSection()` の `construction-bank-section` が totals 後の全幅 | `top-right`：`construction-header > header-right > construction-issuer-box > issuer-seal-row` の右側 | `bottom-center`：`renderNotesSection()` の `construction-notes-section` が bank info 後の全幅 |

**観察**: 6 テンプレで印影は全部 `top-right`、備考は全部 `bottom-center`。振込口座のみテンプレで `top-center` (4) / `bottom-center` (2) に分かれる。これは現行アプリで「印影は会社情報セクションの右」「備考は最下部」がほぼ統一されてる表れ。

### 5.3 抽出による既存 DOM 変更点

- **振込口座**: 現状 `renderInfoBlock()` 内の table row → 独立 placement 用 div に切り出し（CSS class はそのまま、外側 grid セルに配置）
- **印影**: 現状 `renderIssuerBlock()` 内の `.issuer-seal` div → 独立 placement 用 div に切り出し、`renderIssuerBlock()` は印影なしのテキストブロックを返すよう変更
- **備考**: 現状 `renderNotesSection()` で grand-total の後に独立 section → そのまま grid セルに配置（既に独立してるので変更小）

⚠️ **重要**: 抽出対象 DOM の**class 名、margin、padding、line-height、font-size、border 等の CSS は一切変更しない**。配置位置のみ grid で制御。

### 5.4 1px 不変の検証手順（実装フェーズ）

1. v1.0.1 main の各テンプレで 5 件のサンプル書類（振込口座あり/なし、印影あり/なし、備考あり/なし の組合せ）を PDF 生成
2. v1.0.2 実装ブランチの各テンプレで `blockPlacements: null` で同じ書類の PDF 生成
3. ImageMagick `compare -metric AE` で pixel diff、差分 0 を確認
4. 差分が出たテンプレ × ブロックは default 値を調整、または DOM 構造の保存方法を見直す
5. 全 6 テンプレ × 5 書類 = 30 通り全部で diff = 0 になるまで調整

---

## 6. UI 仕様

### 6.1 全体方針

「親友がストレスなく使える」を最優先。設定画面ではなく**書類編集画面から 1 タップで開ける軽量モーダル**で完結。詳細は §6.7 エントリポイント参照。

### 6.2 「見た目を整える」モーダル（二段階 UX）

#### 6.2.1 標準フロー（プリセット 3 ボタン優先）

ほとんどのユーザはこの画面で完結する。

```
┌────────────────────────────────┐
│   見た目を整える          ×   │  ← 親しみやすいタイトル
├────────────────────────────────┤
│ ┌──────────────────────────┐  │
│ │                            │  │
│ │     リアルタイムプレビュー   │  │  ← 上半分（既存 preview
│ │   （配置選択で即時更新）   │  │     経路を再利用、shared
│ │                            │  │     hook で抽出）
│ └──────────────────────────┘  │
├────────────────────────────────┤
│  おすすめの配置から選ぶ      │
│                                │
│  ┌──────────────────────────┐ │  ← プリセット 3 ボタン
│  │ 🏗 建設業らしい           │ │     大きなタップターゲット
│  │ 振込先・印影・備考を定番に  │ │     見出しは絵文字つきで
│  └──────────────────────────┘ │     親しみやすく
│                                │
│  ┌──────────────────────────┐ │
│  │ 💰 振込先を目立たせる     │ │
│  │ 入金を促進したい時に       │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │ ✨ シンプル                │ │
│  │ 振込先を非表示にすっきり    │ │
│  └──────────────────────────┘ │
├────────────────────────────────┤
│   詳細設定（位置を細かく）  ▼ │  ← tap で 6.2.2 に展開
│                                │
│   最初の配置に戻す             │  ← linkスタイル、目立たない
└────────────────────────────────┘
```

#### 6.2.2 詳細設定（展開時、タップした時のみ表示）

「もっと細かくしたい」ユーザ向け。標準フローからは隠れてる。

```
├────────────────────────────────┤
│   詳細設定（位置を細かく）  ▲ │
│                                │
│  振込口座                      │
│   ┌─┬─┬─┐                      │
│   │○│●│ │   上                 │  ← 大きいタップターゲット
│   ├─┼─┼─┤                      │     現在位置がハイライト
│   │ │ │ │   下                 │
│   └─┴─┴─┘   [非表示]            │
│                                │
│  印影                           │
│   ┌─┬─┬─┐                      │
│   │ │ │●│   上                 │
│   ├─┼─┼─┤                      │
│   │ │ │ │   下                 │
│   └─┴─┴─┘   [非表示]            │
│                                │
│  備考                           │
│   ┌─┬─┬─┐                      │
│   │ │ │ │   上                 │
│   ├─┼─┼─┤                      │
│   │ │●│ │   下                 │
│   └─┴─┴─┘   [非表示]            │
└────────────────────────────────┘
```

#### 6.2.3 設計判断のポイント

- **「適用」ボタンは無い**: 変更は即保存（リアルタイムプレビュー反映と保存の挙動が一致するので「保存しないで閉じた」迷いを排除）
- **× 閉じる以外のボタンを最小化**: 「最初の配置に戻す」は link スタイル、押し間違い防止
- **プリセット選択時はその場で書類に保存される**: モーダル閉じても変更が残る
- **詳細設定はデフォルト閉じている**: 親友は「おすすめ 3 つ」だけで完結する想定

### 6.3 リアルタイムプレビューの実装方針（hybrid hook）

iter 4 codex 推奨の Q1=C を反映。**hook は shared rendering pipeline のみ**を抱え、画面固有 state（共有実行、TemplatePickerModal の visible state、モーダル開閉）は preview.tsx / BlockPlacementModal に残す責務分担とする。

#### shared hook の責務（discriminated union source 対応）

```typescript
// src/hooks/useDocumentPreviewHtml.ts (新設)
export type DocumentPreviewSource =
  | { kind: 'documentId'; documentId: string }       // 保存済み書類（preview.tsx の通常経路）
  | { kind: 'previewDocument'; document: Document }; // 未保存プレビュー（previewData URL params 由来）

export function useDocumentPreviewHtml(params: {
  source: DocumentPreviewSource;
  // 現行 preview.tsx の templateDeps を完全包含する override 群
  templateIdOverride?: DocumentTemplateId;
  blockPlacementsOverride?: BlockPlacements | null;
  sealSizeOverride?: SealSize;                    // TemplatePicker 由来の即時反映用
  backgroundDesignOverride?: BackgroundDesign;
  backgroundImageDataUrlOverride?: string | null;
  orientation?: PreviewOrientation;               // 既存型 PORTRAIT / LANDSCAPE（大文字）に揃える
}): {
  webViewHtml: string | null;             // WebView source に渡す HTML（CSP/landscape inject 済み）
  resolvedDocumentWithTotals: DocumentWithTotals | null;  // 共有処理（PDF 出力）で使う
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;       // 共有処理で使う
  isLoading: boolean;
  error: Error | null;
};
```

> ⚠️ **型の所在**: `PreviewOrientation` / `SealSize` / `BackgroundDesign` は `src/types/settings.ts` に定義済み。hook では import して再利用、独自定義しない。

#### hook の内部処理

1. `source` を解決（documentId なら `getDocumentById()`、previewDocument ならそのまま使用）
2. settings / background image / sensitiveSnapshot を並列解決
3. `enrichDocumentWithTotals(document)` で計算
4. `generateHtmlTemplate({mode:'pdf', ..., blockPlacements: blockPlacementsOverride})` 呼び出し
5. `injectCsp(deriveDisplayHtml(html, orientation))` で WebView 用に加工
6. memoize して 200ms 以内の再描画を保証

#### 責務境界（Q1=C ハイブリッドの核）

| 責務 | 担当 |
|---|---|
| 書類読み込み・依存解決・HTML 生成 | **hook 内** |
| WebView source 渡し | hook 戻り値 |
| `documentWithTotals` / `sensitiveSnapshot` の return | hook 戻り値（共有用に必要） |
| **TemplatePickerModal の visible state** | **preview.tsx 側**（hook には含めない） |
| **PDF 共有実行 state（isPublishing 等）** | **preview.tsx 側**（hook には含めない） |
| **BlockPlacementModal の visible state** | **app/document/[id].tsx 側** |

#### preview.tsx と BlockPlacementModal の共通化

- preview.tsx: `source: { kind: 'documentId', documentId }` または `{ kind: 'previewDocument', document }` を渡す
- BlockPlacementModal: `source: { kind: 'documentId', documentId }` + `blockPlacementsOverride: 未保存 override` を渡してプリセット選択時のリアルタイム反映
- 両者で `webViewHtml` を取って WebView の `source` prop に渡すだけ
- 200ms 以内の再描画は `blockPlacementsOverride` 変化時のみ HTML 再生成（memoization で他依存変化なし）

#### 既存実装との差分

- 現状 `preview.tsx` 内の `useEffect` ベース HTML 生成処理を **hook 内に移動**
- `templateDeps` も hook の入力に統合
- preview.tsx は薄くなるが、TemplatePickerModal や共有実行 state はそのまま残す（責務分割でテスト容易性を保つ）

### 6.4 性能 SLO

- **配置プリセット選択 → preview WebView の `source` 更新までを 200ms 以内**
- 測定条件: production build + Hermes + iPhone 14 Pro 以上の実機 / 5 サンプル中央値

### 6.5 適用フロー（簡素化）

- **プリセットタップ** → 即座に `updateDocument(id, { blockPlacements: preset.placements })`、プレビュー反映
- **詳細設定で位置変更** → 即座に `updateDocument(id, { blockPlacements: { ...current, [block]: position } })`、プレビュー反映
- **「最初の配置に戻す」link** → `updateDocument(id, { blockPlacements: null })`、確認ダイアログなし（linkスタイルで誤タップ防止できてる前提）
- **× 閉じる** → 確認ダイアログなし（即保存なので破棄概念がない）

### 6.6 アクセシビリティ

- プリセットボタンに `accessibilityLabel`（例: 「建設業らしいレイアウトを選択」）
- 詳細設定の各 6 マスにも `accessibilityLabel`（例: 「振込口座を左上に配置」）
- 配置変更後 `AccessibilityInfo.announceForAccessibility('配置を○○に変更しました')`

### 6.7 エントリポイント

書類編集画面 `app/document/[id].tsx` の右上ツールバーに **「見た目」ボタン**（パレットアイコン or レイアウトアイコン）を追加。
- 「カスタマイズ」「設定」より親しみやすい単語
- アイコン + ラベル両方表示でわかりやすく

#### 6.7.1 新規未保存書類での挙動（codex Q4=A 採用）

`id === 'new'` または `state.documentId` が未確定の間は、「見た目」ボタンを **disabled** とし、近くに「先に保存すると見た目を整えられます」というヒントテキストを表示。

理由:
- `updateDocument(id, ...)` は永続 ID が必要、`id='new'` では呼べない
- ローカル state に `blockPlacements` を一時保持して初回保存時に永続化する案は、初回保存失敗・「戻る」操作・previewData との同期・dirty 判定など edge case が爆発するため v1.0.2 では非スコープ
- 親友ファースト UX としても「先に保存」というメンタルモデルは既に書類作成画面で確立済み

初回保存成功後は既存の `router.replace('/document/{realId}')` で実 ID 画面に遷移し、その時点でボタンが有効化される。

---

## 7. PDF 生成側の変更

### 7.1 影響箇所

| ファイル | 変更内容 | 種別 |
|---|---|---|
| `src/types/blockPlacement.ts` | 型定義（BlockKind / BlockPosition / BlockPlacements） | 新規 |
| `src/types/document.ts` | `Document.blockPlacements: BlockPlacements \| null` 追加 | 修正 |
| `src/pdf/types.ts` | `PdfTemplateInput.blockPlacements?` (解決前) 追加 | 修正 |
| `src/pdf/templates/templateRegistry.ts` | `TemplateOptions.blockPlacements` (解決済み) 追加 | 修正 |
| **`src/pdf/pdfTemplateService.ts`** | **`resolveBlockPlacements()` 実装、`generateHtmlTemplate()` 内で 1 回呼ぶ shared path** | 修正 |
| `src/pdf/blockPlacementDefaults.ts` | `TEMPLATE_DEFAULT_BLOCK_PLACEMENTS` 定数（§5.2 の確定値） | 新規 |
| `src/pdf/blockPlacementPresets.ts` | `BLOCK_PLACEMENT_PRESETS` 定数（§3.6 の 3 種プリセット） | 新規 |
| `src/pdf/templates/formalStandardTemplate.ts` | grid ラッパー導入、bank/seal/notes を grid セル経由で配置 | 修正 |
| `src/pdf/templates/modernTemplate.ts` | 同上 | 修正 |
| `src/pdf/templates/classicTemplate.ts` | 同上 | 修正 |
| `src/pdf/templates/simpleTemplate.ts` | 同上 | 修正 |
| `src/pdf/templates/constructionTemplate.ts` | 同上 | 修正 |
| `src/pdf/invoiceAccountingTemplate.ts` | 同上 | 修正 |
| `src/pdf/pdfGenerationService.ts` | `generateAndSharePdf()` は generateHtmlTemplate にそのまま委譲（resolver 複製しない） | 修正 |
| `src/utils/previewHtmlSecurity.ts` | parity test 用の `normalizeForParity()` ヘルパ export 追加 | 修正 |
| **`src/storage/asyncStorageService.ts`** | **`getAllDocuments()` / `getDocumentById()` で `blockPlacements: undefined → null` 正規化追加**（§4.2 の読込正規化点） | 修正 |
| **`src/hooks/useDocumentPreviewHtml.ts`** | **shared hook（discriminated union source、resolvedDocumentWithTotals/sensitiveSnapshot 返却）** | 新規 |
| **`src/hooks/useDocumentEdit.ts`** | edit screen state に `blockPlacements` を保持、新規未保存時は `documentId` 未確定状態を export | 修正 |
| `src/utils/previewDataValidator.ts` | `validatePreviewDocument()` で `previewData` 正規化時に `blockPlacements` を Document に伝播（`?? null`） | 修正 |
| `app/document/preview.tsx` | shared hook 呼ぶ形に**責務分解 refactor**（previewData parsing 経路、TemplatePickerModal、共有実行 state を残す）、HTML 生成は hook へ委譲 | 修正 |
| `app/document/[id].tsx` | 「見た目」ボタン追加（**`documentId` 未確定時は disabled + ヒント表示**）+ モーダル統合 + previewDocument に blockPlacements 伝播 | 修正 |
| `src/components/document/edit/BlockPlacementModal.tsx` | モーダル本体（プリセット 3 ボタン + 詳細設定 6 マス + プレビュー） | 新規 |
| `src/storage/migrations/v10-add-block-placements.ts` | no-op migration | 新規 |
| `src/storage/migrations/index.ts` | v10 登録 | 修正 |
| **`src/storage/migrationRunner.ts`** | **`CURRENT_SCHEMA_VERSION` を 9 → 10**（`src/utils/constants.ts` ではなくここに定義） | 修正 |
| `src/domain/document/documentService.ts` | `createDocument` 初期値 `null` / `duplicateDocument` で override コピー | 修正 |
| `src/domain/document/conversionService.ts` | `convertEstimateToInvoice` で **override をコピー**（Alert なし、無言で引き継ぎ） | 修正 |

合計: **新規 7 ファイル + 修正 20 ファイル ≒ 27 ファイル**（large 規模）

> ⚠️ **`app/document/preview.tsx` の refactor 規模注意**: 単純な hook 差し替えではなく、責務分解（previewData parsing / settings 解決 / template picker / 共有 state を残し、HTML 生成と依存解決を hook へ委譲）を伴う。1 行説明だが工数として独立したフェーズ（§11 P3）を確保している。

### 7.2 grid ラッパー設計 (block-by-block override + dual anchor)

#### 7.2.1 設計原則 (P4-C-2-d で確定、Yuma 親友ファースト判断)

**block ごとに独立判定**: ユーザが触ったブロックだけ動かし、untouched ブロックは旧 DOM 位置を維持する。これによりプリセット 1 つを選んでも、override 対象でないブロックは見た目が変わらず予測可能。

```
例: ユーザが💰振込先を目立たせる (bankAccount のみ default から動く) を選択
  → 振込先: 旧 info-box 内から抜き出して bottom-center cell へ
  → 印影: 旧 header 内の位置のまま (移動なし)
  → 備考: 旧 footer の位置のまま (移動なし)
```

**dual anchor region**: テンプレの既存縦フロー (header → main → totals → notes) と単一 3x2 grid は両立しない。代わりに **top region** と **bottom region** に分割し、各 generator が物理的に適切な位置に grid を 2 つ挿入する。

```
[title]
[header (issuer + 印影 default 位置)]
[block-layout-top]      ← top-* override されたブロックがここに集合
  ├─ cell-top-left
  ├─ cell-top-center
  └─ cell-top-right
[info-box (bank が default 位置なら表示、override なら抜く)]
[table]
[totals]
[block-layout-bottom]   ← bottom-* override されたブロックがここに集合
  ├─ cell-bottom-left
  ├─ cell-bottom-center
  └─ cell-bottom-right
[footer / notes (notes が default 位置なら表示)]
```

#### 7.2.2 実装パターン

各 generator は以下のロジックで動作する:

1. `resolveBlockPlacements()` で `Required<BlockPlacements>` を取得
2. `isDefaultResolvedPlacement()` で全 default 一致かチェック
   - 一致 → **legacy branch** (旧 DOM 完全実行、本セクションのコード一切走らせない)
   - 不一致 → **override branch** (block-by-block 判定で部分 grid 化)
3. override branch で各ブロック `kind in {bankAccount, companyStamp, remarks}` ごとに:
   - `placements[kind] === templateDefault[kind]` なら **untouched** → 旧位置に表示する HTML を生成
   - 異なるなら **moved** → 旧位置から抜いて grid セル fragment に追加
4. top-row override がある block を `block-layout-top` (top-left/center/right) grid に
5. bottom-row override がある block を `block-layout-bottom` (bottom-left/center/right) grid に
6. `hidden` の block は output に含めない (旧位置からも grid セルからも除外)

#### 7.2.3 HTML 構造

```html
<!-- top region (override に top-* がある時のみ出力) -->
<div class="block-layout-top">
  <div class="block-layout-cell cell-top-left" data-position="top-left">{{...}}</div>
  <div class="block-layout-cell cell-top-center" data-position="top-center">{{...}}</div>
  <div class="block-layout-cell cell-top-right" data-position="top-right">{{...}}</div>
</div>

<!-- bottom region (override に bottom-* がある時のみ出力) -->
<div class="block-layout-bottom">
  <div class="block-layout-cell cell-bottom-left" data-position="bottom-left">{{...}}</div>
  <div class="block-layout-cell cell-bottom-center" data-position="bottom-center">{{...}}</div>
  <div class="block-layout-cell cell-bottom-right" data-position="bottom-right">{{...}}</div>
</div>
```

CSS (override branch でのみ inject、legacy branch では一切出力しない、namespace 化で既存 selector と衝突回避):

```css
.block-layout-top,
.block-layout-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
}
.block-layout-cell {
  /* セルごとの inner margin は内部 fragment が制御 */
}
.block-layout-cell.cell-top-left, .block-layout-cell.cell-bottom-left { text-align: left; }
.block-layout-cell.cell-top-center, .block-layout-cell.cell-bottom-center { text-align: center; }
.block-layout-cell.cell-top-right, .block-layout-cell.cell-bottom-right { text-align: right; }
```

#### 7.2.4 共有 helper

- `src/pdf/blockPlacementLayout.ts`:
  - `placeBlocks(placements, rendered)`: position → cell マッピング (`hidden` 省略、same-cell 順序固定)
  - `renderBlockLayoutTop(cells)`: top region の HTML 出力
  - `renderBlockLayoutBottom(cells)`: bottom region の HTML 出力
  - `BLOCK_LAYOUT_GRID_CSS`: namespace 化された CSS

各 generator は本 helper を **override branch でのみ** 使い、legacy branch は旧コードを完全実行する (default path に grid wrapper や CSS が漏れない、SPEC §5.4 pixel diff 0 ゲートを保護)。

#### 7.2.5 untouched block の旧位置保持パターン (block-by-block extraction)

各 generator で「block を含む旧 helper」と「block を抜いた版」の二重実装は避け、**断片プリミティブ**に分解する:

- `renderBankFragment(sensitiveSnapshot)` — bank info 単独 fragment (info-row level、`<div class="info-box-row">`)
- `renderSealFragment(issuerSnapshot)` — seal 単独 fragment (`<div class="issuer-seal">` 単位、IssuerSnapshot のみ参照)
- `renderNotesFragment(doc)` — notes 単独 fragment (notes-section 単位、`<div class="formal-notes-section">`)
- `renderInfoBoxRows(doc, sensitiveSnapshot, includeBank: boolean)` — info box の rows 構築 (subject/period 行 + 任意 bank 行)
- `renderIssuerInfoText(doc, sensitiveSnapshot)` — seal を含まない issuer info テキスト (`<div class="issuer-info">`)。doc.type / 登録番号判定のため `sensitiveSnapshot` も必要 (6 テンプレ横断で同じ契約)
- 旧 `renderInfoBox` / `renderIssuerBlock` / `renderNotesSection` は legacy branch で**新 primitive を呼ぶ薄いラッパー**として維持。重複ロジックは内部で持たない (shared primitive を実体共有する)

これにより:
- legacy 合成 (= 旧コード再現) と override 合成 (= 必要部分だけ抜く) で **同じ断片関数を共有**
- 将来 P4-C-3+ で 6 テンプレ展開する時も同じ pattern を適用可能

---

## 8. テスト戦略（TDD 必須、強化版）

### 8.1 Unit Tests

- `resolveBlockPlacements()`: lazy 規則（`null`、partial、full override）が正しい
- `safePosition()`: invalid enum（古いアプリが未来 position を読んだ時）が defensive fallback
- BlockPlacement 型の serialize → deserialize → serialize が冪等（Document 全体）
- `createDocument` / `duplicateDocument` / `convertEstimateToInvoice` の各経路で blockPlacements の扱いが §3.3 表通り

### 8.2 Snapshot Tests（PDF 生成）

#### Tier 1: 1px 不変保証（30 通り）
- 6 テンプレ × 5 サンプル書類（振込口座あり/なし、印影あり/なし、備考あり/なし の組合せ）× `blockPlacements: null` → v1.0.1 main snapshot と pixel diff = 0

#### Tier 2: カスタム配置 smoke（42 通り）
- 6 テンプレ × 7 配置パターン（top-left, top-center, ... bottom-right, hidden）→ 新規 snapshot

#### Tier 3: Multi-block dense（追加観点）
- 同じセルに複数ブロックを配置した場合の重なり / 順序確認（6 テンプレ × 3 ケース）
- 全ブロック hidden ケース
- 1 ブロックだけ表示ケース

### 8.3 Migration / Rollback Tests

- v9 アプリのデータ → v10 アプリで読む → migration no-op → blockPlacements null → テンプレデフォルト適用 → v1.0.1 と同じ PDF
- v10 アプリで blockPlacements を override 保存 → JSON 確認
- v10 アプリのデータ → v9 アプリでデシリアライズ → blockPlacements 無視 → 書類は壊れない（unit test レベル）
- v10 アプリのデータ → v9 アプリで再保存 → blockPlacements 消失 → v10 アプリで読み直すと null（テンプレデフォルト）に戻る

### 8.4 Duplicate / Convert Semantics Tests

> ⚠️ **fixture 規約**: 各テストで `settings.defaultEstimateTemplateId` と `settings.defaultInvoiceTemplateId` の値を fixture で明示し、テスト期待値はそれら fixture 値から導出する（`FORMAL_STANDARD` 等の固定文字列をハードコードしない）。設定変更耐性のため。

```typescript
// fixture 例
const settings = makeFixtureSettings({
  defaultEstimateTemplateId: 'FORMAL_STANDARD',
  defaultInvoiceTemplateId: 'ACCOUNTING',
});
const expected = resolveBlockPlacements(estimate.blockPlacements, settings.defaultEstimateTemplateId);
expect(invoice.blockPlacements).toEqual(expected);
```

#### テストケース

- 書類 A（override あり）を duplicate → 新書類 B の blockPlacements が A と一致
- 見積書 A（override あり）を invoice に convert → **新 invoice の blockPlacements が `resolveBlockPlacements(A.blockPlacements, settings.defaultEstimateTemplateId)` の結果と一致**（full resolve copy、見積で見えてた配置が請求書でも完全維持）
- 見積書 A（`null`）を invoice に convert → 新 invoice の blockPlacements が `resolveBlockPlacements(null, settings.defaultEstimateTemplateId)` の結果（= estimate 用テンプレ default を full override として保存、`null` ではない）
- 確認: convert 後の invoice をさらに別の template に切り替えても、保存済み blockPlacements は維持される（template default に上書きされない）
- プリセットを選択 → `updateDocument({ blockPlacements: preset.placements })` が呼ばれる
- 「最初の配置に戻す」リンクタップ → `updateDocument({ blockPlacements: null })` が呼ばれる
- `UpdateDocumentInput.blockPlacements` の tri-state テスト: `undefined` → 既存値維持 / `null` → 削除 / object → 設定
- `getAllDocuments()` の正規化テスト: legacy データ（`blockPlacements` フィールドなし）→ 読込後 `null` になる

### 8.5 Preview-Print Parity Tests

iter 2 指摘を反映し、**正規化対象を明文化**:

#### 比較戦略

`src/pdf/__tests__/parity.test.ts` を新設し、`normalizeForParity(html: string): string` ヘルパで以下 5 種の **既知 injection を除去してから diff**:

| 正規化対象 | 該当箇所 | 理由 |
|---|---|---|
| **CSP meta タグ** | preview のみ `injectCsp()` が `<meta http-equiv="Content-Security-Policy" ...>` を追加 | preview 限定の security inject、テンプレ本体と無関係 |
| **viewport meta タグ** | template 既定 `width=device-width` / preview portrait `width=800` / landscape `width=1130` | 表示モードによる差分、PDF 内容と無関係 |
| **landscape CSS 断片** | `injectLandscapeCss()` の `@page { size: A4 landscape; }` + `.document-container { max-width: 1130px; min-width: 1130px; }` | landscape 対応のための display only |
| **single-page CSS 全体** | `injectSinglePageCssOnly()` / `injectSinglePageEnforcement()` の `@page ... margin: 0` / `html/body overflow:hidden` / `page-break-inside` 等 | print 限定の page enforce |
| **single-page script** | `injectSinglePageEnforcement()` が追加する inline script 全体 | print 限定の display logic |
| 空行・インデント差分 | 注入に伴う whitespace | trivial |

**`print-color-adjust` プロパティはテンプレ本体 CSS なので比較対象に残す**（normalize しない）。

`FIT_TO_SCREEN_SCRIPT` は preview の WebView prop 経由で HTML 文字列に入らないため、HTML parity 対象外。WebView 動作の検証は別途 E2E で実施。

#### 比較対象

```typescript
// src/pdf/__tests__/parity.test.ts
test('preview と print の base HTML が parity', () => {
  const baseHtml = generateHtmlTemplate({ mode: 'pdf', /* ... */ });
  const previewHtml = injectCsp(deriveDisplayHtml(baseHtml, 'PORTRAIT')).html;
  const printHtml = applyPrintInjection(baseHtml); // generateAndSharePdf 内処理を抜き出した関数
  expect(normalizeForParity(previewHtml)).toEqual(normalizeForParity(printHtml));
});
```

#### 実装ファイル

- `src/pdf/__tests__/parity.test.ts` を新設
- `src/utils/previewHtmlSecurity.ts` に `normalizeForParity()` を export 追加（`src/pdf/utils/displayHtml.ts` / `csp.ts` は現状存在しない、実装実体は `pdfTemplateService.ts` と `previewHtmlSecurity.ts` に分散）

#### テスト範囲

代表 3 テンプレ（FORMAL / MODERN / CONSTRUCTION）× 配置 3 パターン（default / 振込 top-right override / 印影 hidden override）= 9 ケースで parity 確認

### 8.6 E2E（手動）

- 書類作成 → 配置カスタマイズ → 適用 → PDF 出力で配置反映確認
- 既存書類（v1.0.1 で作成済みデータをエミュレート）を v1.0.2 で開く → 見た目変化なし
- 「最初の配置に戻す」→ override クリアされる
- モーダル閉じる前の確認ダイアログ動作

---

## 9. 受け入れ基準（Acceptance Criteria）

1. ✅ 全 6 テンプレで 3 種類のブロック（bank/seal/notes）を 6 プリセット位置 + hidden に配置可能
2. ✅ 既存書類（v1.0.1 で作成、`blockPlacements = null`）の **PDF 出力が v1.0.1 と pixel diff 0**（§5.4 検証手順クリア）
3. ✅ 配置プリセット選択 → preview WebView の `source` 更新までを **200ms 以内** に反映（測定条件: production build + Hermes + iPhone 14 Pro 以上の実機 / 5 サンプル中央値）
4. ✅ 「最初の配置に戻す」リンクで書類個別 override がクリアされ、テンプレデフォルトに戻る
5. ✅ PDF 出力時に WebView プレビューと同じ配置で出力される（preview-print parity test pass）
6. ✅ duplicate / convert / rollback / resave の各経路で §3.3 表の通り動作（unit test pass）
7. ✅ 全テスト（unit / snapshot 30+42+ / migration / parity / E2E）pass
8. ✅ codex-review iter ok:true 達成

---

## 10. リスクと対応

| リスク | 影響 | 対応 |
|---|---|---|
| 既存テンプレの DOM 抽出で副作用が出る | 高 | §5.4 の pixel diff 検証（30 通り）で実装フェーズ最初に確定 |
| WebView プレビューが PDF と微妙にずれる | 中 | preview-print parity test、両方とも `mode:'pdf'` を使う既存設計を維持 |
| invalid enum を読んでクラッシュ | 低 | `safePosition()` で defensive fallback、unit test |
| ロールバック時の override 喪失でユーザがクレーム | 低 | docs/FAQ で明示、v1.0.2 → v1.0.1 ダウングレードは想定範囲外 |
| v10 migration が他 migration と衝突 | 低 | no-op なので衝突しない、registerMigration() に追加するだけ |
| 16 ファイル変更で codex-review が通らない | 中 | large 規模として codex-review に出す、arch + diff 並列 + cross-check で収束 |

---

## 11. 実装フェーズ計画

| Phase | 内容 | 工数目安 | ゲート |
|---|---|---|---|
| **P0** | SPEC レビュー（codex-review iter ok:true） | 1 日 | ok:true |
| **P1** | 型定義 + プリセット定数 + テンプレデフォルト table を §5.4 検証で確定 | 2 日 | pixel diff = 0 |
| **P2** | ドメイン拡張（`createDocument` / `duplicateDocument` / `convertEstimateToInvoice` 各経路、convert は override コピー）+ migration v10 | 2 日 | unit test pass |
| **P3** | shared hook `useDocumentPreviewHtml` 抽出 + preview.tsx リファクタ | 1 日 | 既存 preview 動作変化なし |
| **P4** | PDF 生成側更新（6 テンプレに grid ラッパー導入）+ TemplateOptions 拡張 | 3 日 | snapshot Tier 1 pass |
| **P5** | UI 実装（「見た目を整える」モーダル + プリセット 3 ボタン + 詳細設定 + プレビュー統合） | 4 日 | E2E 手動確認、親友タッチ＆フィール |
| **P6** | テスト網羅（snapshot Tier 2/3 + migration/rollback + parity）+ codex-review iter | 3 日 | iter ok:true |
| **P7** | EAS Build → TestFlight 実機確認 → ASC 提出 | 1 日 | 提出完了 |

**合計: 17 日**（実装日換算）

### Phase 親友フィードバック計画

P5 完了直後に **親友（実ユーザ）に TestFlight で触ってもらう**フェーズを設ける：
- プリセット 3 ボタンで完結できるか
- 「詳細設定」を開く必要があるか
- ネーミング（「見た目を整える」「最初の配置に戻す」）が違和感ないか

フィードバックで重大な体験問題があれば P6 に反映してから提出。

---

## 12. M2 残タスク同梱（v1.0.2 PR で同時クリーンアップ）

- EAS production env vars 削除（`EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_SUPABASE_URL`）
- `APP_STORE_SUBMISSION_TODO.md` を `_v1_0_0_ARCHIVE.md` にリネーム
- iPhone / iPad スクショの並び順最適化（v1.0.1 提出時に未完、v1.0.2 で差し替え）
  - iPhone 順: 書類一覧 → 見積書プレビュー → スタイル選択 → 単価表 → 新規請求書 → 顧客一覧 → カンバン
  - iPad も同様

---

## 13. 残課題（v1.0.3 以降）

- **自由テキストブロック**: `Document.freeText: string | null` 新設、入力 UI、空状態 policy、serialize/deserialize、rollback test まで含めて別 SPEC に切り出し
- 6 → 9 プリセット拡張（3×3 グリッド）の必要性検討
- 完全ドラッグ＆ドロップ（v1.x.x 最終形態）
- 用紙サイズ変更（A4 / A3 / Letter）
