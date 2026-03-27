# プロジェクト行動記録 — 「ポチッと事務」(GenBa Note)

> **目的**: 次回のモバイルアプリ制作で同じ試行錯誤を繰り返さないための振り返り記録
> **期間**: 2026-02-01 〜 2026-03-26（約2ヶ月）
> **リポジトリ**: https://github.com/amuuuy/genba_note
> **開発者**: amuy (Yuma)
> **AI支援**: Claude Code (Claude Opus 4.6) — Co-Author として全PRに参加

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ名 | ポチッと事務（GenBa Note） |
| ターゲット | 建設業の個人事業主・小規模事業者 |
| 主な機能 | 見積書・請求書作成、顧客管理、収支管理、PDF出力、カレンダー、カンバン、AI材料検索 |
| 技術スタック | Expo v54 + React Native v0.81 + TypeScript v5.9 + Supabase + RevenueCat |
| 課金モデル | Freemium（Free / Pro月額¥480・年額¥4,800） |
| Bundle ID | com.kenjimu.genbanote |
| プラットフォーム | iOS / Android |

### アプリの全機能一覧
| 機能 | 説明 | Free制限 |
|------|------|---------|
| 書類管理 | 見積書・請求書の作成・変換・ステータス管理 | 累計10件 |
| PDFテンプレート | 6種（会計基準・標準・フォーマル・モダン・クラシック・建設業） | 4種、透かし付き |
| 顧客管理 | 顧客情報・写真・作業ログ | 5件 |
| 単価マスタ | 品目・単価の登録 | 10件 |
| 収支管理 | チャート・期間フィルタ | 利用可 |
| カレンダー | イベント管理 | 利用可 |
| カンバン | 案件進捗管理 | 利用可 |
| AI材料検索 | Gemini API / 楽天API | 回数制限あり |
| CSV出力 | データエクスポート | Pro限定 |

### 価格戦略
- **Free**: 書類10件、顧客5件、単価10件、PDF透かし付き、CSV不可
- **Pro月額**: ¥480（Apple手数料15%後: ¥408）
- **Pro年額**: ¥4,800（Apple手数料15%後: ¥4,080）
- **競合ポジション**: Jimuu（¥500安い汎用）と ANDPAD（数万円の建設業特化）の間

---

## 2. 全コミット詳細記録（時系列）

### 2026-02-01（土）— Day 1

