/**
 * Verify BlockPlacement type definitions, BLOCK_POSITIONS const,
 * and safePosition() defensive fallback (SPEC §3.5).
 */
import {
  BLOCK_POSITIONS,
  safePosition,
  type BlockKind,
  type BlockPosition,
  type BlockPlacements,
} from '@/types/blockPlacement';

describe('BLOCK_POSITIONS const', () => {
  it('contains all 7 valid positions in stable order', () => {
    expect(BLOCK_POSITIONS).toEqual([
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'hidden',
    ]);
  });
});

describe('safePosition()', () => {
  it('returns the input value if it is a valid BlockPosition', () => {
    expect(safePosition('top-left', 'bottom-center')).toBe('top-left');
    expect(safePosition('hidden', 'top-right')).toBe('hidden');
  });

  it('returns the fallback for unknown string (defensive against future enum)', () => {
    expect(safePosition('top-left-corner-extra', 'top-right')).toBe('top-right');
    expect(safePosition('middle-center', 'bottom-center')).toBe('bottom-center');
  });

  it('returns the fallback for undefined', () => {
    expect(safePosition(undefined, 'top-center')).toBe('top-center');
  });

  it('returns the fallback for empty string', () => {
    expect(safePosition('', 'top-right')).toBe('top-right');
  });
});

describe('BlockPlacement type structure (compile-time check via runtime usage)', () => {
  it('BlockKind / BlockPosition / BlockPlacements types are exported and usable', () => {
    const kind: BlockKind = 'bankAccount';
    const position: BlockPosition = 'top-center';
    const placements: BlockPlacements = {
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    };
    expect(kind).toBe('bankAccount');
    expect(position).toBe('top-center');
    expect(placements.bankAccount).toBe('top-center');
  });

  it('BlockPlacements allows partial override (all fields optional)', () => {
    const partial: BlockPlacements = { companyStamp: 'bottom-left' };
    expect(partial.companyStamp).toBe('bottom-left');
    expect(partial.bankAccount).toBeUndefined();
  });
});
