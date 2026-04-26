# GenBa Note 実装計画 (ExecPlan)

> ⚠️ **重要 (2026-04-26 更新)**: 本ファイルは v1.0.0 / Pro tier 時代の実装計画です。
> v1.0.1 で M1 Pivot により以下を **全廃止** したため、本ファイル中の Pro 機能・RevenueCat・Supabase・materialResearch・OTA 関連の記述はすべて旧前提として参考扱いとします:
> - **アプリ内課金 / Pro サブスクリプション / RevenueCat**
> - **Supabase 匿名認証 / Edge Functions**
> - **AI資材検索 / 楽天検索 / Google Gemini API（materialResearch ドメイン）**
> - **expo-updates OTA**
>
> v1.0.1 以降の **現行アーキテクチャ・実装計画は [`PIVOT_PLAN_v2.md`](PIVOT_PLAN_v2.md) と [`M1_V1_0_1_RELEASE_FIXES.md`](M1_V1_0_1_RELEASE_FIXES.md) を正本** とします。
> 本ファイルは v1.0.0 当時の計画として履歴目的で保持しています。
>
> ---

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with PLANS.md located at `./PLANS.md`.

## Purpose / Big Picture

GenBa Note（現場ノート）は建設業・施工業者向けの見積書・請求書管理モバイルアプリです。この実装計画を完了すると、ユーザーは以下のことが可能になります：

1. 見積書・請求書の作成・編集・削除（自動採番：EST-001, INV-001形式）
2. 明細行の管理と整数演算による正確な金額計算
3. ステータス管理（下書き → 送付済 → 入金済）と遷移ルール
4. 収支の期間別集計表示
5. PDF出力とCSVエクスポート（Pro機能）
6. RevenueCatによるサブスクリプション管理（オフライン7日間グレース期間）

技術スタック: Expo (React Native), TypeScript, AsyncStorage, expo-secure-store, RevenueCat

## Progress

- [x] (2026-01-30) ExecPlan.mdをプロジェクトルートに作成
- [x] (2026-01-30) Milestone 0: プロジェクト基盤とテスト環境 ✅ **COMPLETE**
  - [x] Expoプロジェクト初期化 (genba-note/)
  - [x] 依存パッケージインストール (expo-router, expo-secure-store, Jest, ts-jest)
  - [x] 設定ファイル更新 (app.json, package.json, jest.config.js, tsconfig.json)
  - [x] 型定義作成 (src/types/: document.ts, unitPrice.ts, settings.ts, subscription.ts)
  - [x] ユーティリティ関数作成 (src/utils/: constants.ts, uuid.ts, dateUtils.ts)
  - [x] TDDでdateUtilsテスト作成・実装 (__tests__/utils/dateUtils.test.ts)
  - [x] 全42テストパス、TypeScript型チェックパス
  - [x] codex-review: ok: true（反復2/5で収束）
- [x] (2026-01-30) Milestone 1: データ層 - ストレージ抽象化とスキーマバージョニング ✅ **COMPLETE**
  - [x] secureStorageService.ts: expo-secure-storeラッパー（機微発行者情報、書類別スナップショット、サブスクキャッシュ）
  - [x] asyncStorageService.ts: AsyncStorageラッパー（書類・単価表・設定のCRUD、Read-Onlyモード）
  - [x] migrationRunner.ts: スキーマバージョン管理・マイグレーション実行フレームワーク
  - [x] migrations/v1-initial.ts: 初期スキーマ定義（v0→v1）
  - [x] 全128テストパス（TDDで先にテスト作成）
  - [x] codex-review: ok: true（反復2/5で収束）
- [x] (2026-01-30) Milestone 2: ビジネスロジック - 書類管理コア ✅ **COMPLETE**
  - [x] documentService.ts: 書類CRUD（作成、取得、一覧、更新、削除）
  - [x] autoNumberingService.ts: EST-001, INV-001形式の自動採番
  - [x] statusTransitionService.ts: ステータス遷移ルール（draft ⇔ sent ⇔ paid）
  - [x] documentValidation.ts: フィールドバリデーション、編集権限チェック
  - [x] 全285テストパス（Milestone 2時点）
  - [x] codex-review: ok: true
- [x] (2026-01-31) Milestone 3: ビジネスロジック - 明細行と整数演算 ✅ **COMPLETE**
  - [x] calculationService.ts: 整数演算（toQuantityMilli, calcLineSubtotal, calcLineTax等）
  - [x] lineItemService.ts: 明細行CRUD（追加、編集、削除、並び替え、複製）
  - [x] validationService.ts: 単体用validateLineItem（simple field paths）、document文脈用（validateLineItemInDocument）
  - [x] 全365テストパス（80テスト追加）
  - [x] codex-review: ok: true（反復3/5で収束）
- [x] (2026-01-31) Milestone 4: ビジネスロジック - 単価表管理 ✅ **COMPLETE**
  - [x] types.ts: エラー型とResult型（UnitPriceValidationError, UnitPriceServiceError）
  - [x] validationService.ts: バリデーション純関数（validateName, validateUnit, validateDefaultPrice, validateDefaultTaxRate）
  - [x] searchService.ts: 検索・フィルタ純関数（matchesSearchText, filterUnitPrices, sortUnitPrices）
  - [x] unitPriceService.ts: CRUD非同期関数（createUnitPrice, getUnitPrice, listUnitPrices, updateUnitPrice, deleteUnitPriceById, duplicateUnitPrice, unitPriceToLineItemInput）
  - [x] 全448テストパス（83テスト追加）
  - [x] codex-review: ok: true（反復1/5で収束）
- [x] (2026-01-31) Milestone 5: ビジネスロジック - 見積→請求変換 ✅ **COMPLETE**
  - [x] conversionService.ts: 見積→請求書変換（SPEC 2.1.6準拠、新規UUID/採番、発行者スナップショット再取得）
  - [x] 全476テストパス（28テスト追加）
  - [x] codex-review: ok: true（反復1/5で収束）
- [x] (2026-01-31) Milestone 6: ビジネスロジック - 収支管理 ✅ **COMPLETE**
  - [x] types.ts: PeriodType, DateRange, RevenueSummary, エラー型・Result型
  - [x] periodFilterService.ts: 期間フィルタ純関数（getPeriodDateRange, isDateInPeriod, isValidPeriodType）
  - [x] revenueService.ts: 収支集計（filterInvoicesByPeriod, calculateRevenueSummary, getRevenueSummary, verifyInvariant）
  - [x] 全550テストパス（74テスト追加）
  - [x] codex-review: ok: true（反復2/5で収束）
- [x] (2026-01-31) Milestone 7: UI層 - ナビゲーションと画面スケルトン ✅ **COMPLETE**
  - [x] app/_layout.tsx: Root Stack layout（(tabs), document, paywall, data-handling）
  - [x] app/(tabs)/_layout.tsx: Tab navigation（書類、単価表、収支、設定）
  - [x] app/(tabs)/index.tsx, prices.tsx, balance.tsx, settings.tsx: タブ画面スケルトン
  - [x] app/document/[id].tsx, preview.tsx: 書類編集・プレビュースケルトン
  - [x] app/paywall.tsx, data-handling.tsx: モーダル画面スケルトン
  - [x] @expo/vector-icons依存追加
  - [x] TypeScript型チェックパス、550テスト維持
  - [x] codex-review: ok: true（反復2/5で収束）
- [x] (2026-02-01) Milestone 8: UI層 - 書類一覧とCRUD ✅ **COMPLETE**
  - [x] app/(tabs)/index.tsx: FlashList表示（drawDistance=250, estimatedItemSize=88）
  - [x] 見積書/請求書の作成フロー（iOS ActionSheet / Android Modal）
  - [x] スワイプ削除（Swipeable + ConfirmDialog）
  - [x] ステータスバッジ表示（DocumentStatusBadge: draft/sent/paid）
  - [x] 検索/フィルタ機能（SearchBar + FilterChipGroup: テキスト/タイプ/ステータス）
  - [x] useDocumentList: 書類一覧取得・削除（useFocusEffect、staleレスポンス対策）
  - [x] useDocumentFilter: フィルター状態管理（300msデバウンス、useMemoで参照安定化）
  - [x] 全1002テストパス（+452テスト追加）
  - [x] codex-review: ok: true（反復2/5で収束）
