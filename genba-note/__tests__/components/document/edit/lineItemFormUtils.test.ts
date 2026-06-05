/**
 * lineItemFormUtils Tests
 *
 * Pure helpers extracted from LineItemEditorModal so they can be unit-tested
 * under the project's node test environment (no @testing-library/react-native).
 * The React component rendering itself is verified manually.
 */

import {
  normaliseSpecInput,
  specToFormValue,
} from '@/components/document/edit/lineItemFormUtils';

describe('lineItemFormUtils', () => {
  describe('normaliseSpecInput (form -> persisted spec)', () => {
    it('preserves a non-empty value', () => {
      expect(normaliseSpecInput('t=50')).toBe('t=50');
    });

    it('trims surrounding whitespace', () => {
      expect(normaliseSpecInput('  t=50  ')).toBe('t=50');
    });

    it('returns null for an empty string', () => {
      expect(normaliseSpecInput('')).toBeNull();
    });

    it('returns null for whitespace-only input', () => {
      expect(normaliseSpecInput('   ')).toBeNull();
    });
  });

  describe('specToFormValue (persisted spec -> form field)', () => {
    it('maps a string spec to itself', () => {
      expect(specToFormValue('t=50')).toBe('t=50');
    });

    it('maps null to an empty string', () => {
      expect(specToFormValue(null)).toBe('');
    });

    it('maps undefined (legacy item without spec) to an empty string', () => {
      expect(specToFormValue(undefined)).toBe('');
    });
  });
});
