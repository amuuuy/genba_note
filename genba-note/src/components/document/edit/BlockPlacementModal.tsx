/**
 * BlockPlacementModal — 「見た目を整える」モーダル本体 (SPEC §6.2)。
 *
 * 二段階 UX:
 * 1. プリセット 3 ボタン (建設業らしい / 振込先を目立たせる / シンプル) — 標準フロー
 * 2. 詳細設定 (折り畳み、6 マス + 非表示 を block ごと) — 「もっと細かく」したいユーザ向け
 *
 * 設計判断 (SPEC §6.2.3 / §6.5):
 * - **適用ボタン無し**: 各操作で即時 `updateDocument(id, { blockPlacements })` 保存
 * - **× 閉じる以外のボタン最小化**: 「最初の配置に戻す」は link スタイル
 * - **詳細設定はデフォルト閉じている**: 親友はプリセット 3 つで完結する想定
 * - **新規未保存書類では使えない** (SPEC §6.7.1): 親 (app/document/[id].tsx) で
 *   ボタン disabled、本モーダル自体は documentId を required に取り常に呼出可能を前提
 *
 * Real-time preview (SPEC §6.3):
 * - `useDocumentPreviewHtml` hook で `blockPlacementsOverride: currentPlacements` を渡す
 * - `currentPlacements` は parent (`useDocumentEdit.blockPlacements`) から流れてくる
 * - 各操作で updateDocument → useDocumentEdit refresh → currentPlacements 更新 → 即時反映
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useDocumentPreviewHtml } from '@/hooks/useDocumentPreviewHtml';
import { updateDocument } from '@/domain/document/documentService';
import {
  BLOCK_PLACEMENT_PRESETS,
  type BlockPlacementPreset,
} from '@/pdf/blockPlacementPresets';
import { resolvePlacementsForDisplay } from './blockPlacementModalHelpers';
import type {
  BlockKind,
  BlockPlacements,
  BlockPosition,
} from '@/types/blockPlacement';

// === Props ===

export interface BlockPlacementModalProps {
  visible: boolean;
  documentId: string;
  currentPlacements: BlockPlacements | null;
  /** Modal を閉じる (× タップ or 背景タップ) */
  onClose: () => void;
  /** updateDocument 成功後に呼ばれる。parent で reload して state 反映する想定 */
  onUpdated?: (placements: BlockPlacements | null) => void;
  testID?: string;
}

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

// === Helpers ===

// === Component ===

