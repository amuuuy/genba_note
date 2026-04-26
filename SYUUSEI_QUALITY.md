# GenBa Note コード品質修正計画（Milestone 24〜25）

> ⚠️ **重要 (2026-04-26 更新)**: 本ファイルは v1.0.0 時代の Milestone 24〜25 品質修正計画です。
> Milestone 25 の paywall.tsx リリース準備項目は v1.0.1 で paywall 自体を削除したため OBSOLETE です。
> v1.0.1 以降の現行アーキテクチャは [`PIVOT_PLAN_v2.md`](PIVOT_PLAN_v2.md) と [`M1_V1_0_1_RELEASE_FIXES.md`](M1_V1_0_1_RELEASE_FIXES.md) を正本としてください。
> 本ファイルは履歴目的で保持しています。
>
> ---

## Context

GenBa Noteは建設業向けの書類管理アプリ（Expo SDK 54 + TypeScript + React Native 0.81）。
現在の実装状況:
- **スキーマバージョン: 9**（Milestone 1〜23完了）
- テスト: 121スイート、2,414テスト、全パス
- テンプレート: 6種（FORMAL_STANDARD, ACCOUNTING, SIMPLE, MODERN, CLASSIC, CONSTRUCTION）

コードベース全体の品質調査で発見された問題点を修正する。
SYUUSEI.md（Milestone 16〜23）の続番として Milestone 24〜 を割り当てる。

---

## Milestone 24: コード品質修正（安全性・クリーンアップ）

### スコープ
調査で発見された3つのコード品質問題を修正する:
1. setTimeout のクリーンアップ漏れ（メモリリーク防止）
2. 画像コピー時のファイルサイズ上限チェック追加（ストレージ枯渇防止）
3. PDF キャッシュの孤立ファイルクリーンアップ（ディスク容量節約）

### 受入基準
1. CustomerAutoComplete の `handleBlur` 内 setTimeout が ref で管理され、アンマウント時に clearTimeout される
2. 画像コピー関数4つすべてでファイルサイズ上限チェックが実施される
   - 印鑑画像: 10MB上限
   - 背景画像: 10MB上限
   - 顧客写真: 50MB上限
   - 収支写真: 50MB上限
3. `cleanupOrphanedPdfCache()` がエクスポートされ、アプリ起動時に呼び出される
4. 既存テスト全パス + 各修正のテスト追加
5. TypeScript コンパイルエラーなし

### M24-1: setTimeout クリーンアップ修正

#### 対象ファイル
- `genba-note/src/components/customer/CustomerAutoComplete.tsx`

#### 問題
`handleBlur`（L97-103）内の `setTimeout` が変数に保存されておらず、コンポーネントアンマウント時にキャンセルされない。アンマウント後の state 更新が発生する可能性がある。

```typescript
// 修正前
const handleBlur = useCallback(() => {
  setTimeout(() => {
    setIsFocused(false);
    setShowSuggestions(false);
  }, 200);
}, []);
```

#### 修正内容
- `blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` を追加
- `handleBlur` 内で `blurTimerRef.current = setTimeout(...)` に変更
- アンマウント時の cleanup useEffect を追加: `clearTimeout(blurTimerRef.current)`

```typescript
// 修正後
const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleBlur = useCallback(() => {
  blurTimerRef.current = setTimeout(() => {
    setIsFocused(false);
    setShowSuggestions(false);
  }, 200);
}, []);

useEffect(() => {
  return () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
  };
}, []);
```

#### テスト
- テストファイル: `genba-note/__tests__/components/customer/CustomerAutoComplete.test.tsx`
- アンマウント後に state 更新警告が発生しないことを検証

### M24-2: 画像ファイルサイズバリデーション追加

#### 対象ファイル
- `genba-note/src/utils/imageUtils.ts`

#### 問題
画像コピー関数4つでファイルサイズチェックなしにコピーが実行される。悪意のある、または破損した画像ファイルによるストレージ枯渇の可能性がある。

#### 修正内容

