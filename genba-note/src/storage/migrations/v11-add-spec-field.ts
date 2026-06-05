/**
 * v11 Migration: Add spec field to line items
 *
 * This migration adds:
 * - LineItem.spec (null for existing line items)
 *
 * Backward-safe: only adds the field with a null default, never removes or
 * overwrites existing data. Existing spec values (if any) are preserved.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import type { Document, LineItem } from '@/types/document';

/**
 * v11 Migration: Add spec field to line items
 */
export const v11AddSpecFieldMigration: Migration = {
  fromVersion: 10,
  toVersion: 11,
  description: 'Add spec field to line items',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Migrate documents: backfill spec on every line item
      const documentsJson = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (documentsJson) {
        const documents = JSON.parse(documentsJson) as unknown;
        // Defensive: a valid-JSON payload whose *structure* is corrupted
        // (e.g. JSON.parse("null") → null, or a non-array object). Skip the
        // backfill and leave it untouched rather than throwing — this hardens
        // the new spec backfill against malformed-but-parseable shapes.
        // Note: a truly unparseable payload still throws above and is handled by
        // the outer catch + migrationRunner read-only fail-safe, consistent with
        // every other migration — that is intentional data-corruption protection,
        // not a defect.
        if (!Array.isArray(documents)) {
          return { success: true };
        }
        const migratedDocuments = documents.map((doc) => {
          // Defensive: preserve non-object document entries as-is. Arrays are
          // typeof 'object' too, so exclude them — only plain objects are
          // backfill targets; anything else is left untouched.
          if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
          const typedDoc = doc as Document;
          return {
            ...typedDoc,
            // Defensive: guard against corrupted lineItems (non-array).
            lineItems: Array.isArray(typedDoc.lineItems)
              ? typedDoc.lineItems.map((item: LineItem) =>
                  // Defensive: preserve non-object line-item entries as-is
                  // (arrays excluded — same reasoning as the document guard).
                  item && typeof item === 'object' && !Array.isArray(item)
                    ? { ...item, spec: item.spec ?? null }
                    : item
                )
              : typedDoc.lineItems,
          };
        });
        await AsyncStorage.setItem(
          STORAGE_KEYS.DOCUMENTS,
          JSON.stringify(migratedDocuments)
        );
      }

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v11 schema',
        fromVersion: 10,
        toVersion: 11,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
