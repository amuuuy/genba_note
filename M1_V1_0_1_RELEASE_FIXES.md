# M1 v1.0.1 リリース前 修正記録（クロージャ）

> ステータス: **✅ クローズ済み（2026-04-26）**
> 最後の doc-sync commit: `ca9cedd`（branch `refactor/m1-cleanup`、`main` から +40 commits）
> Phase 1 codex-review (arch): blocking すべて解消 / advisory はすべて適用済または M2 送り
>
> 本ファイルは Phase 1 codex-review (arch) **10+ 反復**の検出 blocker と対応の記録を保持する closure record です。
> v1.0.1 の現行アーキテクチャ正本: [`PIVOT_PLAN_v2.md`](PIVOT_PLAN_v2.md)（M1 完了状態に同期済）。

## サマリ

- **対応期間**: 2026-04-21 〜 2026-04-26
- **対象ブランチ**: `refactor/m1-cleanup`（`main` から +40 commits、最後の doc-sync `ca9cedd`）
- **検出方法**: Phase 1 arch codex-review を 10+ 反復実行（max_iters 解除）
- **解消した blocker**: B1〜B19 + iter10-A/B/C（公開ドキュメント・アプリ内画面・実装・内部計画書・正本ドキュメントの整合化のすべて）
- **M2 送り**: A1（旧 Pro SecureStore キー cleanup migration）/ A2（live URL 配信内容との一致確認 CI 整備）/ A3（内部計画書の本文書き直し or archive 退避、iter10-D HUMAN_TASKS_GUIDE.md 本文を含む）
- **テスト**: 108 suites / 2201 tests pass、tsc --noEmit clean、lint 0 errors

## 解消した blocker 一覧

### iter 1（2026-04-21 検出 / 2026-04-23 解消、commit `dcc595d`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B1 | `docs/privacy/index.html` | 外部送信先に Supabase / RevenueCat / Gemini / 楽天 を列挙していた → Sentry のみに縮小、v1.0.1 廃止経緯を §2.3 に追記、施行日を 2026-04-23 に更新 | ✅ |
| B2 | `docs/terms/index.html` | 第3条サブスクリプション全削除、第4条3号 AI資材検索免責削除、第5〜9条を第4〜8条にリナンバリング | ✅ |
| B3 | `genba-note/app/data-handling.tsx` | 「外部送信機能はありません」断定文を Sentry crash-only 明記に修正 | ✅ |

### iter 2（2026-04-24 検出 / 同日解消、commit `794b42e`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B4 | `app/_layout.tsx` ErrorBoundary 経由 captureException | 「クラッシュのみ」が ErrorBoundary 捕捉エラーも送る実態と不一致 → 実装維持、文言を「予期しないエラー／エラーレポート」に統一（privacy/data-handling/store metadata） | ✅ |
| B5 | `docs/privacy/index.html` SecureStore 記述 | 発行者情報を SecureStore と書いていたが、実装では AsyncStorage 側 → §2.1 を (a) 通常 / (b) セキュア / (c) アプリ専用ディレクトリ の3分割に書き直し、§4 を同粒度概要に | ✅ |

### iter 3（2026-04-26 検出 / 同日解消、commit `765006e`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B6 | privacy / data-handling 画像保存先記述 | 印影画像・作業写真を AsyncStorage 側に書いていたが、実装では URI/メタデータのみ AsyncStorage、画像本体は `Paths.document` 配下 → 3分類で粒度を揃える | ✅ |
| B7 | `app.json` `updates.enabled: true` | OTA 通信が「外部通信は Sentry のみ」開示と不整合 → **Option A 採択**: `updates` ブロック削除、`eas.json` の channel 削除、`update:*` scripts 削除（公開文言は維持）。`runtimeVersion` と `expo-updates` 依存は残置（EAS Build / Expo SDK ピアのため） | ✅ |

