# ポチッと事務 v2 方針転換 ExecPlan

**遵守**: CLAUDE.md（TDD必須、Codex-review ゲート）/ PLANS.md（ExecPlan 規約）

---

## Progress

実状態のみをチェックボックス + タイムスタンプで記録する。未来タスクは各 Milestone の narrative に記載。

- [x] 2026-04-19 AM: Supabase障害復旧（4段階: project再開 / Anonymous sign-in有効化 / Edge Functions再デプロイ / JWT HS256切替）
- [x] 2026-04-19 PM: App Store 実績確認（90日: 3DL / 0課金 / ¥0）
- [x] 2026-04-19 PM: 方針転換決断（Yuma 判断）
- [x] 2026-04-19 PM: PIVOT_PLAN_v2.md 初稿作成
- [x] 2026-04-19 PM: Codex review #1 実施 → ok:false（7 blocking）
- [x] 2026-04-19 夜: v2 改訂
- [x] 2026-04-19 夜: Codex review #2 実施 → ok:false（3 blocking + 2 advisory）
- [x] 2026-04-19 夜: v3 改訂
- [x] 2026-04-19 夜: Codex review #3 実施 → ok:false（3 blocking + 2 advisory、layout key / legacy migration 等の新指摘あり）
- [x] 2026-04-19 夜: v4 改訂
- [x] 2026-04-19 夜: Codex review #4 実施 → ok:false（2 blocking: Commands 自己完結不足 / Preview→Full 互換設計欠如）
- [x] 2026-04-19 夜: v5 改訂（schemaVersion 導入、Commands 完全自己完結化）
- [x] 2026-04-19 夜: Codex review #5 実施 → ok:false（2 blocking + 1 medium: unknown-key skip / M4 Step 0 欠如 / Progress 回帰）
- [x] 2026-04-19 夜: v6 改訂
- [x] 2026-04-19 夜: Codex review #6 実施 → ok:false（1 blocking: M4 Step 0 の命名が v1.1 固定で pre-M4 実ライブ状態と不整合）
- [x] 2026-04-19 夜: v7 改訂（Step 0 を pre-M4 命名に統一）
- [x] 2026-04-19 夜: Codex review #7 実施 → ok:false（1 blocking: line 734 の `mkdir` コマンドに v1.1 残存）
- [x] 2026-04-19 夜: v8 改訂（line 734 の `mkdir -p assets/screenshots-v1.1` を `pre-m4` に修正）
- [x] 2026-04-19 夜: Codex review #8 実施 → ok:false（1 blocking: v8 changelog が「plan全体で v1.1 ゼロ」と過剰主張、実際は forward-compat 文脈で v1.1.0 = M3 Preview 版として意図的残存）
- [x] 2026-04-19 夜: v9 改訂（v8 changelog の実態に合わない主張を訂正。v1.1.0 は M3 Preview 版としての意味で意図的に残す方針明記）
- [x] 2026-04-19 夜: Codex review #9 実施 → **ok:true** （blocking 0、advisory 0、9 回の反復で収束）
- [x] 2026-04-20: Yuma 最終承認 → M1 着手
- [x] 2026-04-21: M1 実装完了（C1〜C10、`refactor/m1-cleanup` ブランチ）+ Acceptance #1〜#5 全 pass + Codex review #1〜#3 ok:true で収束
- [x] 2026-04-21: M1 補完（C11 Sentry crash-only、C12 v1.0.1 bump、C13 OTA 無効化、C14 watermark 削除 + 履歴ドキュメントの OBSOLETE バナー化）
- [x] 2026-04-21: App Store Connect で IAP（`genbanote_pro_monthly_v1` + `genbanote_pro_annual`）を Remove from Sale 実施
- [x] 2026-04-21〜04-26: ストアメタ・公開ドキュメント (privacy/terms) 整合修正、Phase 1 arch review 9 回反復で収束（B1〜B20+ 全解消、A1 のみ M2 送り）
- [ ] PR `refactor/m1-cleanup` → `main` 作成 → マージ → EAS Build production iOS → submit v1.0.1
- [ ] M2 残タスク: 旧 Pro SecureStore キー cleanup migration（v10）、内部計画ドキュメントのセクション単位での全面書き直し、live URL `genba-note.app/privacy` `/terms` の repo 配信内容との一致確認 CI 化

---

## 0. Executive Summary

**目的**: ポチッと事務を「親友（1人親方）が仕事仲間に自信を持って推薦できるアプリ」にする。

**やること**:
1. 使われていない機能（材料リサーチ・Pro tier・Supabase依存）を全削除、障害源を根絶
2. 書類レイアウトを **9マス配置 + プリセット方式** で自由変更可能に
3. 書類タイプを拡張（見積書 / 一般請求書 / 適格請求書）、インボイス制度の法定必須項目を検証
4. 既存の「画像透過機能」を改善
5. 完全無料化、マーケ刷新

**優先順**: 親友の「配置を変えたい」直接要望を最速で届ける（親友ファースト）。

**哲学**: 3DL 段階では市場調査より **ship-and-see**（最小実装でリリース→実反応で学習）を採用。

---

## 1. 背景と根拠

### App Store 実績（過去90日、2026-04-19時点）

| 指標 | 実績 |
|---|---|
| 初回ダウンロード数 | 3 |
| Pro tier 加入 | 0 |
| 収益 | ¥0 |
| 材料リサーチAPI使用 | Supabase自動停止発動=1週間ゼロ |

### 2026-04-18〜19 の障害

Supabase project が無操作で自動停止 → DNS NXDOMAIN → 復旧に半日。4段階の障害（Supabase 停止 / Anonymous sign-in無効 / Edge Functions 消失 / JWT signing key ES256化）を順次解消。

### Yuma の目標

- 主: 親友（1人親方）が仕事仲間に**推薦できるクオリティ**
- 副: 黒字化できたら嬉しい（マーケ施策意欲あり）

### 親友（First User、ペルソナ根拠）

- 最近独立した1人親方、元の会社の知人・友人から仕事受ける
- **適格請求書発行事業者 登録済み**（T+13桁）
- 現在 **ジムー見積書アプリ** 併用
- 直接要望: 「**書類の配置を変えられるようにしてほしい**」「画像透過が**なんか変**」

### 差別化仮説（n=1 の初期シグナルであることを明示）

**仮説**: 建設業1人親方向けに「モバイル完結 × レイアウト自由」を提供すれば差別化できる。

**根拠**: 親友（n=1）の直接要望。これは**初期シグナル**であり、確立された市場需要ではない。

**検証方法**: ship-and-see。M1 リリース → M3 Preview リリース で親友 + 既存3DL + 新規ダウンロード勢の反応を観察。

**否定条件**: M3 Preview リリース後に親友のアクティブ利用が増えない / 新規DLが増えない場合、M3 Full 着手前に scope 再考。

### 競合ポジショニング

| 観点 | freee / yayoi | ポチッと事務 v2 |
|---|---|---|
| レイアウト自由度 | あり（PC主体） | **モバイル完結 + 9マス配置** |
| ターゲット | 幅広 | **建設業1人親方** |
| 価格 | 月額サブスク | **完全無料** |

---

## 2. Milestones

各 Milestone は narrative 形式で記述。Goal / Scope / Validation and Acceptance / Rollback / Files / Commands を明示。

---

### M1: クリーンアップ（v1.0.1 アップデート）

**Goal**: 使われていない機能と障害源の撤去。アプリを**完全ローカル完結**に戻し、Supabase/RevenueCat 依存をゼロにする。

**Scope**:
- 材料リサーチ機能（楽天検索・AI価格調査）の全削除
- Pro tier / RevenueCat / paywall の全削除
- Supabase 認証・Edge Functions・preflight scripts の全削除
- 無料化による挙動変更（書類/顧客/単価/写真 無制限化、Pro テンプレ全開放）
- Apple Store metadata 整合化（説明文・スクショ・What's New、プライバシーラベル）
- IAP を Remove from Sale

**Out of Scope**:
- 書類タイプ拡張（M2 で実施）
- レイアウト自由化（M3 で実施）
- ユーザーデータの migration（AsyncStorage の古いキーは残存放置でOK）

**Validation and Acceptance**:

以下全てが成立したら M1 完了とする。

```bash
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/genba-note

# 1. 全テスト pass
npm test
# 期待: Test Suites: X passed, X total / Tests: Y passed, Y total

# 2. Lint 0 errors
npm run lint
# 期待: 0 errors (warnings は既存許容)

# 3. 削除対象参照ゼロ（意図的残存を除く）
rg -l 'supabase|RevenueCat|Purchases|isPro|dailyUsage|materialResearch|Rakuten|gemini-search|paywall' \
  genba-note/src genba-note/app
# 期待: No files found
# 注: `genba-note/__tests__` は grep 対象から除外する。M1 後も残す回帰ガード系テスト
#   （`no-paywall-navigation.test.ts`, `layout-no-paid-init.test.ts`, `no-pro-gates-in-screens.test.ts` 等）
#   がテスト名・コメントで上記キーワードを意図的に保持するため。§7 TDD テスト戦略と同じ方針。

# 4. 型チェック
npx tsc --noEmit
# 期待: Found 0 errors

# 5. 起動テスト（手動）
# - RevenueCat / Supabase env 無しでも root layout がレンダリングされる
# - paywall 画面に遷移する導線が消えている
# - 全6テンプレが選択可能、Pro専用の印なし
# - 書類/顧客/単価/写真を制限なく作成できる
```

加えて:
- App Store Connect で **IAP を Remove from Sale** 完了
- **App Store メタデータ更新**: 説明文・サブタイトル・キーワード・スクショ・What's New・Review Notes・プライバシーラベル・プライバシーポリシー
- **Supabase project 停止**（削除しない、30日保持）
- **RevenueCat offering 無効化**（30日保持）
- **Codex review: ok:true** が C3 完了時 / C6 完了時 / C10 完了時（M1 全体完了）の3回で成立

**Rollback**:

| 回復経路 | 手順 | 影響 |
|---|---|---|
| コード側 | 各コミット単位で `git revert` | 実装途中なら即復帰可 |
| Supabase | Dashboard で project を**再開**（停止のみなので30日以内は再開可） | 30日超えたら削除済み、復帰不可 |
| RevenueCat | Dashboard で Offering を**再有効化**（無効化のみで復活可） | 30日超えたら削除済み、復帰不可 |
| App Store 配信停止（phased release 中） | App Store Connect で **Pause Phased Release** | 新規ユーザーへの配信停止、既存ユーザーは v1.0.1 のまま |
| App Store 配信停止（public release 後） | App Store Connect で **Remove from Sale** | 新規ダウンロード不可、既存ユーザーには影響なし |
| 致命的バグ | v1.0.0 のコードで **hotfix build v1.0.2 を申請**（審査 1-2日） | 過去版への「完全戻し」は不可、実質は hotfix 経由でしか戻せない |
| IAP（購入者0名なので通常問題なし） | Remove from Sale 取り消しで復活 | 実害想定なし |

**戻せないもの**:
- v1.0.1 をインストール済みユーザーを v1.0.0 に戻すことは App Store 仕様上**不可**
- Supabase/RevenueCat の30日超え削除後は新規プロジェクト作成からやり直し

**Files touched**:
- **削除**: §3 の削除リスト参照
- **修正**: §3 の修正対象リスト参照
- **.env / .env.example の扱い（重要）**:
  - `.env` は **Yuma が手動で削除/編集**。agent（Claude）は値を**読まない**、触らない。
  - `.env.example` は agent が修正可能（値を含まないテンプレファイルのため）
  - CLAUDE.md の secret-handling ルール遵守

**Commands (マイルストーン全体のコマンド順序)**:

```bash
# 着手前
git stash list  # paywall WIPの扱い確認（Decision Log Q3）
git checkout -b refactor/m1-cleanup

# 削除対象の完全棚卸し（実装直前）
# 棚卸しは __tests__ も含めて 96 ファイル前後がヒット想定（M1_INVENTORY.md の根拠）
# Acceptance 側の rg（上の #3）は src app 限定だが、棚卸しはテストも漏れなく分類するため __tests__ も含める
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務
rg -l 'supabase|RevenueCat|Purchases|isPro|dailyUsage|materialResearch|Rakuten|gemini-search|paywall' \
  genba-note/src genba-note/app genba-note/__tests__ > /tmp/m1_cleanup_targets.txt
# → 6区分（UI / domain / storage / pdf-export / docs / tests）に分類

# 各コミット後
cd genba-note && npm test && npm run lint && npx tsc --noEmit

# M1 完了前
# Yuma が手動で実施:
#   - .env を手動で Supabase/RevenueCat 関連の行削除（agent は読まない）
#   - App Store Connect で IAP Remove from Sale + metadata更新
#   - Supabase Dashboard で project 停止
#   - RevenueCat Dashboard で offering 無効化
```

**コミット粒度（コミット1〜10）**:

UI → consumer 剥がし → ドメイン本体削除 → config の順。**各コミット完了時に `npm test && npm run lint && npx tsc --noEmit` を green で通す**ことを最優先制約とし、これを破らない範囲でコミットを分割する。具体的には C3 で **全 consumer の `@/subscription` / `@/hooks/useProStatus` / `@/domain/materialResearch` / `@/hooks/useMaterialSearch` / `@/hooks/useAiPriceSearch` 参照を完全剥がし**、その後 C4/C5 でドメイン実装本体を削除することで、ドメイン削除時点の import 解決エラーをゼロにする。各コミットは TDD RED → GREEN → REFACTOR を厳守。

**注記（M1対象外）**: `src/domain/unitPrice/searchService.ts` は単価表の純粋検索・ソート機能（`matchesSearchText` / `filterUnitPrices` / `sortUnitPrices`）で materialResearch とは無関係。M1 では削除も修正もしない。

