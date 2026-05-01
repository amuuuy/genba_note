/**
 * Block placement presets — 親友ファースト UX の核.
 *
 * SPEC: SPEC_V1_0_2.md §3.6.
 * ユーザは 6 マス × 3 ブロック = 18 セルから選ぶのではなく、
 * 3 種のおすすめプリセットから 1 つを選ぶだけで配置決定できる。
 *
 * 3 プリセットは互いに **位置で完全差別化** されている (iter 5 codex Q3=C 反映)。
 * サイズ変更や枠強調などモデル外の差別化は使わない。
 */

import type { BlockPlacements } from '@/types/blockPlacement';

export type BlockPlacementPresetId = 'classic' | 'bankFocus' | 'minimal';

export interface BlockPlacementPreset {
  id: BlockPlacementPresetId;
  emoji: string;
  label: string;
  description: string;
  placements: Required<BlockPlacements>;
}

export const BLOCK_PLACEMENT_PRESETS: BlockPlacementPreset[] = [
  {
    id: 'classic',
    emoji: '🏗',
    label: '建設業らしい',
    description: '振込先は中央上、印影は右上、備考は下中央。建設業の定番レイアウト',
    placements: {
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    },
  },
  {
    id: 'bankFocus',
    emoji: '💰',
    label: '振込先を目立たせる',
    description: '振込先を請求金額の近く（下中央）に配置。入金を促したい時に気づいてもらえる',
    placements: {
      bankAccount: 'bottom-center',
      companyStamp: 'top-right',
      remarks: 'top-left',
    },
  },
  {
    id: 'minimal',
    emoji: '✨',
    label: 'シンプル',
    description: '振込先を非表示にして、見た目をすっきり整える',
    placements: {
      bankAccount: 'hidden',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    },
  },
];