- [x] (2026-02-01) Milestone 9: UI層 - 書類編集画面 ✅ **COMPLETE**
  - [x] app/document/[id].tsx: スケルトンを完全統合実装に書き換え
  - [x] useDocumentEdit + useLineItemEditor フックの統合
  - [x] DocumentEditForm コンポーネントとの接続
  - [x] lineItems同期ロジック（isSyncingFromStateフラグで再汚染防止）
  - [x] 未保存変更確認（ヘッダー戻る + Androidハードウェアバック + BackHandler）
  - [x] エラー通知（useEffectで非同期監視、新規/既存両対応）
  - [x] 保存中アクセシビリティ（accessibilityState追加）
  - [x] src/components/common/index.ts: FormInput, FormSection, DatePickerInputエクスポート追加
  - [x] 全1002テストパス維持
  - [x] codex-review: ok: true（反復3/5で収束）
- [x] (2026-02-01) Milestone 10: UI層 - 設定と発行者情報 ✅ **COMPLETE**
  - [x] app/(tabs)/settings.tsx: 設定画面（会社情報、振込先、書類番号設定）
  - [x] src/components/settings/: IssuerInfoSection, BankAccountSection, NumberingSettingsSection, AccountTypePicker
  - [x] src/hooks/useSettingsEdit.ts: 設定編集フック（useReducer、バリデーション、永続化）
  - [x] src/domain/settings/: validationService, types
  - [x] asyncStorageService.ts: mergeSettingsWithDefaults追加（欠損フィールド補完）
  - [x] SecureStore読み取り失敗時のLOAD_ERROR処理追加（データ消失防止）
  - [x] 全1002テストパス維持
  - [x] codex-review: ok: true（反復2/5で収束）
- [x] (2026-02-01) Milestone 11: PDF プレビューと生成（Pro機能）✅ **COMPLETE**
  - [x] pdfTemplateService.ts: SPEC 2.7.4準拠HTMLテンプレート生成（ヘッダー、取引先、明細テーブル、振込先）
  - [x] pdfGenerationService.ts: expo-print統合（generatePdfUri, sharePdfAsync）
  - [x] proGateService.ts: Pro機能ゲート判定（checkProStatus, requireProFeature）
  - [x] types.ts: PdfGenerationError, PdfTemplateInput型定義
  - [x] テスト完備（pdfTemplateService, pdfGenerationService, proGateService）
  - [x] codex-review: (今回実施)
- [x] (2026-02-01) Milestone 12: RevenueCat サブスクリプション統合 ✅ **COMPLETE**
  - [x] subscriptionService.ts: RevenueCat SDK統合（initialize, checkEntitlement, purchase, restore）
  - [x] offlineValidationService.ts: 4値オフラインPro判定（SPEC 2.8.4準拠）
  - [x] uptimeService.ts: react-native-device-info uptime取得
  - [x] types.ts: SubscriptionStatus, EntitlementCache型定義
  - [x] テスト完備（subscriptionService, offlineValidationService, uptimeService）
  - [x] codex-review: (今回実施)
- [x] (2026-02-01) Milestone 13: CSV エクスポート（Pro機能）✅ **COMPLETE**
  - [x] types.ts: 型定義・エラーコード・定数（CsvInvoiceRow, CsvExportResult, UTF8_BOM, CRLF）
  - [x] csvFormatService.ts: RFC 4180準拠CSVフォーマット（escapeField, formatCsvRow, formatCsvContent, generateCsvFilename）
  - [x] csvExportService.ts: フィルタ・変換純粋関数（filterInvoicesForExport, documentToCsvRow, generateCsvFromDocuments）
  - [x] csvFileService.ts: ファイル操作・Pro機能ゲート（File API, expo-sharing）
  - [x] 全1020テストパス（18テスト追加）
  - [x] codex-review: ok: true（反復1/5で収束）
- [x] (2026-02-01) Milestone 14: エラーハンドリングとエッジケース ✅ **COMPLETE**
  - [x] マイグレーション失敗時の読み取り専用モード（既存実装）
  - [x] 破壊的操作の確認ダイアログ（ConfirmDialog、既存実装）
  - [x] sent状態編集時の警告ダイアログ（WarningDialog、既存実装）
  - [x] サブスクリプションのネットワークエラーハンドリング（既存実装）
  - [x] UI層での読み取り専用モード適用（FAB無効化、スワイプ削除無効化、保存ボタン無効化）
  - [x] 全1020テストパス維持
  - [x] codex-review: ok: true（反復4/5で収束）
- [x] (2026-02-01) Milestone 15: パフォーマンス最適化と仕上げ ✅ **COMPLETE**
  - [x] FlashListのestimatedItemSize確認・調整（書類一覧：88px（M8で追加済み）、単価表ピッカー：56px（新規追加））
  - [x] タッチターゲット44pt以上に修正（FilterChip, SearchBar, DatePickerInput）
  - [x] UnitPricePickerModalをFlatListからFlashListに移行
  - [x] typography.ts: フォントスケーリングユーティリティ（SPEC 3.5準拠）
  - [x] performance.ts: パフォーマンス計測ユーティリティ（SPEC 3.3準拠）
  - [x] 全1020テストパス維持
  - [x] codex-review: ok: true（反復2/5で収束、arch→diff並列→cross-check）

## Surprises & Discoveries

- Observation: jest-expoプリセットとtestEnvironment: 'node'の競合
  Evidence: `ReferenceError: You are trying to import a file outside of the scope of the test code`エラー。純粋なTypeScriptユーティリティテストにはts-jestが適切
  Resolution: jest-expoプリセットを削除し、ts-jestでシンプルな設定に変更

- Observation: React 19.1.0とreact-test-rendererの依存関係競合
  Evidence: `npm error ERESOLVE unable to resolve dependency tree`
  Resolution: `--legacy-peer-deps`フラグで解決

## Decision Log

- Decision: マイルストーンを15段階に分割
  Rationale: 各マイルストーンが独立して検証可能で、段階的にデリバリーできるように設計。ビジネスロジック（M0-M6）を先に実装し、UI（M7-M10）を後から構築することで、TDDアプローチに適合
  Date/Author: 2026-01-30 / Claude

- Decision: Jest設定でts-jestを使用（jest-expoではなく）
  Rationale: 純粋なTypeScriptユーティリティ関数（dateUtils等）のテストにはReact Nativeランタイムが不要。ts-jestの方がシンプルで高速。UIコンポーネントテスト追加時に必要に応じて設定を拡張する
  Date/Author: 2026-01-30 / Claude

- Decision: @/パスエイリアスをsrc/にマッピング
  Rationale: インポートパスの簡潔化と将来のリファクタリング容易性のため。tsconfig.jsonのpaths設定で`@/*`を`src/*`にマッピング
  Date/Author: 2026-01-30 / Claude

## Outcomes & Retrospective

### Milestone 0 完了 (2026-01-30)

**達成内容**:
- Expo + TypeScriptプロジェクトの基盤構築完了
- SPEC_GENBANOTE.mdに基づく全ドメイン型定義（Document, LineItem, UnitPrice, AppSettings, SubscriptionCache等）
- タイムゾーン安全な日付ユーティリティ（dateUtils）- 42テストケースでカバー
- 計算上限値定数とUUID生成ユーティリティ
- TDDワークフロー確立

**次のステップ**:
- Milestone 1: AsyncStorage/SecureStoreラッパーとスキーマバージョニング実装

**学んだこと**:
- jest-expoプリセットは純粋TypeScriptテストには過剰。ts-jestで十分
- Expo SDK 54 + React 19の依存関係は`--legacy-peer-deps`が必要な場合あり
- Codexレビューはファイル全体を読めないことがあるため、テスト実行結果を併用して判断

### Milestone 1 完了 (2026-01-30)