**実装状況（v11 時点の現実）**: 本計画は当初 v9 時点で未着手と想定していたが、実際には `refactor/m1-cleanup` ブランチに既に 9 コミット（M1-1〜M1-8、`main` から +9）が積まれていた。下表の「実装状態」列は v11 で現実と突き合わせた結果を示す。stub 戦略（M1-4 で `useProStatus` を `{ isPro: true }` 固定返却の no-op stub に差し替え）は v10.8 計画の「consumer から完全剥がし → C4 本体削除」と途中経路こそ異なるが、最終状態は同一。v11 では既存 9 コミットを尊重し、残作業のみ再マッピングする。

| # | 対象 | 分類 | ゲート | 実装状態 |
|---|---|---|---|---|
| C1 | paywall UI 全削除（`app/paywall.tsx`, `app/paywallMessages.ts`, `app/paywallState.ts`, `__tests__/subscription/paywallState.test.ts` 等）+ 回帰ガード `no-paywall-navigation.test.ts` 拡張 | UI | — | **✅ 完了** (`4ee3ea5` M1-2) |
| C2 | material research UI 全削除（`src/components/unitPrice/Material*`, `AiSearch*`, `AiPriceItemCard`, `materialSearchLimitUtils`, `aiSearchViewState` + 関連tests） + consumer cleanup (`app/(tabs)/prices.tsx`, `LineItemList.tsx`, `components/unitPrice/index.ts`) + 回帰ガードテスト `no-material-research-ui.test.ts` 追加 | UI | — | **✅ 完了** (`bb4c5f4`) |
| C3-pre | 先行実装された UI 側剥がし: ①navigation entry points 無効化 / ②`_layout.tsx` の RevenueCat + Supabase-Auth 初期化削除 / ③preview.tsx header 訂正 / ④`useProStatus` を `{ isPro: true }` no-op stub 化 / ⑤各 tab の Pro gates 削除 / ⑥customer/[id].tsx の Pro gates 削除 / ⑦settings + templateOptions `isProTemplate` / `resolveTemplateForUser` 使用側クリーンアップ / ⑧document/[id].tsx + SaveActionSheet の isPro 削除 | UI | — | **✅ 完了** (`70974e9` M1-1, `33bdd6a` M1-3, `e894277` M1-3a, `2313fa6` M1-4, `ebe850f` M1-5, `eebeab1` M1-6, `21c9919` M1-7, `96a92b6` M1-8) |
| C3-rest-1 | **freeTierLimitsService 連鎖剥がし + 関連テスト同時更新**: source 4 ファイル: `src/domain/document/documentService.ts`（`freeTierLimitsService` / `FREE_DOCUMENT_LIMIT` import 削除 + `isPro` 引数削除 + `enforceDocumentCreationLimit` 呼び出し削除）, `src/domain/document/conversionService.ts`（`freeTierLimitsService` 参照と isPro 引数削除）, `src/hooks/useDocumentEdit.ts`（`createDocument(input, { isPro })` → `createDocument(input)` 更新）, `app/document/[id].tsx`（`useDocumentEdit(documentId, documentType, true)` → `useDocumentEdit(documentId, documentType)` caller cleanup）。**同 commit でテスト更新**: `__tests__/domain/document/documentService.test.ts`（`FREE_DOCUMENT_LIMIT` / `{ isPro }` 検証削除）, `__tests__/domain/document/conversionService.test.ts`（`freeTierLimitsService` 依存テスト削除）, `__tests__/hooks/useDocumentEdit.test.ts`（`isPro` 伝搬テスト削除）。完了時 tsc/test/lint green | domain + caller + tests | — | **✅ 完了** |
| C3-rest-2 | **templateOptions + pdf/csv + UI caller + errorMessages 連鎖剥がし + 関連テスト同時更新**: source 10 ファイル: `src/constants/templateOptions.ts`（`isProTemplate` 関数削除 + `resolveTemplateForUser` / `getSelectableTemplateOptions` の `isPro` 引数除去 + L86 `disabled: !isPro && option.requiresPro` 分岐削除 + `requiresPro` プロパティ/型定義削除）, `src/pdf/pdfGenerationService.ts`（`checkProStatus` import/呼び出し削除 + **watermark 撤去（`injectSampleWatermark` 呼び出し削除、全ユーザー向けに clean PDF 常時出力）** — 完全無料化方針で Pro 廃止に伴い Free 限定の SAMPLE watermark も不要、`resolveTemplateForUser(..., isPro)` call site 更新）, `src/pdf/index.ts`（`checkProStatus` / `ProGateReason` / `ProGateResult` re-export 削除）, `src/pdf/types.ts`（`@/subscription/types` re-export 削除・ProGate 型削除）, `src/domain/csvExport/csvFileService.ts`（`checkProStatus` 削除・Pro gating 削除）, `src/constants/errorMessages.ts`（`ProGateReason` import 削除 + `PRO_GATE_MESSAGES` / `SUBSCRIPTION_ERROR_MESSAGES` / `getProGateMessage` / `getSubscriptionErrorMessage` 削除 — pdf/types の ProGateReason 消滅と同 commit で処理）, `src/constants/index.ts`（`PRO_GATE_MESSAGES` / `SUBSCRIPTION_ERROR_MESSAGES` / `getProGateMessage` / `getSubscriptionErrorMessage` の re-export 削除）, `src/components/settings/TemplateSelectionSection.tsx`（`getSelectableTemplateOptions(true)` → `getSelectableTemplateOptions()` + L68-72 PRO バッジ branch 削除）, `src/components/document/TemplatePickerModal.tsx`（isPro prop 依存除去 + L83 PRO バッジ branch 削除）, `app/document/preview.tsx`（`useProStatus` 呼び出し削除 + `resolveTemplateForUser(..., isPro)` call site 更新）。**同 commit でテスト更新**: `__tests__/constants/templateOptions.test.ts`（関数削除と引数除去に合わせて最終整理）, `__tests__/domain/csvExport/csvFileService.test.ts`（`@/subscription/proAccessService` 依存テスト削除）, `__tests__/pdf/pdfGenerationService.test.ts`（`checkProStatus` 依存テスト削除） | domain + caller + tests | — | **✅ 完了** |
| C3-rest-3 | **types/hooks re-export + ActionSheetModal + Codex review #1**: source 3 ファイル: `src/types/index.ts`（`./subscription` / `./materialResearch` re-export 削除）, `src/hooks/index.ts`（`useProStatus` / `UseProStatusReturn` re-export 削除）, `src/components/common/ActionSheetModal.tsx`（`ActionSheetOption.isPro` prop 型定義 L36 削除 + L118 近辺の `option.isPro` による Pro badge branch 削除）。**C3 完了条件 rg の glob 除外に追加**: `!src/storage/secureStorageService.ts`, `!src/storage/index.ts`（これらは subscription type/API 消滅が C4 本体削除と同 commit でしか成立しないため C4 に委譲）。**完了後 Codex review #1 実行（C3 完了ゲート）** | config + UI | **Codex review #1** | **✅ 完了** |
| C4 | subscription ドメイン + storage subscription cache 全削除（`src/subscription/` ディレクトリ全体, `src/hooks/useProStatus.ts`, `src/hooks/useDailySearchUsage.ts`, `src/types/subscription.ts`）+ **`src/storage/secureStorageService.ts` の subscription cache 部分削除**（`@/types/subscription` import、`SubscriptionCache` / `SUBSCRIPTION_STORE_KEYS` 参照、`getSubscriptionCache` / `saveSubscriptionCache` / `clearSubscriptionCache` 関数を削除）+ **`src/storage/index.ts` の 3 関数 re-export 削除**。当該ドメインに依存するテストの同時修正: `__tests__/subscription/`（残存分全削除、subscriptionService.test.ts の subscription cache mock も同 commit で削除）, `__tests__/hooks/useProStatus.test.ts`（M1-4 で stub 版に書き換え済 → 削除）, `useDailySearchUsage.test.ts`（削除）, `__tests__/storage/secureStorageService.test.ts`（subscription cache API 参照テスト削除）。**C3-rest-1/2 で document/csv/pdf 側のテストは同 commit で処理済のため C4 では触らない**。C3 で consumer ゼロ化・C4 で storage 側 subscription cache も同時削除のため C4 完了時 green。 | domain + storage + tests | — | **✅ 完了** |
| C5 | materialResearch ドメイン 全削除（`src/domain/materialResearch/`, `src/hooks/useMaterialSearch.ts`, `useAiPriceSearch.ts`, `src/types/materialResearch.ts`）+ 当該ドメインに依存するテスト: `__tests__/domain/materialResearch/`（全削除）, `__tests__/hooks/useMaterialSearch.test.ts`（削除）, `useAiPriceSearch.test.ts`（削除）。**注: `src/domain/unitPrice/searchService.ts` は単価表の純粋検索・ソート機能（materialResearch 無関係）なので削除対象に含めない**。 | domain + tests | — | **✅ 完了** |
| C6 | auth + supabase + preflight 削除（`src/domain/auth/`, `__tests__/domain/auth/`, `scripts/preflightEnv*`, `__tests__/scripts/preflightEnv.test.ts`, プロジェクトルート `supabase/`）+ `package.json` から `@revenuecat/purchases-react-native`, `@supabase/supabase-js`, `expo-auth-session`, `expo-web-browser` 削除 | storage / config | **Codex review #2** | **✅ 完了** |
| C7 | 残 config 内部整理（C3-rest〜C6 で触れなかった dead re-export / dead import / dead type の残骸整理のみ） | config | — | **✅ 完了** |
| C8 | utils / config 剥がし（`src/utils/environment.ts` の Supabase URL 検査削除, `src/utils/legalLinkHandlers.ts` の paywall 導線削除, `genba-note/.env.example` の Supabase / RevenueCat 行削除, `genba-note/eas.json` の `SUPABASE_URL` / `PUBLISHABLE_KEY` / `REVENUECAT_PUBLIC_KEY` 削除） | utils / config | — | **✅ 完了** |
| C9 | `package-lock.json` / `deno.lock` 再生成（`cd genba-note && npm install`、`deno.lock` は Supabase 撤去に伴いクリーンアップ） | config | — | **✅ 完了** |
| C10 | 残テスト最終調整: `__tests__/pdf/cleanupOrphanedPdfCache.test.ts`, `__tests__/utils/environment.test.ts`, `__tests__/app/settings-legal-links.test.ts` を Acceptance 通る状態に整える + M1 Acceptance 全5項目（test / lint / rg grep / tsc / 手動起動）確認 | tests | **Codex review #3** | **✅ 完了** |

**C3 consumer 剥がし 対象詳細**（C3-pre / C3-rest を統合した完全版、実装時の抜け漏れ防止）:

凡例: `[✅ C3-pre]` = M1-1〜M1-8 で実装済 / `[✅ C2]` = C2 コミット `bb4c5f4` で実装済 / `[⬜ C3-rest-N]` = N (1/2/3) subcommit で実施予定

