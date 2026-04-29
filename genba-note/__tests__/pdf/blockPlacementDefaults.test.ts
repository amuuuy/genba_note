/**
 * Verify TEMPLATE_DEFAULT_BLOCK_PLACEMENTS (SPEC §5.2 confirmed values).
 *
 * 6 テンプレ × 3 ブロック = 18 セル全部の確定値を SPEC §5.2 と一致させる。
 * これにより `blockPlacements: null` の既存書類が v1.0.1 と pixel diff = 0 で
 * レンダされることが型・データレイヤで保証される。
 */
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from '@/pdf/blockPlacementDefaults';
import { BLOCK_POSITIONS } from '@/types/blockPlacement';
import { DOCUMENT_TEMPLATE_IDS } from '@/types/settings';

describe('TEMPLATE_DEFAULT_BLOCK_PLACEMENTS', () => {
  it('covers all 6 DocumentTemplateId entries', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[id]).toBeDefined();
    }
  });

  it('every template has all 3 required blocks (bankAccount / companyStamp / remarks)', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      const def = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[id];
      expect(def.bankAccount).toBeDefined();
      expect(def.companyStamp).toBeDefined();
      expect(def.remarks).toBeDefined();
    }
  });

  it('every block value is a valid BlockPosition', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      const def = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[id];
      expect(BLOCK_POSITIONS).toContain(def.bankAccount);
      expect(BLOCK_POSITIONS).toContain(def.companyStamp);
      expect(BLOCK_POSITIONS).toContain(def.remarks);
    }
  });

  it('matches SPEC §5.2 confirmed values from codex 6-template DOM audit', () => {
    expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD).toEqual({
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
    expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.ACCOUNTING).toEqual({
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
    expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.SIMPLE).toEqual({
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
    expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.MODERN).toEqual({
      bankAccount: 'bottom-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
    expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.CLASSIC).toEqual({
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
    expect(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.CONSTRUCTION).toEqual({
      bankAccount: 'bottom-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
  });

  it('observation: companyStamp is top-right and remarks is bottom-center across all templates', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      const def = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[id];
      expect(def.companyStamp).toBe('top-right');
      expect(def.remarks).toBe('bottom-center');
    }
  });
});
