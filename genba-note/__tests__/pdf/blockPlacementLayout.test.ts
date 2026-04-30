/**
 * Tests for blockPlacementLayout helpers (P4-C-2-b).
 *
 * placeBlocks() と renderBlockLayoutGrid() の挙動を固定。
 * Codex P4-C-2 global concerns 反映:
 * - same-cell render order (bank → seal → notes) を固定
 * - hidden は出力から完全省略
 * - 空セルでも wrapper は出力 (grid 整合のため)
 */

import {
  placeBlocks,
  renderBlockLayoutGrid,
  BLOCK_CELLS,
  SAME_CELL_RENDER_ORDER,
  BLOCK_LAYOUT_GRID_CSS,
  type RenderedBlocks,
  type BlockCell,
} from '@/pdf/blockPlacementLayout';
import type { BlockPlacements } from '@/types/blockPlacement';

const RENDERED: RenderedBlocks = {
  bankAccount: '<div class="bank">BANK</div>',
  companyStamp: '<div class="seal">SEAL</div>',
  remarks: '<div class="notes">NOTES</div>',
};

const FORMAL_DEFAULT: Required<BlockPlacements> = {
  bankAccount: 'top-center',
  companyStamp: 'top-right',
  remarks: 'bottom-center',
};

describe('SAME_CELL_RENDER_ORDER constant', () => {
  it('is fixed to bankAccount → companyStamp → remarks (Codex P4-C-2 global concern)', () => {
    expect(SAME_CELL_RENDER_ORDER).toEqual(['bankAccount', 'companyStamp', 'remarks']);
  });
});

describe('BLOCK_CELLS constant', () => {
  it('has 6 visible cells (no hidden)', () => {
    expect(BLOCK_CELLS).toEqual([
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ]);
  });
});

describe('placeBlocks() — position to cell mapping', () => {
  it('FORMAL default placement places blocks in their canonical cells', () => {
    const cells = placeBlocks(FORMAL_DEFAULT, RENDERED);
    expect(cells['top-center']).toBe(RENDERED.bankAccount);
    expect(cells['top-right']).toBe(RENDERED.companyStamp);
    expect(cells['bottom-center']).toBe(RENDERED.remarks);
    expect(cells['top-left']).toBe('');
    expect(cells['bottom-left']).toBe('');
    expect(cells['bottom-right']).toBe('');
  });

  it('hidden block is omitted entirely (no output, no wrapper artifact in cell html)', () => {
    const placements: Required<BlockPlacements> = {
      bankAccount: 'hidden',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    };
    const cells = placeBlocks(placements, RENDERED);
    // bankAccount was 'hidden' → no cell contains its HTML
    for (const cell of BLOCK_CELLS) {
      expect(cells[cell]).not.toContain('BANK');
    }
    expect(cells['top-right']).toContain('SEAL');
    expect(cells['bottom-center']).toContain('NOTES');
  });

  it('all-hidden produces empty cells everywhere', () => {
    const allHidden: Required<BlockPlacements> = {
      bankAccount: 'hidden',
      companyStamp: 'hidden',
      remarks: 'hidden',
    };
    const cells = placeBlocks(allHidden, RENDERED);
    for (const cell of BLOCK_CELLS) {
      expect(cells[cell]).toBe('');
    }
  });

  it('multiple blocks in the same cell are joined in SAME_CELL_RENDER_ORDER (bank → seal → notes)', () => {
    const allInTopCenter: Required<BlockPlacements> = {
      bankAccount: 'top-center',
      companyStamp: 'top-center',
      remarks: 'top-center',
    };
    const cells = placeBlocks(allInTopCenter, RENDERED);
    expect(cells['top-center']).toBe(
      RENDERED.bankAccount + RENDERED.companyStamp + RENDERED.remarks
    );
  });

  it('multiple blocks in the same cell preserve order even when input order differs', () => {
    // Even if placements.remarks comes first lexically, the output order is
    // determined by SAME_CELL_RENDER_ORDER, not by object key order.
    const remarksFirst: Required<BlockPlacements> = {
      remarks: 'bottom-center',
      bankAccount: 'bottom-center',
      companyStamp: 'top-right',
    };
    const cells = placeBlocks(remarksFirst, RENDERED);
    // bottom-center should have bank then notes (per SAME_CELL_RENDER_ORDER)
    expect(cells['bottom-center']).toBe(RENDERED.bankAccount + RENDERED.remarks);
  });

  it('empty rendered fragment is skipped (no concat with empty string)', () => {
    const emptyRendered: RenderedBlocks = {
      bankAccount: '',
      companyStamp: '<div>S</div>',
      remarks: '<div>N</div>',
    };
    const cells = placeBlocks(FORMAL_DEFAULT, emptyRendered);
    expect(cells['top-center']).toBe(''); // bankAccount was empty → cell stays empty
    expect(cells['top-right']).toBe('<div>S</div>');
    expect(cells['bottom-center']).toBe('<div>N</div>');
  });
});

describe('renderBlockLayoutGrid() — grid wrapper', () => {
  it('emits 6 cell wrappers with stable order and data-position attribute', () => {
    const cells: Record<BlockCell, string> = {
      'top-left': '',
      'top-center': 'A',
      'top-right': 'B',
      'bottom-left': '',
      'bottom-center': 'C',
      'bottom-right': '',
    };
    const html = renderBlockLayoutGrid(cells);
    // wrapper class + 6 cells
    expect(html).toContain('class="block-layout-grid"');
    for (const cell of BLOCK_CELLS) {
      expect(html).toContain(`data-position="${cell}"`);
      expect(html).toContain(`cell-${cell}`);
    }
    // contents preserved
    expect(html).toContain('A');
    expect(html).toContain('B');
    expect(html).toContain('C');
  });

  it('still emits empty cells (no skip), preserving grid integrity', () => {
    const cells: Record<BlockCell, string> = {
      'top-left': '',
      'top-center': '',
      'top-right': '',
      'bottom-left': '',
      'bottom-center': '',
      'bottom-right': '',
    };
    const html = renderBlockLayoutGrid(cells);
    // 6 wrapper divs even if all empty
    const cellWrapperCount = (html.match(/data-position=/g) || []).length;
    expect(cellWrapperCount).toBe(6);
  });
});

describe('BLOCK_LAYOUT_GRID_CSS', () => {
  it('contains display: grid and 3-column template', () => {
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('display: grid');
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('grid-template-columns: 1fr 1fr 1fr');
  });

  it('defines text-align per cell column position', () => {
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('text-align: left');
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('text-align: center');
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('text-align: right');
  });
});