| ファイル | 剥がす内容 | 担当 |
|---|---|---|
| `app/(tabs)/index.tsx` | 上限表示・Pro切替UI削除 | [✅ C3-pre] M1-1, M1-5 |
| `app/(tabs)/settings.tsx` | Pro関連ボタン削除、legal links 保持 | [✅ C3-pre] M1-1, M1-7 |
| `app/(tabs)/prices.tsx` | Pro gate / 上限表示 削除 + material research consumer 削除 | [✅ C3-pre + ✅ C2] M1-1, M1-5 (Pro 側) + C2 `bb4c5f4` (material research 側) |
| `app/(tabs)/customers.tsx` | 上限表示削除 | [✅ C3-pre] M1-1, M1-5 |
| `app/(tabs)/balance.tsx` | 上限表示削除 | [✅ C3-pre] M1-1, M1-5 |
| `app/_layout.tsx` | RevenueCat / Supabase 初期化削除、paywall route 削除 | [✅ C3-pre] M1-1, M1-3 |
| `app/document/[id].tsx` | `useProStatus` 削除 / `useDocumentEdit(..., true)` の isPro 引数 caller cleanup | [部分完了 → C3-rest-1] M1-1, M1-8 で `useProStatus` 除去完了。残る `useDocumentEdit(..., true)` の `true` リテラル削除は **C3-rest-1** で useDocumentEdit 引数削除と同時実施 |
| `app/document/preview.tsx` | `useProStatus` 削除、`resolveTemplateForUser` の isPro 分岐削除 | [⬜ C3-rest-2] ※M1-1 / M1-3a で header と paywall redirect は削除済、stub `useProStatus()` 呼び出しと `resolveTemplateForUser(..., isPro)` call site を C3-rest-2 で修正 |
| `app/customer/[id].tsx` | `useProStatus` 削除 | [✅ C3-pre] M1-1, M1-6 |
| `src/components/settings/TemplateSelectionSection.tsx` | (a) `getSelectableTemplateOptions(true)` の `true` 引数削除 / (b) L68-72 の `option.requiresPro && (...)` PRO バッジ branch 削除（`requiresPro` フィールド撤去に追従） | [部分完了 → C3-rest-2] M1-7 で一部整理済。`true` リテラル caller + dead PRO バッジ UI branch は **C3-rest-2** で除去 |
| `src/components/document/edit/SaveActionSheet.tsx` | Pro 制限削除 | [✅ C3-pre] M1-8 |
| `src/components/document/TemplatePickerModal.tsx` | Pro テンプレ制限削除（`getSelectableTemplateOptions(isPro)` の isPro prop 依存除去 + L83 の `option.requiresPro && (...)` PRO バッジ branch 削除） | [⬜ C3-rest-2] |
| `src/components/common/ActionSheetModal.tsx` | (a) `ActionSheetOption.isPro` prop 型定義削除 (L36) / (b) L118 近辺の `option.isPro` による Pro badge branch 削除 | [⬜ C3-rest-3] |
| `src/components/unitPrice/UnitPriceEditorModal.tsx` | — | [✅ C2 で完全クリア] 実コード確認の結果 Material* / useMaterialSearch / useAiPriceSearch 依存は残存せず、C3 完了条件 rg にもヒットしない。追加作業不要 |
| `src/components/document/edit/LineItemList.tsx` | 材料検索ボタン削除 | [✅ C2] `bb4c5f4` で MaterialSearchModal import / researchModalVisible / handleResearchAddLineItems / researchButton Pressable / styles を全削除 |
| `src/components/unitPrice/index.ts` | Material* export 削除 | [✅ C2] `bb4c5f4` で Material*/AiSearch*/AiPriceItemCard の re-export を削除 |
| `src/domain/document/documentService.ts` | `isPro` 引数・`freeTierLimitsService` 参照削除 | [⬜ C3-rest-1] |
| `src/domain/document/conversionService.ts` | `freeTierLimitsService` 参照削除 | [⬜ C3-rest-1] |
| `src/domain/csvExport/csvFileService.ts` | `checkProStatus` 削除、Pro gating 削除 | [⬜ C3-rest-2] |
| `src/pdf/pdfGenerationService.ts` | `checkProStatus` 削除 + `injectSampleWatermark` 呼び出し削除（完全無料化方針で全ユーザーに clean PDF 常時出力）、`resolveTemplateForUser(..., isPro)` call site 更新 | [⬜ C3-rest-2] |
| `src/pdf/index.ts` | `checkProStatus` re-export 削除、`ProGateReason` / `ProGateResult` type export 削除 | [⬜ C3-rest-2] |
| `src/pdf/types.ts` | `@/subscription/types` re-export 削除、`ProGateReason` / `ProGateResult` 型定義削除 | [⬜ C3-rest-2] |
| `src/constants/templateOptions.ts` | (a) `isProTemplate` 関数ごと削除 / (b) `resolveTemplateForUser` の `isPro` 引数除去 / (c) `getSelectableTemplateOptions` の `isPro` 引数除去 + L86 の `disabled: !isPro && option.requiresPro` 分岐削除 / (d) `TEMPLATE_OPTIONS` 各エントリの `requiresPro: false` フィールドおよび型定義から `requiresPro` プロパティ削除（caller の PRO バッジ branch 削除に連動） | [部分完了 → C3-rest-2] M1-7 で呼び出し側を `isPro=true` 等価へ誘導済み。関数削除・引数除去・フィールド削除は **C3-rest-2** で実施 |
| `src/constants/errorMessages.ts` | `ProGateReason` import 削除、`PRO_GATE_MESSAGES` / `SUBSCRIPTION_ERROR_MESSAGES` / `getProGateMessage` / `getSubscriptionErrorMessage` 削除 | [⬜ C3-rest-2] ※`src/pdf/types.ts` の ProGateReason 型削除と同 commit で処理（型エラー連鎖を防ぐため） |
| `src/constants/index.ts` | `PRO_GATE_MESSAGES` / `SUBSCRIPTION_ERROR_MESSAGES` / `getProGateMessage` / `getSubscriptionErrorMessage` の re-export 削除 | [⬜ C3-rest-2] ※`errorMessages.ts` 本体変更と同 commit |
| `src/hooks/index.ts` | `useProStatus` / `UseProStatusReturn` re-export 削除 | [⬜ C3-rest-3] |
| `src/hooks/useDocumentEdit.ts` | `createDocument(input, { isPro })` → `createDocument(input)` 更新（materialResearch 連携は既に残存せず、C2 以前の何らかの剥がしで消化済） | [⬜ C3-rest-1] |
| `src/types/index.ts` | `subscription` / `materialResearch` re-export 削除 | [⬜ C3-rest-3] |
| `src/storage/secureStorageService.ts` | `@/types/subscription` import 削除、`SubscriptionCache` / `SUBSCRIPTION_STORE_KEYS` 参照と `getSubscriptionCache` / `saveSubscriptionCache` / `clearSubscriptionCache` 関数削除 | [⬜ C4] `src/subscription/subscriptionService.ts` と `__tests__/subscription/subscriptionService.test.ts` が subscription cache mock を前提にしているため C4 本体削除と同 commit |
| `src/storage/index.ts` | 上記 3 関数の re-export 削除 | [⬜ C4] `secureStorageService` 本体変更と同 commit |
| `__tests__/hooks/useDocumentEdit.test.ts` | `isPro` 伝搬検証テスト削除（materialResearch 連携テストは既に残存せず） | [⬜ C3-rest-1] `useDocumentEdit.ts` 本体変更と同 commit |
| `__tests__/constants/templateOptions.test.ts` | `isProTemplate` / `resolveTemplateForUser` テスト削除（該当関数の `isPro` 引数除去と同時） | [部分完了 → C3-rest-2] M1-7 で 102→37 行に縮小済。`isPro` 引数を使った no-op 検証テストの最終調整は **C3-rest-2** で実施 |
| `__tests__/domain/document/documentService.test.ts` | `FREE_DOCUMENT_LIMIT` / `{ isPro }` 依存テスト削除 | [⬜ C3-rest-1] `documentService.ts` 本体変更と同 commit |
| `__tests__/domain/document/conversionService.test.ts` | `freeTierLimitsService` 依存テスト削除 | [⬜ C3-rest-1] `conversionService.ts` 本体変更と同 commit |
| `__tests__/domain/csvExport/csvFileService.test.ts` | `@/subscription/proAccessService` 依存テスト削除 | [⬜ C3-rest-2] `csvFileService.ts` 本体変更と同 commit |
| `__tests__/pdf/pdfGenerationService.test.ts` | `checkProStatus` 依存テスト削除 | [⬜ C3-rest-2] `pdfGenerationService.ts` 本体変更と同 commit |

**C3 完了条件（v11.8 拡張版）**: `cd genba-note` 後に以下を実行し、出力が空。plain `isPro`、subscription cache 関連 ID、再 export パス（`./subscription` / `./materialResearch`）、`useDocumentEdit(..., true)` caller、`getSelectableTemplateOptions(true)` caller、`requiresPro`（テンプレ Pro 限定フィールド + PRO バッジ UI branch）、さらに `PRO_GATE_MESSAGES` 系定数・関数まで網羅するよう `-e` パターンを拡張。`src/storage/secureStorageService.ts` と `src/storage/index.ts` は C4 で subscription 本体削除と同 commit で処理するため glob 除外に追加。

```bash
cd genba-note && rg -l \
  -e '@/subscription' \
  -e 'useProStatus' \
  -e 'checkProStatus' \
  -e 'freeTierLimitsService' \
  -e '@/hooks/useMaterialSearch' \
  -e '@/hooks/useAiPriceSearch' \
  -e '@/domain/materialResearch' \
  -e '@/types/subscription' \
  -e '@/types/materialResearch' \
  -e '\bisPro\b' \
  -e 'SubscriptionCache|SUBSCRIPTION_STORE_KEYS|getSubscriptionCache|saveSubscriptionCache|clearSubscriptionCache' \
  -e '\./subscription' \
  -e '\./materialResearch' \
  -e 'useDocumentEdit\([^)]*,\s*true\)' \
  -e 'getSelectableTemplateOptions\(\s*true\s*\)' \
  -e 'requiresPro' \
  -e 'PRO_GATE_MESSAGES|SUBSCRIPTION_ERROR_MESSAGES|getProGateMessage|getSubscriptionErrorMessage' \
  src app \
  --glob '!src/subscription/**' \
  --glob '!src/domain/materialResearch/**' \
  --glob '!src/hooks/useProStatus.ts' \
  --glob '!src/hooks/useDailySearchUsage.ts' \
  --glob '!src/hooks/useMaterialSearch.ts' \
  --glob '!src/hooks/useAiPriceSearch.ts' \
  --glob '!src/types/subscription.ts' \
  --glob '!src/types/materialResearch.ts' \
  --glob '!src/storage/secureStorageService.ts' \
  --glob '!src/storage/index.ts'
```

**現行 HEAD（v11.8 更新時点 = C2 完了後）のヒット内訳** (計 17 ファイル): C3-rest-1 の 4 ファイル (`app/document/[id].tsx`, `src/domain/document/documentService.ts`, `src/domain/document/conversionService.ts`, `src/hooks/useDocumentEdit.ts`) + C3-rest-2 の 10 ファイル (`app/document/preview.tsx`, `src/constants/templateOptions.ts`, `src/constants/errorMessages.ts`, `src/constants/index.ts`, `src/domain/csvExport/csvFileService.ts`, `src/pdf/index.ts`, `src/pdf/pdfGenerationService.ts`, `src/pdf/types.ts`, `src/components/document/TemplatePickerModal.tsx`, `src/components/settings/TemplateSelectionSection.tsx`) + C3-rest-3 の 3 ファイル (`src/components/common/ActionSheetModal.tsx`, `src/hooks/index.ts`, `src/types/index.ts`)。C3-rest-1 → C3-rest-2 → C3-rest-3 の順で 17 → 13 → 3 → 0 になる。

subscription / materialResearch ディレクトリ本体・hook 本体・types 本体、および `src/storage/secureStorageService.ts` / `src/storage/index.ts` の subscription cache 部分は C4 で subscription 本体削除と同 commit で処理するため、C3 完了条件 rg では glob 除外で見逃す（consumer はゼロ参照）。rg は `-e` 複数指定で alternation を成立させる（`\|` は ripgrep ではリテラル `|` になるため使わない）。

**未割当ファイルが発生した場合**: 実装中に M1_INVENTORY.md の記載と表の割当が食い違うファイルを発見したら、その時点で表を更新してから進める。「見つけたけど割り当て先が不明」のまま進めない。

**Codex Review ゲート**:
- C3 完了時（paywall / 材料検索 UI剥がし直後）
- C6 完了時（package.json 依存削除直後）
- C10 完了時（全変更統合後、M1 Acceptance 全pass 後）

各 review で `ok: true` になるまで修正→再 review を最大5回反復。

---

### M3 Preview: 最小レイアウト機能（v1.1.0 アップデート、親友先行体験）

**Goal**: 親友の「配置を変えたい」要望に最短で応える。親友が**レイアウトを変える体験**を v1.1.0 で得られる状態にする。

**Scope (確定済み)**:
- **対象テンプレート**: `CONSTRUCTION` / `SIMPLE` / `FORMAL_STANDARD` の3つ
- **対象要素**: 主要3つ（**振込先** / **印影** / **会社情報**）
- **入力方式**: **プリセット選択** ベース（出発点）+ 選択後に9マスで微調整可
- **初期プリセット**: 3種
  1. **建設業定番** — 現行 CONSTRUCTION テンプレのデフォルト配置
  2. **振込先強調** — 振込先を上部に大きく配置、入金促進訴求
  3. **シンプル** — 装飾を減らし明細中心、余白多め

**Out of Scope**:
- 残り3テンプレ（ACCOUNTING/MODERN/CLASSIC）の 9マス対応 → M3 Full
- 3要素以外（明細・備考・ロゴ・日付・タイトル等）の 9マス対応 → M3 Full
- 画像透過バグ改善 → M3 Full
- 書類タイプ拡張・必須項目検証 → M2

**Validation and Acceptance**:

```bash
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/genba-note

# 1. TDD テスト全 pass
npm test
# 期待: §7 のテスト群が含まれ、全て緑

# 2. Lint 0 errors
npm run lint

# 3. 型チェック
npx tsc --noEmit

# 4. 手動統合テスト
# - 新規書類作成 → プリセット3種から選択 → 9マス微調整 → PDF出力で反映
# - 既存書類（layoutSnapshot なし）を開く → default layout 自動付与、見た目不変
# - 設定変更後、過去書類再出力 → 作成時の layoutSnapshot で出力される
```

加えて:
- **App Store メタデータ更新**: What's New で「レイアウト自由化プレビュー機能追加（一部テンプレ・主要3要素のみ、拡張予定）」と**誇張なく**記載、スクショ差し替え（プリセット選択画面含む）
- **親友に配布 + フィードバック取得** ≥ 1週間
- **Codex review: ok:true**（データモデル固め時 / UI 完了時 / Preview 完了時 の3回）

**親友フィードバック後の分岐**:
- ポジティブ（「使える」「もっと動かしたい」等） → M3 Full 着手
- ネガティブ（「この方向じゃない」「期待と違う」等） → scope 再考、M3 Full **凍結** して別方向模索

**Rollback**:

| 回復経路 | 手順 | 影響 |
|---|---|---|
| phased release 中の配信停止 | App Store Connect で **Pause Phased Release** | 新規ユーザーへの v1.1.0 配信停止、既存は v1.0.1 のまま |
| public release 後の配信停止 | App Store Connect で **Remove from Sale** | 新規ダウンロード不可 |
| 致命的バグ | v1.0.1 相当のコードで hotfix v1.1.1 を申請（レイアウト機能を一時 disabled） | 審査1-2日、既存 v1.1.0 ユーザーは次回更新まで影響継続 |
| データ側 | `layoutSnapshot` migration は可逆（古い書類は無視される、既存データは破壊しない） | なし |

**戻せないもの**:
- v1.1.0 をインストール済みユーザーを v1.0.1 に戻すことは App Store 仕様上不可
- layoutSnapshot 付与後、データ自体に後戻り不要（snapshot は将来レイアウト変更の影響から書類を守る仕組み）

**予防策**:
- **phased release** で段階配信（初日1% → 徐々に拡大）することで、致命的バグを早期発見 + 影響範囲を最小化

**Files touched** (主要):
- 新規: `src/types/layoutConfig.ts`, `src/domain/layout/presetService.ts`, `src/components/settings/LayoutEditorSection.tsx`
- 修正: `src/types/document.ts`（`layoutSnapshot?: LayoutConfig`, `templateId: DocumentTemplateId` 追加）
- 修正: `src/types/settings.ts`（下記「永続化モデル」参照、**template-aware なキー構造**）
- 修正: `src/pdf/templates/constructionTemplate.ts` / `simpleTemplate.ts` / `formalStandardTemplate.ts` - layoutSnapshot を受けて3要素の配置反映
- 修正: `src/storage/migrations/vN-add-layout-snapshot.ts` - 既存 document に default layout 付与（下記「legacy migration」参照）

