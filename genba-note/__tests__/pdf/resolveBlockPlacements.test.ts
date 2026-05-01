/**
 * Verify resolveBlockPlacements() — shared resolver from SPEC §3.4.
 *
 * 戻り値は `Required<BlockPlacements>` (3 ブロック必ず埋まる) で、
 * テンプレデフォルトに override をマージする。null/undefined override は
 * 全 lazy default に倒す。invalid enum は safePosition() で fallback。
 *
 * convert (P2-E) と P4 の generateHtmlTemplate() 内 shared path で共用される。
 */
import {
  resolveBlockPlacements,
  isDefaultResolvedPlacement,
} from '@/pdf/blockPlacementResolver';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from '@/pdf/blockPlacementDefaults';
import type { BlockPlacements } from '@/types/blockPlacement';

describe('resolveBlockPlacements()', () => {
  describe('null / undefined override (lazy default)', () => {
    it('null → returns full template default', () => {
      expect(resolveBlockPlacements(null, 'FORMAL_STANDARD')).toEqual(
        TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD
      );
    });

    it('undefined → returns full template default', () => {
      expect(resolveBlockPlacements(undefined, 'MODERN')).toEqual(
        TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.MODERN
      );
    });

    it('returns matching defaults for every template id', () => {
      const ids = Object.keys(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS) as Array<
        keyof typeof TEMPLATE_DEFAULT_BLOCK_PLACEMENTS
      >;
      for (const id of ids) {
        expect(resolveBlockPlacements(null, id)).toEqual(
          TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[id]
        );
      }
    });
  });

  describe('partial override (1 ブロックだけ上書き)', () => {
    it('only bankAccount override → other 2 fall back to template default', () => {
      const resolved = resolveBlockPlacements(
        { bankAccount: 'bottom-right' },
        'FORMAL_STANDARD'
      );
      expect(resolved).toEqual({
        bankAccount: 'bottom-right', // override
        companyStamp: TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD.companyStamp,
        remarks: TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD.remarks,
      });
    });

    it('only companyStamp override → bank/notes fall back', () => {
      const resolved = resolveBlockPlacements(
        { companyStamp: 'hidden' },
        'CONSTRUCTION'
      );
      expect(resolved.companyStamp).toBe('hidden');
      expect(resolved.bankAccount).toBe(
        TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.CONSTRUCTION.bankAccount
      );
      expect(resolved.remarks).toBe(
        TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.CONSTRUCTION.remarks
      );
    });
  });

  describe('full override (3 ブロック全部設定)', () => {
    it('all 3 override → all 3 win against template default', () => {
      const override: BlockPlacements = {
        bankAccount: 'top-left',
        companyStamp: 'top-center',
        remarks: 'top-right',
      };
      expect(resolveBlockPlacements(override, 'FORMAL_STANDARD')).toEqual(override);
    });

    it('"hidden" override is preserved (not treated as missing)', () => {
      const override: BlockPlacements = {
        bankAccount: 'hidden',
        companyStamp: 'hidden',
        remarks: 'hidden',
      };
      expect(resolveBlockPlacements(override, 'MODERN')).toEqual(override);
    });
  });

  describe('defensive fallback for invalid enum', () => {
    it('unknown position string falls back to template default (SPEC §3.5)', () => {
      const corrupted = {
        bankAccount: 'middle-mystery' as unknown,
      } as BlockPlacements;
      const resolved = resolveBlockPlacements(corrupted, 'FORMAL_STANDARD');
      expect(resolved.bankAccount).toBe(
        TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD.bankAccount
      );
    });
  });

  describe('return type contract', () => {
    it('always returns Required<BlockPlacements> (all 3 fields defined)', () => {
      const resolved = resolveBlockPlacements(null, 'SIMPLE');
      expect(resolved.bankAccount).toBeDefined();
      expect(resolved.companyStamp).toBeDefined();
      expect(resolved.remarks).toBeDefined();
    });
  });
});

/**
 * isDefaultResolvedPlacement tests (P4-C-1, hybrid pattern 判定 helper).
 *
 * Codex global concern 反映: null 以外にも「full default object」「partial が
 * resolve したら default になる」も legacy branch (= true) に倒れることをテストで固定。
 */
describe('isDefaultResolvedPlacement()', () => {
  describe('legacy branch (resolved equals template default → returns true)', () => {
    it('null override resolved against FORMAL → true', () => {
      const resolved = resolveBlockPlacements(null, 'FORMAL_STANDARD');
      expect(isDefaultResolvedPlacement(resolved, 'FORMAL_STANDARD')).toBe(true);
    });

    it('full default object explicitly passed → true', () => {
      const fullDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.MODERN;
      const resolved = resolveBlockPlacements(fullDefault, 'MODERN');
      expect(isDefaultResolvedPlacement(resolved, 'MODERN')).toBe(true);
    });

    it('partial override that resolves back to default → true (e.g. {bankAccount: top-center} on FORMAL)', () => {
      // FORMAL の bankAccount default は top-center。同じ値を partial 指定 →
      // resolve 後は full default と同じ → legacy branch
      const partialMatchingDefault: BlockPlacements = { bankAccount: 'top-center' };
      const resolved = resolveBlockPlacements(partialMatchingDefault, 'FORMAL_STANDARD');
      expect(isDefaultResolvedPlacement(resolved, 'FORMAL_STANDARD')).toBe(true);
    });

    it('it is true for every template when input is null (regression: 6 templates)', () => {
      const ids = Object.keys(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS) as Array<
        keyof typeof TEMPLATE_DEFAULT_BLOCK_PLACEMENTS
      >;
      for (const id of ids) {
        const resolved = resolveBlockPlacements(null, id);
        expect(isDefaultResolvedPlacement(resolved, id)).toBe(true);
      }
    });
  });

  describe('grid override branch (any field differs → returns false)', () => {
    it('one field differs (bankAccount only) → false', () => {
      const override: BlockPlacements = { bankAccount: 'bottom-right' };
      const resolved = resolveBlockPlacements(override, 'FORMAL_STANDARD');
      expect(isDefaultResolvedPlacement(resolved, 'FORMAL_STANDARD')).toBe(false);
    });

    it('hidden override on a default-visible block → false', () => {
      const override: BlockPlacements = { companyStamp: 'hidden' };
      const resolved = resolveBlockPlacements(override, 'FORMAL_STANDARD');
      expect(isDefaultResolvedPlacement(resolved, 'FORMAL_STANDARD')).toBe(false);
    });

    it('full override differing on all 3 → false', () => {
      const override: BlockPlacements = {
        bankAccount: 'top-left',
        companyStamp: 'top-center',
        remarks: 'top-right',
      };
      const resolved = resolveBlockPlacements(override, 'FORMAL_STANDARD');
      expect(isDefaultResolvedPlacement(resolved, 'FORMAL_STANDARD')).toBe(false);
    });

    it('cross-template comparison: MODERN default placed on FORMAL → false', () => {
      // MODERN default: bankAccount: bottom-center; FORMAL default: top-center.
      // Resolving MODERN's default object against FORMAL produces FORMAL default
      // for unspecified keys, but bankAccount stays bottom-center → diverges from FORMAL default.
      const modernDefaultAsRaw = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.MODERN;
      const resolved = resolveBlockPlacements(modernDefaultAsRaw, 'FORMAL_STANDARD');
      expect(isDefaultResolvedPlacement(resolved, 'FORMAL_STANDARD')).toBe(false);
    });
  });
});
