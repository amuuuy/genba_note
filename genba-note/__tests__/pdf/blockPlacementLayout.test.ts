/**
 * Tests for blockPlacementLayout helpers (P4-C-2-d updated).
 *
 * SPEC §7.2 (block-by-block + dual anchor) 反映:
 * - placeBlocks: position-to-cell マッピング (hidden 省略 / same-cell 順序固定)
 * - renderBlockLayoutTop / renderBlockLayoutBottom: dual anchor region
 * - 空 region は出力スキップ
 * - CSS namespace 化 (.block-layout-cell)
 * - computePerBlockStatus: block-by-block override 判定
 */

import {
  placeBlocks,
  renderBlockLayoutTop,
  renderBlockLayoutBottom,
  hasTopRowContent,
  hasBottomRowContent,
  computePerBlockStatus,
  BLOCK_CELLS,
  TOP_CELLS,
  BOTTOM_CELLS,
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

const EMPTY_CELLS: Record<BlockCell, string> = {
  'top-left': '',
  'top-center': '',
  'top-right': '',
  'bottom-left': '',
  'bottom-center': '',
  'bottom-right': '',
};

describe('SAME_CELL_RENDER_ORDER constant', () => {
  it('is fixed to bankAccount → companyStamp → remarks (Codex P4-C-2 global concern)', () => {
    expect(SAME_CELL_RENDER_ORDER).toEqual(['bankAccount', 'companyStamp', 'remarks']);
  });
});

describe('BLOCK_CELLS / TOP_CELLS / BOTTOM_CELLS constants', () => {
  it('BLOCK_CELLS has 6 visible cells (no hidden)', () => {
    expect(BLOCK_CELLS).toEqual([
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ]);
  });

  it('TOP_CELLS has 3 top-row cells', () => {
    expect(TOP_CELLS).toEqual(['top-left', 'top-center', 'top-right']);
  });

  it('BOTTOM_CELLS has 3 bottom-row cells', () => {
    expect(BOTTOM_CELLS).toEqual(['bottom-left', 'bottom-center', 'bottom-right']);
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

  it('hidden block is omitted entirely', () => {
    const placements: Required<BlockPlacements> = {
      bankAccount: 'hidden',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    };
    const cells = placeBlocks(placements, RENDERED);
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

  it('multiple blocks in the same cell are joined in SAME_CELL_RENDER_ORDER', () => {
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

  it('empty rendered fragment is skipped', () => {
    const emptyRendered: RenderedBlocks = {
      bankAccount: '',
      companyStamp: '<div>S</div>',
      remarks: '<div>N</div>',
    };
    const cells = placeBlocks(FORMAL_DEFAULT, emptyRendered);
    expect(cells['top-center']).toBe('');
    expect(cells['top-right']).toBe('<div>S</div>');
    expect(cells['bottom-center']).toBe('<div>N</div>');
  });
});

describe('hasTopRowContent / hasBottomRowContent — region content predicate', () => {
  it('hasTopRowContent returns false for all-empty cells', () => {
    expect(hasTopRowContent(EMPTY_CELLS)).toBe(false);
  });

  it('hasTopRowContent returns true if any top cell has content', () => {
    const cells = { ...EMPTY_CELLS, 'top-left': 'X' };
    expect(hasTopRowContent(cells)).toBe(true);
  });

  it('hasTopRowContent ignores bottom cell content', () => {
    const cells = { ...EMPTY_CELLS, 'bottom-center': 'X' };
    expect(hasTopRowContent(cells)).toBe(false);
  });

  it('hasBottomRowContent returns true if any bottom cell has content', () => {
    const cells = { ...EMPTY_CELLS, 'bottom-right': 'X' };
    expect(hasBottomRowContent(cells)).toBe(true);
  });

  it('hasBottomRowContent ignores top cell content', () => {
    const cells = { ...EMPTY_CELLS, 'top-center': 'X' };
    expect(hasBottomRowContent(cells)).toBe(false);
  });
});

describe('renderBlockLayoutTop — top region grid wrapper', () => {
  it('returns empty string when no top-row content (avoid emitting empty wrapper)', () => {
    expect(renderBlockLayoutTop(EMPTY_CELLS)).toBe('');
  });

  it('emits 3 top cells with namespace-prefixed class', () => {
    const cells = { ...EMPTY_CELLS, 'top-center': 'A', 'top-right': 'B' };
    const html = renderBlockLayoutTop(cells);
    expect(html).toContain('class="block-layout-top"');
    expect(html).toContain('class="block-layout-cell cell-top-left"');
    expect(html).toContain('class="block-layout-cell cell-top-center"');
    expect(html).toContain('class="block-layout-cell cell-top-right"');
    expect(html).toContain('A');
    expect(html).toContain('B');
  });

  it('does not include bottom cells in top region output', () => {
    const cells = { ...EMPTY_CELLS, 'top-left': 'TOP', 'bottom-left': 'BOT' };
    const html = renderBlockLayoutTop(cells);
    expect(html).toContain('TOP');
    expect(html).not.toContain('BOT');
  });
});

describe('renderBlockLayoutBottom — bottom region grid wrapper', () => {
  it('returns empty string when no bottom-row content', () => {
    expect(renderBlockLayoutBottom(EMPTY_CELLS)).toBe('');
  });

  it('emits 3 bottom cells with namespace-prefixed class', () => {
    const cells = { ...EMPTY_CELLS, 'bottom-center': 'C' };
    const html = renderBlockLayoutBottom(cells);
    expect(html).toContain('class="block-layout-bottom"');
    expect(html).toContain('class="block-layout-cell cell-bottom-left"');
    expect(html).toContain('class="block-layout-cell cell-bottom-center"');
    expect(html).toContain('class="block-layout-cell cell-bottom-right"');
    expect(html).toContain('C');
  });

  it('does not include top cells in bottom region output', () => {
    const cells = { ...EMPTY_CELLS, 'top-left': 'TOP', 'bottom-left': 'BOT' };
    const html = renderBlockLayoutBottom(cells);
    expect(html).toContain('BOT');
    expect(html).not.toContain('TOP');
  });
});

describe('BLOCK_LAYOUT_GRID_CSS', () => {
  it('uses block-layout-top and block-layout-bottom selectors (dual anchor)', () => {
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('.block-layout-top');
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('.block-layout-bottom');
  });

  it('uses namespaced .block-layout-cell selector (avoids collision with template .cell)', () => {
    expect(BLOCK_LAYOUT_GRID_CSS).toContain('.block-layout-cell');
    // Ensure standalone .cell selector is NOT used (would collide with templates)
    expect(BLOCK_LAYOUT_GRID_CSS).not.toMatch(/^\.cell\b|[^a-zA-Z-]\.cell\b/m);
  });

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

describe('computePerBlockStatus — block-by-block override detection', () => {
  it('all 3 blocks at default → all isDefault=true', () => {
    const status = computePerBlockStatus(FORMAL_DEFAULT, FORMAL_DEFAULT);
    expect(status.bankAccount.isDefault).toBe(true);
    expect(status.companyStamp.isDefault).toBe(true);
    expect(status.remarks.isDefault).toBe(true);
  });

  it('one block diverges → only that block isDefault=false', () => {
    const resolved: Required<BlockPlacements> = {
      ...FORMAL_DEFAULT,
      bankAccount: 'bottom-right',
    };
    const status = computePerBlockStatus(resolved, FORMAL_DEFAULT);
    expect(status.bankAccount.isDefault).toBe(false);
    expect(status.bankAccount.position).toBe('bottom-right');
    expect(status.companyStamp.isDefault).toBe(true);
    expect(status.remarks.isDefault).toBe(true);
  });

  it('hidden override is treated as non-default', () => {
    const resolved: Required<BlockPlacements> = {
      ...FORMAL_DEFAULT,
      companyStamp: 'hidden',
    };
    const status = computePerBlockStatus(resolved, FORMAL_DEFAULT);
    expect(status.companyStamp.isDefault).toBe(false);
    expect(status.companyStamp.position).toBe('hidden');
  });

  it('all 3 blocks moved → all isDefault=false', () => {
    const resolved: Required<BlockPlacements> = {
      bankAccount: 'top-left',
      companyStamp: 'bottom-left',
      remarks: 'top-right',
    };
    const status = computePerBlockStatus(resolved, FORMAL_DEFAULT);
    expect(status.bankAccount.isDefault).toBe(false);
    expect(status.companyStamp.isDefault).toBe(false);
    expect(status.remarks.isDefault).toBe(false);
  });
});
