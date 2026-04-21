/**
 * Error Messages Constants
 *
 * Centralized user-friendly error messages for various error conditions.
 * These messages are displayed to users in the UI.
 */

import type { PdfGenerationErrorCode } from '@/pdf/types';

/**
 * User-friendly messages for PDF generation errors
 */
export const PDF_ERROR_MESSAGES: Record<PdfGenerationErrorCode, string> = {
  GENERATION_FAILED: 'PDFの生成に失敗しました。再度お試しください。',
  SHARE_CANCELLED: '共有がキャンセルされました。',
  SHARE_FAILED: 'PDFの共有に失敗しました。',
  DOCUMENT_NOT_FOUND: '書類が見つかりません。',
  TEMPLATE_ERROR: 'テンプレートエラーが発生しました。',
  VALIDATION_FAILED: '必須項目が入力されていません。',
};

/**
 * Get user-friendly message for PDF generation error
 */
export function getPdfErrorMessage(code: PdfGenerationErrorCode): string {
  return PDF_ERROR_MESSAGES[code] ?? 'エラーが発生しました';
}

/**
 * Read-only mode messages
 */
export const READ_ONLY_MODE_MESSAGES = {
  BANNER_TITLE: '読み取り専用モード',
  BANNER_MESSAGE: 'データベースエラーにより、変更を保存できません。',
  RETRY_BUTTON: '再試行',
  RETRY_SUCCESS: 'データベースが復旧しました。',
  RETRY_FAILURE: '復旧に失敗しました。後でもう一度お試しください。',
} as const;