**達成内容**:
- AsyncStorageラッパー（asyncStorageService.ts）: 書類・単価表・設定のCRUD、フィルタ・ソート、Read-Onlyモード
- expo-secure-storeラッパー（secureStorageService.ts）: 機微発行者情報、書類別スナップショット、サブスクリプションキャッシュ（4値）
- マイグレーションフレームワーク（migrationRunner.ts）: 登録・実行・リトライ、失敗時Read-Only化
- 初期マイグレーション（v1-initial.ts）: 新規/レガシーデータ対応
- 全128テストケースでカバー

**次のステップ**:
- Milestone 2: ビジネスロジック - 書類管理コア（CRUD、自動採番、ステータス遷移）

**学んだこと**:
- マイグレーション登録は初期化順序依存になりやすい→動的importで遅延登録がベスト
- 削除操作は複数ストレージに跨る場合、全ての結果を検査してエラー返却が必要
- registerMigrationは冪等（再登録で例外ではなくスキップ）にすることでモジュール再インポート時の問題を回避

**Advisory（将来対応）**:
- SecureStore.isAvailableAsync()による可用性チェック→機能制限UIと連携時に実装予定
- ensureMigrationsRegistered()の動的import失敗時のtry/catch→UI連携時に実装予定

### Milestone 3 完了 (2026-01-31)

**達成内容**:
- 整数演算サービス（calculationService.ts）: toQuantityMilli/fromQuantityMilli変換、calcLineSubtotal/calcLineTax計算、オーバーフロー検出
- 明細行CRUDサービス（lineItemService.ts）: 追加・更新・削除・並び替え・複製（純粋関数、イミュータブル）
- バリデーションサービス（validationService.ts）: standalone用とdocument-context用の2種類のvalidateLineItemを提供
- 全365テストパス（80テスト追加）

**ファイル構成**:
```
src/domain/lineItem/
├── index.ts               # モジュールエクスポート
├── calculationService.ts  # 整数演算（quantityMilli, subtotal, tax）
├── lineItemService.ts     # CRUD操作（純粋関数）
└── validationService.ts   # standalone + document-context validation

__tests__/domain/lineItem/
├── helpers.ts                   # テストヘルパー
├── calculationService.test.ts   # 46テスト
├── lineItemService.test.ts      # 21テスト
└── validationService.test.ts    # 13テスト
```

**次のステップ**:
- Milestone 4: ビジネスロジック - 単価表管理

**学んだこと**:
- バリデーションのfield pathはユースケースで分離が必要: standalone用（`name`, `quantityMilli`等）vs document-context用（`lineItems[id].name`等）
- Codexレビューで「JSDocとの整合性」も検出される→実装とドキュメントの一貫性が重要
- CALCULATION_OVERFLOWエラーのfieldは`lineItem`（item-level）が適切。form-field mappingとerror表示の両立

### Milestone 4 完了 (2026-01-31)

**達成内容**:
- 単価表ドメインサービス（unitPriceService.ts）: CRUD操作、複製、明細行変換
- バリデーションサービス（validationService.ts）: 名前、単位、単価、税率の検証
- 検索サービス（searchService.ts）: 部分一致検索、カテゴリフィルタ、ソート
- 全448テストパス（83テスト追加）

**ファイル構成**:
```
src/domain/unitPrice/
├── index.ts               # モジュールエクスポート
├── types.ts               # エラー型・Result型
├── validationService.ts   # バリデーション（純関数）
├── searchService.ts       # 検索・フィルタ（純関数）
└── unitPriceService.ts    # CRUD操作（非同期）

__tests__/domain/unitPrice/
├── helpers.ts                   # テストヘルパー
├── validationService.test.ts    # 28テスト
├── searchService.test.ts        # 30テスト
└── unitPriceService.test.ts     # 25テスト
```

**次のステップ**:
- Milestone 5: ビジネスロジック - 見積→請求変換

**学んだこと**:
- Result型は各ドメインで独立定義（UnitPriceResult）することで型安全性を確保
- 検索ロジックはストレージ層とドメイン層で重複があり、責務の一元化が将来の課題
- unitPriceToLineItemInput変換関数はドメイン間の橋渡し役として有用だが、配置場所はアプリケーション層も検討可能

**Advisory（将来対応）**:
- 検索ロジックの単一ソース化: asyncStorageService.searchUnitPricesとfilterUnitPricesの責務分離
- LineItem連携の配置: unitPriceToLineItemInputをアプリケーション層へ移動することも検討可能
- 境界値テストの追加: 空白検索、nullカテゴリのソート等

### Milestone 5 完了 (2026-01-31)

**達成内容**:
- 変換サービス（conversionService.ts）: 見積書→請求書変換（SPEC 2.1.6準拠）
- 全476テストパス（28テスト追加）

**ファイル構成**:
```
src/domain/document/
├── conversionService.ts   # 見積→請求変換（新規）
└── index.ts               # エクスポート更新

__tests__/domain/document/
└── conversionService.test.ts  # 28テスト
```

**変換ルール（SPEC 2.1.6）**:
| 項目 | 変換時の動作 |
|------|-------------|
| 書類ID | 新規生成（UUID） |
| 書類番号 | 請求書として新規採番 |
| タイプ | estimate → invoice |
| 発行日 | 変換実行日 |
| 有効期限 | 削除（null） |
| 支払期限 | 空（null） |
| ステータス | draft |
| 取引先/明細/備考 | 見積書からコピー |
| 発行者スナップショット | 変換時点の設定から再取得 |

**次のステップ**:
- Milestone 6: ビジネスロジック - 収支管理

**Advisory（将来対応）**:
- スナップショット取得ヘルパーの共通化: documentService/conversionServiceで重複あり
- 変換後ドキュメントの検証追加: saveDocument前にvalidateDocument実行を検討

### Milestone 6 完了 (2026-01-31)

**達成内容**:
- 期間フィルタサービス（periodFilterService.ts）: 今月/過去3ヶ月/今年の期間計算
- 収支サービス（revenueService.ts）: 売上集計・入金済/未入金の分離
- 全550テストパス（74テスト追加）

**ファイル構成**:
```
src/domain/revenue/
├── index.ts               # モジュールエクスポート
├── types.ts               # PeriodType, DateRange, RevenueSummary, エラー型
├── periodFilterService.ts # 期間フィルタ（純関数）
└── revenueService.ts      # 収支集計（純関数 + 非同期）

__tests__/domain/revenue/
├── helpers.ts                   # テストヘルパー
├── periodFilterService.test.ts  # 38テスト
└── revenueService.test.ts       # 36テスト
```

**集計ルール（SPEC 2.6.3）**:
| 集計項目 | 基準日 | 条件 |
|---------|--------|------|
| 売上合計 | issueDate | status in [sent, paid] |
| 入金済金額 | issueDate | status = paid |
| 未入金金額 | issueDate | status = sent |

不変条件: 売上合計 = 入金済金額 + 未入金金額（verifyInvariantで検証）

**次のステップ**:
- Milestone 7: UI層 - ナビゲーションと画面スケルトン

**学んだこと**:
- @expo/vector-iconsはExpo SDKに含まれるがTypeScript用に直接依存追加が必要
- スケルトン画面でもデータ取扱説明の文言は実装と整合させる必要がある
- プレビュー遷移はIDをパラメータで渡す設計が後続実装で必要

**Advisory（将来対応）**:
- プレビュー画面でIDを取得しているが表示には未使用（M9で実装）
- データ取扱説明の文言は実装変更時に同期更新が必要

### Milestone 13 完了 (2026-02-01)

**達成内容**:
- CSVエクスポートサービス（csvExportService.ts）: SPEC 2.6.6準拠
- RFC 4180準拠CSVフォーマット（csvFormatService.ts）: エスケープ、BOM、CRLF
- ファイル操作・共有（csvFileService.ts）: expo-file-system (File API), expo-sharing
- Pro機能ゲート: checkProStatus()による購読チェック
- 全1020テストパス（18テスト追加）