### iter 4（2026-04-26 検出 / 同日解消、commit `ad3d1ad`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B8 | privacy §2.1(b) / §4 + data-handling 機密情報の扱い | SecureStore に書類別 issuer snapshot (`issuer_snapshot_{documentId}`) も保存される実態が記述漏れ → 「(1) 現在の設定値 + (2) 各書類のスナップショット (書類削除と連動)」に拡張 | ✅ |
| B9 | UNIMPLEMENTED.md / RODOAPPU.md / ISSUES.md の OTA 関連記述 | 旧前提の OTA 導入タスクが残存 → 各セクションに OBSOLETE マーカー + 本ファイル B7 への参照を追記 | ✅ |

### iter 5（2026-04-26 検出 / 同日解消、commit `1f527b3`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B10 | UNIMPLEMENTED.md / RODOAPPU.md / ISSUES.md トップ | iter 4 の OTA セクション以外も旧前提（RevenueCat/Supabase/AI資材検索）が active → 3 ファイル冒頭に強い OBSOLETE バナー追加（M1 Pivot 全廃止項目を明示、PIVOT_PLAN_v2.md と本ファイルを正本として参照） | ✅ |

### iter 6（2026-04-26 検出 / 同日解消、commit `b77fb63`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B11 | ExecPlan.md | living document の現行計画として Pro 機能・RevenueCat を残存 → OBSOLETE バナー追加 | ✅ |
| B12 | SPEC_GENBANOTE.md | 仕様書として paywall・Pro境界・RevenueCat・materialResearch を規定 → OBSOLETE バナー追加 | ✅ |
| B13 | APP_STORE_SUBMISSION_TODO.md | 旧リリースゲート（RevenueCat/旧アプリ名/Pro機能/AI検索）残存 → OBSOLETE バナー + v1.0.1 release gate 3点（ローカル機能/Sentry/公開ドキュメント整合）を冒頭で明示 | ✅ |
| B14 | RELEASE_TODO.md / HUMAN_TASKS_GUIDE.md | paywall URL / RevenueCat / Sandbox 課金 / Supabase 確認を提出条件として保持 → OBSOLETE バナー追加 | ✅ |

### iter 7（2026-04-26 検出 / 同日解消、commit `731eb25`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B15 | FEATURE_ROADMAP.md / SYUUSEI.md / SYUUSEI_QUALITY.md / ai-price-research-changes.md | Free/Pro 価格戦略・paywall・AI資材検索を現行計画として保持 → OBSOLETE バナー追加 | ✅ |
| B16 | HANDOFF_PROMPT.md / HANDOFF_PROMPT_M1_START.md | 「新セッションでコピペ可」の M1 着手前 handoff として残存 → 「新セッションで再利用しないでください」を明記する強い OBSOLETE バナー | ✅ |
| advisory | PROJECT_RETROSPECTIVE.md | 末尾未完了チェックリストが旧 backlog として読める | ✅ バナー追加 |
| advisory | watermarkService.ts + test | dead code（プロダクション参照ゼロ）+ stale Pro コメント | ✅ ファイル削除 + `app/document/[id].tsx:244` の stale コメント削除 |

### iter 8（2026-04-26 検出 / 同日解消、commit `cae1f8e` + fixup `16539c2`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B17 | M1_INVENTORY.md | 「TDD で進める」「git rm で削除」「10 コミットに分割」が現行手順として残存 → 「2026-04-19 時点の M1 着手前棚卸しスナップショット」「役目終了済み」のバナー追加 | ✅ |
| advisory | 4 つの regression-guard test header | M1 進行中前提の予定表現（「コミット2 で削除予定」など）が stale → 現在形に整理 | ✅ |
| (fixup) | `no-pro-gates-in-screens.test.ts` | header 内の `*/` glob シンタックスが JSDoc 終端と衝突して TS parse エラー → 表現を「canCreate / canAddPhoto / canSearch 等の gate helpers」に変更 | ✅ commit 16539c2 |

