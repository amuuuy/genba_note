/**
 * Tests for secureStorageService
 *
 * TDD approach: Write tests first, then implement to make them pass
 */

import * as SecureStore from 'expo-secure-store';
import {
  getSensitiveIssuerInfo,
  saveSensitiveIssuerInfo,
  getIssuerSnapshot,
  saveIssuerSnapshot,
  deleteIssuerSnapshot,
} from '@/storage/secureStorageService';
import { setReadOnlyMode } from '@/storage/asyncStorageService';
import { SensitiveIssuerSettings } from '@/types/settings';
import { SensitiveIssuerSnapshot } from '@/types/document';
import { SECURE_STORAGE_KEYS } from '@/utils/constants';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe('secureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === Sensitive Issuer Info Tests ===
  describe('Sensitive issuer info', () => {
    const testIssuerInfo: SensitiveIssuerSettings = {
      invoiceNumber: 'T1234567890123',
      bankAccount: {
        bankName: '三菱UFJ銀行',
        branchName: '渋谷支店',
        accountType: '普通',
        accountNumber: '1234567',
        accountHolderName: '山田太郎',
      },
    };

    it('should save and retrieve sensitive issuer info', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(testIssuerInfo));

      const saveResult = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(saveResult.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO,
        JSON.stringify(testIssuerInfo)
      );

      const getResult = await getSensitiveIssuerInfo();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testIssuerInfo);
    });

    it('should return null when no info exists', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getSensitiveIssuerInfo();
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Read failed'));

      const result = await getSensitiveIssuerInfo();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ERROR');
    });

    it('should handle write errors gracefully', async () => {
      mockedSecureStore.setItemAsync.mockRejectedValue(new Error('Write failed'));

      const result = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue('invalid json');

      const result = await getSensitiveIssuerInfo();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should reject data exceeding 2KB size limit', async () => {
      // Create data that exceeds 2048 bytes when JSON-serialized
      const largeIssuerInfo: SensitiveIssuerSettings = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: 'あ'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
          branchName: 'い'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
          accountType: '普通',
          accountNumber: '1234567',
          accountHolderName: '山田太郎',
        },
      };

      const result = await saveSensitiveIssuerInfo(largeIssuerInfo);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SIZE_LIMIT_EXCEEDED');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should accept data within 2KB size limit', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();

      // Normal sized data should succeed
      const normalIssuerInfo: SensitiveIssuerSettings = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: '三菱UFJ銀行',
          branchName: '渋谷支店',
          accountType: '普通',
          accountNumber: '1234567',
          accountHolderName: '山田太郎',
        },
      };

      const result = await saveSensitiveIssuerInfo(normalIssuerInfo);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  // === Document Snapshot Tests ===
  describe('Issuer snapshots', () => {
    const testDocumentId = 'doc-123-uuid';
    const testSnapshot: SensitiveIssuerSnapshot = {
      invoiceNumber: 'T1234567890123',
      bankName: '三菱UFJ銀行',
      branchName: '渋谷支店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolderName: '山田太郎',
    };

    it('should save and retrieve issuer snapshot by document ID', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(testSnapshot));

      const saveResult = await saveIssuerSnapshot(testDocumentId, testSnapshot);
      expect(saveResult.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${testDocumentId}`,
        JSON.stringify(testSnapshot)
      );

      const getResult = await getIssuerSnapshot(testDocumentId);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testSnapshot);
    });

    it('should delete issuer snapshot', async () => {
      mockedSecureStore.deleteItemAsync.mockResolvedValue();

      const result = await deleteIssuerSnapshot(testDocumentId);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${testDocumentId}`
      );
    });

    it('should return null for non-existent snapshot', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getIssuerSnapshot('non-existent-id');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle delete errors gracefully', async () => {
      mockedSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      const result = await deleteIssuerSnapshot(testDocumentId);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_ERROR');
    });

    it('should reject snapshot exceeding 2KB size limit', async () => {
      // Create snapshot that exceeds 2048 bytes when JSON-serialized
      const largeSnapshot: SensitiveIssuerSnapshot = {
        invoiceNumber: 'T1234567890123',
        bankName: 'あ'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
        branchName: 'い'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
        accountType: '普通',
        accountNumber: '1234567',
        accountHolderName: '山田太郎',
      };

      const result = await saveIssuerSnapshot(testDocumentId, largeSnapshot);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SIZE_LIMIT_EXCEEDED');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should accept snapshot within 2KB size limit', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();

      const result = await saveIssuerSnapshot(testDocumentId, testSnapshot);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  // === Read-Only Mode Tests ===
  describe('Read-only mode enforcement', () => {
    const testIssuerInfo: SensitiveIssuerSettings = {
      invoiceNumber: 'T1234567890123',
      bankAccount: {
        bankName: 'テスト銀行',
        branchName: 'テスト支店',
        accountType: '普通',
        accountNumber: '1234567',
        accountHolderName: 'テスト',
      },
    };

    const testSnapshot: SensitiveIssuerSnapshot = {
      invoiceNumber: 'T1234567890123',
      bankName: 'テスト銀行',
      branchName: 'テスト支店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolderName: 'テスト',
    };

    beforeEach(() => {
      // Ensure read-only mode is disabled before each test
      setReadOnlyMode(false);
    });

    afterAll(() => {
      // Clean up after all tests
      setReadOnlyMode(false);
    });

    it('should block saveSensitiveIssuerInfo in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block saveIssuerSnapshot in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await saveIssuerSnapshot('doc-123', testSnapshot);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block deleteIssuerSnapshot in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteIssuerSnapshot('doc-123');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('should allow read operations in read-only mode', async () => {
      setReadOnlyMode(true);
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      // All read operations should still work
      const issuerResult = await getSensitiveIssuerInfo();
      expect(issuerResult.success).toBe(true);

      const snapshotResult = await getIssuerSnapshot('doc-123');
      expect(snapshotResult.success).toBe(true);
    });

    it('should allow write operations when read-only mode is disabled', async () => {
      setReadOnlyMode(false);
      mockedSecureStore.setItemAsync.mockResolvedValue();

      const result = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalled();
    });
  });
});