**永続化モデル（template-aware + forward-compatible）**:

プリセット選択や 9マス微調整の結果は **書類タイプ × テンプレート** 単位で保存。加えて、**M3 Preview（v1.1.0）→ M3 Full（v1.2.0）の前方互換**のため `schemaVersion` とフィールド merge 規則を導入する（Codex review #4 指摘反映）:

```typescript
// src/types/layoutConfig.ts
export interface LayoutConfig {
  schemaVersion: number;  // 1 = M3 Preview (3要素), 2 = M3 Full (10+要素)
  elements: {
    [key in LayoutElementKey]?: { position: number /* 1..9 */ };
  };
}

// v1.1.0 で保存される LayoutConfig は schemaVersion=1 で 3要素のみ
// v1.2.0 で読み込むと merge:
//   - 既存3要素の position は不変（「見た目不変」を保証）
//   - 新要素（明細・備考・ロゴ等）は template default を merge
//   - 読み込み後は schemaVersion=2 に書き換え保存

// src/types/settings.ts
interface AppSettings {
  // ...既存フィールド
  layoutConfigs: {
    [docType in DocumentType]?: {
      [templateId in DocumentTemplateId]?: LayoutConfig;
    };
  };
}

// 例: appSettings.layoutConfigs.estimate.CONSTRUCTION = { schemaVersion: 1, elements: { bankInfo: { position: 1 }, ... } }
```

**Forward-compatible merge 規則（v1.2.0 で実装）**:

重要ルール:
1. **既存要素の position は不変**（「見た目不変」保証）
2. **新要素は template default で補完**
3. **不明な element key は skip**（旧 version から来た想定外キー / 手動改ざん対策）

```typescript
// src/domain/layout/layoutMerger.ts
import { LAYOUT_ELEMENT_KEYS } from '@/types/layoutConfig';
// LAYOUT_ELEMENT_KEYS: v1.2.0 時点で許可された要素キーの readonly 配列

function isKnownLayoutElementKey(key: string): key is LayoutElementKey {
  return (LAYOUT_ELEMENT_KEYS as readonly string[]).includes(key);
}

export function upgradeLayoutConfig(
  stored: LayoutConfig,
  templateId: DocumentTemplateId
): LayoutConfig {
  if (stored.schemaVersion === 2) return stored;  // 既に最新

  // Step 1: stored.elements から不明 key を filter out
  const filtered: Partial<Record<LayoutElementKey, { position: number }>> = {};
  for (const [key, value] of Object.entries(stored.elements ?? {})) {
    if (isKnownLayoutElementKey(key) && value && typeof value.position === 'number') {
      filtered[key] = value;
    }
    // 不明 key は skip（意図的）
  }

  // Step 2: template default に filtered を重ねる（filtered が勝つ → 既存要素 position 不変）
  const templateDefaults = getTemplateDefaultLayout(templateId);
  return {
    schemaVersion: 2,
    elements: {
      ...templateDefaults.elements,  // 新要素を template default で埋める
      ...filtered,                     // 既存の許可キーのみで上書き
    },
  };
}
```

プリセット適用:
- ユーザーが「建設業定番」を選ぶ → `layoutConfigs[docType][templateId]` に プリセット LayoutConfig を書き込み
- その後の 9マス微調整も同じキーに保存 → 次回同じ書類タイプ+テンプレ で同じレイアウト再現

書類作成時:
- 現在の `layoutConfigs[docType][templateId]` を snapshot として document に埋め込み（§5 参照）
- 書類側の layoutSnapshot も **upgradeLayoutConfig で読み込み時に merge**（PDF出力時も同様）

**不変性の保証**:
- v1.1.0 で作成した書類（3要素）を v1.2.0 で開いても、その3要素の `position` は変わらない
- 新要素は template default で補完される（ユーザー明示で変更するまで）

**Commands** (TDD サイクル):

```bash
# 着手前
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務
git checkout -b feature/m3-preview

# RED: 失敗するテストを先に書く
cd genba-note
# テストファイル作成例: __tests__/domain/layout/presetService.test.ts
# 内容: プリセット3種 × 3テンプレ の LayoutConfig 生成が期待通りか
npm test -- --testPathPattern='layout' 2>&1 | grep -E 'FAIL|PASS'
# 期待: FAIL（RED が確認できる）

# GREEN: 最小実装
# 1. src/types/layoutConfig.ts 実装
# 2. src/domain/layout/presetService.ts 実装
# 3. テスト再実行
npm test -- --testPathPattern='layout'
# 期待: PASS

# REFACTOR + Codex review
# コミット、Codex review 実施

# PDFテンプレ3種の layoutSnapshot 対応（同様の RED→GREEN）
# マイグレーション実装（下記 legacy migration）
# UI 実装（LayoutEditorSection）

# 手動統合テスト（実機 or simulator）
cd genba-note
npm start
# iPhone Simulator で起動し、以下シナリオ実行:
#   シナリオA: 新規見積書作成 → プリセット3種から1つ選択 → 9マス微調整 → PDF出力 → 反映確認
#   シナリオB: 旧書類を開く → 見た目が M1 リリース時と変わらないことを目視確認
#   シナリオC: 設定でレイアウト変更 → 過去書類再出力 → 作成時の snapshot で出力されること確認

# M3 Preview 完了前
npm test && npm run lint && npx tsc --noEmit
# 期待: 全 pass / 0 errors / 0 type errors
```

**Legacy document migration（見た目不変を保証、Codex review #3 指摘反映）**:

既存書類（`layoutSnapshot` 無し）を開く際、**現在の template 解決ロジック**に従って `templateId` を導出する。`SIMPLE` などのハードコードは行わない:

```typescript
// src/storage/migrations/vN-add-layout-snapshot.ts
// 擬似コード: 実際の templateId 解決は現行 resolveTemplateForUser / settings.defaultEstimateTemplateId 等と同じロジックを使う
for (const doc of allDocuments) {
  if (!doc.layoutSnapshot) {
    // 現行ロジックで templateId を導出（AppSettings.defaultEstimate/InvoiceTemplateId 由来）
    const resolvedTemplateId = resolveCurrentTemplateIdForLegacyDocument(doc, appSettings);
    doc.templateId = resolvedTemplateId;
    doc.layoutSnapshot = getDefaultLayoutFor(doc.type, resolvedTemplateId);
    await saveDocument(doc);
  }
}
```

TDD 回帰テスト:
- `test: legacy document (layoutSnapshot なし) を開いた時、PDF出力は M1 リリース時と同じ視覚結果である` — fail-before（migration 無しで別結果） / pass-after（migration 後は同結果）
- `test: legacy document の templateId 導出が AppSettings.defaultXxxTemplateId に従う`（`'SIMPLE'` 固定にならないこと）

**Codex Review ゲート**:
- LayoutConfig 型と migration 実装完了時
- プリセット3種 + 9マス微調整 UI 完了時
- Preview 全体完了時

---

### M2 + M3 Full: 書類タイプ拡張 + 全要素レイアウト + 画像透過改善（v1.2.0 アップデート、同時リリース）

**Goal**: 適格請求書を法的に安全に発行できる状態にし、全要素・全テンプレで配置自由にし、画像透過バグを解消する。

**Scope**:

**M2 部分（書類タイプ拡張 + 必須項目検証）**:
- `DocumentType` を `'estimate' | 'invoice' | 'qualifiedInvoice'` に拡張
- `REQUIRED_FIELDS` レジストリ（§4 国税庁 No.6625 準拠）
- `validateDocument()` 関数実装
- 新規作成時の書類タイプ選択モーダル
- 必須項目マーク UI（legal_required は赤、business_recommended はオレンジ）
- エクスポート警告ダイアログ:
  - 見積書 / 一般請求書: Pattern A（警告のみ、出力可）
  - 適格請求書: legal_required 欠落時は **ブロック** + 「一般請求書として出力」escape hatch
- 既存 `'invoice'` データは後方互換、自動的に一般請求書として扱う

**M3 Full 部分（全要素 + 全テンプレ + 画像透過）**:
- 全10+要素の 9マス配置（振込先、印影、会社情報、顧客情報、明細、備考、日付、ロゴ、タイトル、小計、消費税欄、合計 等）
- 全6テンプレ対応（FORMAL_STANDARD / ACCOUNTING / SIMPLE / MODERN / CLASSIC / CONSTRUCTION）
- プリセット拡充: 業種別（建設業定番 / 内装業向け / 電気工事向け 等）5-10種
- 画像透過機能の調査 → 改善（「納得いかない」原因特定 → 修正 or 再設計）
- レイアウトプレビュー機能（WebView ベース）

**Validation and Acceptance**:

```bash
# 全テスト pass
npm test

# Lint 0 errors
npm run lint

# 型チェック
npx tsc --noEmit

# 手動統合テスト
# - 書類タイプ3種（見積書/一般請求書/適格請求書）新規作成
# - 適格請求書で登録番号なし → 出力ブロックダイアログ → escape hatch 動作確認
# - 全6テンプレで9マス配置を反映
# - 画像透過: iPhone/Android で同じ見た目、プレビューとPDFで一致
```

加えて:
- **App Store メタデータ更新**: 書類タイプ3種対応、レイアウト全要素対応、画像透過改善を説明文・スクショ・What's New に反映
- **Codex review: ok:true**（M2 validation 完成時 / M3 Full UI 完成時 / M2+M3 Full 統合時）

**Rollback**:

| 回復経路 | 手順 | 影響 |
|---|---|---|
| phased release 中の停止 | App Store Connect で **Pause Phased Release** | 新規 v1.2.0 配信停止 |
| public release 後 | **Remove from Sale** | 新規ダウンロード不可 |
| 致命的バグ | hotfix v1.2.1 を申請、ブロックダイアログ無効化（適格請求書を警告のみに降格）等の安全側修正 | 審査1-2日 |
| 書類タイプ拡張の後方互換 | 既存 `'invoice'` データはそのまま一般請求書として扱う（破壊なし） | なし |

**戻せないもの**:
- v1.2.0 ユーザーを v1.1.0 に戻すことは App Store 仕様上不可
- 適格請求書として保存された書類は、v1.1.0 にダウングレードされても type フィールドは残存（適切にハンドル必要）

**予防策**:
- phased release で段階配信
- TDD テスト厳格化（§7 の qualifiedInvoice 関連）
- Codex review を M2 validation 完成時 / M3 Full UI 完成時 / 統合時の3回実施

**Commands** (自己完結手順):

```bash
# ────────────────────────────────────────
# ブランチ作成
# ────────────────────────────────────────
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務
git checkout main
git pull origin main
git checkout -b feature/m2-m3-full

# ────────────────────────────────────────
# Step 1: M2 書類タイプ拡張 + 必須項目検証
# ────────────────────────────────────────
cd genba-note

# 1-RED: 先に失敗するテスト作成
# __tests__/domain/document/requiredFields.test.ts を新規作成
# 内容: REQUIRED_FIELDS['qualifiedInvoice'] に 8項目含まれるテスト、validateDocument のブロック/警告判定テスト
npm test -- --testPathPattern='requiredFields|documentValidation'
# 期待: FAIL (テスト対象がまだ実装されていない)

# 1-GREEN: 実装
# - src/domain/document/requiredFields.ts 新規作成
# - src/domain/document/documentValidation.ts 新規作成
# - src/types/document.ts で DocumentType = 'estimate' | 'invoice' | 'qualifiedInvoice' に拡張

npm test -- --testPathPattern='requiredFields|documentValidation'
# 期待: PASS

git add -A && git commit -m "feat(M2): add REQUIRED_FIELDS registry and validateDocument"

# 1-REFACTOR + Codex review #1 (M2 validation 完成時)
# /Users/yuma/.claude/skills/codex-review を実行

# ────────────────────────────────────────
# Step 2: 書類タイプ選択 UI + エクスポート警告ダイアログ
# ────────────────────────────────────────

# 2-RED: UI コンポーネントのテスト先行
# __tests__/app/documentTypeSelector.test.tsx
# __tests__/app/validationWarningDialog.test.tsx
npm test -- --testPathPattern='documentTypeSelector|validationWarningDialog'
# 期待: FAIL

# 2-GREEN: 実装
# - app/document/new.tsx 書類タイプ選択モーダル
# - src/components/document/ValidationWarningDialog.tsx 警告ダイアログ
#   - 適格請求書: legal_required 欠落 → ブロック + escape hatch
#   - 他: Pattern A (警告のみ)

npm test -- --testPathPattern='documentTypeSelector|validationWarningDialog'
# 期待: PASS

git add -A && git commit -m "feat(M2): add document type selector and validation warning dialog"

# ────────────────────────────────────────
# Step 3: M3 Full - 全要素9マス対応、全6テンプレ対応
# ────────────────────────────────────────

# 3-RED: 全テンプレで全要素 layoutSnapshot 反映テスト
# __tests__/pdf/templates/allTemplatesLayoutSnapshot.test.ts
npm test -- --testPathPattern='allTemplatesLayoutSnapshot'
# 期待: FAIL

# 3-GREEN: 実装
# - src/pdf/templates/* 各テンプレ（6個）に全10+要素の 9マス配置対応
# - src/types/layoutConfig.ts に全要素キーを追加 (schemaVersion=2)
# - src/domain/layout/layoutMerger.ts の upgradeLayoutConfig で v1.1.0 → v1.2.0 互換
# - プリセット拡充（建設業定番 / 内装業向け / 電気工事向け 等 5-10種）

npm test -- --testPathPattern='allTemplatesLayoutSnapshot|layoutMerger'
# 期待: PASS

git add -A && git commit -m "feat(M3 Full): all elements + all templates 9-grid layout + merger for v1.1 compat"

# ────────────────────────────────────────
# Step 4: 画像透過バグ調査 + 改善
# ────────────────────────────────────────

# 4-a: 現状調査（調査専用 throwaway ブランチ）
git checkout -b investigation/image-transparency
cd genba-note

# 対象ファイル候補を特定
rg -l 'transparent|opacity|alpha|backgroundImage' src/ app/ --type=ts --type=tsx
# 画像透過関連ファイルのリストを取得

# 再現シナリオ手動確認（Yuma + simulator/実機）:
# シナリオA: 設定で背景画像アップロード → 透過度調整 → 書類作成 → プレビュー表示 → PDF出力
# シナリオB: iOS Simulator と Android Emulator で同じ操作 → 差分確認
# シナリオC: PNG透過背景画像と JPEG を比較

# 調査ログを BUGREPORT_image_transparency.md に記録（再現条件、期待、実際）
# 原因仮説を列挙（alpha channel handling / PDF rendering / opacity CSS / etc.）

git checkout feature/m2-m3-full
git branch -D investigation/image-transparency  # 調査終わったら削除

# 4-RED: 調査結果に基づく回帰テスト
# __tests__/pdf/imageTransparency.test.ts
# 内容: PNG透過背景が PDF で正しくレンダリングされるスナップショットテスト、iOS/Android 差分ゼロ
npm test -- --testPathPattern='imageTransparency'
# 期待: FAIL (未修正の状態を RED として記録)

# 4-GREEN: 修正
# 調査で判明した原因箇所を修正
# fallback 案: 「透過度プリセット」（5段階の opacity プリセットを UI で選択、座標ドラッグ不要）

npm test -- --testPathPattern='imageTransparency'
# 期待: PASS

git add -A && git commit -m "fix(M3 Full): image transparency rendering and iOS/Android parity"

# Codex review #2 (M3 Full UI 完成時)
# /Users/yuma/.claude/skills/codex-review を実行

# ────────────────────────────────────────
# Step 5: 統合テスト + 最終確認
# ────────────────────────────────────────

cd genba-note
npm test && npm run lint && npx tsc --noEmit
# 期待: 全 pass / 0 errors / 0 type errors

# 手動統合テスト (iPhone Simulator + Android Emulator):
# シナリオ1: 適格請求書新規作成 → 登録番号なし → 出力ブロックダイアログ → escape hatch → 一般請求書として出力成功
# シナリオ2: 見積書で 6テンプレ全部で 9マス配置を反映できる
# シナリオ3: 画像透過が iOS / Android で視覚的に一致
# シナリオ4: v1.1.0 由来の書類 (schemaVersion=1) を開く → upgradeLayoutConfig で merge → 既存3要素不変、新要素 default 補完

# Codex review #3 (統合時、M2+M3 Full リリース前)
# /Users/yuma/.claude/skills/codex-review を実行

# マージ & リリース
git checkout main
git merge --no-ff feature/m2-m3-full
git tag v1.2.0
git push origin main --tags

# EAS build + submit
cd genba-note
eas build --profile production --platform all
# ビルド完了後
eas submit --profile production --platform all --latest
```