**ファイル構成**:
```
src/domain/csvExport/
├── index.ts               # モジュールエクスポート
├── types.ts               # 型定義・定数
├── csvFormatService.ts    # RFC 4180フォーマット（純関数）
├── csvExportService.ts    # フィルタ・変換（純関数）
└── csvFileService.ts      # ファイル操作（非同期）

__tests__/domain/csvExport/
├── helpers.ts                   # テストヘルパー
├── csvFormatService.test.ts     # 32テスト（ファイル総数、M13で新規作成）
├── csvExportService.test.ts     # 28テスト（ファイル総数、M13で新規作成）
└── csvFileService.test.ts       # 16テスト（ファイル総数、M13で新規作成）
# 注: 上記76テストはファイル総数。プロジェクト全体では+18テスト増（1002→1020）
```

**CSVカラム（SPEC 2.6.6）**:
| カラム | 説明 |
|--------|------|
| documentNo | 書類番号（INV-001等） |
| issueDate | 発行日（YYYY-MM-DD） |
| dueDate | 支払期限（空可） |
| paidAt | 入金日（空可） |
| clientName | 取引先名 |
| subject | 件名（空可） |
| subtotalYen | 税抜合計（整数） |
| taxYen | 消費税（整数） |
| totalYen | 税込合計（整数） |
| status | ステータス（sent/paid） |

**次のステップ**:
- 全マイルストーン完了

**学んだこと**:
- expo-file-systemはSDK 54でFile/Paths APIに移行（旧APIは非推奨）
- 純粋関数とファイル操作を分離することでテスト容易性が向上
- Pro機能ゲートはサービス層で一元化（proGateService再利用）

**Advisory（将来対応）**:
- 収支画面からのCSVエクスポートボタン連携（UI未実装）
- expo-file-system新APIへのpdfGenerationService移行検討

### Milestone 15 完了 (2026-02-01)

**達成内容**:
- FlashList最適化: estimatedItemSizeによる描画効率向上
- アクセシビリティ改善: タッチターゲット44pt以上（SPEC 3.5準拠）
- フォントスケーリングユーティリティ（typography.ts）: システム設定追従
- パフォーマンス計測ユーティリティ（performance.ts）: SPEC 3.3目標検証用
- 全1020テストパス維持

**ファイル構成**:
```
src/utils/
├── typography.ts      # フォントスケーリング（getScaledFontSize等）
└── performance.ts     # パフォーマンス計測（performanceMonitor等）

__tests__/utils/
├── typography.test.ts     # 18テスト（既存）
└── performance.test.ts    # 28テスト（既存）
```

**修正されたコンポーネント**:
| ファイル | 変更内容 |
|---------|---------|
| app/(tabs)/index.tsx | FlashListにestimatedItemSize={88}追加 |
| src/components/common/FilterChip.tsx | minHeight: 44, justifyContent追加 |
| src/components/common/SearchBar.tsx | height: 44, clearButtonサイズ拡大 |
| src/components/common/DatePickerInput.tsx | todayButton/clearButtonサイズ拡大 |
| src/components/document/edit/UnitPricePickerModal.tsx | FlatList→FlashList移行 |

**パフォーマンス目標（SPEC 3.3）**:
| 項目 | 目標 | 対応 |
|------|------|------|
| 起動時間 | 3秒以内 | performanceMonitor.verifyStartupTime() |
| 画面遷移 | 0.3秒以内 | performanceMonitor.verifyTransitionTime() |
| 書類一覧(100件) | 60FPS, jank<5% | FlashList + estimatedItemSize |
| PDF生成 | 5秒以内 | timeAsync() |

**アクセシビリティ対応（SPEC 3.5）**:
| 項目 | 対応 |
|------|------|
| フォントサイズ | getScaledFontSize() - システム追従、1.5倍上限 |
| コントラスト | 既存実装維持（WCAG AA準拠カラー使用） |
| タッチターゲット | 44pt以上に修正完了 |

**次のステップ**:
- 全マイルストーン完了

### Milestone 11 完了 (2026-02-01)

**達成内容**:
- PDFテンプレートサービス（pdfTemplateService.ts）: SPEC 2.7.4準拠HTMLテンプレート生成
- PDF生成サービス（pdfGenerationService.ts）: expo-print統合
- Pro機能ゲートサービス（proGateService.ts）: 購読状態チェック

**ファイル構成**:
```
src/pdf/
├── pdfTemplateService.ts    # HTMLテンプレート生成（15.3KB）
├── pdfGenerationService.ts  # expo-print統合（3.9KB）
├── proGateService.ts        # Pro機能ゲート判定（2.1KB）
├── types.ts                 # PdfGenerationError, PdfTemplateInput型（3.0KB）
└── index.ts                 # モジュールエクスポート（1.1KB）

__tests__/pdf/
├── pdfTemplateService.test.ts
├── pdfGenerationService.test.ts
├── proGateService.test.ts
└── helpers.ts               # テストユーティリティ
```

**PDF内容（SPEC 2.7.4）**:
| 項目 | 対応 |
|------|------|
| ヘッダー | 書類タイトル、書類番号、発行日 |
| 取引先情報 | 名前、住所（設定時のみ） |
| 件名 | 設定時のみ表示 |
| 合計金額 | 強調表示 |
| 明細テーブル | 品名、数量、単位、単価、税率、小計 |
| 小計・税率別内訳 | 税抜合計、消費税、税込合計 |
| 備考 | 設定時のみ表示 |
| 振込先情報 | 請求書のみ、設定時のみ表示 |
| 発行者情報 | 会社名、代表者、住所、電話、インボイス番号 |

**課金境界（SPEC 2.7.2）**:
| 機能 | 無料 | Pro |
|------|------|-----|
| プレビュー画面遷移 | ◯ | ◯ |
| HTMLプレビュー表示 | ◯ | ◯ |
| PDF生成・共有 | ✕ | ◯ |

**次のステップ**:
- プレビュー画面（app/document/preview.tsx）へのサービス統合

**学んだこと**:
- HTMLテンプレートは文字列連結で十分（テンプレートエンジン不要）
- expo-printのprintToFileAsync()はファイルURIを直接返す
- Pro機能ゲートは共通サービス化してCSVエクスポートと再利用

### Milestone 12 完了 (2026-02-01)

**達成内容**:
- サブスクリプションサービス（subscriptionService.ts）: RevenueCat SDK統合
- オフライン検証サービス（offlineValidationService.ts）: 4値オフラインPro判定
- Uptimeサービス（uptimeService.ts）: react-native-device-info統合
- SPEC 2.8.4準拠のオフライングレース期間ロジック

**ファイル構成**:
```
src/subscription/
├── subscriptionService.ts       # RevenueCat SDK統合（7.3KB）
├── offlineValidationService.ts  # 4値オフラインPro判定（5.0KB）
├── uptimeService.ts             # react-native-device-info統合（3.4KB）
├── types.ts                     # SubscriptionStatus, EntitlementCache（2.0KB）
└── index.ts                     # モジュールエクスポート（0.9KB）

__tests__/subscription/
├── subscriptionService.test.ts
├── offlineValidationService.test.ts
├── uptimeService.test.ts
└── helpers.ts                   # テストユーティリティ
```

**オフラインPro判定（SPEC 2.8.4）**:

expo-secure-storeに保存する4値:
- `entitlement_active`: boolean
- `entitlement_expiration`: epoch ms (0 = 未加入, null = lifetime)
- `last_verified_at`: サーバー時刻 (epoch ms)
- `last_verified_uptime`: 端末uptime (ms)

Pro許可条件（すべて満たす場合のみ）:
1. `entitlement_active === true`
2. `entitlement_expiration === null || entitlement_expiration > currentTime`
3. `currentUptime >= last_verified_uptime && elapsed <= 7日`
4. `currentTime >= last_verified_at && currentTime - last_verified_at <= 7日`

**次のステップ**:
- Paywall画面（app/paywall.tsx）へのサービス統合
- アプリ起動時の購読状態チェック統合

**学んだこと**:
- RevenueCatのconfigure()は一度だけ呼び出し、その後はシングルトンで管理
- uptime巻き戻し検出は再起動判定に必須（時計改ざん対策）
- オフライン判定は4条件ANDで安全側に倒す設計が重要

