/**
 * BlockPlacementInlineControls — preview 画面に inline 統合する配置選択 UI (v1.0.3)。
 *
 * v1.0.2 では BlockPlacementModal (シートモーダル) で配置を変更していたが、
 * 「移動と確認を分ける UX がめんどくさい」という Yuma フィードバックを受けて
 * v1.0.3 でモーダルを廃止し、preview 画面の WebView 直下に inline 統合する。
 * 同じ画面で「動かす」「確認する」が完結する。
 *
 * 設計判断:
 * - **プリセット撤廃**: 親友フィードバック「ユーザーが自分で決められた方が満足度高い」
 *   を受けて 🏗 / 💰 / ✨ の 3 プリセットを削除。3 ブロック × 6 マス + 非表示 を
 *   そのまま提示。
 * - **詳細設定の折り畳み撤廃**: モーダル時代の「プリセット先 → 詳細後」段階 UX が
 *   なくなったため、最初から全 3 ブロックの位置選択を表示する。
 * - **適用ボタン無し**: 各 tap で即時 `updateDocument` 保存 (modal と同じ semantics)。
 * - **連打防止**: useRef ベースの同期ロック (savingLockRef) で並行保存を弾く。
 * - **アクセシビリティ**: 各セルに accessibilityLabel + selected state を付与。
 *
 * Props 設計:
 * - `currentPlacements`: parent からの override (preview.tsx の blockPlacementsOverride
 *   に直接連動)。null の場合はテンプレデフォルト (resolvedTemplateId 経由で穴埋め)。
 * - `resolvedTemplateId`: hook が解決済みのテンプレ ID。null の間 (load 中) は
 *   詳細設定を disable して誤更新を防ぐ。
 * - `onUpdated`: updateDocument 成功時の callback。parent が override state を
 *   反映する用途。
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { updateDocument } from '@/domain/document/documentService';
import {
  applyPlacementUpdate,
  buildUpdatedPlacements,
  resolvePlacementsForDisplay,
} from './edit/blockPlacementModalHelpers';
import type {
  BlockKind,
  BlockPlacements,
  BlockPosition,
} from '@/types/blockPlacement';
import type { DocumentTemplateId } from '@/types/settings';

// === Constants ===

const BLOCK_KINDS: readonly BlockKind[] = [
  'bankAccount',
  'companyStamp',
  'remarks',
];

const BLOCK_LABELS: Record<BlockKind, string> = {
  bankAccount: '振込口座',
  companyStamp: '印影',
  remarks: '備考',
};

const POSITION_GRID: readonly (readonly BlockPosition[])[] = [
  ['top-left', 'top-center', 'top-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

const POSITION_LABEL: Record<BlockPosition, string> = {
  'top-left': '左上',
  'top-center': '中央上',
  'top-right': '右上',
  'bottom-left': '左下',
  'bottom-center': '中央下',
  'bottom-right': '右下',
  hidden: '非表示',
};

// === Props ===

export interface BlockPlacementInlineControlsProps {
  documentId: string;
  currentPlacements: BlockPlacements | null;
  /** hook 経由で解決済みのテンプレ ID。null の間は detail を disable する */
  resolvedTemplateId: DocumentTemplateId | null;
  /** updateDocument 成功時の callback。parent で override state を更新 */
  onUpdated?: (placements: BlockPlacements | null) => void;
  testID?: string;
}

// === Component ===

