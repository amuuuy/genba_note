/**
 * Pure form helpers for LineItemEditorModal.
 *
 * Kept free of any React / react-native imports so they can be unit-tested
 * under the project's node test environment (see jest.config.js).
 */

/**
 * Convert a persisted spec value into the editable form field value.
 * null / undefined (legacy items created before the spec field existed)
 * map to an empty string so the input renders blank.
 */
export function specToFormValue(spec: string | null | undefined): string {
  return spec ?? '';
}

/**
 * Convert the form's spec input into the persisted value.
 * Trims whitespace; an empty result becomes null (never an empty string),
 * matching the convention that null represents an unset optional value.
 */
export function normaliseSpecInput(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}
