# M1 削除対象 棚卸し (2026-04-19)

rg 対象キーワード: `supabase|RevenueCat|Purchases|isPro|dailyUsage|materialResearch|Rakuten|gemini-search|paywall`

合計 96 ファイル検出。以下に6区分で分類（※印=部分削除・依存剥がしのみ、無印=ファイル全削除）。

## 1. UI (app/, src/components/)

### 全削除
- app/paywall.tsx
- app/paywallMessages.ts
- app/paywallState.ts
- src/components/unitPrice/MaterialSearchModal.tsx
- src/components/unitPrice/MaterialSearchResultItem.tsx
- src/components/unitPrice/AiSearchResultView.tsx
- src/components/unitPrice/AiPriceItemCard.tsx
- src/components/unitPrice/materialSearchLimitUtils.ts
- src/components/unitPrice/aiSearchViewState.ts

### 部分削除（依存剥がし）
- app/(tabs)/settings.tsx  ※paywall 導線・Pro表示削除、legal links 保持
- app/(tabs)/prices.tsx    ※material research 導線削除
- app/(tabs)/index.tsx     ※Pro関連UI削除
- app/(tabs)/customers.tsx ※
- app/(tabs)/balance.tsx   ※
- app/_layout.tsx          ※paywall route 削除
- app/document/preview.tsx ※
- app/document/[id].tsx    ※
- app/customer/[id].tsx    ※
- src/components/settings/TemplateSelectionSection.tsx ※
- src/components/document/edit/SaveActionSheet.tsx ※
- src/components/document/TemplatePickerModal.tsx ※
- src/components/common/ActionSheetModal.tsx ※

## 2. domain / hooks / types

### 全削除
- src/subscription/ ディレクトリ全体
  - subscriptionService.ts, proAccessService.ts, offlineValidationService.ts
  - offeringsErrorResolver.ts, fetchOfferingsController.ts
  - freeTierLimitsService.ts, dailyUsageService.ts
  - types.ts, index.ts
- src/domain/auth/ ディレクトリ全体
  - supabaseAuthService.ts, index.ts
- src/domain/materialResearch/ ディレクトリ全体
  - materialResearchService.ts, geminiSearchService.ts, geminiMappingService.ts
  - rakutenMappingService.ts, lineItemMappingService.ts, index.ts
- src/hooks/useMaterialSearch.ts
- src/hooks/useAiPriceSearch.ts
- src/hooks/useProStatus.ts
- src/hooks/useDailySearchUsage.ts
- src/types/subscription.ts
- src/types/materialResearch.ts

### 部分削除
- src/hooks/useDocumentEdit.ts ※material research 連携削除
- src/domain/document/documentService.ts ※
- src/domain/document/conversionService.ts ※
- src/domain/csvExport/csvFileService.ts ※
- src/types/index.ts ※re-export 削除
- src/constants/templateOptions.ts ※Pro 限定判定削除

## 3. storage / infra

- supabase/ （プロジェクトルート）全削除
- genba-note/deno.lock   ※Supabase Edge Functions 用、要確認

## 4. pdf-export

- src/pdf/pdfGenerationService.ts ※Pro限定ロジック削除

## 5. utils

- src/utils/legalLinkHandlers.ts ※paywall 導線削除
- src/utils/environment.ts       ※Supabase URL 検査削除

## 6. tests

### 全削除
- __tests__/subscription/ 全ファイル
- __tests__/domain/auth/ 全ファイル
- __tests__/domain/materialResearch/ 全ファイル
- __tests__/app/paywall-offerings-error.test.ts
- __tests__/app/paywallMessages.test.ts
- __tests__/app/paywall-legal-links.test.ts
- __tests__/hooks/useProStatus.test.ts
- __tests__/hooks/useDailySearchUsage.test.ts
- __tests__/hooks/useMaterialSearch.test.ts
- __tests__/hooks/useAiPriceSearch.test.ts
- __tests__/components/unitPrice/MaterialSearch*.test.ts
- __tests__/components/unitPrice/AiSearch*.test.ts / AiPriceItemCard.test.ts

### 部分削除
- __tests__/hooks/useDocumentEdit.test.ts ※
- __tests__/pdf/pdfGenerationService.test.ts ※
- __tests__/pdf/cleanupOrphanedPdfCache.test.ts ※
- __tests__/domain/document/documentService.test.ts ※
- __tests__/domain/document/conversionService.test.ts ※
- __tests__/domain/csvExport/csvFileService.test.ts ※
- __tests__/constants/templateOptions.test.ts ※
- __tests__/utils/environment.test.ts ※
- __tests__/app/settings-legal-links.test.ts ※

## 7. config

- genba-note/package.json       ※@revenuecat/purchases-react-native, @supabase/supabase-js, expo-auth-session, expo-web-browser 等の依存削除
- genba-note/package-lock.json  ※npm install で自動更新

## 注記

- 部分削除ファイルは1ファイルごとに diff 確認しながら TDD で進める
- 全削除ファイルは git rm で削除、該当テストも同時削除
- PIVOT_PLAN_v2.md §M1 コミット粒度に従い、10 コミットに分割する