**Files touched**:
- 新規: `src/domain/document/requiredFields.ts`, `src/domain/document/documentValidation.ts`, `src/components/document/ValidationWarningDialog.tsx`
- 修正: `src/types/document.ts`（`DocumentType` 拡張）
- 修正: `src/pdf/templates/*` 全て（全要素9マス対応）
- 修正: 画像透過実装（調査してから修正対象特定）

---

### M4: マーケ刷新（v1.2.0 リリース後）

**Goal**: 新ポジショニング「配置を変えられる建設業見積アプリ」を広める。

**Scope**:
- App Store 説明文・キーワード刷新（レイアウト自由化を全面訴求）
- スクリーンショット総刷新（配置変更の before/after、プリセットギャラリー）
- AI広告動画制作（Instagram Reels / YouTube Shorts / TikTok、各30秒）
- SNS アカウント開設 & 定期投稿
- 親友経由の口コミ導線（インセンティブなし、純粋な推薦）

**Validation and Acceptance**:
- App Store 説明文・スクショ刷新版が審査通過
- 広告動画 3媒体（Instagram / YouTube / TikTok）へ投稿完了
- ASO モニタリング: 「見積書」「建設業 請求書」検索順位を週次で記録、前週比を Decision Log に追記

**Rollback**:

| 回復経路 | 手順 | 影響 |
|---|---|---|
| 広告配信 | 各 SNS 管理画面で即停止 | 直ちに広告表示停止 |
| App Store メタデータ | 旧メタデータを App Store Connect で再入力 → 審査申請 | 審査1-2日 |
| 広告動画反響悪い | 動画差し替え or 配信停止 | なし |

**Commands** (自己完結手順):

```bash
# ────────────────────────────────────────
# Step 0: 現行メタデータのバックアップ作成（rollback 用、M4 着手前必須）
# ────────────────────────────────────────
# 目的: M4 リリース後に戻す必要が生じた時の参照用（M4 着手直前時点の live metadata を退避）
# App Store Connect (https://appstoreconnect.apple.com/apps/6760102152) を開き、
# **M4 着手直前に App Store で live / ready-for-sale になっている最新 metadata**（通常は v1.2.0 時点）を手動で以下ファイルに転記:

cat > docs/store-metadata-pre-m4-ja.md <<'EOF'
# Backup: App Store Metadata (pre-M4 live version)

**Backup timestamp**: <YYYY-MM-DD HH:MM JST>

## アプリ名
<現行のアプリ名をここに記載>

## サブタイトル (最大30文字)
<現行のサブタイトルをここに記載>

## プロモーション用テキスト (最大170文字)
<現行のプロモ用テキスト>

## キーワード (最大100文字、カンマ区切り)
<現行のキーワード>

## 説明 (日本語フル)
<現行の説明文 全文>

## このバージョンの新機能 (最新 What's New)
<現行の What's New>

## スクリーンショット一覧
- 6.7インチ: <枚数とファイル名>
- 6.5インチ: <枚数とファイル名>
- 5.5インチ: <枚数とファイル名>
- iPad: <枚数とファイル名>
- 元ファイル保存先: <assets/screenshots-pre-m4/ など>

## プライバシーラベル
<現行の設定>
EOF

# バックアップファイルを git に保存
git add docs/store-metadata-pre-m4-ja.md
git commit -m "chore(M4): backup pre-M4 App Store metadata before rewrite"

# スクリーンショット素材もバックアップ（assets/screenshots-pre-m4/ ディレクトリへ保存）
mkdir -p assets/screenshots-pre-m4
# App Store Connect から M4 着手直前時点の live スクショをダウンロードし assets/screenshots-pre-m4/ に配置
git add assets/screenshots-pre-m4/
git commit -m "chore(M4): backup pre-M4 screenshots"

# ────────────────────────────────────────
# Step 1: App Store Connect メタデータ刷新
# ────────────────────────────────────────
# 手順 (https://appstoreconnect.apple.com/apps/6760102152):
#   1. 左メニュー「配信」→「iOS App 1.2」を選択
#   2. 「情報」タブ:
#      - 「サブタイトル」: 「配置自由の見積書アプリ for 建設業」 等
#      - 「プロモーション用テキスト」: 新機能訴求文
#   3. 「App情報」タブ:
#      - 「キーワード」: 「見積書,レイアウト,自由,建設業,請求書,カスタマイズ,インボイス,適格請求書,職人,一人親方」
#   4. 「バージョンv1.2.0」セクション:
#      - 「説明」: レイアウト自由化訴求版に差し替え（具体文案は docs/store-metadata-ja.md に事前準備）
#      - 「このバージョンの新機能」: M2+M3 Full の変更サマリ
#      - 「スクリーンショット」: 6.7インチ用 + 6.5インチ用 + 5.5インチ用 + iPad用 を差し替え
#        - プリセット選択画面 (1枚)
#        - 9マス配置エディタ (1枚)
#        - before/after (1枚)
#        - 書類タイプ3種選択 (1枚)
#        - 完成書類例 (1枚)
#      - 「プロモーション用テキスト」: 新規 30文字以内

# ────────────────────────────────────────
# Step 2: 広告動画制作（使用ツールを1つに固定）
# ────────────────────────────────────────
# 使用ツール: ChatGPT + Sora 2（text-to-video + text-to-image 統合）
#   (Yuma が別ツールを希望する場合は本 Plan をレビューし再決定)
#
# 動画仕様:
#   - 30秒 × 3パターン（訴求の主題別）
#     a) レイアウト自由化（配置変更デモ）
#     b) 建設業特化（職人の作業風景 + アプリ画面）
#     c) インボイス安全（適格請求書の警告機能）
#   - 縦型 9:16（全媒体共通）
#   - 日本語ナレーション + 字幕必須
#
# 制作フロー:
#   1. Sora でシーン動画生成（30秒 × 3本）
#   2. CapCut (無料) で字幕・ナレーション合成
#   3. 各媒体フォーマット対応:
#      - Instagram Reels: 9:16 / 最大60秒
#      - YouTube Shorts: 9:16 / 最大60秒
#      - TikTok: 9:16 / 15-60秒
#   4. 書き出し: MP4 H.264, 1080x1920

# ────────────────────────────────────────
# Step 3: SNS アカウント開設 & 初回投稿
# ────────────────────────────────────────
# アカウント名（統一）:
#   - Instagram: @pochittojimu_official (Meta Business Suite から開設)
#   - YouTube: @pochittojimu-official (Google アカウントから作成)
#   - TikTok: @pochittojimu (TikTok app から作成)
#
# プロフィール統一テキスト:
#   「建設業向け見積書・請求書アプリ『ポチッと事務』公式 / レイアウト自由 / 完全無料 / iOS対応」
#
# 初回投稿: 各媒体に動画パターン (a) レイアウト自由化 をアップ

# ────────────────────────────────────────
# Step 4: 広告配信（媒体を1つに固定して始める）
# ────────────────────────────────────────
# 開始媒体: Meta Ads (Instagram + Facebook)
#   (Yuma が別媒体から始める場合は本 Plan を更新)
#
# 設定（Meta Business Suite → 広告マネージャ）:
#   - キャンペーン目的: 「アプリのプロモーション」（インストール増）
#   - 配信先: iPhone のみ（現在 Android 未対応）
#   - 日本限定
#   - オーディエンス: 「建設・建築」関連興味 + 20-50代男性
#   - 予算: 日額 ¥500 × 7日 = ¥3,500（初週）
#   - クリエイティブ: 動画 (a) (b) (c) の A/B テスト
#   - ランディング: App Store アプリページ
#
# 停止方法: Meta Business Suite → 広告マネージャ → 該当キャンペーンの「停止」ボタン

# ────────────────────────────────────────
# Step 5: ASO モニタリング
# ────────────────────────────────────────
# 使用ツール: Apple Search Ads の「推奨事項」セクション（公式・無料）
#   (補助として AppTweak 無料プランで週次スナップショット取得、順位追跡は公式データ優先)
#
# 週次ルーチン（毎週月曜）:
#   1. App Store Connect → Analytics → Trends → 「インプレッション」「プロダクトページ閲覧数」「コンバージョン率」を確認
#   2. App Store の検索順位を手動確認（主要キーワード5つ）:
#      - 「見積書」
#      - 「見積書 アプリ」
#      - 「建設業 請求書」
#      - 「請求書 レイアウト」
#      - 「インボイス アプリ」
#   3. 前週比の変動を Decision Log に記録
#   4. 順位低下があれば広告クリエイティブまたはメタデータを調整

# ────────────────────────────────────────
# Step 6: 親友経由の口コミ依頼
# ────────────────────────────────────────
# インセンティブなし、純粋な推薦:
#   - 親友に「周りの1人親方 / 工務店に紹介してほしい」と直接依頼
#   - 紹介用の短い共有テキスト + App Store リンクを用意:
#     「建設業向けの見積書アプリ。レイアウトを自由に変えられて、完全無料。インボイス対応も。 https://apps.apple.com/jp/app/id6760102152」

# ────────────────────────────────────────
# Rollback 用コマンド
# ────────────────────────────────────────
# 広告停止:
#   Meta Business Suite → 広告マネージャ → キャンペーン一覧 → 「停止」

# メタデータ戻し:
#   Step 0 で作成した docs/store-metadata-pre-m4-ja.md と assets/screenshots-pre-m4/ を参照
#   （M4 着手直前の live 状態 = 通常は v1.2.0 時点のメタデータ）
#   App Store Connect で pre-M4 時点の内容を再投入 → 新バージョン (v1.2.1 または v1.3.x) として審査申請
#   スクリーンショットは assets/screenshots-pre-m4/ からアップロード
```

---

## 3. 削除対象 / 修正対象リスト（M1）

実装直前に以下の `rg` コマンドで最終棚卸し実行し、6区分（UI / domain / storage / pdf-export / docs / tests）に分類する。

```bash
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務
rg -l 'supabase|RevenueCat|Purchases|isPro|dailyUsage|materialResearch|Rakuten|gemini-search|paywall' \
  genba-note/src genba-note/app genba-note/__tests__
```

### 現時点の既知「削除」対象

**材料リサーチ**:
```
genba-note/src/domain/materialResearch/                  # ディレクトリ全削除
genba-note/src/components/unitPrice/MaterialSearchModal.tsx
genba-note/src/components/unitPrice/MaterialSearchResultItem.tsx
genba-note/src/components/unitPrice/AiSearchResultView.tsx
genba-note/src/components/unitPrice/AiPriceItemCard.tsx
genba-note/src/components/unitPrice/materialSearchLimitUtils.ts
genba-note/src/components/unitPrice/aiSearchViewState.ts
genba-note/src/types/materialResearch.ts
genba-note/__tests__/domain/materialResearch/            # 全削除
supabase/                                                 # ディレクトリ全削除
```

