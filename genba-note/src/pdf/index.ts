/**
 * PDF Module for ポチッと事務
 *
 * Provides HTML template generation and PDF generation.
 */

// Types
export type {
  PdfTemplateInput,
  PdfTemplateResult,
  ColorScheme,
  TemplateMode,
  PdfGenerationErrorCode,
  PdfGenerationError,
  PdfGenerationResult,
} from './types';

export { ESTIMATE_COLORS, INVOICE_COLORS, FORMAL_COLORS, getColorSchemeForType } from './types';

// Theme CSS Functions
export { getScreenThemeCss, getFormalThemeCss } from './themes';

// Template Service
export {
  generateHtmlTemplate,
  getColorScheme,
  formatCurrency,
  formatQuantity,
  formatTaxRate,
  formatDate,
  generateDocumentTitle,
  generateFilenameTitle,
} from './pdfTemplateService';

// Generation Service
// NOTE: generatePdf and sharePdf are intentionally NOT exported.
export { generateAndSharePdf } from './pdfGenerationService';
