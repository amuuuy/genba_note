# AI資材価格リサーチ機能 - 変更ファイル一覧

## 新規作成ファイル (10)

### Supabase Edge Function
- `supabase/functions/gemini-search/index.ts`
  - Gemini API プロキシ（Google Search grounding付き）
  - JWT認証、レート制限（5 req/min per IP）
  - Flash / Pro モデル切替対応

### ドメイン層
- `genba-note/src/domain/materialResearch/geminiMappingService.ts`
  - `parseGeminiJsonBlock()` — LLMレスポンスからJSONブロック抽出
  - `mapGeminiResponse()` — Edge Function レスポンス → `AiSearchResponse`
  - `aiPriceItemToSearchResult()` — 既存型への変換
  - `aiPriceItemToUnitPriceInput()` — 単価マスタ登録用変換（税抜き計算含む）

- `genba-note/src/domain/materialResearch/geminiSearchService.ts`
  - `searchMaterialsWithAi()` — Result パターン（throw しない）
  - エラーコード: RATE_LIMIT / API_ERROR / NETWORK_ERROR / PARSE_ERROR

### フック
- `genba-note/src/hooks/useAiPriceSearch.ts`
  - query, result, isLoading, error, model, setModel, search, clear

### UIコンポーネント
- `genba-note/src/components/unitPrice/AiPriceItemCard.tsx`
  - AI価格アイテムカード（sparklesアイコン、ソースリンク、登録ボタン）

- `genba-note/src/components/unitPrice/AiModelSelector.tsx`
  - Flash ⚡ / Pro 🎯 セグメントコントロール

- `genba-note/src/components/unitPrice/AiSearchResultView.tsx`
  - AI分析サマリー、推奨価格帯、価格比較リスト、情報ソース一覧

### テスト
- `genba-note/__tests__/domain/materialResearch/geminiMappingService.test.ts` (19テスト)
- `genba-note/__tests__/domain/materialResearch/geminiSearchService.test.ts` (10テスト)
- `genba-note/__tests__/hooks/useAiPriceSearch.test.ts` (5テスト)

## 既存修正ファイル (6)

### 型定義
- `genba-note/src/types/materialResearch.ts`
  - 追加: `AiSearchModel`, `AiPriceItem`, `GroundingSource`, `AiSearchResponse`, `AiSearchParams`, `AiSearchError`, `AiSearchDomainResult<T>`, `SearchSource`

- `genba-note/src/types/settings.ts`
  - `AppSettings` に `aiSearchModel: AiSearchModel` フィールド追加
  - `DEFAULT_APP_SETTINGS` に `aiSearchModel: 'FLASH'` 追加

### ストレージ
- `genba-note/src/storage/asyncStorageService.ts`
  - `mergeSettingsWithDefaults()` に `aiSearchModel` バリデーション追加

### ドメイン index
- `genba-note/src/domain/materialResearch/index.ts`
  - geminiMappingService, geminiSearchService の re-export 追加

### UI統合
- `genba-note/src/components/unitPrice/MaterialSearchModal.tsx`
  - タブバー追加: 「楽天検索」|「AI価格調査」
  - 検索入力共有、アクティブタブの検索を実行
  - AIタブ時にモデルセレクター表示
  - 免責バナーのテキストをタブに応じて変更

### 設定
- `genba-note/.env.example`
  - Gemini AI セクション追加（Supabase Secrets 経由の設定方法）

## テスト影響

### 修正が必要だったテストファイル
- `genba-note/__tests__/pdf/issuerResolverService.test.ts`
  - 全 `AppSettings` リテラルに `aiSearchModel: 'FLASH'` 追加
- `genba-note/__tests__/domain/materialResearch/helpers.ts`
  - AI用ファクトリー関数追加: `createTestAiPriceItem()`, `createTestAiSearchResponse()`, `createTestGeminiEdgeFunctionResponse()`

## デプロイ手順

```bash
# 1. Gemini API キーを設定
supabase secrets set GEMINI_API_KEY=<your_key>

# 2. Edge Function をデプロイ
supabase functions deploy gemini-search --verify-jwt
```
