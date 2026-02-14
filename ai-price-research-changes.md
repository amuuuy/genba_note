# AI資材価格リサーチ機能 - Milestone別 変更一覧

---

## Milestone 1: 型定義 + 設定層
> AI検索に必要な型と設定の土台

| 操作 | ファイル | 内容 |
|------|---------|------|
| 修正 | `genba-note/src/types/materialResearch.ts` | `AiSearchModel`, `AiPriceItem`, `AiSearchResponse` 等の型追加 |
| 修正 | `genba-note/src/types/settings.ts` | `AppSettings.aiSearchModel` フィールド追加 |
| 修正 | `genba-note/src/storage/asyncStorageService.ts` | `mergeSettingsWithDefaults()` にバリデーション追加 |
| 修正 | `genba-note/__tests__/pdf/issuerResolverService.test.ts` | AppSettingsリテラルに `aiSearchModel: 'FLASH'` 追加 |

---

## Milestone 2: Edge Function（サーバー側）
> Gemini APIプロキシ

| 操作 | ファイル | 内容 |
|------|---------|------|
| 新規 | `supabase/functions/gemini-search/index.ts` | Gemini API プロキシ、JWT認証、レート制限 5 req/min |

---

## Milestone 3: ドメインサービス + テスト
> パース・マッピング・API呼び出しの純粋ロジック

| 操作 | ファイル | 内容 |
|------|---------|------|
| 新規 | `genba-note/src/domain/materialResearch/geminiMappingService.ts` | JSONパース、型変換、税抜き計算 |
| 新規 | `genba-note/__tests__/domain/materialResearch/geminiMappingService.test.ts` | 19テスト |
| 新規 | `genba-note/src/domain/materialResearch/geminiSearchService.ts` | API呼び出し（Resultパターン） |
| 新規 | `genba-note/__tests__/domain/materialResearch/geminiSearchService.test.ts` | 10テスト |
| 修正 | `genba-note/__tests__/domain/materialResearch/helpers.ts` | テストファクトリー関数追加 |
| 修正 | `genba-note/src/domain/materialResearch/index.ts` | re-export追加 |

---

## Milestone 4: フック + テスト
> React状態管理

| 操作 | ファイル | 内容 |
|------|---------|------|
| 新規 | `genba-note/src/hooks/useAiPriceSearch.ts` | AI検索フック |
| 新規 | `genba-note/__tests__/hooks/useAiPriceSearch.test.ts` | 5テスト |

---

## Milestone 5: UIコンポーネント
> AI検索結果の表示部品

| 操作 | ファイル | 内容 |
|------|---------|------|
| 新規 | `genba-note/src/components/unitPrice/AiPriceItemCard.tsx` | 価格アイテムカード |
| 新規 | `genba-note/src/components/unitPrice/AiModelSelector.tsx` | Flash/Pro切替トグル |
| 新規 | `genba-note/src/components/unitPrice/AiSearchResultView.tsx` | 検索結果ビュー全体 |

---

## Milestone 6: モーダル統合 + 設定ファイル
> 既存UIにタブ切替を組み込み、完成

| 操作 | ファイル | 内容 |
|------|---------|------|
| 修正 | `genba-note/src/components/unitPrice/MaterialSearchModal.tsx` | タブバー「楽天検索 / AI価格調査」統合 |
| 修正 | `genba-note/.env.example` | Gemini設定コメント追加 |

---

## デプロイ（Milestone 2 の後に実施可能）

```bash
supabase secrets set GEMINI_API_KEY=<your_key>
supabase functions deploy gemini-search --verify-jwt
```
