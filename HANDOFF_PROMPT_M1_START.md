# ポチッと事務 M1 着手再開 引き継ぎプロンプト

**作成日**: 2026-04-20
**引き継ぎ元**: v9 plan 最終承認済み・M1 土台（OQ2処理 + feature branch + 棚卸し）完了時点

---

## 🎯 使い方

新しい Claude Code セッションを開始し、以下のコードブロック全体をコピペしてください。

---

```
【引き継ぎ】ポチッと事務 M1 コミット1 から再開

## 前提
- プロジェクト: /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/
- PIVOT_PLAN_v2.md v9 = Yuma 最終承認済み
- 現ブランチ: refactor/m1-cleanup（main から切り出し、main rebase 済み）
- main は 819c999（PIVOT_PLAN_v2 merge 済み）、origin より 2 コミット ahead（未push）

## 必読ファイル（この順）
1. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/PIVOT_PLAN_v2.md
   — §M1 (line 106-217) のコミット粒度・TDD テスト戦略・Rollback を精読
2. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/M1_INVENTORY.md
   — 96ファイルの6区分棚卸し済み（UI/domain/storage/pdf-export/utils/tests/config）
3. /Users/yuma/VScode_projects/Expo_projects/ポチッと事務/CLAUDE.md
   — TDD 必須、Codex review ゲート、.env 読み取り禁止
4. /Users/yuma/.claude/CLAUDE.md
   — Yuma グローバルルール（破壊操作は明示承認必須）

## 完了事項（前セッション）
- ✅ v9 plan Yuma 最終承認
- ✅ OQ2: fix/material-research-env-vars を backup/material-research-env-vars に退避→元ブランチ削除
- ✅ refactor/m1-cleanup ブランチ作成（main から）
- ✅ M1_INVENTORY.md 作成（96ファイル6区分分類）
- ✅ PIVOT_PLAN_v2.md/HANDOFF_PROMPT.md を main に merge（fast-forward）

## 未処理
- ⏸ OQ1: stash@{0}（paywall-wip）は Yuma 判断で保持中（M1 完了後に再検討）
- ⏸ main の 2コミット ahead は未 push（M1 完了まで push 不要の判断）
- ⏸ supabase/.temp/cli-latest の modified は M1 で supabase/ 全削除時に解消
- ⏸ docs/pivot-plan-v2 ブランチは役目終了（M1 完了後に削除可）

## 次のアクション

### Step 1: PIVOT_PLAN_v2.md §M1 を精読（line 106-217）
コミット粒度（コミット1〜10）を確認。特にコミット1 が「どのファイル群をまとめて消すか」「TDD RED フェーズで書くべき失敗テスト」を把握。

### Step 2: M1_INVENTORY.md と照合
棚卸しの「全削除」分類と §M1 コミット粒度を突き合わせ、コミット1 の対象ファイルを確定。

### Step 3: コミット1 の TDD RED → GREEN → REFACTOR を実施
1. RED: コミット1 で削除される機能が「存在しない」ことを確認する失敗テスト追加 or 既存テスト調整
2. 棚卸し該当ファイルを削除（git rm）
3. GREEN: テスト通過確認（cd genba-note && npm test）
4. REFACTOR: 必要に応じて依存の後片付け
5. lint + tsc 確認: npm run lint && npx tsc --noEmit
6. commit（明確な WHAT/WHY メッセージ）

### Step 4: コミット3 完了時に Codex review（初回ゲート）
codex-review skill 実行 → ok:true まで反復（最大5回）。

## 制約（必ず守る）

### 破壊操作
- git rm は Yuma 承認済み（§M1 の Files 節に列挙）だが、実行前に対象ファイルを diff/log で確認
- git branch -D / stash drop / git push --force は明示承認必須
- OQ1 stash@{0} には触らない（Yuma が保持判断）

### TDD
- RED → GREEN → REFACTOR 厳守
- テストを書かずに delete しない（削除された機能のテスト自体も同時削除で整合性維持）

### .env
- 値を読まない・開かない・編集しない（.env.example のみ可）
- EAS 環境変数の Supabase 系削除は Yuma 手動（§M1 §9）

### App Store 影響
- IAP Remove from Sale、Supabase project 停止、RevenueCat offering 無効化は M1 完了時に Yuma 承認取ってから実行

## Task List（前セッションで作成済、次セッションで引き継ぐ）
- #4 M1 コミット1〜10 を実施（pending）
- #5 M1 Codex review ゲート3回（pending）
- #6 M1 App Store Connect メタデータ更新（pending）
- #7 M1 完了後 Supabase 停止/RevenueCat 無効化（pending）

## 引き継ぎ確認の一言
まず `PIVOT_PLAN_v2.md` §M1（line 106-217）と `M1_INVENTORY.md` を読んで、コミット1 の対象ファイルを特定。Yuma に「コミット1 はこの N ファイルを削除する予定です、TDD RED テストはこれ、進めてOK？」と確認してから実施してください。
```

---

## 📝 Yuma への連絡事項

- このファイルは次セッションでコピペするための引き継ぎプロンプト
- M1 着手が完了したら本ファイル + HANDOFF_PROMPT.md は削除可
- 前 HANDOFF_PROMPT.md は v9 plan 承認前の引き継ぎなので役目終了済み
