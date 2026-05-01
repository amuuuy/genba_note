/**
 * Document Preview Screen
 *
 * Thin wrapper around `useDocumentPreviewHtml` hook (SPEC §6.3 hybrid hook).
 * このスクリーンは:
 *  - URL params から source を組み立て (previewData parsing or saved-document id)
 *  - hook が生成した webViewHtml を WebView に描画
 *  - TemplatePickerModal 開閉 / template & sealSize 選択 state
 *  - 共有実行 state (filename modal、generateAndSharePdf、pdfError)
 *  - orientation toggle state
 *
 * 書類読み込み・依存解決・HTML 生成・WebView 加工は hook 内 (P5 の
 * BlockPlacementModal でも同じ hook を再利用する)。
 */

import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { generateFilenameTitle, toggleOrientation } from '@/pdf/pdfTemplateService';
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import { FilenameEditModal } from '@/components/document/FilenameEditModal';
import { TemplatePickerModal } from '@/components/document/TemplatePickerModal';
import { BlockPlacementModal } from '@/components/document/edit';
import { getPdfErrorMessage } from '@/constants/errorMessages';
import { validatePreviewDocument } from '@/utils/previewDataValidator';
import { FIT_TO_SCREEN_SCRIPT } from '@/utils/previewHtmlSecurity';
import {
  useDocumentPreviewHtml,
  type DocumentPreviewSource,
} from '@/hooks/useDocumentPreviewHtml';
import type { DocumentTemplateId, PreviewOrientation, SealSize } from '@/types/settings';
import type { BlockPlacements } from '@/types/blockPlacement';

