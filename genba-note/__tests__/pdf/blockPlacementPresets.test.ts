/**
 * Verify BLOCK_PLACEMENT_PRESETS (SPEC §3.6 親友ファースト UX の核).
 *
 * 3 種プリセット: classic / bankFocus / minimal が
 * - 全部互いに異なる placements を持つ（位置で完全差別化、iter 5 修正点）
 * - 必須フィールドを欠かさない
 * - id / placements が SPEC §3.6 と一致
 */
import {
  BLOCK_PLACEMENT_PRESETS,
  type BlockPlacementPreset,
  type BlockPlacementPresetId,
} from '@/pdf/blockPlacementPresets';
import { BLOCK_POSITIONS } from '@/types/blockPlacement';

describe('BLOCK_PLACEMENT_PRESETS', () => {
  it('contains exactly 3 presets', () => {
    expect(BLOCK_PLACEMENT_PRESETS).toHaveLength(3);
  });

  it('preset ids are unique', () => {
    const ids = BLOCK_PLACEMENT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes the 3 expected ids: classic / bankFocus / minimal', () => {
    const ids = BLOCK_PLACEMENT_PRESETS.map((p) => p.id);
    expect(ids).toEqual(['classic', 'bankFocus', 'minimal']);
  });

  it('every preset has all required fields with non-empty values', () => {
    for (const preset of BLOCK_PLACEMENT_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.emoji).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.placements).toBeDefined();
    }
  });

  it('every placement value is a valid BlockPosition', () => {
    for (const preset of BLOCK_PLACEMENT_PRESETS) {
      expect(BLOCK_POSITIONS).toContain(preset.placements.bankAccount);
      expect(BLOCK_POSITIONS).toContain(preset.placements.companyStamp);
      expect(BLOCK_POSITIONS).toContain(preset.placements.remarks);
    }
  });

  it('all 3 presets have mutually distinct placements (位置で完全差別化、iter 5 fix)', () => {
    const fingerprints = BLOCK_PLACEMENT_PRESETS.map(
      (p) => `${p.placements.bankAccount}|${p.placements.companyStamp}|${p.placements.remarks}`
    );
    expect(new Set(fingerprints).size).toBe(BLOCK_PLACEMENT_PRESETS.length);
  });

  it('classic = SPEC §3.6: top-center / top-right / bottom-center', () => {
    const preset = BLOCK_PLACEMENT_PRESETS.find((p) => p.id === 'classic');
    expect(preset).toBeDefined();
    expect(preset!.emoji).toBe('🏗');
    expect(preset!.placements).toEqual({
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
  });

  it('bankFocus = SPEC §3.6: bottom-center / top-right / top-left (振込先を金額付近、備考を上部に押し上げ)', () => {
    const preset = BLOCK_PLACEMENT_PRESETS.find((p) => p.id === 'bankFocus');
    expect(preset).toBeDefined();
    expect(preset!.emoji).toBe('💰');
    expect(preset!.placements).toEqual({
      bankAccount: 'bottom-center',
      companyStamp: 'top-right',
      remarks: 'top-left',
    });
  });

  it('minimal = SPEC §3.6: hidden / top-right / bottom-center (振込先を非表示にすっきり)', () => {
    const preset = BLOCK_PLACEMENT_PRESETS.find((p) => p.id === 'minimal');
    expect(preset).toBeDefined();
    expect(preset!.emoji).toBe('✨');
    expect(preset!.placements).toEqual({
      bankAccount: 'hidden',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    });
  });

  it('exports BlockPlacementPreset / BlockPlacementPresetId types', () => {
    const id: BlockPlacementPresetId = 'classic';
    const preset: BlockPlacementPreset = BLOCK_PLACEMENT_PRESETS[0];
    expect(id).toBe('classic');
    expect(preset).toBeDefined();
  });
});