### iter 9（2026-04-26 検出 / 同日解消、commit `699623f`）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| B18 | PIVOT_PLAN_v2.md Progress + C-task 表 | 正本にもかかわらず「Yuma 最終承認待ち」のまま、C3-rest-1 以降を「未着手」と表示 → 現在状態（M1 実装完了 + Acceptance + Codex review 収束 + B1-B19 解消）に同期、C-task すべて完了に更新 | ✅ |
| B19 | M1_V1_0_1_RELEASE_FIXES.md（本ファイル） | 末尾手順が「[B1]〜[B5] 修正 → review → commit → PR」の pending 形のまま → closure record に全面書き換え、各 B/A 項目に解消 commit/日付を追記 | ✅ |

### iter 10（2026-04-26 検出 / 同日解消、commit 本コミット）

| ID | 場所 | 内容 | 状態 |
|----|------|------|------|
| iter10-A | PIVOT_PLAN_v2.md C-task 詳細表 (L249-285) | `[⬜ C3-rest-*]` / `[⬜ C4]` / `[部分完了 → ...]` といった未完了マーカーが現役表記として残存 → 全項目を `[✅ ...]` + 解消 commit ハッシュに更新 | ✅ |
| iter10-B | PIVOT_PLAN_v2.md §13 Open Questions (L1343+) | 「承認前の残タスク」見出しと OQ1〜OQ3 が現役 pending として読める → セクション名を「Resolved historical notes（v9 承認前の残タスク・解決済み）」に変更し、解決状況を冒頭で要約 | ✅ |
| iter10-C | M1_V1_0_1_RELEASE_FIXES.md ヘッダの最終 commit | `cae1f8e + 16539c2 fixup` → `699623f` に更新（doc sync の最新コミット） | ✅ |
| iter10-D (advisory) | HUMAN_TASKS_GUIDE.md 本文 | OBSOLETE バナー追加済みだが本文に「未着手」「ブロック中」の現役進捗ラベルが残存 → A3 で M2 にて archive 退避予定として closure record にも明記 | ✅ M2 送り |

## M2 送り（残件）

### [A1] 旧 Pro SecureStore キー cleanup migration
- **場所**: `genba-note/src/storage/migrationRunner.ts`
- **内容**: v1.0.0 で保存された `entitlement_active` / `entitlement_expiration` / `last_verified_at` / `last_verified_uptime` が SecureStore に残存
- **影響**: 現行コードは参照しないため app は壊れない。dead data として残存するのみ
- **対応方針**: M2 で v10 migration を追加し、起動時に best-effort で削除
- **理由**: 親友のみ使用で影響最小、v1.0.1 リリース目標優先、破壊リスクなし

### [A2] live URL `genba-note.app/privacy` `/terms` の repo 配信内容との一致確認
- **内容**: PR マージ後に GitHub Pages の配信内容が repo の `docs/` と一致しているかの確認
- **対応方針**: PR マージ後、Yuma が手動で `curl https://genba-note.app/privacy` と repo を比較。M2 以降で自動化（CI workflow 追加）

### [A3] 内部計画ドキュメント（UNIMPLEMENTED / RODOAPPU / ISSUES / ExecPlan / SPEC_GENBANOTE 等）のセクション単位での全面書き直し
- **内容**: 本 PR ではトップバナーで現行参照は確保したが、各ドキュメントの本文中に旧前提の手順や条件が残存
- **対応方針**: M2 以降で v1.0.1 ベースに全面書き直し、または archive ディレクトリへ退避

## v1.0.1 リリース手順（次ステップ）

1. ✅ refactor/m1-cleanup ブランチで M1 実装 + B1〜B19 + iter10-A/B/C 修正完了
2. ✅ Phase 1 arch codex-review 10+ 反復で blocker 解消
3. ⏳ PR `refactor/m1-cleanup` → `main` 作成 → マージ
4. ⏳ Yuma が live `genba-note.app/privacy` `/terms` を repo `docs/` と実測照合（A2）
5. ⏳ EAS build production iOS（`eas build --profile production --platform ios`）
6. ⏳ EAS submit（`eas submit --platform ios --latest`）
7. ⏳ Apple 審査通過 → リリース
