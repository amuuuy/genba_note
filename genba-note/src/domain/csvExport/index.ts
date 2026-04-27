/**
 * CSV Export Module
 *
 * Public exports for CSV export functionality (SPEC 2.6.6).
 */

// Types
export type {
  CsvInvoiceRow,
  CsvExportOptions,
  CsvExportErrorCode,
  CsvExportError,
  CsvExportResult,
} from './types';

// Constants
export { UTF8_BOM, CRLF, CSV_HEADER } from './types';

// Pure functions (for testing and advanced usage)
export {
  escapeField,
  formatCsvRow,
  formatHeaderRow,
  formatCsvContent,
  generateCsvFilename,
} from './csvFormatService';

export {
  filterInvoicesForExport,
  documentToCsvRow,
  documentsToCsvRows,
  generateCsvFromDocuments,
} from './csvExportService';

// Main entry point (async)
export { exportInvoicesToCsv } from './csvFileService';
