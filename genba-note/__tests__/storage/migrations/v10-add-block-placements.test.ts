/**
 * Tests for v10-add-block-placements migration (SPEC §4.2).
 *
 * v10 adds Document.blockPlacements: BlockPlacements | null.
 * Migration is intentionally **no-op** — 既存書類には何も書き換えない。
 * 読込時の `undefined → null` 正規化は asyncStorageService.getAllDocuments()
 * 側で行う (P2-G)。これにより:
 *   - migration は冪等で安全 (storage 書き換えなし)
 *   - 万一 migration が失敗してもデータは壊れない
 *   - lazy default の semantics が保たれる
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v10AddBlockPlacementsMigration } from '@/storage/migrations/v10-add-block-placements';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('v10-add-block-placements migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 9 to 10', () => {
      expect(v10AddBlockPlacementsMigration.fromVersion).toBe(9);
      expect(v10AddBlockPlacementsMigration.toVersion).toBe(10);
    });

    it('should have a description mentioning block placements', () => {
      expect(v10AddBlockPlacementsMigration.description).toBeTruthy();
      expect(typeof v10AddBlockPlacementsMigration.description).toBe('string');
      expect(
        v10AddBlockPlacementsMigration.description.toLowerCase()
      ).toContain('block');
    });
  });

  describe('no-op behavior', () => {
    it('returns success without reading any storage', async () => {
      const result = await v10AddBlockPlacementsMigration.migrate();
      expect(result.success).toBe(true);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('returns success without writing any storage', async () => {
      const result = await v10AddBlockPlacementsMigration.migrate();
      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('is idempotent (running twice has the same effect as running once)', async () => {
      const r1 = await v10AddBlockPlacementsMigration.migrate();
      const r2 = await v10AddBlockPlacementsMigration.migrate();
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