**Pro tier / RevenueCat**:
```
genba-note/src/subscription/                             # ディレクトリ全削除
genba-note/app/paywall.tsx / paywallMessages.ts / paywallState.ts
genba-note/src/hooks/useProStatus.ts
genba-note/src/types/subscription.ts
genba-note/__tests__/subscription/                       # 全削除
genba-note/__tests__/hooks/useProStatus.test.ts
genba-note/__tests__/app/paywall*.test.ts
```

**Supabase 依存**:
```
genba-note/src/domain/auth/                              # ディレクトリ全削除
genba-note/__tests__/domain/auth/                        # 全削除
genba-note/scripts/preflightEnv.js / .d.ts
genba-note/__tests__/scripts/preflightEnv.test.ts
```

### 現時点の既知「修正」対象（機能残す、依存剥がすのみ）

> **注**: C3 で剥がす consumer ファイル群の**正本は §M1 の「C3 consumer 剥がし 対象詳細」表**。下記リストは初稿時の主要ファイルの抜粋で、網羅性は §M1 側が担保する。不整合があれば §M1 の詳細表を正として扱う。

```
genba-note/src/domain/document/documentService.ts    # isPro 引数削除
genba-note/src/pdf/pdfGenerationService.ts           # checkProStatus 削除
genba-note/src/constants/templateOptions.ts          # isProTemplate / resolveTemplateForUser 削除
genba-note/src/domain/csvExport/csvFileService.ts    # Free/Pro判定削除
genba-note/src/pdf/index.ts                          # 関連 import 削除
genba-note/src/components/unitPrice/index.ts         # Material* エクスポート削除
genba-note/src/components/unitPrice/UnitPriceEditorModal.tsx  # 材料検索導線削除
genba-note/src/components/document/edit/LineItemList.tsx      # 材料検索ボタン削除
genba-note/src/storage/secureStorageService.ts       # @/types/subscription import削除・SubscriptionCache/SUBSCRIPTION_STORE_KEYS 参照削除（C3 で対応）
genba-note/src/constants/errorMessages.ts            # Supabase/Pro関連削除
genba-note/app/_layout.tsx                           # RevenueCat/Supabase初期化削除
genba-note/app/(tabs)/settings.tsx                   # Proボタン削除
genba-note/app/(tabs)/prices.tsx                     # 材料検索導線削除
genba-note/app/(tabs)/index.tsx / customers.tsx / balance.tsx  # 上限表示/Pro切替削除
genba-note/app/customer/[id].tsx / document/[id].tsx         # Pro関連 import 削除
genba-note/app.json                                  # 維持
genba-note/eas.json                                  # SUPABASE_URL / PUBLISHABLE_KEY / REVENUECAT_PUBLIC_KEY 削除
genba-note/.env.example                              # Supabase/RevenueCat 関連削除（agent対応OK）
genba-note/package.json                              # @supabase/supabase-js, react-native-purchases 削除
genba-note/package-lock.json                         # npm install で再生成
genba-note/deno.lock                                 # Supabase撤去に伴いクリーンアップ
```

### Agent が触らないもの（Yuma 手動対応）

- `genba-note/.env`（**値を読まない、触らない**。Yuma が手動で Supabase / RevenueCat 関連の行を削除）
- App Store Connect の metadata / IAP 設定
- Supabase Dashboard の project 停止
- RevenueCat Dashboard の offering 無効化

### 保持するもの（誤削除防止）

```
genba-note/src/domain/document/                      # コア、触らない
genba-note/src/domain/customer/                      # コア、触らない
genba-note/src/domain/unitPrice/                     # 単価マスタ・検索・ソート全て残す（materialResearch とは別物）
genba-note/src/domain/lineItem/                      # コア、触らない
genba-note/src/domain/finance/                       # 収支管理残す
genba-note/src/domain/calendar/                      # カレンダー残す
genba-note/src/pdf/templates/                        # テンプレ6種残す（M3 Fullで改修）
genba-note/src/storage/asyncStorageService.ts        # コア、触らない
expo-secure-store (依存)                              # invoice番号・銀行情報で使用、残す
```

---

## 4. 法的必須項目定義（国税庁 No.6625 準拠）

**一次ソース**: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6625.htm

### 適格請求書（qualifiedInvoice）の legal_required 項目

1. 発行者の氏名または名称
2. 発行者の **登録番号**（T + 13桁）
3. 取引年月日
4. 取引内容（軽減税率対象品目ならその旨含む）
5. 税率ごとに区分した対価の額
6. 税率ごとに区分した適用税率
7. 税率ごとに区分した消費税額等
8. 書類の交付を受ける事業者の氏名または名称（宛先）

→ これら一つでも欠けたら出力ブロック（escape hatch で「一般請求書として出力」可能）。

### 一般請求書（invoice）の business_recommended 項目

1. 発行者の氏名または名称、宛先、発行日
2. 取引内容、金額（合計）
3. 支払期限（強く推奨、法定ではない）
4. 振込先（強く推奨、建設業では入金促進の要）

→ 欠けても Pattern A（警告のみ、出力可）。

### 見積書（estimate）の business_recommended 項目

1. 発行者、宛先、発行日
2. 見積内容、金額
3. 有効期限（強く推奨、法定ではない）

→ 欠けても Pattern A（警告のみ、出力可）。

### 実装構造

```typescript
// src/domain/document/requiredFields.ts
export type FieldSeverity = 'legal_required' | 'business_recommended';

export interface RequiredFieldSpec {
  key: string;
  label: string;
  severity: FieldSeverity;
  description?: string;
}

export const REQUIRED_FIELDS: Record<DocumentType, RequiredFieldSpec[]> = {
  estimate: [/* business_recommended のみ */],
  invoice: [/* business_recommended のみ */],
  qualifiedInvoice: [/* legal_required 8項目 + business_recommended */],
};
```

検証ロジック:
- 適格請求書で `legal_required` 欠落 → `ok: false, blockExport: true`
- 他 or `business_recommended` のみ欠落 → `ok: true, warnings: [...]`

---

## 5. Layout Snapshot 不変性（M3 設計の核）

**課題**: もし `AppSettings.layoutConfigs` のみ保存すると、ユーザーが後でレイアウト変更したら過去書類の見た目が変わる → 監査・再発行性が壊れる。

**解決**: 書類作成時点で `layoutSnapshot` を document 側に保存。

```typescript
interface Document {
  // 既存フィールド...
  layoutSnapshot?: LayoutConfig;   // 作成時点の snapshot、以後不変
  templateId: DocumentTemplateId;   // 使用テンプレート
}
```

**ストレージマイグレーション（M3 Preview リリース時）**:

既存書類（`layoutSnapshot` 無し）を開く際、**現行の template 解決ロジック**（`resolveTemplateForUser` や `AppSettings.defaultEstimateTemplateId` / `defaultInvoiceTemplateId`）から `templateId` を導出し、その `templateId` に対応する default layout を付与する。**`'SIMPLE'` などのハードコードは行わない**（これが Codex review #3 指摘の要点）。

```typescript
// 擬似コード
for (const doc of allDocuments) {
  if (!doc.layoutSnapshot) {
    // 現行の描画ロジックが使う templateId を導出
    const resolvedTemplateId = resolveCurrentTemplateIdForLegacyDocument(doc, appSettings);
    doc.templateId = resolvedTemplateId;
    doc.layoutSnapshot = getDefaultLayoutForTemplate(resolvedTemplateId);
    await saveDocument(doc);
  }
}
```

受け入れ条件（M3 Preview §2 参照）:
- 既存書類を開いた時、**PDF 出力は M1 リリース時と同じ視覚結果**
- 過去書類の `templateId` は `AppSettings.defaultXxxTemplateId` に従う（`'SIMPLE'` 固定ではない）
- ユーザーが設定でレイアウト変更しても、過去書類の `layoutSnapshot` は不変

---

## 6. Supabase / RevenueCat / IAP 撤去タイムライン

| 段階 | Supabase | RevenueCat | IAP |
|---|---|---|---|
| M1 C6 | `src/domain/auth/` 等コード削除 + `@supabase/supabase-js` 依存削除 | `@revenuecat/purchases-react-native` 依存削除 | - |
| M1 C3 | `_layout.tsx` の Supabase 初期化削除 | `_layout.tsx` の RevenueCat 初期化削除 | - |
| M1 リリース時 | Dashboard で **project 停止**（保持） | Offering **無効化**（保持） | **Remove from Sale** |
| M1 リリース +30日 | project **完全削除** | project **完全削除** | - |

**保持理由**: M1 リリース後の万一の切り戻し保険。

---

## 7. TDD テスト戦略（fail-before / pass-after）

### M1 テスト（無料化による挙動変更の回帰防止）

- `test: 無料ユーザーが documents / customers / unitPrices / photos を無制限に作成できる`
- `test: preview / export 実行時に paywall へ遷移しない`
- `test: RevenueCat / Supabase env 無しでも root layout が成立する（startup crash なし）`
- `test: Pro 専用テンプレ fallback が消え、全 6 テンプレが選択可能`
- `test: templateOptions.getSelectableTemplateOptions() が全テンプレを返す`
- `test: rg で supabase/RevenueCat/isPro 参照が 0件（M1 Acceptance #3 と同一スコープ: `genba-note/src` と `genba-note/app`、`__tests__` は回帰ガードテスト残存のため除外）` — 実装後に lint ルールとして加えるか、CI でチェック

### M3 Preview テスト

- `test: LayoutConfig 型が { key, position: 1-9 } の形式を持つ`
- `test: 9マス座標（position 1-9）のバリデーション、範囲外は reject`
- `test: document 作成時に layoutSnapshot + templateId が保存される`
- `test: AppSettings.layoutConfigs 変更後、過去書類のレンダリング入力が不変`
- `test: ストレージマイグレーションが layoutSnapshot 無し document に default を付与`
- `test: プリセット3種（建設業定番/振込先強調/シンプル）が LayoutConfig を正しく生成`
- `test: 対象3テンプレ（CONSTRUCTION/SIMPLE/FORMAL_STANDARD）のPDF生成でlayoutSnapshot反映`

### M2 + M3 Full テスト

- `test: REQUIRED_FIELDS['qualifiedInvoice'] に国税庁 No.6625 の 8 項目全て含まれる`
- `test: validateDocument(適格請求書, 登録番号null) → ok: false, blockExport: true`
- `test: validateDocument(適格請求書, 税率別消費税額null) → ok: false, blockExport: true`
- `test: validateDocument(見積書, dueDate null) → ok: true, blockExport: false`
- `test: validateDocument(一般請求書, 支払期限null) → ok: true, warnings: ['dueDate']`
- `test: エクスポート警告ダイアログの integration test`
- `test: escape hatch「一般請求書として出力」実行時、document type が invoice に一時変更されて出力`
- `test: 全 6 テンプレで 9マス配置が正しく反映される（スナップショット）`
- `test: PNG 透過背景が PDF で正しくレンダリングされる`
- `test: 画像透過が iOS / Android で一致する`

### Forward-compat テスト（v1.1.0 → v1.2.0 互換、Codex review #4 指摘反映）

- `test: upgradeLayoutConfig(schemaVersion=1, 3要素) → schemaVersion=2, 3要素 position 不変 + 新要素 template default`
- `test: v1.1.0 由来の LayoutConfig を v1.2.0 で読み込み → 既存3要素の PDF出力 position が不変（スナップショット比較）`
- `test: v1.1.0 由来の LayoutConfig を v1.2.0 で読み込み → 新要素（明細/備考/ロゴ等）が template default で補完される`
- `test: document.layoutSnapshot (schemaVersion=1) を v1.2.0 で開く → upgradeLayoutConfig で merge、再保存時は schemaVersion=2`
- `test: 不明な element key が含まれる stored LayoutConfig → 無視して skip（forward-compat の下位方向）`
- fail-before: upgradeLayoutConfig 未実装で `LayoutConfig.schemaVersion === 2` を前提にするコードが stored v1 で落ちる
- pass-after: merge 経由で v2 の形に正規化され、既存3要素の position は保存されたまま、他要素は default で埋まる

---

## 8. Apple 審査 メタデータ整合（全リリースで）

Codex指摘: App Review Guidelines 2.3 / 2.3.12 は各バージョンで metadata と実装の整合を要求。

**各リリース前に metadata checklist を実行**:

### M1 リリース前（v1.0.1）
- [ ] 説明文: 材料リサーチ / Pro tier / AI / 楽天 記述削除
- [ ] サブタイトル: 材料リサーチ前提のものを差し替え
- [ ] キーワード: 材料リサーチ/AI/楽天 削除
- [ ] スクリーンショット: 材料リサーチ画面含むものを差し替え（暫定）
- [ ] What's New: 「機能整理のお知らせ」明記
- [ ] Review Notes: 機能削除の理由明記
- [ ] プライバシーラベル: 第三者APIへの送信なしに変更
- [ ] プライバシーポリシー: Supabase/RevenueCat関連削除

### M3 Preview リリース前（v1.1.0）
- [ ] What's New: 「レイアウト自由化プレビュー機能追加（一部テンプレ・主要3要素のみ、拡張予定）」と**誇張なく**明記
- [ ] スクショ: プリセット選択画面・9マス配置画面を追加（1-2枚）
- [ ] 説明文: レイアウト自由化を**プレビュー段階として**訴求
- [ ] Review Notes: 対象3テンプレ・主要3要素に絞ってる理由と M3 Full 予定

### M2+M3 Full リリース前（v1.2.0）
- [ ] What's New: 書類タイプ3種対応、全要素レイアウト自由、画像透過改善
- [ ] スクショ: 全面刷新（プリセットギャラリー、書類タイプ選択モーダル、適格請求書発行画面等）
- [ ] 説明文: レイアウト自由化を**本機能として**訴求
- [ ] キーワード更新: 「見積書 レイアウト 自由」「建設業 請求書 カスタマイズ」等
- [ ] Review Notes: M2 + M3 Full の統合リリースであることを明記
- [ ] プライバシーラベル: 変化なし確認