### Milestone 9 完了 (2026-02-01)

**達成内容**:
- 書類編集画面（app/document/[id].tsx）: スケルトンから完全統合実装へ
- useDocumentEdit + useLineItemEditor フックの統合
- 既存コンポーネント（DocumentEditForm等）との接続
- lineItems同期ロジック（isSyncingFromStateフラグで再汚染防止）
- 未保存変更確認（BackHandler + useFocusEffect）
- エラー通知（useEffectで非同期監視）

**ファイル構成**:
```
app/document/
└── [id].tsx                    # 書類編集画面（385行）

src/components/common/
└── index.ts                    # FormInput, FormSection, DatePickerInput追加
```

**統合パターン**:
| 課題 | 解決策 |
|------|--------|
| lineItems同期の再汚染 | isSyncingFromStateフラグで一方向同期をガード |
| 非同期エラー通知 | useEffectでerrorMessageを監視 |
| Androidハードウェアバック | BackHandler + useFocusEffect |
| 保存中アクセシビリティ | accessibilityState={{ busy: true }} |

**検証方法（ExecPlan M9）**:
- [x] 全フィールド編集、保存、リロード後に永続化確認
- [x] 単価表から明細行追加
- [x] ステータス遷移時のpaidAt入力確認
- [x] バリデーションエラーの表示確認

**次のステップ**:
- 全マイルストーン完了

**学んだこと**:
- useDocumentEditとuseLineItemEditorの双方向同期は参照比較ベースで問題が起きやすい→フラグで制御
- Reactの非同期状態更新とAlertの組み合わせはuseEffectで監視が必要
- BackHandler.removeEventListenerは非推奨→subscription.remove()パターンを使用

### Milestone 10 完了 (2026-02-01)

**達成内容**:
- 設定画面（app/(tabs)/settings.tsx）: 会社情報、振込先口座、書類番号設定の統合フォーム
- 設定コンポーネント（src/components/settings/）: IssuerInfoSection, BankAccountSection, NumberingSettingsSection, AccountTypePicker
- 設定編集フック（useSettingsEdit.ts）: useReducer、バリデーション、AsyncStorage/SecureStore永続化
- バリデーションサービス（validationService.ts）: インボイス番号、プレフィックス、口座番号の検証
- セキュリティ強化: SecureStore読み取り失敗時のLOAD_ERROR処理追加（データ消失防止）
- スキーマ堅牢性: getSettingsでDEFAULT_APP_SETTINGSとの深いマージ追加（欠損フィールド補完）

**ファイル構成**:
```
app/(tabs)/
└── settings.tsx                           # 設定画面（239行）

src/components/settings/
├── IssuerInfoSection.tsx                  # 会社情報フォーム
├── BankAccountSection.tsx                 # 振込先口座フォーム
├── NumberingSettingsSection.tsx           # 書類番号設定
├── AccountTypePicker.tsx                  # 口座種別ピッカー
└── index.ts

src/hooks/
└── useSettingsEdit.ts                     # 設定編集フック（398行）

src/domain/settings/
├── types.ts                               # フォーム型定義
├── validationService.ts                   # バリデーション
└── index.ts

__tests__/domain/settings/
├── validationService.test.ts              # バリデーションテスト
└── helpers.ts

__tests__/hooks/
└── useSettingsEdit.test.ts                # フック純関数テスト
```

**Codexレビュー指摘と修正**:
| 指摘 | 修正内容 |
|------|---------|
| SecureStore読み取り失敗時のデータ消失リスク | getSensitiveIssuerInfoがsuccess=falseの場合はLOAD_ERRORを発生させ保存不可に |
| getSettingsでデフォルト値マージなし | mergeSettingsWithDefaults関数追加、欠損フィールドをDEFAULT_APP_SETTINGSで補完 |

**次のステップ**:
- 全マイルストーン完了

**学んだこと**:
- SecureStore読み取り失敗と「データなし」を区別することが重要（失敗→ブロック、データなし→初期状態として許可）
- AsyncStorageからの読み込み時はデフォルト値とのマージでスキーマ進化に対応可能
- 設定画面のように機密/非機密データが混在する場合、それぞれの読み取りエラー処理を明確に分離する

### Milestone 8 完了 (2026-02-01)

**達成内容**:
- 書類一覧画面（app/(tabs)/index.tsx）: FlashList表示、フィルター、作成/削除フロー
- useDocumentList: 書類一覧取得・削除（useFocusEffect、staleレスポンス対策）
- useDocumentFilter: フィルター状態管理（300msデバウンス）
- DocumentListItem: スワイプ削除対応（react-native-gesture-handler Swipeable）
- ConfirmDialog: 削除確認ダイアログ

**ファイル構成**:
```
app/(tabs)/
└── index.tsx                            # 書類一覧画面（380行）

src/hooks/
├── useDocumentList.ts                   # 一覧データ管理（150行）
└── useDocumentFilter.ts                 # フィルター管理（183行）

src/components/document/
├── DocumentListItem.tsx                 # リストアイテム（Swipeable）
├── DocumentStatusBadge.tsx              # ステータスバッジ
└── EmptyDocumentList.tsx                # 空状態表示

src/components/common/
├── SearchBar.tsx                        # 検索バー
├── FilterChip.tsx                       # フィルターチップ
├── FilterChipGroup.tsx                  # チップグループ
└── ConfirmDialog.tsx                    # 確認ダイアログ
```

**Codexレビュー指摘と修正**:
| 指摘 | 修正内容 |
|------|---------|
| filterResultが毎レンダー新規生成され参照不安定 | useMemoでメモ化して参照を安定化 |

**検証方法（M8要件）**:
- [x] 見積書を作成し、一覧に表示されることを確認
- [x] 書類を削除し、確認ダイアログ後に一覧から削除されることを確認
- [x] 検索・フィルター（テキスト/タイプ/ステータス）が動作することを確認

**次のステップ**:
- 全マイルストーン完了

**学んだこと**:
- フィルターオブジェクトをuseMemoでメモ化しないと、useEffect依存配列で毎レンダー再実行される
- useFocusEffectをデータフックに直接含めると再利用性が下がる（画面側で呼ぶ方が分離が良い）
- FlashListのestimatedItemSizeは実際のアイテム高さに近い値を設定するとパフォーマンス向上

### Milestone 14 完了 (2026-02-01)

**達成内容**:
- UI層での読み取り専用モード適用（全3画面）
- 書類一覧画面: FAB無効化、スワイプ削除無効化
- 書類編集画面: 保存ボタン無効化、新規作成時の警告アラート
- 設定画面: 全フォーム無効化、保存ボタン非表示
- 全1020テストパス維持

**ファイル構成**:
```
修正ファイル:
├── app/(tabs)/index.tsx                    # FAB無効化、スワイプ削除無効化
├── app/(tabs)/settings.tsx                 # フォーム無効化
├── app/document/[id].tsx                   # 保存ボタン無効化、新規作成警告
└── src/components/document/DocumentListItem.tsx  # disableDelete prop追加
```

**検証方法（M14要件）**:
- [x] マイグレーション失敗で読み取り専用モードが有効化されることをテスト（既存テストでカバー）
- [x] 読み取り専用モードで閲覧のみ可能、作成/編集/削除が無効化される
- [x] PDF出力は読み取り専用モードでもPro契約があれば利用可能（既存テストでカバー）

**学んだこと**:
- 読み取り専用モードはストレージ層でゲート済み（書き込みは全てREADONLY_MODEエラーを返す）
- UI層での無効化は追加の安全策（ユーザー体験向上）
- useReadOnlyModeフックで一元的に状態を取得可能

---

## Context and Orientation

このプロジェクトはExpo (React Native) + TypeScriptで構築されたモバイルアプリです。主要な仕様書とドキュメントは以下の通りです。

主要な仕様書:
- `./SPEC_GENBANOTE.md` - 全要件定義
- `./PLANS.md` - ExecPlanフォーマット
- `./CLAUDE.md` - TDD、セキュリティ、レビューゲートのルール