export const BlockPlacementInlineControls: React.FC<BlockPlacementInlineControlsProps> = ({
  documentId,
  currentPlacements,
  resolvedTemplateId,
  onUpdated,
  testID,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const savingLockRef = useRef(false);

  // displayPlacements: テンプレデフォルト穴埋め済 (現在位置ハイライト用)。
  // resolvedTemplateId が null (hook load 中) は誤ハイライト防止のため null。
  const displayPlacements = resolvedTemplateId
    ? resolvePlacementsForDisplay(currentPlacements, resolvedTemplateId)
    : null;
  const controlsDisabled = isSaving || displayPlacements === null;

  /**
   * 配置更新 + 永続保存 + accessibility 通知。
   * 連打防止: useRef 同期ロックで並行保存を弾く (state 反映前の rapid tap 対策)。
   */
  const apply = useCallback(
    async (placements: BlockPlacements | null, announceMessage: string) => {
      if (savingLockRef.current) return;
      savingLockRef.current = true;
      setIsSaving(true);
      try {
        const result = await applyPlacementUpdate(
          { documentId, placements },
          { updateDocument }
        );
        if (!result.success) {
          Alert.alert('配置の更新に失敗しました', result.errorMessage);
          AccessibilityInfo.announceForAccessibility(
            `配置の更新に失敗しました: ${result.errorMessage}`
          );
          return;
        }
        onUpdated?.(result.placements);
        AccessibilityInfo.announceForAccessibility(announceMessage);
      } finally {
        savingLockRef.current = false;
        setIsSaving(false);
      }
    },
    [documentId, onUpdated]
  );

  const handlePositionSelect = useCallback(
    (kind: BlockKind, position: BlockPosition) => {
      const next = buildUpdatedPlacements(currentPlacements, kind, position);
      apply(
        next,
        `${BLOCK_LABELS[kind]}を${POSITION_LABEL[position]}に変更しました`
      );
    },
    [apply, currentPlacements]
  );

  const handleResetToDefault = useCallback(() => {
    apply(null, '最初の配置に戻しました');
  }, [apply]);

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="none"
    >
      <Text style={styles.heading}>見た目を整える</Text>

      {displayPlacements === null && (
        <Text
          style={styles.loadingText}
          testID={testID ? `${testID}-loading` : undefined}
        >
          現在位置を読み込み中…
        </Text>
      )}

      {BLOCK_KINDS.map((kind) => {
        const currentPosition = displayPlacements?.[kind];
        return (
          <View key={kind} style={styles.blockSection}>
            <Text style={styles.blockTitle}>{BLOCK_LABELS[kind]}</Text>
            <View style={styles.cellGrid}>
              {POSITION_GRID.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.cellRow}>
                  {row.map((position) => {
                    const isSelected = currentPosition === position;
                    return (
                      <Pressable
                        key={position}
                        style={[
                          styles.cell,
                          isSelected && styles.cellSelected,
                          controlsDisabled && styles.cellDisabled,
                        ]}
                        onPress={() => handlePositionSelect(kind, position)}
                        disabled={controlsDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={`${BLOCK_LABELS[kind]}を${POSITION_LABEL[position]}に配置`}
                        accessibilityState={{
                          selected: isSelected,
                          disabled: controlsDisabled,
                        }}
                        testID={
                          testID ? `${testID}-cell-${kind}-${position}` : undefined
                        }
                      >
                        {isSelected && <View style={styles.cellDot} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <Pressable
              style={[
                styles.hiddenChip,
                currentPosition === 'hidden' && styles.hiddenChipSelected,
                controlsDisabled && styles.cellDisabled,
              ]}
              onPress={() => handlePositionSelect(kind, 'hidden')}
              disabled={controlsDisabled}
              accessibilityRole="button"
              accessibilityLabel={`${BLOCK_LABELS[kind]}を非表示にする`}
              accessibilityState={{
                selected: currentPosition === 'hidden',
                disabled: controlsDisabled,
              }}
              testID={testID ? `${testID}-cell-${kind}-hidden` : undefined}
            >
              <Text
                style={[
                  styles.hiddenChipLabel,
                  currentPosition === 'hidden' && styles.hiddenChipLabelSelected,
                ]}
              >
                非表示
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        style={styles.resetLink}
        onPress={handleResetToDefault}
        disabled={isSaving}
        accessibilityRole="link"
        accessibilityLabel="最初の配置に戻す"
        testID={testID ? `${testID}-reset` : undefined}
      >
        <Text
          style={[
            styles.resetLinkText,
            isSaving && styles.resetLinkTextDisabled,
          ]}
        >
          ↻ 最初の配置に戻す
        </Text>
      </Pressable>
    </View>
  );
};

// === Styles ===

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  blockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#444',
    width: 64,
  },
  cellGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  cellRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    width: 32,
    height: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  cellDisabled: {
    opacity: 0.5,
  },
  cellDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  hiddenChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginLeft: 4,
  },
  hiddenChipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  hiddenChipLabel: {
    fontSize: 12,
    color: '#666',
  },
  hiddenChipLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  resetLink: {
    marginTop: 4,
    paddingVertical: 6,
    alignItems: 'flex-start',
  },
  resetLinkText: {
    fontSize: 13,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  resetLinkTextDisabled: {
    color: '#aaa',
  },
});
