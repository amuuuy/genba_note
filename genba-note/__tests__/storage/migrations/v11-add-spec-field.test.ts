/**
 * Tests for v11-add-spec-field migration
 *
 * v11 adds spec field to:
 * - LineItem.spec (null for existing line items)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v11AddSpecFieldMigration } from '@/storage/migrations/v11-add-spec-field';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('v11-add-spec-field migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 10 to 11', () => {
      expect(v11AddSpecFieldMigration.fromVersion).toBe(10);
      expect(v11AddSpecFieldMigration.toVersion).toBe(11);
    });

    it('should have a description', () => {
      expect(v11AddSpecFieldMigration.description).toBeTruthy();
      expect(typeof v11AddSpecFieldMigration.description).toBe('string');
    });
  });

  describe('documents migration', () => {
    it('should add spec: null to line items missing the field', async () => {
      const documents = [
        {
          id: 'doc-1',
          lineItems: [
            { id: 'li-1', name: '墨出し', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 },
            { id: 'li-2', name: '斫り工事', quantityMilli: 2750, unit: 'm²', unitPrice: 6000, taxRate: 10 },
          ],
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].lineItems[0].spec).toBeNull();
      expect(savedDocs[0].lineItems[1].spec).toBeNull();
    });

    it('should preserve existing spec value', async () => {
      const documents = [
        {
          id: 'doc-1',
          lineItems: [
            { id: 'li-1', name: '斫り工事', quantityMilli: 2750, unit: 'm²', unitPrice: 6000, taxRate: 10, spec: 't=50' },
          ],
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].lineItems[0].spec).toBe('t=50');
    });

    it('should handle documents with empty lineItems array', async () => {
      const documents = [{ id: 'doc-1', lineItems: [] }];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
    });
  });

  describe('no data', () => {
    it('should succeed when no documents exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v11AddSpecFieldMigration.migrate();

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v11AddSpecFieldMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(10);
      expect(result.error!.toVersion).toBe(11);
    });
  });

  describe('corrupted payloads (fail-safe, never brick startup)', () => {
    it('should succeed and skip when documents root is null', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(null);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should succeed and skip when documents root is a non-array object', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify({});
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should preserve a malformed (non-object) document entry as-is', async () => {
      const documents = [null, { id: 'doc-2', lineItems: [] }];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0]).toBeNull();
      expect(savedDocs[1].id).toBe('doc-2');
    });

    it('should preserve malformed (null) line-item entries without throwing', async () => {
      const documents = [
        {
          id: 'doc-1',
          lineItems: [
            null,
            { id: 'li-2', name: '斫り工事', quantityMilli: 2750, unit: 'm²', unitPrice: 6000, taxRate: 10 },
          ],
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].lineItems[0]).toBeNull();
      expect(savedDocs[0].lineItems[1].spec).toBeNull();
    });

    it('should preserve an array-shaped (malformed) document entry as-is', async () => {
      const documents = [[], { id: 'doc-2', lineItems: [] }];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(Array.isArray(savedDocs[0])).toBe(true);
      expect(savedDocs[0]).toEqual([]);
      expect(savedDocs[1].id).toBe('doc-2');
    });

    it('should preserve an array-shaped (malformed) line-item entry as-is', async () => {
      const documents = [
        {
          id: 'doc-1',
          lineItems: [
            [],
            { id: 'li-2', name: '斫り工事', quantityMilli: 2750, unit: 'm²', unitPrice: 6000, taxRate: 10 },
          ],
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v11AddSpecFieldMigration.migrate();
      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(Array.isArray(savedDocs[0].lineItems[0])).toBe(true);
      expect(savedDocs[0].lineItems[0]).toEqual([]);
      expect(savedDocs[0].lineItems[1].spec).toBeNull();
    });
  });
});
