/**
 * Block placement layout helpers — shared by all 6 templates' override branch.
 *
 * SPEC §7.2 の grid layout を実装する pure helper。
 * Codex P4-C-2 設計判断 reflect: position-to-cell map を共有し、各 generator
 * の override branch は本 module を呼ぶだけで grid 配置を実現する。
 *
 * 設計原則:
 * - **default branch では使われない**: 各 generator は isDefaultResolvedPlacement
 *   が true の時はこの module を経由せず、旧コードをそのまま実行する
 *   (Codex global concern: default path should not emit the new grid wrapper)
 * - **same-cell render order を固定**: bankAccount → companyStamp → remarks
 *   (Codex global concern: define same-cell render order now)
 * - **hidden は完全省略**: output に含めない (空 wrapper の余白対策)
 */

import type { BlockKind, BlockPlacements } from '@/types/blockPlacement';

/**
 * Visible cell positions (excludes 'hidden').
 * 'hidden' は cellMap に含めず、output から完全省略する。
 */
export const BLOCK_CELLS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type BlockCell = (typeof BLOCK_CELLS)[number];

/**
 * Same-cell stacking order (Codex P4-C-2 global concern: define this now).
 * 同じセルに複数ブロックが配置された時の出力順序を一意に決める。
 * これにより dense layout でも テンプレ間の挙動が分岐しない。
 */
export const SAME_CELL_RENDER_ORDER: readonly BlockKind[] = [
  'bankAccount',
  'companyStamp',
  'remarks',
];

/**
 * Pre-rendered HTML fragment per block kind.
 * 各 generator が bank/seal/notes の DOM を抽出して渡す。
 * 内部 DOM 構造 (CSS class、margin、line-height など) は変更されない。
 */
export interface RenderedBlocks {
  bankAccount: string;
  companyStamp: string;
  remarks: string;
}

/**
 * Map each (block, position) to a cell.
 *
 * - 'hidden' は出力に含めない
 * - 同じセルに複数ブロックが配置された場合は SAME_CELL_RENDER_ORDER で連結
 * - 空文字 fragment は出力に影響しない (no-op)
 */
export function placeBlocks(
  placements: Required<BlockPlacements>,
  rendered: RenderedBlocks
): Record<BlockCell, string> {
  const cellFragments: Record<BlockCell, string[]> = {
    'top-left': [],
    'top-center': [],
    'top-right': [],
    'bottom-left': [],
    'bottom-center': [],
    'bottom-right': [],
  };

  for (const kind of SAME_CELL_RENDER_ORDER) {
    const position = placements[kind];
    if (position === 'hidden') continue;
    const html = rendered[kind];
    if (!html) continue;
    cellFragments[position].push(html);
  }

  return {
    'top-left': cellFragments['top-left'].join(''),
    'top-center': cellFragments['top-center'].join(''),
    'top-right': cellFragments['top-right'].join(''),
    'bottom-left': cellFragments['bottom-left'].join(''),
    'bottom-center': cellFragments['bottom-center'].join(''),
    'bottom-right': cellFragments['bottom-right'].join(''),
  };
}

/**
 * Wrap cell HTML fragments into a 3x2 grid layout.
 * Empty cells still emit a wrapper div for layout grid integrity.
 *
 * 出力例:
 *   <div class="block-layout-grid">
 *     <div class="cell cell-top-left" data-position="top-left">...</div>
 *     <div class="cell cell-top-center" data-position="top-center">...</div>
 *     ... (6 cells) ...
 *   </div>
 */
export function renderBlockLayoutGrid(cells: Record<BlockCell, string>): string {
  const cellHtml = BLOCK_CELLS.map(
    (cell) => `<div class="cell cell-${cell}" data-position="${cell}">${cells[cell]}</div>`
  ).join('');
  return `<div class="block-layout-grid">${cellHtml}</div>`;
}

/**
 * CSS rules for the block-layout-grid wrapper (SPEC §7.2).
 * 各 generator の override branch で <style> に挿入する。
 * default branch では絶対に出力しないこと (Codex global concern)。
 */
export const BLOCK_LAYOUT_GRID_CSS = `
.block-layout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 0;
}
.block-layout-grid .cell {
  /* per-cell margin is controlled by inner content; wrapper itself has no padding */
}
.block-layout-grid .cell-top-left,
.block-layout-grid .cell-bottom-left {
  text-align: left;
}
.block-layout-grid .cell-top-center,
.block-layout-grid .cell-bottom-center {
  text-align: center;
}
.block-layout-grid .cell-top-right,
.block-layout-grid .cell-bottom-right {
  text-align: right;
}
`.trim();
