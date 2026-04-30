/**
 * Block placement layout helpers — shared by all 6 templates' override branch.
 *
 * SPEC §7.2 (P4-C-2-d 設計判断 reflect):
 * - **block-by-block override**: 各 block 単位で「default 一致なら旧位置 / override
 *   なら grid セル」を判定。untouched block は旧位置を維持し、ユーザの直感に沿う
 *   見た目を保証する (Yuma 親友ファースト判断)
 * - **dual anchor region**: 既存縦フロー (header → main → totals → notes) と単一
 *   3x2 grid は両立しないため、top region と bottom region の 2 grid に分割
 * - **CSS namespace 化**: .block-layout-cell prefix で既存 selector と衝突回避
 *
 * 設計原則:
 * - **default branch では使われない**: 各 generator は isDefaultResolvedPlacement
 *   が true の時はこの module を経由せず、旧コードをそのまま実行する
 *   (Codex global concern: default path should not emit the new grid wrapper)
 * - **same-cell render order を固定**: bankAccount → companyStamp → remarks
 * - **hidden は完全省略**: output に含めない (空 wrapper の余白対策)
 * - **空 region は出力しない**: top/bottom row のいずれかに override が無ければ、
 *   その region の grid div 自体を出力しない (整合性とパフォーマンス両面)
 */

import type { BlockKind, BlockPlacements, BlockPosition } from '@/types/blockPlacement';

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
 * Top row cells (block-layout-top region 用).
 */
export const TOP_CELLS = ['top-left', 'top-center', 'top-right'] as const;
export type TopCell = (typeof TOP_CELLS)[number];

/**
 * Bottom row cells (block-layout-bottom region 用).
 */
export const BOTTOM_CELLS = ['bottom-left', 'bottom-center', 'bottom-right'] as const;
export type BottomCell = (typeof BOTTOM_CELLS)[number];

/**
 * Same-cell stacking order (Codex P4-C-2 global concern: define this now).
 * 同じセルに複数ブロックが配置された時の出力順序を一意に決める。
 */
export const SAME_CELL_RENDER_ORDER: readonly BlockKind[] = [
  'bankAccount',
  'companyStamp',
  'remarks',
];

/**
 * Pre-rendered HTML fragment per block kind.
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
 * Determine if any cell in the top region has content.
 * top-row に何も無ければ block-layout-top の出力自体をスキップできる。
 */
export function hasTopRowContent(cells: Record<BlockCell, string>): boolean {
  return TOP_CELLS.some((cell) => cells[cell].length > 0);
}

/**
 * Determine if any cell in the bottom region has content.
 */
export function hasBottomRowContent(cells: Record<BlockCell, string>): boolean {
  return BOTTOM_CELLS.some((cell) => cells[cell].length > 0);
}

/**
 * Render the top region grid wrapper (block-layout-top).
 * Returns empty string if no top-row content (avoid emitting empty wrapper).
 */
export function renderBlockLayoutTop(cells: Record<BlockCell, string>): string {
  if (!hasTopRowContent(cells)) return '';
  const cellHtml = TOP_CELLS.map(
    (cell) =>
      `<div class="block-layout-cell cell-${cell}" data-position="${cell}">${cells[cell]}</div>`
  ).join('');
  return `<div class="block-layout-top">${cellHtml}</div>`;
}

/**
 * Render the bottom region grid wrapper (block-layout-bottom).
 */
export function renderBlockLayoutBottom(cells: Record<BlockCell, string>): string {
  if (!hasBottomRowContent(cells)) return '';
  const cellHtml = BOTTOM_CELLS.map(
    (cell) =>
      `<div class="block-layout-cell cell-${cell}" data-position="${cell}">${cells[cell]}</div>`
  ).join('');
  return `<div class="block-layout-bottom">${cellHtml}</div>`;
}

/**
 * CSS rules for block-layout grid (SPEC §7.2.3).
 * Override branch のみ <style> に inject、legacy branch では絶対に出力しない
 * (Codex global concern + SPEC §5.4 pixel diff 0 ゲート保護)。
 *
 * 全 selector を `.block-layout-*` namespace に閉じ込め、既存 generator の
 * `.cell` や `.header` 等と衝突しないように設計。
 */
export const BLOCK_LAYOUT_GRID_CSS = `
.block-layout-top,
.block-layout-bottom {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
}
.block-layout-cell {
  /* per-cell inner margin is controlled by inner content; wrapper itself has no padding */
}
.block-layout-cell.cell-top-left,
.block-layout-cell.cell-bottom-left {
  text-align: left;
}
.block-layout-cell.cell-top-center,
.block-layout-cell.cell-bottom-center {
  text-align: center;
}
.block-layout-cell.cell-top-right,
.block-layout-cell.cell-bottom-right {
  text-align: right;
}
`.trim();

/**
 * Determine which blocks are at default positions (untouched) vs moved (override).
 *
 * Used by each generator's override branch to decide:
 * - untouched block → render at original position (legacy DOM)
 * - moved block → extract from original position, place into grid cell
 *
 * Returns a record indicating per-block whether it stays at default.
 */
export interface PerBlockOverrideStatus {
  bankAccount: { isDefault: boolean; position: BlockPosition };
  companyStamp: { isDefault: boolean; position: BlockPosition };
  remarks: { isDefault: boolean; position: BlockPosition };
}

export function computePerBlockStatus(
  resolved: Required<BlockPlacements>,
  templateDefault: Required<BlockPlacements>
): PerBlockOverrideStatus {
  return {
    bankAccount: {
      isDefault: resolved.bankAccount === templateDefault.bankAccount,
      position: resolved.bankAccount,
    },
    companyStamp: {
      isDefault: resolved.companyStamp === templateDefault.companyStamp,
      position: resolved.companyStamp,
    },
    remarks: {
      isDefault: resolved.remarks === templateDefault.remarks,
      position: resolved.remarks,
    },
  };
}
