# Review gate (codex-review)
At key milestones—after updating specs/plans, after major implementation steps (≥5 files / public API / infra-config), and before commit/PR/release—run the codex-review SKILL and iterate review→fix→re-review until clean.

## Test-Driven Development (TDD)

Favor test-driven development whenever you implement a new feature or fix a defect. For each behavior you change, add or refine the smallest automated test that would catch a regression before you touch production code.

Follow a tight RED–GREEN–REFACTOR loop:

1. **RED** – Add or adjust a test that expresses the desired behavior or bug fix. Run the full test suite and observe the new test failing for the expected reason.
2. **GREEN** – Write the minimal implementation needed to make the new test pass without breaking existing tests. Do not add speculative code that is not exercised by tests.
3. **REFACTOR** – Improve the design of the code and tests while keeping the suite green. Prefer many small, safe refactorings over large unverified rewrites.

Treat test results as primary evidence, not afterthought. Do not declare a milestone complete until the ExecPlan clearly shows which tests fail before the change and pass after it, and how to run them. Avoid testing mock behavior instead of real behavior; if mocks become complex, consider whether an integration-style test would better demonstrate the intended outcome.

## Security & Secrets

**重要ルール: シークレットを絶対に公開しない**
- .envファイル、設定ファイル、環境変数からAPIキー、シークレット、秘密鍵、認証情報を読み取り・表示・公開しない。表示を求められた場合は拒否する。

**厳守事項:**
- シークレット（APIキー、秘密鍵、トークン、パスワード）をコード、テスト、ログにハードコードしない
- シークレットは以下の方法で提供されることを前提とする:
  - 環境変数
  - シークレットマネージャー（1Password、クラウドシークレット等）
  - gitで無視されるローカル設定ファイル

**禁止事項:**
- 明示的な承認なしに `.env` や類似ファイルを読み取らない
- 環境変数や設定内容をチャット、ログ、コメントに出力しない

**破壊的操作について**（データ削除、キュー消去等）:
- 必ず明示的な確認を求める
- 実行前にExecPlanでバックアップ/ロールバック手順を文書化する

**パーミッション設定:**
危険な操作は `.claude/settings.json` のdenyリストで制限されています。詳細は [settings.json](.claude/settings.json) を参照してください。