**参考**: https://developer.apple.com/app-store/review/guidelines/

---

## 9. Risks & Mitigations

| # | リスク | 緩和策 |
|---|---|---|
| R1 | Apple 審査リジェクト（機能削除） | §8 の M1 前倒し metadata整合、Review Notes に削除理由明記 |
| R2 | Supabase 削除後に戻れない | 30日保持期間、必要なら拡張可能 |
| R3 | 親友が M3 Preview で「これじゃない」 | 期待値コントロール（「プレビュー版」明記）、M3 Full 着手前の分岐ルール定義 |
| R4 | 画像透過バグ原因が深い | M3 Full で調査時間2-3日確保、解決しなければ「透過度プリセット」でフォールバック |
| R5 | 法的必須項目の解釈ミス | 国税庁 No.6625 一次ソース、親友（登録事業者）にレビュー依頼 |
| R6 | M3 Full 工数膨張 | テンプレ優先順位（SIMPLE/CONSTRUCTION → FORMAL → 残り）で段階可 |
| R7 | コード削除時の import エラー | TypeScript strict で即検知、CI 段階検証 |
| R8 | 差別化仮説が弱い（n=1 バイアス） | M3 Preview 後の反応で検証、ネガ反応なら M3 Full **凍結** |
| R9 | App Store metadata と実装の乖離 | §8 の全リリース前 checklist |
| R10 | .env 誤操作でシークレット漏洩 | Yuma 手動対応、agent は値読まない |

---

## 10. Decision Log

| 日付 | 決定事項 | 根拠 |
|---|---|---|
| 2026-04-19 | 材料リサーチ機能を全削除 | Supabase停止で1週間ゼロ使用判明、維持コスト>価値 |
| 2026-04-19 | Pro tier / RevenueCat 全削除、完全無料化 | 90日で0加入、親友の推薦しやすさ優先 |
| 2026-04-19 | Supabase依存を全撤去、30日保持後削除 | Codex推奨、障害時保険 |
| 2026-04-19 | 新方向性 = 書類レイアウト自由配置（9マス、プリセット選択） | 親友直接要望、初期シグナル、ship-and-see で検証 |
| 2026-04-19 | インボイス厳密度 = 書類タイプで分岐、適格請求書はブロック + escape hatch | 法的安全性と使い勝手のバランス |
| 2026-04-19 | アプリ名 = ポチッと事務 継続 | 親しみやすさ、SNS広告で呼びやすさ |
| 2026-04-19 | 親友ファースト順序: M1 → M3 Preview → M2+M3 Full | 親友の直接要望を最速で届ける |
| 2026-04-19 | レイアウト入力方式 = プリセット選択 + 9マス微調整 | 1人親方が迷わない配慮、Yuma 確認済み |
| 2026-04-19 | M3 Preview 対象テンプレ = CONSTRUCTION / SIMPLE / FORMAL_STANDARD | 建設業1人親方の実用テンプレ、Yuma 確認済み |
| 2026-04-19 | M3 Preview 初期プリセット = 建設業定番 / 振込先強調 / シンプル | Yuma 確認済み、親友フィードバックで調整余地あり |
| 2026-04-19 | M0 需要検証ゲート削除、ship-and-see 採用 | 3DL規模では実反応の方が早い、Yuma判断 |
| 2026-04-19 | `.env` は Yuma 手動、agent は触らない | CLAUDE.md secret-handling ルール遵守、Codex指摘反映 |

---

## 11. Surprises & Discoveries

| 日付 | 発見 | インパクト |
|---|---|---|
| 2026-04-18 | Supabase project が1週間無活動で自動停止、DNSごと消える | 障害復旧に半日、材料リサーチ機能の実質的不使用が判明 |
| 2026-04-18 | JWT signing key が ES256 に切り替わり Edge Functions 401 | 復旧で HS256 legacy への切替操作が必要 |
| 2026-04-18 | Edge Functions が Supabase 停止中に消失 | 再デプロイが必要 |
| 2026-04-18 | Anonymous sign-ins がデフォルト無効に戻っていた | Dashboard で手動有効化が必要 |
| 2026-04-19 | App 実績 3DL / 0課金 / ¥0（90日） | 方針転換判断の決定打、ユーザー影響ほぼなし |
| 2026-04-19 | 親友から「書類の配置を変えたい」直接要望 | 差別化の初期シグナル、仮説発想の起点 |
| 2026-04-19 | freee 請求書は既に自由レイアウト対応 | 「固定テンプレ競合」仮定が不正確、差別化を建設業特化・モバイル完結に絞る必要 |
| 2026-04-19 | 親友は適格請求書発行事業者登録済み | デフォルト書類タイプ想定のペルソナ明確化 |
| 2026-04-19 | 既存の画像透過機能が「納得いかない」バグ状態 | M3 Full で調査・改善必須 |

---

## 12. Outcomes & Retrospective

（各マイルストーン完了時に追記）

### M1 完了時
- 削除行数:
- 残存テスト数:
- Codex review 反復回数:
- 気づき:

### M3 Preview 完了時
- 親友フィードバック:
- 工数実績:
- 気づき:

### M2 + M3 Full 完了時
- 全テンプレ 9マス対応の工数:
- 画像透過バグ原因と解決:
- 気づき:

### M4 完了時
- App Store DL推移:
- 親友の口コミ拡散状況:
- 全体振り返り:

---

## 13. Open Questions（承認前の残タスク）

### OQ1: stash した paywall 変更の扱い

**現状**: main の未コミット変更（paywall 系）を `git stash push -u` で退避済み（Supabase障害対応時）。

**推奨**: 破棄（M1 で paywall 消えるため）。ただし**破壊的操作なので確認ステップ必須**（AGENTS.md / CLAUDE.md の破壊的操作ルール遵守）。

**手順**:
```bash
cd /Users/yuma/VScode_projects/Expo_projects/ポチッと事務

# Step 1: stash 内容を確認（読み取りのみ、破壊なし）
git stash list
git stash show -p stash@{0}
# → Yuma が内容を目視確認し、「本当に破棄していい」と判断

# Step 2: 念のためバックアップブランチを作成（破棄後の後悔に備える）
git stash branch backup/paywall-wip-2026-04-19 stash@{0}
# → 新ブランチ backup/paywall-wip-2026-04-19 に stash 内容が復元される
# → stash は削除される

# Step 3: 本当に不要と確認できたら、30日後に backup ブランチを削除
# git branch -D backup/paywall-wip-2026-04-19
# （30日間は保持、M1 リリース + 観測期間で問題ないことを確認してから削除）
```

**Yuma 承認が必要**: Step 2 実行前に stash 内容を目視確認し、承認。

---

### OQ2: `fix/material-research-env-vars` ブランチの扱い

**現状**: Supabase障害対応時に作った preflight env script のブランチ。M1 で preflight 自体を削除するため不要。

**推奨**: 破棄。ただし**破壊的操作なので確認ステップ必須**。

**手順**:
```bash
# Step 1: ブランチの commit log を確認
git log --oneline fix/material-research-env-vars ^main

# Step 2: ブランチ内容の差分を確認
git diff main...fix/material-research-env-vars

# Step 3: Yuma が内容を目視確認し、「不要」と判断

# Step 4: 削除前に backup ブランチ作成（念のため）
git branch backup/material-research-env-vars fix/material-research-env-vars

# Step 5: 元ブランチ削除
git branch -D fix/material-research-env-vars

# Step 6: 30日後に backup 削除（M1 リリース + 観測期間後）
# git branch -D backup/material-research-env-vars
```

**Yuma 承認が必要**: Step 4 以降。

---

### OQ3: M1 の着手タイミング

本 ExecPlan (v9) の **Codex review で ok:true になり**、かつ **Yuma が最終承認** したら着手。即日〜翌日を想定。

---

## 14. Codex Review ゲート運用ルール

CLAUDE.md に従い、以下のタイミングで `codex-review` skill を実行:

- **M1 作業中**: C3 完了時 / C6 完了時 / C10 完了時（M1 全体完了）
- **M3 Preview 作業中**: データモデル固め時 / UI 完了時 / Preview 完了時
- **M2 + M3 Full 作業中**: M2 validation完成時 / M3 Full UI完成時 / 統合時
- **各マイルストーン リリース前**: 最終 review

`ok: true` になるまで review → 修正 → 再 review を最大5回反復。収束しない場合は scope 見直しを Yuma と相談。

---

## 15. 改訂履歴