export const BlockPlacementModal: React.FC<BlockPlacementModalProps> = ({
  visible,
  documentId,
  currentPlacements,
  onClose,
  onUpdated,
  testID,
}) => {
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // useRef-based 同期ロック (Codex P5-A iter1 advisory 反映): React state は
  // 反映に 1 frame 遅延があるため rapid tap で並行保存に入る余地がある。ref で
  // 同期的に弾く。state は UI disable 表示用に残す。
  const savingLockRef = useRef(false);

  // SPEC §6.2.3「詳細設定はデフォルト閉」: visible を false にした際に reset
  // (Codex P5-A iter1 blocking 反映)。これで再オープン時に必ず閉じている。
  useEffect(() => {
    if (!visible) {
      setDetailExpanded(false);
    }
  }, [visible]);

  // Real-time preview using shared hook (SPEC §6.3).
  // resolvedTemplateId は hook が settings から自動解決するため Props で受け取らない
  // (DRY: 詳細設定の "現在位置" ハイライト計算にも本値を再利用)。
  const {
    webViewHtml,
    isLoading: isPreviewLoading,
    resolvedTemplateId,
    error: previewError,
  } = useDocumentPreviewHtml({
    source: { kind: 'documentId', documentId },
    blockPlacementsOverride: currentPlacements,
  });

  // Display-resolved placements (default 穴埋め済) for "現在位置" highlight。
  // resolvedTemplateId が hook の load 完了前 (null) は、誤ハイライトを避けるため
  // displayPlacements 自体を null にして「現在位置不明」状態として詳細設定を扱う
  // (Codex P5-B iter1 advisory 反映: MODERN/CONSTRUCTION で default 'bottom-center'
  // が一時的に 'top-center' (FORMAL fallback) と誤表示される問題を防ぐ)。
  const displayPlacements: Required<BlockPlacements> | null = resolvedTemplateId
    ? resolvePlacementsForDisplay(currentPlacements, resolvedTemplateId)
    : null;
  // hook load 完了前は詳細設定の cell タップを disable して誤更新を防ぐ
  const detailDisabled = isSaving || displayPlacements === null;

  /**
   * Apply block placement update via updateDocument (SPEC §6.5 即時保存).
   *
   * 連打防止 (Codex P5-A iter1 advisory 反映):
   *   - useRef 同期ロック (savingLockRef) で並行保存を弾く
   *   - useState (isSaving) は UI disable 表示用
   *
   * Accessibility (Codex P5-A iter1 blocking 反映):
   *   - 成功時: announceForAccessibility で変更内容を読み上げ
   *   - 失敗時: Alert.alert + announceForAccessibility 両方 (VoiceOver/TalkBack
   *     利用者が即時失敗を認識できるように)
   */
  const applyPlacements = useCallback(
    async (placements: BlockPlacements | null, announceMessage: string) => {
      if (savingLockRef.current) return;
      savingLockRef.current = true;
      setIsSaving(true);
      try {
        const result = await updateDocument(documentId, {
          blockPlacements: placements,
        });
        if (!result.success) {
          throw new Error(result.error?.message ?? '保存に失敗しました');
        }
        onUpdated?.(placements);
        AccessibilityInfo.announceForAccessibility(announceMessage);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '保存に失敗しました';
        Alert.alert('配置の更新に失敗しました', message);
        AccessibilityInfo.announceForAccessibility(
          `配置の更新に失敗しました: ${message}`
        );
      } finally {
        savingLockRef.current = false;
        setIsSaving(false);
      }
    },
    [documentId, onUpdated]
  );

  const handlePresetSelect = useCallback(
    (preset: BlockPlacementPreset) => {
      applyPlacements(
        preset.placements,
        `配置を${preset.label}に変更しました`
      );
    },
    [applyPlacements]
  );

  const handlePositionSelect = useCallback(
    (kind: BlockKind, position: BlockPosition) => {
      // 既存の override を保ちつつ kind 1 つだけ変更
      const next: BlockPlacements = {
        ...(currentPlacements ?? {}),
        [kind]: position,
      };
      applyPlacements(
        next,
        `${BLOCK_LABELS[kind]}を${POSITION_LABEL[position]}に変更しました`
      );
    },
    [applyPlacements, currentPlacements]
  );

  const handleResetToDefault = useCallback(() => {
    applyPlacements(null, '最初の配置に戻しました');
  }, [applyPlacements]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={styles.sheet}
          onStartShouldSetResponder={() => true}
          accessibilityRole="none"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>見た目を整える</Text>
            <Pressable
              onPress={onClose}
              accessibilityLabel="閉じる"
              accessibilityRole="button"
              testID={testID ? `${testID}-close` : undefined}
              hitSlop={12}
            >
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Real-time preview (SPEC §6.3) */}
            <View style={styles.previewWrapper}>
              {webViewHtml ? (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: webViewHtml }}
                  style={styles.preview}
                  scalesPageToFit
                  automaticallyAdjustContentInsets={false}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderText}>
                    {isPreviewLoading ? 'プレビュー読み込み中…' : 'プレビューを準備中'}
                  </Text>
                </View>
              )}
            </View>

            {/* Preset buttons (SPEC §6.2.1) */}
            <Text style={styles.sectionLabel}>おすすめの配置から選ぶ</Text>
            {BLOCK_PLACEMENT_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                style={({ pressed }) => [
                  styles.presetButton,
                  pressed && styles.presetButtonPressed,
                  isSaving && styles.presetButtonDisabled,
                ]}
                onPress={() => handlePresetSelect(preset)}
                disabled={isSaving}
                accessibilityLabel={`${preset.label}レイアウトを選択`}
                accessibilityRole="button"
                accessibilityHint={preset.description}
                testID={testID ? `${testID}-preset-${preset.id}` : undefined}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <View style={styles.presetTextWrap}>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                  <Text style={styles.presetDescription}>
                    {preset.description}
                  </Text>
                </View>
              </Pressable>
            ))}

            {/* Detail expander (SPEC §6.2.2) */}
            <Pressable
              style={styles.detailToggle}
              onPress={() => setDetailExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                detailExpanded
                  ? '詳細設定を閉じる'
                  : '詳細設定を開く: 位置を細かく調整'
              }
              accessibilityState={{ expanded: detailExpanded }}
              testID={testID ? `${testID}-detail-toggle` : undefined}
            >
              <Text style={styles.detailToggleLabel}>
                詳細設定（位置を細かく）
              </Text>
              <Text style={styles.detailToggleArrow}>
                {detailExpanded ? '▲' : '▼'}
              </Text>
            </Pressable>

            {detailExpanded && (
              <View style={styles.detailSection}>
                {displayPlacements === null && (
                  // resolvedTemplateId 未解決時のヒント (Codex P5-B iter1 advisory 反映)。
                  // error と loading を分岐 (Codex P5-B iter2 advisory 反映): error 時は
                  // 専用文言 + 再試行ガイダンスを表示し、ユーザに永続 loading の誤認を
                  // 与えないようにする。
                  previewError ? (
                    <Text
                      style={styles.detailErrorText}
                      testID={
                        testID ? `${testID}-detail-error` : undefined
                      }
                    >
                      現在位置の読み込みに失敗しました。一度閉じてから開き直してください。
                    </Text>
                  ) : (
                    <Text
                      style={styles.detailLoadingText}
                      testID={
                        testID ? `${testID}-detail-loading` : undefined
                      }
                    >
                      現在位置を読み込み中…
                    </Text>
                  )
                )}
                {BLOCK_KINDS.map((kind) => {
                  const currentPosition = displayPlacements?.[kind];
                  return (
                    <View key={kind} style={styles.blockSection}>
                      <Text style={styles.blockTitle}>{BLOCK_LABELS[kind]}</Text>
                      {/* 6-cell grid: 2 rows × 3 cols */}
                      <View style={styles.cellGrid}>
                        {POSITION_GRID.map((row, rowIdx) => (
                          <View key={rowIdx} style={styles.cellRow}>
                            {row.map((position) => {
                              // displayPlacements が null の間は誤ハイライト防止のため
                              // 一切選択状態を出さない
                              const isSelected = currentPosition === position;
                              return (
                                <Pressable
                                  key={position}
                                  style={[
                                    styles.cell,
                                    isSelected && styles.cellSelected,
                                    detailDisabled && styles.cellDisabled,
                                  ]}
                                  onPress={() =>
                                    handlePositionSelect(kind, position)
                                  }
                                  disabled={detailDisabled}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${BLOCK_LABELS[kind]}を${POSITION_LABEL[position]}に配置`}
                                  accessibilityState={{ selected: isSelected }}
                                  testID={
                                    testID
                                      ? `${testID}-cell-${kind}-${position}`
                                      : undefined
                                  }
                                >
                                  {isSelected && (
                                    <View style={styles.cellDot} />
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                      {/* Hidden chip (off-grid) */}
                      <Pressable
                        style={[
                          styles.hiddenChip,
                          currentPosition === 'hidden' &&
                            styles.hiddenChipSelected,
                          detailDisabled && styles.cellDisabled,
                        ]}
                        onPress={() => handlePositionSelect(kind, 'hidden')}
                        disabled={detailDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={`${BLOCK_LABELS[kind]}を非表示にする`}
                        accessibilityState={{
                          selected: currentPosition === 'hidden',
                        }}
                        testID={
                          testID ? `${testID}-cell-${kind}-hidden` : undefined
                        }
                      >
                        <Text
                          style={[
                            styles.hiddenChipLabel,
                            currentPosition === 'hidden' &&
                              styles.hiddenChipLabelSelected,
                          ]}
                        >
                          非表示
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Reset link (SPEC §6.2.3 — link style for low-emphasis) */}
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
                最初の配置に戻す
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

// === Styles ===

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  closeIcon: {
    fontSize: 28,
    color: '#666',
    lineHeight: 28,
    paddingHorizontal: 8,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  previewWrapper: {
    height: 240,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  preview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: {
    color: '#888',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  presetButtonPressed: {
    backgroundColor: '#f0f7ff',
    borderColor: '#4a90e2',
  },
  presetButtonDisabled: {
    opacity: 0.5,
  },
  presetEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  presetTextWrap: {
    flex: 1,
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  presetDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  detailToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailToggleLabel: {
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  detailToggleArrow: {
    fontSize: 12,
    color: '#888',
  },
  detailSection: {
    paddingTop: 8,
  },
  detailLoadingText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  detailErrorText: {
    fontSize: 12,
    color: '#d9534f',
    textAlign: 'center',
    paddingVertical: 8,
  },
  blockSection: {
    marginBottom: 20,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cellGrid: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cellRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
  },
  cellSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4a90e2',
  },
  cellDisabled: {
    opacity: 0.4,
  },
  cellDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4a90e2',
  },
  hiddenChip: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  hiddenChipSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4a90e2',
  },
  hiddenChipLabel: {
    fontSize: 12,
    color: '#666',
  },
  hiddenChipLabelSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  resetLink: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resetLinkText: {
    fontSize: 13,
    color: '#888',
    textDecorationLine: 'underline',
  },
  resetLinkTextDisabled: {
    opacity: 0.4,
  },
});
