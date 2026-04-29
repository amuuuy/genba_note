/**
 * v10 Migration: Add blockPlacements field to Document (SPEC §4.2).
 *
 * 意図的な **no-op** — 既存書類の永続データを書き換えない。
 * 必要な正規化 (`blockPlacements: undefined → null`) は read 経路
 * (asyncStorageService.getAllDocuments() / getDocumentById()) 側で行う。
 *
 * これにより:
 * - migration が失敗してもデータは壊れない (no write = no risk)
 * - 冪等で再実行可能
 * - lazy default semantics が保たれる
 *   (書類は `null` のままテンプレデフォルトを参照、明示 override 時のみ object 設定)
 */

import type { Migration, MigrationStepResult } from '../migrationRunner';

export const v10AddBlockPlacementsMigration: Migration = {
  fromVersion: 9,
  toVersion: 10,
  description:
    'Add blockPlacements field to Document (no-op; normalization happens at read time)',

  migrate: async (): Promise<MigrationStepResult> => {
    return { success: true };
  },
};