#### コミット①: `c8215ed` — Milestone15の後の９（16:55）
- **変更**: 6ファイル追加（+2,676行）
- **内容**: ExecPlan.md、SPEC_GENBANOTE.md、scripts/* を追加
- **意図**: 仕様書・実装計画・スクリプト群の初期投入
- **備考**: Milestone15までは別環境で開発しており、ここからGit管理を本格化

#### コミット②: `b345bab` — クラッシュ後（22:05）
- **変更**: 5ファイル（+467行 / -18行）
- **内容**: AGENTS.md、CLAUDE.md、ExecPlan.md、PLANS.md、SKILL.md を更新
- **意図**: 開発中にクラッシュが発生し、復旧後にAI支援設定ファイルを整備
- **学び**: クラッシュ対策として頻繁にコミットする習慣が必要

---

### 2026-02-04（火）— Day 4

#### コミット③: `2bb70a8` — 施工ログ機能拡張（09:49）
- **変更**: 5ファイル（+26行 / -13行）
- **内容**: AGENTS.md、CLAUDE.md、ExecPlan.md、PLANS.md、SKILL.md を微調整
- **意図**: 「作業前/作業後」写真を日付単位で複数追加できる日次作業記録に拡張
- **判断**: 施工現場のニーズに合わせて写真機能を強化する方針を決定

---

### 2026-02-06（木）— Day 6

#### コミット④: `eb1ef82` — 法人向け削除（16:19）
- **変更**: 1ファイル追加（+387行）
- **内容**: FEATURE_ROADMAP.md を新規作成
- **意図**: 法人向け機能を削除し、個人事業主にターゲットを絞り込む判断をドキュメント化
- **重要決断**: ターゲットの変更。法人向け機能は作っていたが削除。将来のロードマップと価格戦略を策定

#### コミット⑤: `907fef4` — たいきと会議後（23:40）
- **変更**: 1ファイル追加（+763行）
- **内容**: SYUUSEI.md を新規作成
- **意図**: チームメンバー「たいき」との会議フィードバックを元に、Milestone 16〜23の実装計画を策定
- **決定事項**: PDFカスタマイズ（印鑑サイズ、背景デザイン、ファイル名）、新テンプレート5種、カンバン、カレンダー
- **学び**: 会議後すぐに計画をドキュメント化するのは良い習慣

---

### 2026-02-07（金）— Day 7

#### コミット⑥: `be4bed5` — テンプレート種類修正（10:54）
- **変更**: 1ファイル（+388行 / -47行）
- **内容**: SYUUSEI.md を更新
- **意図**: PDFテンプレートの種類と仕様を修正。TDD方式での実装手順を詳細化

#### コミット⑦: `c15914b` — なんかあった（23:58）
- **変更**: 1ファイル追加（+158行）
- **内容**: supabase/functions/rakuten-search/index.ts を新規作成
- **意図**: 楽天API連携のEdge Function実装
- **反省**: コミットメッセージが「なんかあった」— 後から何をしたか全くわからない

---

### 2026-02-14（土）— Day 14

#### コミット⑧: `16160da` — API機能や色々やってた時のやつ（22:30）
- **変更**: 1ファイル追加（+216行）
- **内容**: supabase/functions/gemini-search/index.ts を新規作成
- **意図**: Google Gemini API連携のEdge Function実装（AI材料価格検索）
- **反省**: 1週間分の作業を1コミットにまとめてしまった

#### コミット⑨: `3c21e56` — 修正用ファイル（22:32）
- **変更**: 1ファイル追加（+86行）
- **内容**: ai-price-research-changes.md を新規作成
- **意図**: AI材料価格検索機能の変更ログを記録開始

#### コミット⑩: `47ae244` — 次（22:37）
- **変更**: 1ファイル（+52行 / -62行）
- **内容**: ai-price-research-changes.md を更新
- **意図**: AI検索機能のMilestone進捗更新
- **反省**: コミットメッセージ「次」— 意味不明

---

### 2026-02-15（日）— Day 15

#### コミット⑪: `8e3e8ee` — Milestone2（14:46）
- **変更**: 3ファイル（+581行 / -60行）
- **内容**: gemini-search のテスト（index_test.ts）追加、本体修正
- **意図**: Edge FunctionのMilestone2完了。テストコード追加で品質確保
- **良かった点**: テストを書く習慣がこの時点で根付き始めた

---

### 2026-02-17（月）— Day 17

#### コミット⑫: `7d404f5` — 修正（15:54）
- **変更**: 1ファイル（+21行 / -21行）
- **内容**: FEATURE_ROADMAP.md を修正
- **意図**: ロードマップの価格・機能の微調整

#### コミット⑬: `600b44b` — 問題点（16:49）
- **変更**: 1ファイル追加（+206行）
- **内容**: SYUUSEI_QUALITY.md を新規作成
- **意図**: コード品質の問題点を洗い出し。Milestone 24-25として整理
- **発見した問題**: setTimeoutクリーンアップ漏れ、画像サイズバリデーション欠如、PDFキャッシュ孤立

#### コミット⑭: `3601449` — M1,2（20:53）
- **変更**: 1ファイル追加（+83行）
- **内容**: RELEASE_TODO.md を新規作成
- **意図**: リリース前タスクを簡略版で管理開始

---

### 2026-02-22（土）— Day 22

#### コミット⑮: `38b9a39` — リサーチプロ削除（10:17）
- **変更**: 2ファイル（+94行 / -46行）
- **内容**: gemini-search のindex.ts、index_test.ts を修正
- **意図**: Pro限定だったAI検索をFreeユーザーにも開放（制限付き）

#### コミット⑯: `1237e80` — 修正計画（21:58）★ 大規模コミット
- **変更**: 15ファイル（+2,296行 / -62行）
- **内容**:
  - ISSUES.md 新規作成（問題点をCritical/High/Mediumで分類）
  - RODOAPPU.md 新規作成（リリースロードマップ: MS1-MS8）
  - docs/ ディレクトリ作成（法務ページ: index.html, privacy/, terms/）
  - rakuten-search テスト追加
  - Supabase共有モジュール（auth.ts, dailyLimit.ts, test_helpers.ts）
- **意図**: リリースに向けた全体整理。問題点の体系化、法務ページの初期作成、テスト基盤強化
- **重要**: このコミットが「リリースモード」への切り替え点

#### コミット⑰: `5d6ea45` — MS6: CI/CDパイプライン追加（22:33）
- **変更**: 2ファイル追加（+114行）
- **内容**: .github/workflows/test.yml, eas-build.yml を新規作成
- **CI/CD構成**:
  - test.yml: push to main / PR で発火 → JWT検証チェック → TypeScriptコンパイル → Jest
  - eas-build.yml: タグ（v*）で発火 → EAS Build（dev/preview/production プロファイル別）
- **学び**: CI/CDの導入で「マージ前に壊れてないか確認」が自動化された

---

### 2026-03-05（水）— Day 33

#### コミット⑱: `cf47d4f` — H-1（11:16）
- **変更**: 2ファイル（+26行 / -25行）
- **内容**: ISSUES.md 更新、docs/CNAME 追加
- **意図**: H-1（Free AI検索コスト制限）の完了記録、GitHub PagesのCNAME設定

#### コミット⑲: `a1a2bbd` — 最終修正ファイル（12:49）
- **変更**: 1ファイル追加（+568行）
- **内容**: UNIMPLEMENTED.md を新規作成
- **意図**: 全未実装タスクをM-01〜M-07の7マイルストーンに体系化（37タスク）
- **構成**:
  - M-01: コード修正（3件）
  - M-02: 外部サービス設定（7件）
  - M-03: ドメイン・法務（4件）
  - M-04: ストア申請準備（13件）
  - M-05: ブランチ保護（1件）
  - M-06: 本番ビルド・テスト（5件）
  - M-07: ストア提出（3件）

#### コミット⑳: `c636824` — M-01/07完了: CI JWTゲート追加（18:09）
- **変更**: 2ファイル（+59行 / -20行）
- **内容**: test.yml にJWT検証ステップ追加、UNIMPLEMENTED.md 進捗更新
- **意図**: 全Edge FunctionがJWT検証を有効にしているかCIで自動チェック
- **セキュリティ**: `verify_jwt = true` がconfig.tomlに存在しないとCIが失敗する仕組み

---

### 2026-03-06（木）— Day 34

#### コミット㉑: `13c33e9` — UNIMPLEMENTED.md進捗更新 + HUMAN_TASKS_GUIDE.md新規作成（10:12）
- **変更**: 2ファイル（+491行 / -26行）
- **内容**: HUMAN_TASKS_GUIDE.md を新規作成（手作業の詳細手順書）
- **意図**: Yumaが手動で実施する残タスクを4フェーズに整理
  - Phase 1: 並行可能タスク（Google登録、ドメイン、API Key確認、ブランチ保護、価格決定）
  - Phase 2a/2b: URL公開確認、アイコン・ストア設定
  - Phase 3: RevenueCat Secret登録
  - Phase 4: 本番ビルド → ストア提出

---

### 2026-03-09（月）— Day 37

#### コミット㉒: `3105ee2` — M-02-01/07（14:51）
- **変更**: 2ファイル（+54行 / -33行）
- **内容**: UNIMPLEMENTED.md 更新、docs/store-metadata-ja.md 新規作成
- **意図**: App Store / Google Play のメタデータ（日本語）を作成
- **メタデータ内容**: アプリ名、サブタイトル、キーワード（23個）、カテゴリ、説明文（1,200語）、プライバシーラベル、年齢レーティング

---

### 2026-03-10（火）— Day 38 ★ PR #1

#### コミット㉓: `ebc9dad` — .gitignore強化（15:56）
- **変更**: 1ファイル（+4行）
- **PR #1**: `chore: .gitignore強化（Public化対応）`
- **内容**: `.env.*` 派生ファイルと `supabase/.temp/` を .gitignore に追加
- **意図**: リポジトリ公開に備えてシークレット誤コミットを防止
- **マージ**: 同日 16:05

---

### 2026-03-15（土）— Day 43 ★ PR #2, #3

#### コミット㉔: `b9efdac` — docs: アプリ名を「ポチッと事務」に統一（15:42）
- **PR #2**: `docs: アプリ名を「ポチッと事務」に統一`
- **変更**: 3ファイル（+10行 / -10行）
- **内容**: docs/ 内の index.html, privacy/index.html, terms/index.html で `GenBa Note` → `ポチッと事務` に変更
- **マージ**: 翌日 03:36

#### コミット㉕: `47d83a0` — feat: genba-note アプリソースコードをリポジトリに追加（16:00）
- **PR #3**: `feat: genba-note アプリソースコードを追加`
- **変更**: 419ファイル（+107,220行）★ 最大のコミット
- **内容**: genba-note/ ディレクトリ全体をリポジトリに追加
- **意図**: CIワークフローがソースコードを参照するため、リポジトリに含める必要があった
- **確認事項**: 機密ファイル混入なし（dry-run確認済み）
- **マージ**: 翌日 03:25

---

### 2026-03-16（日）— Day 44 ★ PR #4

#### コミット㉖: `0f39739` — docs: ISSUES.md/UNIMPLEMENTED.md 進捗更新（11:16）
- **PR #4**: `docs: ISSUES.md/UNIMPLEMENTED.md 進捗更新`
- **変更**: 2ファイル（+68行 / -65行）
- **内容**: 各マイルストーンの進捗を更新
  - M-05/M-09: Supabase Secrets登録済み
  - M-12: Sentry名称統一
  - C-3: RevenueCat一部完了（Offering設定済み）
  - MS4/MS6: ステータス更新
- **プロセス**: **Codexレビュー9回反復で収束（ok: true）** ← レビュープロセスの成功例
- **マージ**: 同日 03:40

---

### 2026-03-18（水）— Day 46 ★ PR #5（OPEN）

#### コミット㉗: `c39e5f1` — fix(security): Supabaseセッション永続化をAsyncStorage→SecureStoreに移行（12:54）
- **PR #5**: `fix(security): Supabaseセッション→SecureStore移行 (B2)`
- **変更**: 4ファイル（+111行 / -2行）
- **内容**:
  - `SecureStoreAdapter` 実装（getItem/setItem/removeItem、Promise正しくreturn）
  - expo-secure-store モック追加（`__reset()` 付き）
  - 回帰テスト3件追加（Promise返却・2KBサイズ検証・エラー伝播）
- **背景**: B2セキュリティ指摘 — refresh tokenがAsyncStorage（平文）に保存されていた
- **テスト**: 130スイート / 2,589テスト 全パス
- **Codexレビュー**: 5回反復。blocking修正は1件（Promise返却漏れ）のみ
- **ステータス**: OPEN（未マージ）

---

### 2026-03-25（火）— Day 53 ★ セキュリティ集中日

#### コミット㉘: `0fe860d` — fix(safety): 防御的コーディング修正（20:08）
- **変更**: 9ファイル（+59行 / -18行）
- **内容**: AddWorkLogEntryModal, CustomerSearchModal, WorkLogEntrySection, imageUtils 等の防御的コーディング
- **修正例**: null チェック追加、オプショナルチェーン導入、エラーハンドリング強化

#### コミット㉙: `9fe82ad` — fix(security): Codexレビューで検出されたセキュリティ強化（20:36）
- **変更**: 10ファイル（+381行 / -165行）
- **内容**: secureStorageService, subscriptionService, asyncStorageService, migrationRunner, モック等
- **修正例**: ストレージサービスのエラーハンドリング、サブスクリプション検証の堅牢化

#### コミット㉚: `880c9c6` — fix(security): 権限・依存・入力検証の強化（20:55）
- **変更**: 7ファイル（+383行 / -40行）
- **内容**: app.json, package.json, imageUtils.ts, previewDataValidator.ts, テスト群
- **修正例**: 画像サイズバリデーション追加、プレビューデータの入力検証強化、依存関係の整理

---

### 2026-03-26（水）— Day 54（現在）

#### コミット㉛: `dde9671` — fix: バリデーション・耐障害性・パフォーマンス改善（10:30）★ 大規模
- **変更**: 28ファイル（+1,437行 / -150行）
- **内容**: useCalendar, pdfGenerationService, pdfValidationService, MaterialSearchModal, テスト多数
- **修正例**: カレンダーフックの耐障害性、PDF生成のバリデーション強化、マテリアル検索の入力チェック

#### コミット㉜: `5c4ebfd` — fix(security): PDF生成パイプラインのfail-closed検証・横断整合性を強化（11:25）
- **変更**: 10ファイル（+390行 / -16行）
- **内容**: pdfGenerationService, pdfValidationService, imageUtils, テスト群
- **意図**: PDF生成パイプラインを「fail-closed」設計に変更（失敗時は安全側に倒す）
- **設計原則**: 検証が失敗した場合はPDF生成を中止する（不正なデータでPDFを生成しない）

---

## 3. PR（プルリクエスト）一覧と詳細

| PR | タイトル | ブランチ | 状態 | 作成日 | マージ日 | 変更ファイル数 | +/- |
|----|---------|---------|------|--------|---------|-------------|-----|
| #1 | chore: .gitignore強化（Public化対応） | chore/gitignore-hardening | MERGED | 3/10 | 3/10 | 1 | +4/-0 |
| #2 | docs: アプリ名を「ポチッと事務」に統一 | docs/rename-app-title | MERGED | 3/15 | 3/16 | 3 | +10/-10 |
| #3 | feat: genba-note アプリソースコードを追加 | feat/add-genba-note-source | MERGED | 3/15 | 3/16 | 419 | +107,220/-0 |
| #4 | docs: ISSUES.md/UNIMPLEMENTED.md 進捗更新 | docs/progress-update-2026-03-16 | MERGED | 3/16 | 3/16 | 2 | +68/-65 |
| #5 | fix(security): Supabaseセッション→SecureStore移行 | fix/b2-secure-store-migration | OPEN | 3/18 | — | 4 | +111/-2 |

---

## 4. 作成したドキュメント一覧と役割

| ファイル名 | 作成日 | 役割 | 行数 | 次回も使うか |
|-----------|--------|------|------|------------|
| SPEC_GENBANOTE.md | 2/1 | 完全な要件定義書（データ型、計算ロジック、課金仕様） | 大 | **Yes** — 仕様書は必須 |
| ExecPlan.md | 2/1 | 実装計画（26マイルストーン、進捗チェックリスト） | 大 | **Yes** — ただし1ファイルに統合 |
| FEATURE_ROADMAP.md | 2/6 | 将来機能14個 & 価格戦略 | 387行 | **Yes** — 価格は早期に決めるべき |
| SYUUSEI.md | 2/6 | M16-23実装計画（PDF・カンバン・カレンダー） | 763行+ | **No** — ExecPlanに統合すべき |
| SYUUSEI_QUALITY.md | 2/17 | M24-25品質修正計画 | 206行 | **No** — ExecPlanに統合すべき |
| RELEASE_TODO.md | 2/17 | リリース前タスク簡略版 | 83行 | **No** — UNIMPLEMENTED.mdと重複 |
| ISSUES.md | 2/22 | 問題点リスト（Critical/High/Medium分類） | 大 | **Yes** — ただしGitHub Issuesを併用 |
| RODOAPPU.md | 2/22 | リリースロードマップ（MS1-8, 6-8週計画） | 大 | **No** — ExecPlanに統合すべき |
| ai-price-research-changes.md | 2/14 | AI検索機能の変更ログ（6 Milestone） | 86行+ | **No** — コミットログで十分 |
| UNIMPLEMENTED.md | 3/5 | 全未実装タスク体系化（M-01〜M-07, 37件） | 568行 | **Yes** — リリースチェックリストとして |
| HUMAN_TASKS_GUIDE.md | 3/6 | 手作業タスク詳細手順書（4 Phase, 40段階） | 491行 | **Yes** — 手動タスクは手順書が必要 |
| docs/store-metadata-ja.md | 3/9 | ストアメタデータ（iOS/Android両方） | 54行+ | **Yes** — テンプレートとして再利用可 |
| AGENTS.md | 2/1 | Claude/AI支援のルール設定 | — | **Yes** — AI支援には必須 |
| CLAUDE.md | 2/1 | Claude Code の設定ファイル | — | **Yes** — TDD・セキュリティルール |
| PLANS.md | 2/1 | ExecPlan作成ガイドライン | — | **Yes** — 計画書の品質基準 |
| SKILL.md | 2/1 | スキル作成ガイド | — | 必要に応じて |

### ドキュメント管理の反省
- **8個の管理ドキュメント** は多すぎた
- SYUUSEI.md / RODOAPPU.md / RELEASE_TODO.md は ExecPlan.md / UNIMPLEMENTED.md と重複
- **次回は3つに絞る**: SPEC.md（仕様）/ PLAN.md（実装計画）/ RELEASE_CHECKLIST.md（リリース）

---

## 5. 技術スタック詳細 & 選定理由

### フロントエンド

| ライブラリ | バージョン | 選定理由 | 評価 |
|-----------|-----------|---------|------|
| Expo | v54.0.32 | iOS/Android一括開発、EAS Build/Update | ★★★★★ |
| React | v19.1.0 | Expo標準 | ★★★★★ |
| React Native | v0.81.5 | Expo標準 | ★★★★☆ |
| Expo Router | v6.0.22 | ファイルベースルーティング | ★★★★★ |
| TypeScript | v5.9.2 | 型安全性、IDE補完 | ★★★★★ |

### UI / ビジュアル

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| @expo/vector-icons | v15.0.3 | アイコン |
| react-native-calendars | v1.1314.0 | カレンダー表示 |
| react-native-chart-kit | v6.12.0 | 収支チャート |
| react-native-gesture-handler | v2.28.0 | ジェスチャー操作 |
| react-native-svg | v15.12.1 | SVG描画 |
| react-native-webview | v13.15.0 | PDF プレビュー |

### ストレージ & ファイル

| ライブラリ | バージョン | 用途 | 評価 |
|-----------|-----------|------|------|
| @react-native-async-storage/async-storage | v2.2.0 | 一般データ保存 | ★★★★☆ |
| expo-secure-store | v15.0.8 | 機微情報（Keychain/Keystore） | ★★★★★ |
| expo-file-system | v19.0.21 | ファイル操作 | ★★★★☆ |
| expo-print | v15.0.8 | PDF生成 | ★★★☆☆（カスタマイズ制限あり） |

### バックエンド & 外部サービス

| サービス | 用途 | 評価 |
|---------|------|------|
| Supabase | PostgreSQL + Edge Functions + Auth | ★★★★☆（Edge Functionsのデバッグが難しい） |
| RevenueCat (react-native-purchases v9.7.5) | 課金管理 | ★★★★★（複雑な課金ロジックを抽象化） |
| Sentry (@sentry/react-native v7.2.0) | クラッシュ追跡 | ★★★★★ |
| Google Gemini API | AI材料検索 | ★★★☆☆（レスポンス品質にばらつき） |
| 楽天API | 材料価格検索 | ★★★★☆ |

### テスト

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| Jest | v30.2.0 | テストフレームワーク |
| jest-expo | v54.0.16 | Expo用プリセット |
| ts-jest | v29.4.6 | TypeScript対応 |
| @testing-library/react-native | v13.3.3 | コンポーネントテスト |
| @testing-library/jest-native | v5.4.3 | ネイティブマッチャー |

---

## 6. アプリのアーキテクチャ

### ディレクトリ構成（実際）

```
genba-note/
├── app/                          # Expo Router ページ（7画面）
│   ├── _layout.tsx               # ルートレイアウト
│   ├── (tabs)/                   # タブナビゲーション
│   │   ├── _layout.tsx           # タブ設定
│   │   ├── index.tsx             # ダッシュボード
│   │   ├── balance.tsx           # 収支管理
│   │   ├── calendar.tsx          # カレンダー
│   │   ├── customers.tsx         # 顧客一覧
│   │   ├── prices.tsx            # 単価マスタ
│   │   └── settings.tsx          # 設定
│   ├── customer/[id].tsx         # 顧客詳細（動的ルート）
│   ├── document/[id].tsx         # 書類詳細（動的ルート）
│   ├── document/preview.tsx      # 書類プレビュー
│   ├── paywall.tsx               # 課金画面
│   └── data-handling.tsx         # データエクスポート
├── src/
│   ├── components/               # UIコンポーネント（8カテゴリ）
│   │   ├── calendar/             # カレンダー関連
│   │   ├── common/               # 共通コンポーネント（17ファイル）
│   │   ├── customer/             # 顧客管理UI
│   │   ├── document/             # 書類作成・表示
│   │   ├── document/edit/        # 書類編集
│   │   ├── finance/              # 収支UI
│   │   ├── kanban/               # カンバンUI
│   │   ├── settings/             # 設定画面
│   │   └── unitPrice/            # 単価管理UI
│   ├── domain/                   # ビジネスロジック（12ドメイン）
│   │   ├── auth/                 # 認証
│   │   ├── calendar/             # カレンダー
│   │   ├── csvExport/            # CSV出力
│   │   ├── customer/             # 顧客
│   │   ├── document/             # 書類
│   │   ├── finance/              # 収支
│   │   ├── kanban/               # カンバン
│   │   ├── lineItem/             # 明細行
│   │   ├── materialResearch/     # 材料検索
│   │   ├── revenue/              # 売上
│   │   ├── settings/             # 設定
│   │   └── unitPrice/            # 単価
│   ├── hooks/                    # カスタムHooks（22個）
│   ├── storage/                  # データ永続化
│   │   ├── asyncStorageService.ts
│   │   ├── secureStorageService.ts
│   │   ├── calendarEventStorage.ts
│   │   ├── migrationRunner.ts
│   │   ├── readOnlyModeState.ts
│   │   └── migrations/           # スキーマ移行（12バージョン）
│   ├── subscription/             # 課金ロジック
│   │   ├── subscriptionService.ts
│   │   ├── freeTierLimitsService.ts
│   │   ├── dailyUsageService.ts
│   │   ├── proAccessService.ts
│   │   ├── offlineValidationService.ts
│   │   └── uptimeService.ts
│   ├── pdf/                      # PDF生成（6テンプレート）
│   ├── contexts/                 # React Context
│   ├── constants/                # 定数
│   ├── types/                    # 型定義（14モジュール）
│   ├── utils/                    # ユーティリティ（16モジュール）
│   └── monitoring/               # Sentry
├── supabase/                     # バックエンド
│   ├── functions/
│   │   ├── gemini-search/        # Gemini API プロキシ
│   │   ├── rakuten-search/       # 楽天API プロキシ
│   │   └── _shared/              # 共有（auth, dailyLimit, test_helpers）
│   └── config.toml               # JWT検証設定
└── __tests__/                    # テスト
```

### 設計パターン

| パターン | 適用箇所 | 評価 |
|---------|---------|------|
| **ドメイン分離** | src/domain/ に純粋なビジネスロジックを集約 | ★★★★★ テスト容易 |
| **カスタムHooks** | src/hooks/ でUI状態管理を抽象化 | ★★★★☆ |
| **ストレージ分離** | AsyncStorage（一般）+ SecureStore（機微） | ★★★★★ 最初からやるべき |
| **マイグレーション** | storage/migrations/ でスキーマバージョン管理 | ★★★★☆ 12回のマイグレーション |
| **fail-closed PDF** | 検証失敗時はPDF生成を中止 | ★★★★★ |
| **整数演算** | 金額は全て整数（数量は×1000） | ★★★☆☆ 複雑だが正確 |
| **日付文字列** | YYYY-MM-DD文字列、Dateパース禁止 | ★★★★★ TZ問題を回避 |

---

## 7. CI/CD パイプライン

### test.yml（テスト & 型チェック）
```
トリガー: push to main / PR targeting main
ステップ:
  1. Supabase Edge Functions JWT検証チェック（全関数に verify_jwt = true が必須）
  2. TypeScript コンパイル（tsc --noEmit）
  3. Jest テスト実行（カバレッジレポート付き）
並行制御: ブランチ単位で既存のランをキャンセル
```

### eas-build.yml（EAS ビルド）
```
トリガー: Git タグ（v*）
マッピング:
  v*-dev     → development プロファイル
  v*-preview → preview プロファイル
  v*         → production プロファイル
必要シークレット: EXPO_TOKEN
```

---

## 8. セキュリティ対策の全記録

### 実施したセキュリティ対策（時系列）

| 日付 | 対策 | コミット |
|------|------|---------|
| 2/22 | Edge Functions にJWT検証を設定 | 1237e80 |
| 3/5 | CI でJWT検証の自動チェック導入 | c636824 |
| 3/10 | .gitignore 強化（.env派生, supabase/.temp） | ebc9dad |
| 3/18 | セッショントークンをAsyncStorage→SecureStoreに移行 | c39e5f1 |
| 3/25 | 防御的コーディング（null チェック、オプショナルチェーン） | 0fe860d |
| 3/25 | ストレージサービスのエラーハンドリング強化 | 9fe82ad |
| 3/25 | 画像サイズバリデーション、入力検証強化 | 880c9c6 |
| 3/26 | PDF生成パイプラインのfail-closed設計 | 5c4ebfd |

### ストレージ戦略（最終形）
| データ種別 | ストレージ | 暗号化 |
|-----------|-----------|--------|
| 書類・顧客・単価・カレンダー等 | AsyncStorage | なし（端末ローカル） |
| 発行者情報（インボイス番号、振込口座） | expo-secure-store | iOS Keychain / Android Keystore |
| Supabase セッショントークン | expo-secure-store | iOS Keychain / Android Keystore |
| 課金キャッシュ | expo-secure-store | 4値（entitlement, verified_at, uptime, expiration） |

### オフライン課金検証の仕組み
- **4値キャッシュ**: entitlement_active, last_verified_at, uptime, expiration
- **7日間グレース期間**: オフラインでも7日間はPro機能を利用可能
- **改ざん検知**: uptimeベースで時計の巻き戻しを検出
- **学び**: この仕組みは想定以上に複雑。次回は仕様段階で十分に検討する

---

## 9. 法務ページ & ストアメタデータ

### 法務ページ（GitHub Pages でホスト）
- **ドメイン**: genba-note.app（CNAME設定済み）
- **プライバシーポリシー**: /privacy（施行日: 2026-03-01）
  - ローカルファーストのデータ保存を明記
  - 外部送信先5サービス（Supabase, RevenueCat, Gemini, 楽天, Sentry）を列挙
  - アカウント不要（匿名認証）
  - アンインストールで全データ削除
- **利用規約**: /terms（施行日: 2026-03-01）
  - サブスク詳細（月額/年額、自動更新、解約手順）
  - 免責事項（税務ソフトではない、AI検索の精度保証なし）
  - 日本法準拠

### App Store メタデータ（docs/store-metadata-ja.md）
- **iOS**: アプリ名、サブタイトル（30文字）、キーワード23個、カテゴリ（ビジネス/仕事効率化）
- **Android**: アプリ名（30文字）、短い説明（80文字）、カテゴリ（ビジネス）
- **プライバシーラベル**: 購入履歴（RevenueCat）、クラッシュデータ（Sentry）、識別子（Supabase UUID）
- **年齢レーティング**: 4+
- **スクリーンショット**: iOS 6枚（6.7" + iPad）、Android 6枚

---

## 10. テスト戦略の詳細

### 最終的なテスト規模
- **130 テストスイート / 2,589 テストケース / 全パス**（PR#5時点）
- TypeScript 0 エラー
- スキーマバージョン v9（12回のマイグレーション）

### テスト対象の分類

| カテゴリ | テスト内容 | 重要度 |
|---------|-----------|--------|
| domain/ | 金額計算、ステータス遷移、データ変換 | ★★★★★ |
| storage/ | マイグレーション、CRUD操作 | ★★★★★ |
| subscription/ | 課金判定、オフライン検証、改ざん検知 | ★★★★★ |
| hooks/ | カスタムHooksの状態管理 | ★★★★☆ |
| components/ | UIコンポーネントのレンダリング | ★★★☆☆ |
| pdf/ | PDF生成、バリデーション | ★★★★☆ |
| supabase/functions/ | Edge Functionsのユニットテスト | ★★★★☆ |

### テスト基盤の設定
```javascript
// jest.config.js のポイント
- jest-expo プリセット使用
- ts-jest でTypeScript対応
- moduleNameMapper でパスエイリアス解決
- setupFiles で expo-secure-store 等のモック設定
```

---

## 11. 技術選定の振り返り

### 採用して良かった技術

| 技術 | 理由 |
|------|------|
| **Expo (v54)** | iOS/Android 両対応が1コードベースで可能。EAS Build/Update でCI/CDが楽 |
| **Expo Router** | ファイルベースルーティングで画面構成が直感的 |
| **TypeScript** | 型安全性でバグを早期発見。2,500+テストの信頼性を支えた |
| **expo-secure-store** | Keychain/Keystore暗号化が簡単に使える |
| **RevenueCat** | 課金実装の複雑さを大幅に軽減。iOS/Android統一API |
| **Supabase** | PostgreSQL + Edge Functions + Auth が一体で手軽 |
| **Sentry** | クラッシュ追跡がリアルタイムで可能 |
| **GitHub Actions** | CI/CDがリポジトリ内で完結 |
| **Claude Code** | AI支援でコード品質・レビュー・ドキュメント生成が加速 |

### 課題があった技術・設計

| 技術/設計 | 課題 | 次回の対策 |
|-----------|------|-----------|
| **AsyncStorage** | 機微情報の保存に使ってしまい後でSecureStoreに移行が必要になった | 最初からストレージ戦略を決める |
| **日付処理** | `new Date()` のタイムゾーン問題に悩まされた | `YYYY-MM-DD` 文字列で統一。Dateパース禁止 |
| **整数演算** | 数量の小数対応（×1000）が複雑 | 設計段階で精度方針を決める |
| **オフライン課金** | 改ざん対策（uptimeベース）が想定以上に複雑 | 仕様段階で十分に検討 |
| **コミットメッセージ** | 初期は「なんかあった」「次」等、意味不明 | Conventional Commits を Day 1 から |
| **expo-print** | PDFのカスタマイズ制限（CSS対応が不完全） | 代替ライブラリも検討 |
| **管理ドキュメント** | 8個作って重複・矛盾が発生 | 3つに絞る |

---

## 12. リリース準備チェックリスト（次回テンプレート）

### ストア設定（開発開始時に着手）
- [ ] Apple Developer Program 登録（年額 ¥12,980）
- [ ] Google Play Developer 登録（$25 一回のみ）
- [ ] Apple Small Business Program 申請（手数料15%に軽減）
- [ ] App Store Connect でアプリ登録
- [ ] Google Play Console でアプリ登録

### アプリ情報（デザインフェーズで並行準備）
- [ ] アプリ名・Bundle ID・パッケージ名 確定
- [ ] アプリアイコン（1024x1024）
- [ ] スクリーンショット（iPhone 6.7" / 6.5" / iPad / Android）
- [ ] アプリ説明文（短い説明 + 詳細説明）
- [ ] カテゴリ・年齢レーティング
- [ ] プライバシーラベル

### 課金設定（課金機能実装と同時に）
- [ ] RevenueCat プロジェクト作成 & API Key 取得
- [ ] App Store Connect サブスクリプション商品作成
- [ ] Google Play Console サブスクリプション商品作成
- [ ] RevenueCat と各ストア商品を紐付け
- [ ] Sandbox テスト（iOS TestFlight / Android 内部テスト）

### ドメイン & 法務（開発初週に着手）
- [ ] 独自ドメイン取得
- [ ] ホスティング設定（GitHub Pages等）
- [ ] プライバシーポリシー HTML 作成 & 公開
- [ ] 利用規約 HTML 作成 & 公開

### ビルド & 提出
- [ ] EAS Build で本番ビルド
- [ ] TestFlight / 内部テストで最終確認
- [ ] ストアに提出

---

## 13. ディレクトリ構成テンプレート（次回プロジェクト用）

```
project-root/
├── .github/workflows/          # CI/CD（Day 1 から）
│   ├── test.yml                # テスト & 型チェック & Lint
│   └── eas-build.yml           # EAS ビルド（タグ駆動）
├── docs/                       # 法務ページ（GitHub Pages）
│   ├── index.html
│   ├── privacy/index.html
│   ├── terms/index.html
│   └── CNAME
├── app/                        # Expo Router ページ
│   ├── _layout.tsx
│   ├── (tabs)/
│   └── [dynamic]/
├── src/
│   ├── components/             # UI（機能別サブフォルダ）
│   ├── domain/                 # ビジネスロジック（純粋関数）
│   ├── hooks/                  # カスタム React Hooks
│   ├── storage/                # AsyncStorage + SecureStore
│   │   └── migrations/
│   ├── subscription/           # 課金（RevenueCat）
│   ├── pdf/                    # PDF生成
│   ├── contexts/               # React Context
│   ├── constants/
│   ├── types/
│   ├── utils/
│   └── monitoring/             # Sentry
├── supabase/
│   ├── functions/
│   │   └── _shared/
│   └── config.toml
├── __tests__/
├── CLAUDE.md                   # AI支援ルール
├── SPEC.md                     # 仕様書（1つに集約）
├── PLAN.md                     # 実装計画（1つに集約）
└── RELEASE_CHECKLIST.md        # リリースチェックリスト（1つに集約）
```

---

## 14. 次回プロジェクト開始時のチェックリスト

### Day 0: 開発開始前に確定すること
- [ ] ターゲットユーザーを確定し文書化（二度と「法人向け削除」をしない）
- [ ] MVP 機能スコープを確定（削除が予想される機能は含めない）
- [ ] アプリ名・Bundle ID・パッケージ名を確定
- [ ] 技術スタックを確定
- [ ] ストレージ戦略を決定（一般データ→AsyncStorage、機微→SecureStore）
- [ ] 金額計算の精度方針を決定（整数演算 or dinero.js 等のライブラリ）
- [ ] 日付処理の方針を決定（YYYY-MM-DD文字列 or dayjs）
- [ ] 課金モデル・価格を仮決定
- [ ] Apple Developer / Google Play 登録を開始

### Day 1: プロジェクト初期設定
- [ ] Expo プロジェクト作成 + TypeScript 設定
- [ ] .gitignore 設定（Expo + Supabase + .env 完全対応）
- [ ] Conventional Commits のルール設定（commitlint + husky）
- [ ] GitHub リポジトリ作成 + ブランチ保護
- [ ] CI/CD 設定（テスト + 型チェック + Lint + JWT検証チェック）
- [ ] Sentry 導入
- [ ] ESLint + Prettier 設定
- [ ] CLAUDE.md / SPEC.md / PLAN.md を作成
- [ ] ドメイン取得を開始

### Week 1: 基盤構築
- [ ] Supabase プロジェクト作成
- [ ] 認証基盤（最初からSecureStoreベース）
- [ ] ストレージ基盤（AsyncStorage + SecureStore の分離）
- [ ] テスト基盤（Jest + testing-library + TDDルール）
- [ ] 基本的な画面遷移（Expo Router）
- [ ] マイグレーション基盤

### 並行タスク（開発と同時進行、人間が担当）
- [ ] Apple Developer / Google Play 登録完了
- [ ] ドメイン取得 & ホスティング設定
- [ ] プライバシーポリシー・利用規約の HTML 作成 & 公開
- [ ] アプリアイコン・スクリーンショット作成
- [ ] RevenueCat 設定（課金機能の実装と同時）
- [ ] App Store Connect / Google Play Console で商品登録

---

## 15. 数値で見るプロジェクト

| 指標 | 値 |
|------|-----|
| 総コミット数 | 36（うち意味のあるメッセージ: 約20） |
| 開発期間 | 約2ヶ月（2026-02-01 〜 2026-03-26） |
| PR数 | 5（4 merged, 1 open） |
| テストスイート数 | 130 |
| テストケース数 | 2,589 |
| TypeScript エラー | 0 |
| スキーマバージョン | v9（12マイグレーション） |
| PDFテンプレート | 6種類 |
| Edge Functions | 2（gemini-search, rakuten-search） |
| 画面数 | 12（タブ6 + 詳細3 + paywall + data-handling + preview） |
| src/ コンポーネント | 8カテゴリ |
| src/ ドメイン | 12ドメイン |
| src/ カスタムHooks | 22個 |
| src/ ユーティリティ | 16モジュール |
| src/ 型定義 | 14モジュール |
| 管理ドキュメント | 8ファイル（多すぎた → 次回は3つに） |
| ソースコード総行数 | 107,220+行（PR#3より） |
| セキュリティ修正コミット | 6（3/18〜3/26） |
| Codexレビュー最大反復回数 | 9回（PR#4）、5回（PR#5） |

---

## 16. 最重要な教訓 5選

### 1. 「最初にやるべきことを最初にやる」
セキュリティ（SecureStore）、CI/CD、.gitignore、アプリ名の確定、ドメイン取得 — これらは全て後回しにして苦労した。次回は Day 0〜1 で完了させる。

### 2. 「管理の複雑さはバグの温床」
8個の管理ドキュメントは多すぎた。情報の重複と矛盾が発生した。次回は SPEC.md / PLAN.md / RELEASE_CHECKLIST.md の3つに絞る。

### 3. 「ストア申請準備は開発と並行する」
コードが完成してからストア準備を始めると、ドメイン取得・法務ページ・アイコン作成で更に数週間かかる。これらは開発初期から並行して進める。

### 4. 「コミットメッセージは未来の自分への手紙」
「なんかあった」「次」では2ヶ月後の自分が困る。Conventional Commits を Day 1 から強制する。

### 5. 「AIレビューの反復は品質を上げる」
Codexレビュー9回反復でok: trueに収束させるプロセスは効果的だった。ただし、反復回数が多い場合は最初の設計に問題がある可能性がある。次回は設計段階でレビューを入れる。
