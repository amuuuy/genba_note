/**
 * Tests for conversionService.ts
 * TDD: Tests are written first, implementation follows
 *
 * Test coverage for SPEC 2.1.6 conversion rules:
 * - Document ID: New UUID generated
 * - Document number: New invoice number auto-generated
 * - Type: estimate -> invoice
 * - Issue date: Set to conversion date
 * - validUntil: Removed (set to null)
 * - dueDate: Empty (null, manual input)
 * - Status: draft
 * - Client info: Copied from estimate
 * - Line items: Copied with new IDs
 * - Notes: Copied from estimate
 * - Issuer snapshot: Re-fetched from current settings
 * - Sensitive snapshot: Re-fetched from current settings
 */

// Mock expo-secure-store FIRST before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock storage services
jest.mock('@/storage/asyncStorageService');
jest.mock('@/storage/secureStorageService');
jest.mock('@/domain/document/autoNumberingService');
import { convertEstimateToInvoice } from '@/domain/document/conversionService';
import { resolveBlockPlacements } from '@/pdf/pdfTemplateService';
import * as asyncStorageService from '@/storage/asyncStorageService';
import * as secureStorageService from '@/storage/secureStorageService';
import * as autoNumberingService from '@/domain/document/autoNumberingService';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import {
  createTestDocument,
  createTestInvoice,
  createTestLineItem,
  createTestIssuerSnapshot,
} from './helpers';

const mockedAsyncStorage = jest.mocked(asyncStorageService);
const mockedSecureStorage = jest.mocked(secureStorageService);
const mockedNumbering = jest.mocked(autoNumberingService);