定数を追加:
```typescript
/** 印鑑画像の最大サイズ（10MB） */
export const MAX_SEAL_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
/** 背景画像の最大サイズ（10MB） */
export const MAX_BACKGROUND_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
/** 写真の最大サイズ（50MB） */
export const MAX_PHOTO_SIZE_BYTES = 50 * 1024 * 1024;
```

各コピー関数にサイズ検証を追加:
```typescript
const sourceFile = new File(sourceUri);
if (sourceFile.size > MAX_SEAL_IMAGE_SIZE_BYTES) {
  if (__DEV__) console.warn(`Image file exceeds size limit: ${sourceFile.size} bytes`);
  return null;
}
```

対象関数と上限:
| 関数 | 行 | 上限 |
|------|-----|------|
| `copyImageToPermanentStorage` | L70 | 10MB |
| `copyBackgroundImageToPermanentStorage` | L100 | 10MB |
| `copyCustomerPhotoToPermanentStorage` | L276 | 50MB |
| `copyFinancePhotoToPermanentStorage` | L467 | 50MB |

#### テスト
- テストファイル: `genba-note/__tests__/utils/imageUtils.test.ts`
- expo-file-system の File mock でサイズ超過ケースを検証
- サイズ超過時に null が返ることをアサート

### M24-3: PDF キャッシュクリーンアップ

#### 対象ファイル
- `genba-note/src/pdf/pdfGenerationService.ts`
- `genba-note/app/_layout.tsx`（呼び出し元）

#### 問題
PDF 共有時に生成されるキャッシュファイルは `finally` ブロックで削除されるが、アプリクラッシュ時にはキャッシュに残る。

#### 修正内容

`pdfGenerationService.ts` に追加:
```typescript
/**
 * アプリ起動時にキャッシュディレクトリ内の孤立 PDF ファイルを削除する。
 * クリーンアップ失敗はアプリ起動を妨げない。
 */
export async function cleanupOrphanedPdfCache(): Promise<void> {
  try {
    const cacheDir = new Directory(Paths.cache);
    if (!cacheDir.exists) return;
    for (const entry of cacheDir.list()) {
      if (entry instanceof File && entry.uri.endsWith('.pdf')) {
        entry.delete();
      }
    }
  } catch {
    // Silent - cleanup failure should not block app startup
  }
}
```

`app/_layout.tsx` の初期化 useEffect 内で呼び出し:
```typescript
import { cleanupOrphanedPdfCache } from '@/pdf/pdfGenerationService';

useEffect(() => {
  cleanupOrphanedPdfCache();
}, []);
```

#### テスト
- テストファイル: `genba-note/__tests__/pdf/pdfGenerationService.test.ts`
- キャッシュディレクトリに PDF が存在する場合に削除されることを検証
- ディレクトリが存在しない場合にエラーが発生しないことを検証

---

## Milestone 25: paywall.tsx リリース準備（URL 決定後に実施）

### スコープ
App Store 提出前に必要な修正。利用規約・プライバシーポリシーの実 URL が決定してから実施する。

### 受入基準
1. `TERMS_OF_SERVICE_URL` が実際の利用規約 URL に置換済み
2. `PRIVACY_POLICY_URL` が実際のプライバシーポリシー URL に置換済み
3. TODO コメントが削除済み

### 対象ファイル
- `genba-note/app/paywall.tsx` (L34-36)

```typescript
// 修正前（現在）
// TODO: Replace with actual URLs before App Store submission
const TERMS_OF_SERVICE_URL = 'https://genba-note.app/terms';
const PRIVACY_POLICY_URL = 'https://genba-note.app/privacy';

// 修正後（URL 決定後）
const TERMS_OF_SERVICE_URL = 'https://（実URL）';
const PRIVACY_POLICY_URL = 'https://（実URL）';
```

### ステータス: 未着手（URL 決定待ち）

---

## 検証方法

```bash
cd genba-note
npx jest --verbose
npx tsc --noEmit
```

全テストパス + TypeScript コンパイルエラーなしを確認。
