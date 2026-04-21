/**
 * Secure Storage Service
 *
 * Wrapper for expo-secure-store to manage sensitive data:
 * - Sensitive issuer info (invoice number, bank account)
 * - Document-specific issuer snapshots
 */

import * as SecureStore from 'expo-secure-store';
import { SensitiveIssuerSettings } from '@/types/settings';
import { SensitiveIssuerSnapshot } from '@/types/document';
import { SECURE_STORAGE_KEYS } from '@/utils/constants';
import { getReadOnlyMode } from './readOnlyModeState';
import { getByteLength } from '@/utils/stringBytes';

// expo-secure-store value size limit (2KB)
const SECURE_STORE_VALUE_LIMIT = 2048;

// === Result Types ===

export type SecureStorageErrorCode =
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'DELETE_ERROR'
  | 'PARSE_ERROR'
  | 'UNAVAILABLE'
  | 'READONLY_MODE'
  | 'SIZE_LIMIT_EXCEEDED';

export interface SecureStorageError {
  code: SecureStorageErrorCode;
  message: string;
  originalError?: Error;
}

export interface SecureStorageResult<T> {
  success: boolean;
  data?: T;
  error?: SecureStorageError;
}

// === Helper Functions ===

function createError(
  code: SecureStorageErrorCode,
  message: string,
  originalError?: Error
): SecureStorageError {
  return { code, message, originalError };
}

function successResult<T>(data: T): SecureStorageResult<T> {
  return { success: true, data };
}

function errorResult<T>(error: SecureStorageError): SecureStorageResult<T> {
  return { success: false, error };
}

/**
 * Check if read-only mode is active and return error if so
 */
function checkReadOnlyMode(): SecureStorageResult<void> | null {
  if (getReadOnlyMode()) {
    return errorResult(
      createError('READONLY_MODE', 'Cannot modify data in read-only mode')
    );
  }
  return null;
}

// === Sensitive Issuer Info ===

/**
 * Get sensitive issuer information (invoice number, bank account)
 */
export async function getSensitiveIssuerInfo(): Promise<
  SecureStorageResult<SensitiveIssuerSettings | null>
> {
  try {
    const data = await SecureStore.getItemAsync(
      SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO
    );

    if (data === null) {
      return successResult(null);
    }

    try {
      const parsed = JSON.parse(data) as SensitiveIssuerSettings;
      return successResult(parsed);
    } catch {
      return errorResult(
        createError('PARSE_ERROR', 'Failed to parse sensitive issuer info')
      );
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read sensitive issuer info',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Save sensitive issuer information
 */
export async function saveSensitiveIssuerInfo(
  info: SensitiveIssuerSettings
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    const jsonString = JSON.stringify(info);

    // Validate byte length before saving
    const byteLength = getByteLength(jsonString);
    if (byteLength > SECURE_STORE_VALUE_LIMIT) {
      return errorResult(
        createError(
          'SIZE_LIMIT_EXCEEDED',
          `データサイズ(${byteLength}バイト)が制限(${SECURE_STORE_VALUE_LIMIT}バイト)を超えています`
        )
      );
    }

    await SecureStore.setItemAsync(
      SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO,
      jsonString
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to save sensitive issuer info',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete sensitive issuer information
 * Used for rollback when initial save fails
 */
export async function deleteSensitiveIssuerInfo(): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO);
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'DELETE_ERROR',
        'Failed to delete sensitive issuer info',
        error instanceof Error ? error : undefined
      )
    );
  }
}

// === Document-specific Issuer Snapshots ===

/**
 * Get issuer snapshot for a specific document
 */
export async function getIssuerSnapshot(
  documentId: string
): Promise<SecureStorageResult<SensitiveIssuerSnapshot | null>> {
  try {
    const key = `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${documentId}`;
    const data = await SecureStore.getItemAsync(key);

    if (data === null) {
      return successResult(null);
    }

    try {
      const parsed = JSON.parse(data) as SensitiveIssuerSnapshot;
      return successResult(parsed);
    } catch {
      return errorResult(
        createError('PARSE_ERROR', `Failed to parse issuer snapshot for document ${documentId}`)
      );
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        `Failed to read issuer snapshot for document ${documentId}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Save issuer snapshot for a specific document
 */
export async function saveIssuerSnapshot(
  documentId: string,
  snapshot: SensitiveIssuerSnapshot
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    const jsonString = JSON.stringify(snapshot);

    // Validate byte length before saving
    const byteLength = getByteLength(jsonString);
    if (byteLength > SECURE_STORE_VALUE_LIMIT) {
      return errorResult(
        createError(
          'SIZE_LIMIT_EXCEEDED',
          `スナップショットサイズ(${byteLength}バイト)が制限(${SECURE_STORE_VALUE_LIMIT}バイト)を超えています`
        )
      );
    }

    const key = `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${documentId}`;
    await SecureStore.setItemAsync(key, jsonString);
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        `Failed to save issuer snapshot for document ${documentId}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete issuer snapshot for a specific document
 */
export async function deleteIssuerSnapshot(
  documentId: string
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    const key = `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${documentId}`;
    await SecureStore.deleteItemAsync(key);
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'DELETE_ERROR',
        `Failed to delete issuer snapshot for document ${documentId}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}