export default function DocumentPreviewScreen() {
  const { id, previewData } = useLocalSearchParams<{ id?: string; previewData?: string }>();

  // Resolve URL params into a hook-compatible source. Returns:
  //  - source: discriminated union for the hook
  //  - sourceErrorMessage: caller-side validation error (parse / no-id 等)
  // 書類読み込み自体は hook が引き受けるので、ここでは URL params の
  // structural な妥当性のみを判定する。
  const sourceResolution = useMemo<{
    source: DocumentPreviewSource | null;
    sourceErrorMessage: string | null;
  }>(() => {
    if (previewData) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(previewData);
      } catch {
        return { source: null, sourceErrorMessage: 'プレビューデータの解析に失敗しました' };
      }
      const validated = validatePreviewDocument(parsed);
      if (!validated) {
        return { source: null, sourceErrorMessage: 'プレビューデータが無効です' };
      }
      return {
        source: { kind: 'previewDocument', document: validated },
        sourceErrorMessage: null,
      };
    }
    if (id) {
      return {
        source: { kind: 'documentId', documentId: id },
        sourceErrorMessage: null,
      };
    }
    return { source: null, sourceErrorMessage: '書類IDまたはプレビューデータが見つかりません' };
  }, [id, previewData]);

  const isPreviewMode = !!previewData;

  // Local UI state owned by the screen (per SPEC §6.3 hybrid hook 責務境界):
  // - orientation toggle
  // - TemplatePickerModal (visible state, current selection override)
  // - PDF share execution state (filename modal, generating, pdfError)
  const [orientation, setOrientation] = useState<PreviewOrientation>('PORTRAIT');
  const [templateIdOverride, setTemplateIdOverride] = useState<DocumentTemplateId | undefined>(undefined);
  const [sealSizeOverride, setSealSizeOverride] = useState<SealSize | undefined>(undefined);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [filenameModalVisible, setFilenameModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // SPEC §6.2 「見た目を整える」モーダル (BlockPlacementModal 再利用、SPEC §6.7 の
  // entry point は書類編集画面と preview 画面の両方)。未保存 preview では disabled。
  const [blockPlacementModalVisible, setBlockPlacementModalVisible] = useState(false);
  // modal の onUpdated コールバックで永続保存後の最新値を local state に反映し、
  // 次の hook 再描画が始まる前にプレビューへ即時反映する (templateIdOverride と同 pattern)。
  // undefined = caller override 不在 → hook が doc.blockPlacements にフォールバック
  const [blockPlacementsOverride, setBlockPlacementsOverride] = useState<
    BlockPlacements | null | undefined
  >(undefined);

  // Run hook only when source is valid. When invalid, we still need to call
  // hooks unconditionally — pass a sentinel and rely on render branch below.
  const hookResult = useDocumentPreviewHtml({
    source: sourceResolution.source ?? { kind: 'documentId', documentId: '__invalid__' },
    templateIdOverride,
    sealSizeOverride,
    blockPlacementsOverride,
    orientation,
  });

  const {
    webViewHtml,
    webViewCspApplied,
    resolvedDocumentWithTotals,
    sensitiveSnapshot,
    resolvedTemplateId,
    resolvedSealSize,
    isLoading,
    error: hookError,
  } = hookResult;

  // Default filename for the share modal
  const defaultFilename = useMemo(() => {
    if (!resolvedDocumentWithTotals) return '';
    return generateFilenameTitle(resolvedDocumentWithTotals.documentNo, resolvedDocumentWithTotals.type);
  }, [resolvedDocumentWithTotals]);

  // === Handlers ===

  const handleToggleOrientation = useCallback(() => {
    setOrientation((prev) => toggleOrientation(prev));
  }, []);

  const handleTemplateSelect = useCallback((newTemplateId: DocumentTemplateId) => {
    setTemplatePickerVisible(false);
    setTemplateIdOverride(newTemplateId);
  }, []);

  const handleSealSizeSelect = useCallback((newSealSize: SealSize) => {
    setSealSizeOverride(newSealSize);
  }, []);

  const handleShareButtonPress = useCallback(() => {
    setPdfError(null);
    setFilenameModalVisible(true);
  }, []);

  const handleFilenameConfirm = useCallback(async (customFilename: string) => {
    setFilenameModalVisible(false);
    if (!resolvedDocumentWithTotals) return;

    setIsGenerating(true);
    try {
      const result = await generateAndSharePdf(
        { document: resolvedDocumentWithTotals, sensitiveSnapshot },
        { orientation, customFilename }
      );

      if (!result.success && result.error) {
        if (result.error.code === 'SHARE_CANCELLED') {
          return;
        }
        const message =
          result.error.code === 'VALIDATION_FAILED' && result.error.message
            ? result.error.message
            : getPdfErrorMessage(result.error.code);
        setPdfError(message);
      }
    } catch {
      setPdfError('PDF生成中に予期しないエラーが発生しました。');
    } finally {
      setIsGenerating(false);
    }
  }, [resolvedDocumentWithTotals, sensitiveSnapshot, orientation]);

  const handleFilenameCancel = useCallback(() => {
    setFilenameModalVisible(false);
  }, []);

  const handleDismissPdfError = useCallback(() => {
    setPdfError(null);
  }, []);

  // === Render ===

  // Source-level validation errors (URL params)
  if (sourceResolution.sourceErrorMessage) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{sourceResolution.sourceErrorMessage}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </Pressable>
      </View>
    );
  }

  // Loading state
  if (isLoading || !webViewHtml) {
    if (hookError) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{hookError.message || 'プレビューの読み込みに失敗しました'}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>戻る</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // Render preview
  return (
    <View style={styles.container}>
      {/* HTML Preview - Security hardened for static content */}
      {/* Fail-closed: JS enabled only when CSP was successfully injected */}
      <WebView
        style={styles.webview}
        originWhitelist={['about:blank']}
        source={{ html: webViewHtml }}
        scrollEnabled={false}
        javaScriptEnabled={webViewCspApplied}
        injectedJavaScript={webViewCspApplied ? FIT_TO_SCREEN_SCRIPT : undefined}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
      />

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {/* Preview mode notice */}
        {isPreviewMode && (
          <View style={styles.previewNotice}>
            <Text style={styles.previewNoticeText}>
              プレビューモード（未保存）
            </Text>
          </View>
        )}

        {/* Orientation toggle button */}
        <Pressable
          style={styles.orientationToggle}
          onPress={handleToggleOrientation}
          accessibilityLabel={
            orientation === 'PORTRAIT' ? '横向きに切り替え' : '縦向きに切り替え'
          }
          accessibilityRole="button"
        >
          <Ionicons
            name={orientation === 'PORTRAIT' ? 'phone-portrait-outline' : 'phone-landscape-outline'}
            size={20}
            color="#007AFF"
          />
          <Text style={styles.orientationToggleText}>
            {orientation === 'PORTRAIT' ? '縦向き' : '横向き'}
          </Text>
        </Pressable>

        {/* Template style picker button */}
        <Pressable
          style={styles.stylePickerButton}
          onPress={() => setTemplatePickerVisible(true)}
          accessibilityLabel="他のスタイルを試す"
          accessibilityRole="button"
        >
          <Ionicons name="color-palette-outline" size={20} color="#007AFF" />
          <Text style={styles.stylePickerButtonText}>他のスタイルを試す</Text>
        </Pressable>

        {/* SPEC §6.7 「見た目を整える」エントリポイント (preview 画面)。
            未保存 preview (isPreviewMode) では documentId 無いため非表示
            (SPEC §6.7.1: 新規未保存書類では使えない)。 */}
        {!isPreviewMode && resolvedDocumentWithTotals && (
          <Pressable
            style={styles.stylePickerButton}
            onPress={() => setBlockPlacementModalVisible(true)}
            accessibilityLabel="見た目を整える"
            accessibilityRole="button"
          >
            <Ionicons name="grid-outline" size={20} color="#007AFF" />
            <Text style={styles.stylePickerButtonText}>見た目を整える</Text>
          </Pressable>
        )}

        {/* PDF Error Display - only show when not in preview mode */}
        {!isPreviewMode && pdfError && (
          <View style={styles.pdfErrorContainer}>
            <Text style={styles.pdfErrorText}>{pdfError}</Text>
            <View style={styles.pdfErrorButtons}>
              <Pressable onPress={handleShareButtonPress} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>再試行</Text>
              </Pressable>
              <Pressable onPress={handleDismissPdfError} style={styles.dismissButton}>
                <Text style={styles.dismissButtonText}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* PDF Share button - only show when document is saved */}
        {!isPreviewMode && (
          <Pressable
            style={[styles.shareButton, isGenerating && styles.shareButtonDisabled]}
            onPress={handleShareButtonPress}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareButtonText}>PDFで共有</Text>
            )}
          </Pressable>
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>
            {isPreviewMode ? '編集画面に戻る' : '編集に戻る'}
          </Text>
        </Pressable>
      </View>

      {/* Filename Edit Modal (M19) */}
      <FilenameEditModal
        visible={filenameModalVisible}
        defaultFilename={defaultFilename}
        onConfirm={handleFilenameConfirm}
        onCancel={handleFilenameCancel}
        testID="filename-edit-modal"
      />

      {/* Template Picker Modal */}
      <TemplatePickerModal
        visible={templatePickerVisible}
        currentTemplateId={resolvedTemplateId ?? 'FORMAL_STANDARD'}
        onSelect={handleTemplateSelect}
        onClose={() => setTemplatePickerVisible(false)}
        currentSealSize={resolvedSealSize ?? undefined}
        onSealSizeSelect={handleSealSizeSelect}
        testID="template-picker-modal"
      />

      {/* SPEC §6.2 「見た目を整える」モーダル — preview 画面のエントリポイント。
          isPreviewMode (未保存) では documentId なしで render しない。
          modal の onUpdated で local override に反映 → 即時プレビュー更新。 */}
      {!isPreviewMode && resolvedDocumentWithTotals && (
        <BlockPlacementModal
          visible={blockPlacementModalVisible}
          documentId={resolvedDocumentWithTotals.id}
          currentPlacements={
            blockPlacementsOverride !== undefined
              ? blockPlacementsOverride
              : resolvedDocumentWithTotals.blockPlacements
          }
          onClose={() => setBlockPlacementModalVisible(false)}
          onUpdated={setBlockPlacementsOverride}
          testID="preview-block-placement-modal"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  previewNotice: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  previewNoticeText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '600',
  },
  orientationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 8,
    gap: 8,
  },
  orientationToggleText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  stylePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 8,
    gap: 8,
  },
  stylePickerButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  pdfErrorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#d32f2f',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pdfErrorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 8,
  },
  pdfErrorButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});