| 日付 | 版 | 改訂内容 |
|---|---|---|
| 2026-04-19 | v1 | 初版 |
| 2026-04-19 | v2 | Codex review #1 の7指摘反映、PLANS.md準拠化、親友ファースト構成、国税庁 No.6625準拠、layoutSnapshot不変性、M1 rg棚卸し、TDD明記、Apple metadata前倒し、Supabase 30日保持 |
| 2026-04-19 | v3 | Codex review #2 の 3 blocking + 2 advisory 反映: Progress独立セクション化、M3 Preview scope完全確定（CONSTRUCTION/SIMPLE/FORMAL_STANDARD + プリセット3種）、`.env` 安全手順（agent は値読まず Yuma 手動対応）、Apple metadata checklist を M1/M3 Preview/v1.2.0 全てに、差別化根拠を「初期シグナル」に是正、M0削除しship-and-see採用 |
| 2026-04-19 | v4 | Codex review #3 の 3 blocking + 2 advisory 反映: Progress を checkbox + 実状態のみに修正、M3 Preview の layout 永続化キーを template-aware に変更（`{docType}[templateId]` 構造）、legacy document migration の `'SIMPLE'` ハードコード削除し現行 template 解決ロジック使用、M2+M3 Full と M4 に concrete Commands 追加、各 Rollback を「回復経路/手順/影響」テーブル化、OQ1/OQ2 に破壊操作前の確認・バックアップ手順追加 |
| 2026-04-19 | v5 | Codex review #4 の 2 blocking 反映: M2+M3 Full / M4 Commands を完全自己完結（ブランチ名固定、ツール選定 Meta Ads + Sora + ChatGPT 等で固定、App Store Connect 画面パス明記、ASO モニタリング手順具体化）、LayoutConfig に `schemaVersion` 導入し v1.1.0 → v1.2.0 forward-compat merge 規則を §M3 Preview 永続化モデルに追加、v1.1.0 由来の layoutSnapshot の既存要素 position 不変性を §7 forward-compat テスト群で担保 |
| 2026-04-19 | v6 | Codex review #5 の 2 blocking + 1 medium 反映: `upgradeLayoutConfig` 疑似コードに unknown-key filter ステップを明示（`isKnownLayoutElementKey` で runtime filter）、M4 に Step 0 追加し現行メタデータとスクショを `docs/store-metadata-pre-m4-ja.md` + `assets/screenshots-pre-m4/` にバックアップする手順を明文化、Progress と OQ3 の stale な v4 参照を v5/v6 に更新 |
| 2026-04-19 | v7 | Codex review #6 の 1 blocking 反映: M4 Step 0 のバックアップ基準点を v1.1 固定から「M4 着手直前の pre-M4 live metadata」に変更、ファイル名/ディレクトリ名/commit message/コメント/rollback 文言を全て `pre-m4` 命名に統一し時系列整合化 |
| 2026-04-19 | v8 | Codex review #7 の 1 blocking 反映: M4 Step 0 の `mkdir -p assets/screenshots-v1.1` を `pre-m4` に修正 |
| 2026-04-19 | v9 | Codex review #8 の 1 blocking 反映: v8 changelog の過剰主張「plan全体から v1.1 参照をゼロに」を訂正。M4 Step 0 の pre-M4 命名統一は完遂だが、forward-compat 文脈（§5 / §7 / §M3 Preview 見出し / §M2+M3 Full rollback / 改訂履歴）の `v1.1.0` は **M3 Preview の App Store version 識別子** として意味があるため意図的に残す方針を明記 |
| 2026-04-20 | v10 | §M1 にコミット粒度（C1〜C10）サブセクションを追加。UI → consumer 剥がし → domain 本体削除 → config の依存順で10コミットに分割、C3 / C6 / C10 の3点を Codex review ゲートに固定。§M1 Acceptance（line 159）と §6 撤去タイムラインのコミット番号を新 C 番号に統一 |
| 2026-04-20 | v10.1 | Codex review #9 の blocking 3件反映: (1) C3 に全 consumer の subscription / materialResearch 参照剥がしを集約し、C4/C5 のドメイン本体削除時に型エラー連鎖が起きない順序に再設計、(2) `app/document/preview.tsx`、`conversionService.ts`、`useDocumentEdit.ts` 等の未割当ファイルを C3 / C10 に明示、(3) §M1 Acceptance と §6 タイムラインの旧「コミット 3 / 5」表記を C3 / C6 に統一して単一ソース化 |
| 2026-04-20 | v10.2 | Codex review #10 の blocking 2件反映: (1) C3 consumer 剥がし漏れを修正（`src/pdf/types.ts` の `@/subscription/types` re-export、`src/hooks/index.ts` の `useProStatus` re-export、`src/constants/errorMessages.ts` の `@/subscription/types` import 削除を C3 に追加し、`errorMessages.ts` を C7 から C3 へ移動）、(2) `src/domain/unitPrice/searchService.ts` の誤分類訂正（materialResearch 無関係の単価表純粋検索機能のため C5 削除対象から除外、§3 削除リスト 899行から除去、962行「(searchService.ts 以外)」表記を「ディレクトリ全体残す」に修正）。C3 に rg-based 完了条件を追加し、C6 に `__tests__/domain/auth/` を明示。C1 の paywall* を個別列挙（`paywall.tsx` / `paywallMessages.ts` / `paywallState.ts`） |
| 2026-04-20 | v10.3 | Codex review #11 の blocking 2件反映: (1) C3 完了条件の rg に `--glob '!...'` 除外を追加し、C4/C5 で削除予定の本体ファイル（`src/subscription/**`, `src/domain/materialResearch/**`, 4つの hook, 2つの types）を grep 対象から除外することで「出力が空」条件を成立可能にした、(2) §M1 冒頭の C3 方針説明 (line 211 相当) から `@/domain/unitPrice/searchService` を削除し、C5 注記・§3 保持リストとの「searchService.ts は保持」方針に全体統一。さらに searchService.ts が M1 対象外である旨を独立した注記ブロックとして明示 |
| 2026-04-20 | v10.4 | Codex review #12 の blocking 2件反映: (1) C3 完了条件の rg を `cd genba-note && rg ... src app --glob '!src/...'` 形式に書き換え、glob 除外を実行コンテキスト起点で成立させる（ついでに `@/types/subscription` / `@/types/materialResearch` も grep パターンに追加して type-level 参照も検知）、(2) `src/storage/secureStorageService.ts` の `@/types/subscription` import と `SubscriptionCache` / `SUBSCRIPTION_STORE_KEYS` 参照削除を C7 から C3 へ前倒し（C4 の `src/types/subscription.ts` 削除で型エラーになるのを防止）。C7 を「dead re-export / dead import / dead type の残骸整理のみ」に縮小し、§3 修正対象リストの該当行コメントも「C3 で対応」に更新 |
| 2026-04-20 | v10.5 | Codex review #13 の blocking 2件反映: (1) C3 完了条件の rg パターンが `\|` でリテラル `|` として扱われ false negative になっていたのを、`-e` 複数指定形式に書き換え（実測で意図した15ファイルがヒット、consumer 剥がし後に空出力となる構造を確認）、(2) C4 時点で壊れるテスト5本（`secureStorageService.test.ts`, `documentService.test.ts`, `conversionService.test.ts`, `csvFileService.test.ts`, `pdfGenerationService.test.ts`）を C10 から C4 へ前倒し、materialResearch consumer テストを C5 へ移動、`src/storage/index.ts` の subscription re-export 削除を C3 へ追加。§M1 コミット粒度表の可読性向上のため「C3 consumer 剥がし 対象詳細」展開表と完了条件 rg ブロックをテーブル外へ分離 |
| 2026-04-20 | v10.6 | Codex review #14 の blocking 2件反映: (1) `__tests__/constants/templateOptions.test.ts` を C10 から C3 詳細表へ前倒し（C3 で `isProTemplate` / `resolveTemplateForUser` を削除するため同コミット内でテスト更新必須、C10 の対象リストからも除外）、(2) §3 「現時点の既知『修正』対象」冒頭に single-source 注記を追加し、C3 consumer の正本が §M1「C3 consumer 剥がし 対象詳細」表であることを明示。§3 と §M1 の情報源二重化を解消 |
| 2026-04-20 | v10.7 | Codex review #15 の blocking 2件反映: (1) §M1 Acceptance `#3. 削除対象参照ゼロ` の rg から `genba-note/__tests__` を除外し `src app` 限定に変更（M1 後も残す回帰ガードテスト `no-paywall-navigation.test.ts` / `layout-no-paid-init.test.ts` / `no-pro-gates-in-screens.test.ts` 等がテスト名・コメントで M1 キーワードを意図的保持するため成立不能だった問題を解消、§7 テスト戦略と同一スコープ方針で一致）。棚卸し用 rg（line 194-195）は `__tests__` を含めた形を保持し、用途の違いをコメントで明記、(2) §3 注記と changelog v10.6 の固定件数表現を削除し「§M1 詳細表を正本とする」表現のみに統一（C3 詳細表は追加削除で変動するので、件数を書かない方針が single-source として堅牢） |
| 2026-04-20 | v10.8 | Codex review #16 で blocking 0件（ok: true）を達成。残った advisory 2件も反映: (1) §7 TDD テスト戦略の「`src配下`」表現を「M1 Acceptance #3 と同一スコープ: `genba-note/src` と `genba-note/app`、`__tests__` は回帰ガードテスト残存のため除外」に具体化（CI/Lint 化時の誤読防止）、(2) v10.7 の changelog 文言から数値リテラル表現を除去し `grep '30ファイル\|31ファイル'` が空になる状態に整理 |
| 2026-04-20 | v11 | 実装現実との突合せによる大規模再マッピング。`refactor/m1-cleanup` ブランチに **main から +9 コミット** (M1-1 `70974e9` 〜 M1-8 `96a92b6`) が既に積まれており、当初 v9 で未着手と想定していた C1 と C3 大部分が実装済だったため、§M1 粒度表を「実装状態」列付きで書き直し、残作業を **C2 未着手 + C3-rest 未着手 + C4-C10 未着手** に再マッピング。C3 を C3-pre（既存8 commit 実装分）と C3-rest（preview.tsx / pdf 3ファイル / csvFileService / documentService / conversionService / errorMessages / hooks/index / types/index / secureStorageService / storage/index + C2 連動する 3 UI の 計14前後ファイル）に分割。M1-4 の `useProStatus` no-op stub 戦略を v10.8 の「consumer 完全剥がし」方針と**最終状態は同一・途中経路が異なる**として受け入れ。C3 consumer 剥がし 対象詳細 表の各行に `[✅ C3-pre] M1-x` / `[⬜ C3-rest]` 凡例と担当 commit を付与し、single source として保持 |
| 2026-04-20 | v11.1 | Codex review #17 の blocking 2件 + advisory 1件反映: (1) C3-pre 完了扱いの誤りを訂正 — `app/document/[id].tsx` は `useDocumentEdit(..., true)` caller が残存するため [部分完了] に変更、`TemplatePickerModal.tsx` と `ActionSheetModal.tsx` は M1-1〜M1-8 で未変更かつ `isPro` リテラルが残るため C3-rest に再配置、(2) C3 完了条件 rg を拡張 — plain `\bisPro\b`、`SubscriptionCache`/`SUBSCRIPTION_STORE_KEYS`/`get|save|clearSubscriptionCache`、`./subscription`/`./materialResearch` 再 export パスを追加パターン化。C3-rest 行に全ファイル列挙 + 対応テストを明記。`prices.tsx` の説明を「Pro gate 削除済 / material research consumer 未了」と分離し、C3-pre と C3-rest の作業境界を明確化 |
| 2026-04-20 | v11.2 | Codex review #18 の blocking 2件反映: (1) C3 完了条件 rg に `-e 'useDocumentEdit\([^)]*,\s*true\)'` を追加し、`app/document/[id].tsx:74` の `useDocumentEdit(documentId, documentType, true)` caller 残課題を検知可能に、(2) `src/constants/templateOptions.ts` と `__tests__/constants/templateOptions.test.ts` の詳細表行を [✅ C3-pre] → [部分完了] に訂正（M1-7 で呼び出し側は完了したが `isPro` 引数シグネチャ自体は残存） |
| 2026-04-20 | v11.3 | Codex review #19 の blocking 1件反映: `src/components/settings/TemplateSelectionSection.tsx:39` の `getSelectableTemplateOptions(true)` caller が rg から漏れていた問題を解消。(1) 完了条件 rg に `-e 'getSelectableTemplateOptions\(\s*true\s*\)'` パターン追加、(2) 詳細表の `TemplateSelectionSection.tsx` 行を [✅ C3-pre] → [部分完了] に訂正、(3) C3-rest 行の source 件数を 17→18、合計 23→24 に更新 |
| 2026-04-20 | v11.4 | Codex review #20 の blocking 1件反映: `TemplateSelectionSection.tsx` の残課題が caller の `true` 引数だけでなく dead PRO バッジ UI branch (L68-72 `option.requiresPro && (...)`) も含まれる実態を詳細表で未反映だった問題を解消。(1) 完了条件 rg に `-e 'requiresPro'` を追加、(2) `TemplateSelectionSection.tsx` / `TemplatePickerModal.tsx` / `templateOptions.ts` の詳細表行を書き直し — `requiresPro` プロパティ/型定義削除と L68-72 / L83 の PRO バッジ branch 削除を C3-rest の残作業として明記 |
| 2026-04-20 | v11.5 | Codex review #21 の blocking 1件反映: 詳細表の文言精度を修正。(1) `TemplatePickerModal.tsx` 行: 「`isPro` リテラル」→「`isPro` prop 依存」に訂正（caller は `(isPro)` で prop を渡しており、リテラル `true` ではない）、(2) `templateOptions.ts` 行: 「3 関数の `isPro` 引数完全除去」という単純化を、関数削除 (`isProTemplate`) と引数除去 (`resolveTemplateForUser` / `getSelectableTemplateOptions`) と分岐削除 (L86 `disabled: !isPro && option.requiresPro`) に分離して精密に記述 |
| 2026-04-20 | v11.6 | Codex review #22 の blocking 1件反映: C3-rest 節内の文言ドリフト 2 箇所を解消。(1) L227 上位サマリの `templateOptions.ts` 記述を詳細表と同粒度へ — 「3 関数の `isPro` 引数完全除去」→「`isProTemplate` 関数削除 + `resolveTemplateForUser` / `getSelectableTemplateOptions` の `isPro` 引数除去 + L86 disabled 分岐削除 + `requiresPro` プロパティ/型定義削除」、(2) L254 詳細表の `ActionSheetModal.tsx` 行を実コードに合わせて「`isPro` リテラル」→「`ActionSheetOption.isPro` prop 型定義 (L36) 削除 + L118 近辺の `option.isPro` による Pro badge branch 削除」に訂正 |
| 2026-04-20 | v11.7 | C2 (`bb4c5f4`) 完了反映 + C3-rest を 3 subcommit に分割。(1) C2 行を「**✅ 完了** (`bb4c5f4`)」に更新し、consumer cleanup + 回帰ガードテスト追加の実施内容を記載、(2) C3-rest を green-commit-per-subcommit 原則に従い **C3-rest-1 / C3-rest-2 / C3-rest-3** の 3 段階に分割 — C3-rest-1: `freeTierLimitsService` 連鎖剥がし（documentService / conversionService / useDocumentEdit + `app/document/[id].tsx` の useDocumentEdit caller）、C3-rest-2: templateOptions + pdf/csv + UI caller 連鎖剥がし（templateOptions.ts 完全整理 + pdfGenerationService / pdf/index / pdf/types / csvFileService / TemplateSelectionSection / TemplatePickerModal / preview.tsx + templateOptions.test.ts）、C3-rest-3: storage/types/errorMessages/hooks re-export + ActionSheetModal + Codex review #1 ゲート、(3) C3 consumer 剥がし 対象詳細表の凡例に `[✅ C2]` / `[⬜ C3-rest-N]` を追加し各行に担当 subcommit を付与。`LineItemList.tsx` / `components/unitPrice/index.ts` は C2 で消化済、`UnitPriceEditorModal.tsx` は C2 で副次的に Material 依存が消えた可能性があり C3-rest-2 で要確認 |
| 2026-04-20 | v11.8 | Codex review #23 の blocking 2件 + advisory 1件反映: (1) **対応テスト の subcommit 寄せ替え** — `documentService.test.ts` / `conversionService.test.ts` / `useDocumentEdit.test.ts` を C3-rest-1 に、`csvFileService.test.ts` / `pdfGenerationService.test.ts` / `templateOptions.test.ts` を C3-rest-2 に配置し、各 subcommit 完了時に `npm test` green が成立するよう担当を揃えた、(2) **境界型エラーを回避する寄せ替え** — `errorMessages.ts` / `src/constants/index.ts` の `PRO_GATE_MESSAGES` 系削除を C3-rest-3 → **C3-rest-2** に前倒し（`pdf/types.ts` の `ProGateReason` 型削除と同 commit で処理）、`secureStorageService.ts` / `src/storage/index.ts` の subscription cache API 削除を C3-rest-3 → **C4** に後ろ倒し（`subscriptionService.ts` とそのテストが subscription cache mock に依存するため本体削除と同 commit）、(3) C3 完了条件 rg を拡張 — `-e 'PRO_GATE_MESSAGES|SUBSCRIPTION_ERROR_MESSAGES|getProGateMessage|getSubscriptionErrorMessage'` 追加、glob 除外に `!src/storage/secureStorageService.ts` / `!src/storage/index.ts` 追加。実測で C2 完了後の HEAD で **17 ファイル**ヒット（C3-rest-1: 4 + C3-rest-2: 10 + C3-rest-3: 3）、C3-rest-1/2/3 完了ごとに 17→13→3→0 と推移、(4) `UnitPriceEditorModal.tsx` 詳細表行を `[✅ C2 で完全クリア]` に訂正（実コード確認で Material* 依存は残存せず、pending 解除） |
| 2026-04-21 | v11.9 | Codex review #24 の blocking 1件 + advisory 1件反映: (1) **watermark 方針の訂正** — v11.8 C3-rest-2 に誤って書いた「`pdfGenerationService.ts` の watermark 常時ON」を「**watermark 撤去、clean PDF 常時出力**」に訂正。現状 `checkProStatus()` で Pro=無し/Free=SAMPLE 表示の 2 分岐を、完全無料化方針（§0 Executive Summary / §2 M1 Scope の「無料化による挙動変更」と整合）に合わせて常に clean PDF にする。C3-rest-2 は `injectSampleWatermark` 呼び出しの削除も含む（`watermarkService.ts` 本体と `watermarkService.test.ts` の扱いは dead code として C7 / C10 で処理するか保持するかを後続で判断）、(2) **stale な materialResearch 文言の削除** — `useDocumentEdit.ts` / `useDocumentEdit.test.ts` には既に `materialResearch` / `useMaterialSearch` / `useAiPriceSearch` / `research` 系参照が残存しないことを実コード確認済。C3-rest-1 行・詳細表・changelog から「材料検索連携削除」表現を除去し、C3-rest-1 の対象を `isPro` シグネチャ除去と caller/test 更新に限定 |