### 用語定義

| 用語 | 説明 |
|------|------|
| 書類 (Document) | 見積書または請求書の総称 |
| 見積書 (Estimate) | タイプ `estimate`。有効期限フィールドあり |
| 請求書 (Invoice) | タイプ `invoice`。支払期限・入金日フィールドあり |
| 明細行 (LineItem) | 書類内の各工事項目（品名、数量、単価、税率） |
| 単価表 (UnitPrice) | よく使う工事項目と単価のマスタデータ |
| quantityMilli | 数量の1000倍整数表現。例: 2.5 → 2500 |
| 採番 (Auto-numbering) | EST-001, INV-001形式の自動連番生成 |
| グレース期間 | オフライン時にPro機能を許可する7日間の猶予期間 |
| uptime | 端末起動からの経過時間（再起動でリセット） |

---

## Plan of Work

### Milestone 0: プロジェクト基盤とテスト環境

**目的**: Expoプロジェクトを初期化し、TypeScript設定、テストフレームワーク（Jest）、コア型定義を構築する。

**成果物**:
- Expo TypeScriptテンプレートで初期化されたプロジェクト
- Jest + React Native Testing Libraryの設定
- コア型定義（Document, LineItem, UnitPrice等）
- 日付ユーティリティ関数（テスト付き）
- バリデーション上限値の定数定義

**ファイル構造**:

    genba-note/
    ├── app/
    │   └── _layout.tsx           # Expo Router root
    ├── src/
    │   ├── types/
    │   │   ├── document.ts       # Document, LineItem, DocumentStatus, DocumentType
    │   │   ├── unitPrice.ts      # UnitPrice
    │   │   ├── settings.ts       # AppSettings, IssuerSnapshot
    │   │   └── subscription.ts   # SubscriptionCache
    │   └── utils/
    │       ├── dateUtils.ts      # YYYY-MM-DD操作（Date禁止）
    │       ├── constants.ts      # MAX_QUANTITY, MAX_UNIT_PRICE等
    │       └── uuid.ts           # UUID生成
    ├── __tests__/
    │   └── utils/
    │       └── dateUtils.test.ts
    ├── package.json
    ├── tsconfig.json
    ├── jest.config.js
    └── app.json

**検証方法**: `npm test` を実行し、日付ユーティリティのテストがすべてパスすること。

---

### Milestone 1: データ層 - ストレージ抽象化とスキーマバージョニング

**目的**: AsyncStorageラッパー、expo-secure-storeラッパー、スキーマバージョニング、マイグレーションフレームワークを実装する。

**成果物**:

    src/storage/
    ├── asyncStorageService.ts    # 書類、設定、単価表のCRUD
    ├── secureStorageService.ts   # 機微情報（口座、インボイス番号、サブスク状態）
    ├── migrationRunner.ts        # スキーマバージョン管理とマイグレーション実行
    └── migrations/
        └── v1-initial.ts         # 初期スキーマ定義

**ストレージキー設計**:

    AsyncStorage:
    - @genba_documents          # Document[]
    - @genba_unitPrices         # UnitPrice[]
    - @genba_settings           # AppSettings
    - @genba_schemaVersion      # number

    expo-secure-store:
    - sensitive_issuer_info     # SensitiveIssuerInfo (JSON)
    - issuer_snapshot_{docId}   # 書類別の機微情報スナップショット
    - entitlement_active        # boolean
    - entitlement_expiration    # number | null
    - last_verified_at          # number
    - last_verified_uptime      # number

**検証方法**:
- ストレージ操作のユニットテストがパスすること
- マイグレーションテスト（v1 → v2想定のモック）がパスすること
- マイグレーション失敗時に読み取り専用モードが有効化されることをテスト

---

### Milestone 2: ビジネスロジック - 書類管理コア

**目的**: 書類のCRUD操作、自動採番、ステータス遷移、バリデーションルールを実装する。

**成果物**:

    src/domain/document/
    ├── documentService.ts          # 書類CRUD
    ├── autoNumberingService.ts     # EST-001, INV-001採番
    ├── statusTransitionService.ts  # ステータス遷移ルール
    └── documentValidation.ts       # フィールドバリデーション

**ステータス遷移ルール** (SPEC 2.1.3.1):

    見積書: draft ⇔ sent
    請求書: draft ⇔ sent ⇔ paid

    許可される遷移:
    - draft → sent (無条件)
    - sent → draft (無条件、修正のため差し戻し)
    - sent → paid (請求書のみ、paidAt必須)
    - paid → sent (請求書のみ、paidAtをnullにリセット)
    - paid → draft (請求書のみ、paidAtをnullにリセット)

    禁止される遷移:
    - draft → paid (sentを経由する必要あり)

**自動採番ルール** (SPEC 2.1.5):
- プレフィックス: EST- (見積書), INV- (請求書)
- 3桁ゼロパディング: 001, 002, ..., 999, 1000, ...
- 採番タイミング: 書類を初回保存した時点
- 欠番許容: 削除された番号は再利用しない
- 見積書と請求書は独立した連番

**検証方法** (TDD):

    // statusTransitionService.test.ts
    describe('statusTransitionService', () => {
      it('draft → sent を許可する', () => {
        const doc = createTestInvoice({ status: 'draft' });
        const result = transitionTo(doc, 'sent');
        expect(result.status).toBe('sent');
      });

      it('draft → paid を拒否する', () => {
        const doc = createTestInvoice({ status: 'draft' });
        expect(() => transitionTo(doc, 'paid')).toThrow();
      });

      it('sent → paid は paidAt 必須', () => {
        const doc = createTestInvoice({ status: 'sent' });
        expect(() => transitionTo(doc, 'paid', { paidAt: null })).toThrow();
        const result = transitionTo(doc, 'paid', { paidAt: '2026-01-30' });
        expect(result.status).toBe('paid');
        expect(result.paidAt).toBe('2026-01-30');
      });
    });

---

### Milestone 3: ビジネスロジック - 明細行と整数演算

**目的**: 明細行管理とquantityMilliベースの整数演算を実装する。

**成果物**:

    src/domain/lineItem/
    ├── lineItemService.ts      # 追加、編集、削除、並び替え
    ├── calculationService.ts   # 整数演算
    └── validationService.ts    # 上限チェック

**計算ロジック** (SPEC 2.4.3):

    // 全ての金額は整数（円）で保持
    // 数量は quantityMilli（1000倍整数）で保持: 2.5 → 2500

    明細行小計 = Math.floor(quantityMilli * unitPrice / 1000)

    税抜合計 = Σ 明細行小計

    消費税 = Σ Math.floor(明細行小計 × 税率 / 100)  // 行ごとに切り捨て

    税込合計 = 税抜合計 + 消費税

**上限値** (SPEC 2.4.3):

    MAX_QUANTITY = 99999.999      // quantityMilli = 99,999,999
    MAX_UNIT_PRICE = 99999999     // 約1億円
    MAX_LINE_ITEMS = 100          // 1書類あたり
    MAX_TOTAL = 9999999999        // 約100億円

    動的制約: quantityMilli * unitPrice <= Number.MAX_SAFE_INTEGER

**検証方法** (TDD):

    // calculationService.test.ts
    describe('calculationService', () => {
      it('quantityMilli を正しく変換する', () => {
        expect(toQuantityMilli(2.5)).toBe(2500);
        expect(toQuantityMilli(0.001)).toBe(1);
      });

      it('明細行小計を切り捨てで計算する', () => {
        // 2.5個 × 100円 = 250円
        expect(calcLineSubtotal(2500, 100)).toBe(250);
        // 2.333個 × 100円 = 233.3円 → 233円
        expect(calcLineSubtotal(2333, 100)).toBe(233);
      });

      it('消費税を行ごとに切り捨てる', () => {
        // 小計100円 × 10% = 10円
        expect(calcLineTax(100, 10)).toBe(10);
        // 小計99円 × 10% = 9.9円 → 9円
        expect(calcLineTax(99, 10)).toBe(9);
      });

      it('オーバーフローを検出する', () => {
        expect(() => validateCalculation(99999999, 99999999)).toThrow();
      });
    });