describe('conversionService', () => {
  const TODAY = '2026-01-30';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getReadOnlyMode.mockReturnValue(false);
  });

  describe('convertEstimateToInvoice', () => {
    // === Happy Path Tests ===

    describe('successful conversion', () => {
      beforeEach(() => {
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({
          success: true,
        });
      });

      it('should create new invoice with new UUID', async () => {
        const estimate = createTestDocument({
          id: 'estimate-id-123',
          type: 'estimate',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice('estimate-id-123', { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.id).not.toBe('estimate-id-123');
        expect(result.data?.invoice.id).toBeDefined();
        expect(result.data?.invoice.id.length).toBeGreaterThan(0);
      });

      it('should generate new invoice document number', async () => {
        const estimate = createTestDocument({ type: 'estimate', documentNo: 'EST-001' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.documentNo).toBe('INV-001');
        expect(result.data?.invoice.documentNo).not.toBe('EST-001');
      });

      it('should change type from estimate to invoice', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.type).toBe('invoice');
      });

      it('should set issueDate to conversion date', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          issueDate: '2025-12-01', // Old date
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.issueDate).toBe(TODAY); // '2026-01-30'
      });

      it('should remove validUntil (set to null)', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          validUntil: '2026-03-01',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.validUntil).toBeNull();
      });

      it('should set dueDate to null (for manual input)', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.dueDate).toBeNull();
      });

      it('should set status to draft', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          status: 'sent', // Even if estimate was sent
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.status).toBe('draft');
      });

      it('should set paidAt to null', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.paidAt).toBeNull();
      });

      it('should copy clientName from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          clientName: 'ABC Construction Co.',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.clientName).toBe('ABC Construction Co.');
      });

      it('should copy clientAddress from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          clientAddress: '123 Main Street, Tokyo',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.clientAddress).toBe('123 Main Street, Tokyo');
      });

      it('should copy subject from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          subject: 'Exterior Painting Project',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.subject).toBe('Exterior Painting Project');
      });

      it('should copy notes from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          notes: 'Payment due within 30 days',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.notes).toBe('Payment due within 30 days');
      });

      it('should copy lineItems content but regenerate IDs', async () => {
        const lineItem1 = createTestLineItem({
          id: 'old-line-1',
          name: 'Exterior Wall Painting',
          quantityMilli: 100000, // 100 m2
          unit: 'm²',
          unitPrice: 3000,
          taxRate: 10,
        });
        const lineItem2 = createTestLineItem({
          id: 'old-line-2',
          name: 'Scaffolding',
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 50000,
          taxRate: 10,
        });
        const estimate = createTestDocument({
          type: 'estimate',
          lineItems: [lineItem1, lineItem2],
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        const invoice = result.data!.invoice;

        // Same content
        expect(invoice.lineItems).toHaveLength(2);
        expect(invoice.lineItems[0].name).toBe('Exterior Wall Painting');
        expect(invoice.lineItems[0].quantityMilli).toBe(100000);
        expect(invoice.lineItems[0].unit).toBe('m²');
        expect(invoice.lineItems[0].unitPrice).toBe(3000);
        expect(invoice.lineItems[0].taxRate).toBe(10);

        expect(invoice.lineItems[1].name).toBe('Scaffolding');

        // New IDs
        expect(invoice.lineItems[0].id).not.toBe('old-line-1');
        expect(invoice.lineItems[1].id).not.toBe('old-line-2');
        expect(invoice.lineItems[0].id).toBeDefined();
        expect(invoice.lineItems[1].id).toBeDefined();
      });

      it('should re-fetch issuerSnapshot from current settings (not copy from estimate)', async () => {
        // Estimate has old issuer info
        const estimate = createTestDocument({
          type: 'estimate',
          issuerSnapshot: createTestIssuerSnapshot({
            companyName: 'Old Company Name',
            address: 'Old Address',
          }),
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        // Current settings have new issuer info
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: {
            ...DEFAULT_APP_SETTINGS,
            issuer: {
              companyName: 'New Company Name',
              representativeName: 'New Representative',
              address: 'New Address',
              phone: '090-1234-5678',
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
          },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        // Invoice should have NEW issuer info from current settings
        expect(result.data?.invoice.issuerSnapshot.companyName).toBe('New Company Name');
        expect(result.data?.invoice.issuerSnapshot.address).toBe('New Address');
        expect(result.data?.invoice.issuerSnapshot.representativeName).toBe('New Representative');
        expect(result.data?.invoice.issuerSnapshot.phone).toBe('090-1234-5678');
      });

      it('should save sensitive issuer snapshot for the new invoice', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        // Sensitive info from current settings
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: {
            invoiceNumber: 'T1234567890123',
            bankAccount: {
              bankName: 'Test Bank',
              branchName: 'Test Branch',
              accountType: '普通',
              accountNumber: '1234567',
              accountHolderName: 'Test Holder',
            },
          },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(mockedSecureStorage.saveIssuerSnapshot).toHaveBeenCalledWith(
          result.data!.invoice.id,
          expect.objectContaining({
            invoiceNumber: 'T1234567890123',
            bankName: 'Test Bank',
            branchName: 'Test Branch',
            accountType: '普通',
            accountNumber: '1234567',
            accountHolderName: 'Test Holder',
          })
        );
      });

      it('should return both the new invoice and the original estimate', async () => {
        const estimate = createTestDocument({
          id: 'estimate-id',
          type: 'estimate',
          documentNo: 'EST-001',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice('estimate-id', { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.originalEstimate.id).toBe('estimate-id');
        expect(result.data?.originalEstimate.documentNo).toBe('EST-001');
        expect(result.data?.originalEstimate.type).toBe('estimate');
      });

      it('should preserve estimate (not modify it)', async () => {
        const originalEstimate = createTestDocument({
          id: 'estimate-id',
          type: 'estimate',
          status: 'sent',
          documentNo: 'EST-001',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: originalEstimate,
        });

        const result = await convertEstimateToInvoice('estimate-id', { today: TODAY });

        expect(result.success).toBe(true);
        // Original estimate should be unchanged
        expect(result.data?.originalEstimate.type).toBe('estimate');
        expect(result.data?.originalEstimate.status).toBe('sent');
        expect(result.data?.originalEstimate.documentNo).toBe('EST-001');

        // saveDocument should only be called once (for the new invoice)
        expect(mockedAsyncStorage.saveDocument).toHaveBeenCalledTimes(1);
      });

      it('should set new createdAt and updatedAt timestamps', async () => {
        const oldTimestamp = Date.now() - 86400000; // 1 day ago
        const estimate = createTestDocument({
          type: 'estimate',
          createdAt: oldTimestamp,
          updatedAt: oldTimestamp,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const beforeConversion = Date.now();
        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });
        const afterConversion = Date.now();

        expect(result.success).toBe(true);
        expect(result.data?.invoice.createdAt).toBeGreaterThanOrEqual(beforeConversion);
        expect(result.data?.invoice.createdAt).toBeLessThanOrEqual(afterConversion);
        expect(result.data?.invoice.updatedAt).toBeGreaterThanOrEqual(beforeConversion);
        expect(result.data?.invoice.updatedAt).toBeLessThanOrEqual(afterConversion);
      });
    });

    // === blockPlacements full resolve copy (SPEC §3.3 / §8.4) ===
    //
    // convert 時は estimate template default で resolve した値を full override
    // として invoice に保存する。理由:
    //   - estimate template default ≠ invoice template default の場合
    //     (FORMAL_STANDARD vs ACCOUNTING)、partial override コピーだと
    //     override してないブロックの位置が変わってしまい「見積で見えてた配置」
    //     が請求書で崩れる
    //   - full resolve することで、見積で整えた見た目が請求書でも完全に維持される
    //
    // fixture 規約 (SPEC §8.4): settings.defaultEstimateTemplateId を明示し、
    // 期待値はそれら fixture 値から導出する (FORMAL_STANDARD ハードコード禁止)
    describe('blockPlacements full resolve copy (SPEC §3.3 / §8.4)', () => {
      function setupHappyMocks() {
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({ success: true });
      }

      it('estimate.blockPlacements: null → invoice gets full resolve of estimate template default', async () => {
        const fixtureSettings = {
          ...DEFAULT_APP_SETTINGS,
          defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
          defaultInvoiceTemplateId: 'ACCOUNTING' as const,
        };
        setupHappyMocks();
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: fixtureSettings,
        });

        const estimate = createTestDocument({ type: 'estimate', blockPlacements: null });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });
        expect(result.success).toBe(true);

        // Expected derived from fixture (no FORMAL_STANDARD hardcode)
        const expected = resolveBlockPlacements(
          estimate.blockPlacements,
          fixtureSettings.defaultEstimateTemplateId
        );
        expect(result.data?.invoice.blockPlacements).toEqual(expected);
        // null だった override が full override に変わっていることを確認
        expect(result.data?.invoice.blockPlacements).not.toBeNull();
      });

      it('estimate.blockPlacements: partial override → invoice gets full resolved copy', async () => {
        const fixtureSettings = {
          ...DEFAULT_APP_SETTINGS,
          defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
        };
        setupHappyMocks();
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: fixtureSettings,
        });

        const estimate = createTestDocument({
          type: 'estimate',
          blockPlacements: { bankAccount: 'bottom-right' }, // partial
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });
        expect(result.success).toBe(true);

        const expected = resolveBlockPlacements(
          estimate.blockPlacements,
          fixtureSettings.defaultEstimateTemplateId
        );
        expect(result.data?.invoice.blockPlacements).toEqual(expected);
        expect(result.data?.invoice.blockPlacements?.bankAccount).toBe('bottom-right');
      });

      it('different defaultEstimateTemplateId → expected derived from that template', async () => {
        const fixtureSettings = {
          ...DEFAULT_APP_SETTINGS,
          defaultEstimateTemplateId: 'CONSTRUCTION' as const,
        };
        setupHappyMocks();
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: fixtureSettings,
        });

        const estimate = createTestDocument({ type: 'estimate', blockPlacements: null });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });
        expect(result.success).toBe(true);

        const expected = resolveBlockPlacements(
          null,
          fixtureSettings.defaultEstimateTemplateId
        );
        expect(result.data?.invoice.blockPlacements).toEqual(expected);
      });

      it('full override is preserved as-is after resolve (idempotent)', async () => {
        const fixtureSettings = {
          ...DEFAULT_APP_SETTINGS,
          defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
        };
        setupHappyMocks();
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: fixtureSettings,
        });

        const fullOverride = {
          bankAccount: 'top-left' as const,
          companyStamp: 'bottom-right' as const,
          remarks: 'top-center' as const,
        };
        const estimate = createTestDocument({
          type: 'estimate',
          blockPlacements: fullOverride,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });
        expect(result.success).toBe(true);
        expect(result.data?.invoice.blockPlacements).toEqual(fullOverride);
      });
    });

    // === Error Cases ===

    describe('error handling', () => {
      it('should return DOCUMENT_NOT_FOUND when document does not exist', async () => {
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await convertEstimateToInvoice('non-existent-id', { today: TODAY });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('DOCUMENT_NOT_FOUND');
      });

      it('should return VALIDATION_ERROR when document is an invoice', async () => {
        const invoice = createTestInvoice({ id: 'invoice-id', type: 'invoice' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: invoice,
        });

        const result = await convertEstimateToInvoice('invoice-id', { today: TODAY });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
        expect(result.error?.message).toContain('invoice');
      });

      it('should return STORAGE_ERROR when getDocumentById fails', async () => {
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Storage failure' },
        });

        const result = await convertEstimateToInvoice('some-id', { today: TODAY });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
      });

      it('should return NUMBERING_ERROR when generateDocumentNumber fails', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: false,
          error: { code: 'SETTINGS_READ_ERROR', message: 'Cannot read settings' },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NUMBERING_ERROR');
      });

      it('should return STORAGE_ERROR when saveDocument fails', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockResolvedValue({
          success: false,
          error: { code: 'WRITE_ERROR', message: 'Storage full' },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
      });

      it('should succeed even if saveIssuerSnapshot fails (non-fatal)', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({
          success: false,
          error: { code: 'WRITE_ERROR', message: 'Secure store failure' },
        });

        // Conversion should still succeed
        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice).toBeDefined();
      });
    });

    // === Edge Cases ===

    describe('edge cases', () => {
      beforeEach(() => {
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({
          success: true,
        });
      });

      it('should handle estimate with null optional fields', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          clientAddress: null,
          subject: null,
          validUntil: null,
          notes: null,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.clientAddress).toBeNull();
        expect(result.data?.invoice.subject).toBeNull();
        expect(result.data?.invoice.notes).toBeNull();
      });

      it('should handle estimate with empty settings (null issuer info)', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: false, // Settings read fails
          error: { code: 'READ_ERROR', message: 'No settings' },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        // Should use default empty issuer snapshot
        expect(result.data?.invoice.issuerSnapshot.companyName).toBeNull();
        expect(result.data?.invoice.issuerSnapshot.address).toBeNull();
      });

      it('should handle estimate with many line items', async () => {
        const lineItems = Array.from({ length: 50 }, (_, i) =>
          createTestLineItem({
            id: `old-line-${i}`,
            name: `Item ${i + 1}`,
          })
        );
        const estimate = createTestDocument({
          type: 'estimate',
          lineItems,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.lineItems).toHaveLength(50);
        // All IDs should be different
        const oldIds = new Set(lineItems.map((li) => li.id));
        const invoiceLineItems = result.data?.invoice.lineItems ?? [];
        const newIds = new Set(invoiceLineItems.map((li) => li.id));
        // No overlap between old and new IDs
        for (const newId of Array.from(newIds)) {
          expect(oldIds.has(newId)).toBe(false);
        }
      });

      it('should use provided today parameter for issueDate', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const customToday = '2026-06-15';
        const result = await convertEstimateToInvoice(estimate.id, { today: customToday });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.issueDate).toBe('2026-06-15');
      });
    });

  });
});
