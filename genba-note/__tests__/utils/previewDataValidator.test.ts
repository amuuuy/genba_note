/**
 * Tests for previewDataValidator (SPEC §7.1 / §4.2).
 *
 * v1.0.2 で `blockPlacements` を Document に伝播する正規化点を検証する。
 * preview の URL params 由来 untrusted input から構造を厳密に組み立てる
 * 既存パターン (spread 禁止、明示的フィールド構築) に合わせて、
 * blockPlacements も:
 *   - undefined / null / 不正な型 → null (lazy default)
 *   - 各フィールドは valid BlockPosition のみ採用
 *   - 1 つも valid フィールドが無いオブジェクト → null
 */

import { validatePreviewDocument } from '@/utils/previewDataValidator';

const baseInput = {
  id: 'pv-1',
  documentNo: 'EST-001',
  type: 'estimate' as const,
  status: 'draft' as const,
  clientName: 'Test Client',
  issueDate: '2026-01-30',
  lineItems: [
    {
      id: 'li-1',
      name: 'Item',
      unit: '式',
      quantityMilli: 1000,
      unitPrice: 10000,
      taxRate: 10,
    },
  ],
};

describe('validatePreviewDocument — blockPlacements normalization (SPEC §4.2)', () => {
  it('omitted blockPlacements → null', () => {
    const result = validatePreviewDocument(baseInput);
    expect(result).not.toBeNull();
    expect(result!.blockPlacements).toBeNull();
  });

  it('explicit null → null', () => {
    const result = validatePreviewDocument({ ...baseInput, blockPlacements: null });
    expect(result).not.toBeNull();
    expect(result!.blockPlacements).toBeNull();
  });

  it('valid partial override is preserved', () => {
    const result = validatePreviewDocument({
      ...baseInput,
      blockPlacements: { bankAccount: 'top-left', companyStamp: 'hidden' },
    });
    expect(result!.blockPlacements).toEqual({
      bankAccount: 'top-left',
      companyStamp: 'hidden',
    });
  });

  it('valid full override is preserved', () => {
    const full = {
      bankAccount: 'top-center' as const,
      companyStamp: 'top-right' as const,
      remarks: 'bottom-center' as const,
    };
    const result = validatePreviewDocument({ ...baseInput, blockPlacements: full });
    expect(result!.blockPlacements).toEqual(full);
  });

  it('invalid position string is filtered out (defensive normalization)', () => {
    const result = validatePreviewDocument({
      ...baseInput,
      blockPlacements: {
        bankAccount: 'middle-mystery', // invalid → dropped
        companyStamp: 'top-right', // valid → kept
      },
    });
    expect(result!.blockPlacements).toEqual({ companyStamp: 'top-right' });
  });

  it('all-invalid object → null (no fields survive)', () => {
    const result = validatePreviewDocument({
      ...baseInput,
      blockPlacements: { bankAccount: 'corner-x', companyStamp: 42 },
    });
    expect(result!.blockPlacements).toBeNull();
  });

  it('non-object input (string / number / array) → null', () => {
    expect(
      validatePreviewDocument({ ...baseInput, blockPlacements: 'not-an-object' })!
        .blockPlacements
    ).toBeNull();
    expect(
      validatePreviewDocument({ ...baseInput, blockPlacements: 42 })!.blockPlacements
    ).toBeNull();
    expect(
      validatePreviewDocument({ ...baseInput, blockPlacements: ['arr'] })!
        .blockPlacements
    ).toBeNull();
  });

  it('extraneous unknown keys are dropped (only 3 known keys are read)', () => {
    const result = validatePreviewDocument({
      ...baseInput,
      blockPlacements: {
        bankAccount: 'top-left',
        unknownExtra: 'top-right', // ignored
      },
    });
    expect(result!.blockPlacements).toEqual({ bankAccount: 'top-left' });
  });
});