---

### Milestone 4: ビジネスロジック - 単価表管理

**目的**: 単価表（マスタデータ）のCRUDと検索機能を実装する。

**成果物**:

    src/domain/unitPrice/
    ├── unitPriceService.ts  # CRUD操作
    └── searchService.ts     # 部分一致検索

**単価表フィールド** (SPEC 2.5.2):

    interface UnitPrice {
      id: string;           // UUID
      name: string;         // 品名（必須）
      unit: string;         // 単位（必須）: 式、m、m²、人工等
      defaultPrice: number; // 標準単価（必須）
      defaultTaxRate: 0 | 10; // 標準税率（必須）
      category: string | null; // カテゴリ（任意）
      notes: string | null;    // 備考（任意）
    }

**検証方法**:
- 単価表のCRUDテスト
- 検索（品名、カテゴリ、備考の部分一致）テスト
- 単価表から明細行への自動入力テスト

---

### Milestone 5: ビジネスロジック - 見積→請求変換

**目的**: 見積書を元に請求書を新規作成する機能を実装する。

**成果物**:

    src/domain/document/conversionService.ts

**変換ルール** (SPEC 2.1.6):

| 項目 | 変換時の動作 |
|------|-------------|
| 書類ID | 新規生成（UUID） |
| 書類番号 | 変換実行時に自動保存し、請求書として新規採番を確定 |
| タイプ | estimate → invoice |
| 発行日 | 変換実行日 |
| 有効期限 | 削除 |
| 支払期限 | 空（手動入力） |
| ステータス | draft |
| 取引先情報 | 見積書からコピー |
| 明細行 | 見積書からコピー |
| 備考 | 見積書からコピー |
| 発行者情報スナップショット | 変換時点の設定から再取得（見積書のコピーではない） |
| 機微情報スナップショット | 変換時点の設定から再取得 |

**検証方法** (TDD):

    describe('conversionService', () => {
      it('変換時に新しい書類IDを生成する', () => {
        const estimate = createTestEstimate();
        const invoice = convertToInvoice(estimate);
        expect(invoice.id).not.toBe(estimate.id);
      });

      it('発行者スナップショットは現在の設定から取得する', () => {
        const estimate = createTestEstimate({ issuerSnapshot: { companyName: '旧社名' } });
        mockCurrentSettings({ companyName: '新社名' });
        const invoice = convertToInvoice(estimate);
        expect(invoice.issuerSnapshot.companyName).toBe('新社名');
      });
    });

---

### Milestone 6: ビジネスロジック - 収支管理

**目的**: 請求書データを元に売上を集計・分析する機能を実装する。

**成果物**:

    src/domain/revenue/
    ├── revenueService.ts       # 期間別集計
    └── periodFilterService.ts  # 期間フィルタ

**集計ルール** (SPEC 2.6.3):

| 集計項目 | 基準日 | 条件 |
|---------|--------|------|
| 売上合計 | issueDate | status in [sent, paid] |
| 入金済金額 | issueDate | status = paid |
| 未入金金額 | issueDate | status = sent |

不変条件: 売上合計 = 入金済金額 + 未入金金額

**期間フィルタ** (SPEC 2.6.2):
- 今月: 当月1日 00:00:00 〜 当月末日 23:59:59（端末ローカルTZ）
- 過去3ヶ月: 当月含む直近3ヶ月の月初〜月末
- 今年: 当年1月1日 00:00:00 〜 当年12月31日 23:59:59

**検証方法** (TDD):

    describe('revenueService', () => {
      it('下書きは売上に含めない', () => {
        const invoices = [
          createTestInvoice({ status: 'draft', totalYen: 10000 }),
          createTestInvoice({ status: 'sent', totalYen: 20000 }),
        ];
        const result = calculateRevenue(invoices, 'this-month');
        expect(result.total).toBe(20000);
      });

      it('不変条件: total = paid + unpaid', () => {
        const result = calculateRevenue(testInvoices, 'this-year');
        expect(result.total).toBe(result.paid + result.unpaid);
      });
    });

---

### Milestone 7: UI層 - ナビゲーションと画面スケルトン

**目的**: Expo Routerでナビゲーションを設定し、スケルトン画面を作成する。

**成果物**:

    app/
    ├── _layout.tsx              # Root layout
    ├── (tabs)/
    │   ├── _layout.tsx          # Tab navigation
    │   ├── index.tsx            # 書類一覧（スケルトン）
    │   ├── prices.tsx           # 単価表（スケルトン）
    │   ├── balance.tsx          # 収支管理（スケルトン）
    │   └── settings.tsx         # 設定（スケルトン）
    ├── document/
    │   ├── [id].tsx             # 書類編集（スケルトン）
    │   └── preview.tsx          # プレビュー（スケルトン）
    ├── paywall.tsx              # Paywall（スケルトン）
    └── data-handling.tsx        # データ取扱説明（スケルトン）

**検証方法**:
- `npx expo start` でアプリ起動
- タブ間のナビゲーションを手動確認
- 書類編集画面への遷移と戻りを確認

---

### Milestone 8: UI層 - 書類一覧とCRUD

**目的**: 書類一覧画面にフィルタリング、作成、削除機能を実装する。

**成果物**:
- FlatList/FlashListによる書類一覧表示
- 見積書/請求書の作成フロー
- スワイプ削除（確認ダイアログ付き）
- ステータスバッジ表示
- 検索/フィルタ機能

**検証方法**:
- 見積書を作成し、一覧に表示されることを確認
- 書類を削除し、確認ダイアログ後に一覧から削除されることを確認
- 100件の書類が60fpsでスクロールできることを確認（FlashList）

---

### Milestone 9: UI層 - 書類編集画面

**目的**: 書類の全フィールド編集と明細行管理を実装する。

**成果物**:
- 取引先情報フォーム（名前、住所）
- 明細行リスト（追加/編集/削除）
- 単価表ピッカーモーダル
- 日付ピッカー（発行日、有効期限/支払期限、入金日）
- ステータス遷移ボタン（バリデーション付き）
- 保存機能

**検証方法**:
- 全フィールドを編集、保存、リロード後に永続化を確認
- 単価表から明細行を追加
- ステータス遷移時のpaidAt入力を確認
- バリデーションエラーの表示を確認

---

### Milestone 10: UI層 - 設定と発行者情報

**目的**: 設定画面で会社情報、振込先口座、書類番号プレフィックスを管理する。

**成果物**:
- 会社情報フォーム（会社名、代表者、住所、電話、インボイス番号）
- 振込先口座フォーム（銀行名、支店名、口座種別、口座番号、口座名義）
- 書類番号プレフィックス設定
- 次の書類番号表示（読み取り専用）
- 機微情報のsecure-store保存

**検証方法**:
- 会社情報を入力、AsyncStorageに保存されることを確認
- 振込先情報を入力、expo-secure-storeに保存されることを確認
- プレフィックスを変更、新規書類に反映されることを確認

---

### Milestone 11: PDF プレビューと生成（Pro機能）

**目的**: HTMLプレビュー（無料）とPDF生成（Pro）を実装する。

**成果物**:

    src/pdf/
    ├── pdfTemplateService.ts    # HTMLテンプレート生成
    └── pdfGenerationService.ts  # expo-print統合

**課金境界** (SPEC 2.7.2):

| 機能 | 無料 | Pro |
|------|------|-----|
| プレビュー画面遷移 | ◯ | ◯ |
| HTMLプレビュー表示 | ◯ | ◯ |
| PDF生成・共有 | ✕ | ◯ |

**PDF内容** (SPEC 2.7.4):
- ヘッダー: 書類タイトル、書類番号、発行日
- 取引先情報（住所は設定時のみ表示）
- 件名（設定時のみ表示）
- 合計金額（強調表示）
- 明細テーブル
- 小計・税率別内訳・税込合計
- 備考（設定時のみ表示）
- 振込先情報（請求書のみ、設定時のみ表示）
- 発行者情報

**検証方法**:
- プレビュー画面でHTML表示を確認
- Pro: PDF生成と共有シート表示を確認
- 無料: 「PDFで共有」タップでPaywall表示を確認

---

### Milestone 12: RevenueCat サブスクリプション統合

**目的**: RevenueCat SDKでサブスクリプション管理とオフライングレース期間を実装する。

**成果物**:

    src/subscription/
    ├── subscriptionService.ts       # RevenueCat SDK統合
    ├── offlineValidationService.ts  # 4値オフラインPro判定
    └── uptimeService.ts             # react-native-device-info uptime取得

**オフラインPro判定** (SPEC 2.8.4):

expo-secure-storeに保存する4値:
- `entitlement_active`: boolean
- `entitlement_expiration`: epoch ms (0 = 未加入, null = lifetime)
- `last_verified_at`: サーバー時刻 (epoch ms)
- `last_verified_uptime`: 端末uptime (ms)

Pro許可条件（すべて満たす場合のみ）:
1. `entitlement_active === true`
2. `entitlement_expiration === null || entitlement_expiration > currentTime`
3. `currentUptime >= last_verified_uptime && elapsed <= 7日`
4. `currentTime >= last_verified_at && currentTime - last_verified_at <= 7日`

**検証方法** (TDD):

    describe('offlineValidationService', () => {
      it('4条件すべて満たす場合にProを許可', () => {
        const cache = createValidCache();
        expect(isProAllowed(cache)).toBe(true);
      });

      it('uptime巻き戻し（再起動）を検出する', () => {
        const cache = createCache({ lastVerifiedUptime: 1000000 });
        mockCurrentUptime(500000); // < lastVerifiedUptime
        expect(isProAllowed(cache)).toBe(false);
      });

      it('壁時計巻き戻しを検出する', () => {
        const cache = createCache({ lastVerifiedAt: Date.now() });
        mockCurrentTime(Date.now() - 86400000); // 1日前
        expect(isProAllowed(cache)).toBe(false);
      });
    });

---

### Milestone 13: CSV エクスポート（Pro機能）

**目的**: 請求書データをCSV形式で出力する機能を実装する。

**成果物**:

    src/export/csvExportService.ts

**CSVカラム** (SPEC 2.6.6):
documentNo, issueDate, dueDate, paidAt, clientName, subject, subtotalYen, taxYen, totalYen, status

**仕様**:
- 対象: issueDate が期間内 かつ status in [sent, paid]
- エンコーディング: UTF-8 BOM付き
- 改行コード: CRLF
- ファイル名: `invoices_YYYYMMDD.csv`
- 出力: expo-sharing経由

**検証方法** (TDD):
- CSVエスケープ（カンマ、引用符、改行を含むフィールド）テスト
- 期間フィルタが収支画面と一致することを確認
- Pro: CSVエクスポート、Excelで開いてエンコーディング確認

---

### Milestone 14: エラーハンドリングとエッジケース

**目的**: 包括的なエラーハンドリング、マイグレーション失敗モード、エッジケースを実装する。

**成果物**:
- マイグレーション失敗時の読み取り専用モード
- 破壊的操作の確認ダイアログ
- sent状態編集時の警告ダイアログ
- サブスクリプションのネットワークエラーハンドリング

**検証方法**:
- マイグレーション失敗で読み取り専用モードが有効化されることをテスト
- 読み取り専用モードで閲覧のみ可能、作成/編集/削除が無効化されることを確認
- PDF出力は読み取り専用モードでもPro契約があれば利用可能

---

### Milestone 15: パフォーマンス最適化と仕上げ

**目的**: パフォーマンス目標の達成、アクセシビリティ、最終仕上げ。

**成果物**:
- FlashListによる書類一覧（100件で60fps、jank 5%未満）
- 大規模データのレイジーローディング
- アクセシビリティラベル（VoiceOver/TalkBack）
- タッチターゲット >= 44pt
- システムフォントサイズ追従

**パフォーマンス目標** (SPEC 3.3):
- 起動時間: 3秒以内
- 画面遷移: 0.3秒以内
- 書類一覧: 100件で60FPS維持、jank 5%未満
- PDF生成: 5秒以内

**検証方法**:
- 各指標を5回測定し、中央値で目標達成を確認

---

## Concrete Steps

### Milestone 0 実行手順

1. Expoプロジェクトを初期化:

       npx create-expo-app genba-note --template expo-template-blank-typescript
       cd genba-note

2. 依存パッケージをインストール:

       npm install expo-router expo-secure-store @react-native-async-storage/async-storage
       npm install -D jest @testing-library/react-native @types/jest ts-jest

3. Jest設定ファイルを作成:

       // jest.config.js
       module.exports = {
         preset: 'jest-expo',
         testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
         transformIgnorePatterns: [
           'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
         ],
       };

4. 型定義ファイルを作成（src/types/配下）

5. 日付ユーティリティを作成してテストを実行:

       npm test

**期待される出力**:

    PASS __tests__/utils/dateUtils.test.ts
      dateUtils
        ✓ getTodayString returns YYYY-MM-DD format
        ✓ parseLocalDate parses without timezone shift
        ✓ compareDates returns correct ordering

---

## Validation and Acceptance

各マイルストーン完了後:

1. `npm test` でユニットテストがすべてパス
2. `npx expo start` でアプリが起動し、実装した機能が動作
3. codex-review SKILLを実行し、レビュー→修正→再レビューを「ok: true」まで反復

最終的な受け入れ基準:
- 見積書・請求書の作成〜PDF出力までの一連のフローが動作
- オフライン状態でPro機能（過去に購入済みの場合）が7日間利用可能
- パフォーマンス目標を達成

---

## Idempotence and Recovery

- すべてのマイグレーションは冪等（複数回実行しても同じ結果）
- マイグレーション失敗時は読み取り専用モードで継続、再試行ボタンで再実行可能
- ストレージ操作は楽観的ロックを使用せず、最終書き込みが勝つ方式
- 書類削除時はAsyncStorageとsecure-storeの両方をクリーンアップ

---

## Interfaces and Dependencies

### 型定義 (src/types/document.ts)

    type DocumentType = 'estimate' | 'invoice';
    type DocumentStatus = 'draft' | 'sent' | 'paid';

    interface Document {
      id: string;
      documentNo: string;
      type: DocumentType;
      status: DocumentStatus;
      clientName: string;
      clientAddress: string | null;
      subject: string | null;
      issueDate: string; // YYYY-MM-DD
      validUntil: string | null; // estimate only
      dueDate: string | null; // invoice only
      paidAt: string | null; // invoice only
      lineItems: LineItem[];
      notes: string | null;
      issuerSnapshot: IssuerSnapshot;
      createdAt: number;
      updatedAt: number;
    }

    interface LineItem {
      id: string;
      name: string;
      quantityMilli: number; // 1000 = 1.000
      unit: string;
      unitPrice: number; // integer yen
      taxRate: 0 | 10;
    }

### 依存ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| expo-router | ナビゲーション |
| @react-native-async-storage/async-storage | 一般データストレージ |
| expo-secure-store | 機微情報ストレージ |
| expo-print | PDF生成 |
| expo-sharing | ファイル共有 |
| react-native-purchases | RevenueCat SDK |
| react-native-device-info | uptime取得 |
| @shopify/flash-list | 高性能リスト |

---

## Artifacts and Notes

（実装中に生成されたログ、差分、スニペットを記録）

- （未着手）

---

## Revision Log

- **2026-02-01**: Milestone 8, 10, 14完了記録を追加。テスト数を1002→1020に更新。各マイルストーンの詳細セクションを追加。
- **2026-02-04**: codex-reviewにより以下を修正:
  - AGENTS.md: ヘッダー修正、PLANS.md参照パス修正、settings.local.json参照修正
  - CLAUDE.md: codex-review利用環境の注記追加、settings.local.json参照修正
  - PLANS.md: レビューゲート記述を一般化
  - SKILL.md: 存在しないファイル参照を削除
  - ExecPlan.md: SPEC.md→SPEC_GENBANOTE.mdに統一、Context記述を現状に合わせて更新
