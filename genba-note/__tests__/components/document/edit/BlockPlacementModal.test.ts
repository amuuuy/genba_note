/**
 * BlockPlacementModal pure-logic tests (P5-C).
 *
 * jest testEnvironment は node のため UI rendering test は不可 (TemplatePickerModal
 * など他 modal と同じスタンス)。ここでは export された pure helper の単体テストと
 * useDocumentEdit reducer の `UPDATE_BLOCK_PLACEMENTS` action semantics を担保する。
 *
 * Codex P5-A iter1 / P5-B iter1+2 で指摘された設計ポイントを test で凍結:
 * - resolvePlacementsForDisplay の null / partial / full override コーナーケース
 * - UPDATE_BLOCK_PLACEMENTS reducer が isDirty を変えない、blockPlacements 以外を保つ
 */

import {
  resolvePlacementsForDisplay,
  resolveEffectiveBlockPlacements,
} from '@/components/document/edit/blockPlacementModalHelpers';
import {
  documentEditReducer,
  type DocumentEditState,
} from '@/hooks/useDocumentEdit';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from '@/pdf/blockPlacementDefaults';
import type { BlockPlacements } from '@/types/blockPlacement';

// === resolvePlacementsForDisplay ===

describe('resolvePlacementsForDisplay (P5-A)', () => {
  it('null current → template default for all 3 blocks (FORMAL_STANDARD)', () => {
    const result = resolvePlacementsForDisplay(null, 'FORMAL_STANDARD');
    expect(result).toEqual(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD);
  });

  it('null current → template default for MODERN (different default than FORMAL)', () => {
    // MODERN default: bank='bottom-center' (FORMAL は 'top-center')
    const result = resolvePlacementsForDisplay(null, 'MODERN');
    expect(result).toEqual(TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.MODERN);
    expect(result.bankAccount).toBe('bottom-center');
  });

  it('partial override → user-specified field uses override, others fall back to template default', () => {
    const partial: BlockPlacements = { bankAccount: 'bottom-right' };
    const result = resolvePlacementsForDisplay(partial, 'ACCOUNTING');
    expect(result.bankAccount).toBe('bottom-right');
    // ACCOUNTING default: companyStamp='top-right', remarks='bottom-center'
    expect(result.companyStamp).toBe(
      TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.ACCOUNTING.companyStamp
    );
    expect(result.remarks).toBe(
      TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.ACCOUNTING.remarks
    );
  });

  it('full override → all 3 fields use user-specified values', () => {
    const full: BlockPlacements = {
      bankAccount: 'top-left',
      companyStamp: 'bottom-left',
      remarks: 'top-right',
    };
    const result = resolvePlacementsForDisplay(full, 'CLASSIC');
    expect(result).toEqual(full);
  });

  it('hidden override → result preserves hidden value (not replaced by default)', () => {
    const placements: BlockPlacements = { bankAccount: 'hidden' };
    const result = resolvePlacementsForDisplay(placements, 'SIMPLE');
    expect(result.bankAccount).toBe('hidden');
    expect(result.companyStamp).toBe(
      TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.SIMPLE.companyStamp
    );
  });
});

// === resolveEffectiveBlockPlacements (P5-D preview/PDF parity) ===

describe('resolveEffectiveBlockPlacements (P5-D)', () => {
  it('override === undefined → fallback to document value (saved-doc fallback)', () => {
    const docValue: BlockPlacements = { bankAccount: 'top-left' };
    const result = resolveEffectiveBlockPlacements(undefined, docValue);
    expect(result).toEqual(docValue);
  });

  it('override === undefined + document value === null → null', () => {
    const result = resolveEffectiveBlockPlacements(undefined, null);
    expect(result).toBeNull();
  });

  it('override === null → null pass-through (「最初の配置に戻す」)', () => {
    // caller の explicit null は document value より優先される
    const docValue: BlockPlacements = { bankAccount: 'top-left' };
    const result = resolveEffectiveBlockPlacements(null, docValue);
    expect(result).toBeNull();
  });

  it('override === BlockPlacements → override pass-through', () => {
    // caller の explicit override が document value より優先される
    const override: BlockPlacements = { remarks: 'bottom-right' };
    const docValue: BlockPlacements = { bankAccount: 'top-left' };
    const result = resolveEffectiveBlockPlacements(override, docValue);
    expect(result).toEqual(override);
  });

  it('override = explicit hidden → preserved over document default', () => {
    // hidden override は document の null より優先される (preview / PDF 両方で印影非表示)
    const override: BlockPlacements = { companyStamp: 'hidden' };
    const result = resolveEffectiveBlockPlacements(override, null);
    expect(result).toEqual(override);
  });
});

// === useDocumentEdit reducer: UPDATE_BLOCK_PLACEMENTS action ===

function makeBaseState(overrides: Partial<DocumentEditState> = {}): DocumentEditState {
  return {
    documentId: 'doc-1',
    documentNo: 'INV-001',
    status: 'draft',
    customerId: null,
    values: {
      type: 'invoice',
      clientName: 'テスト顧客',
      clientAddress: '',
      subject: '件名',
      issueDate: '2026-05-01',
      validUntil: '',
      dueDate: '2026-05-31',
      paidAt: '',
      carriedForwardAmount: '',
      notes: '',
    },
    lineItems: [],
    issuerSnapshot: null,
    blockPlacements: null,
    errors: {},
    isLoading: false,
    isSaving: false,
    isDirty: false,
    errorMessage: null,
    ...overrides,
  };
}

describe('documentEditReducer: UPDATE_BLOCK_PLACEMENTS (P5-B)', () => {
  it('updates blockPlacements field with new value', () => {
    const state = makeBaseState({ blockPlacements: null });
    const next: BlockPlacements = { bankAccount: 'bottom-right' };
    const result = documentEditReducer(state, {
      type: 'UPDATE_BLOCK_PLACEMENTS',
      blockPlacements: next,
    });
    expect(result.blockPlacements).toEqual(next);
  });

  it('accepts null to reset blockPlacements (「最初の配置に戻す」)', () => {
    const state = makeBaseState({
      blockPlacements: { bankAccount: 'top-left' },
    });
    const result = documentEditReducer(state, {
      type: 'UPDATE_BLOCK_PLACEMENTS',
      blockPlacements: null,
    });
    expect(result.blockPlacements).toBeNull();
  });

  it('does NOT mark isDirty (永続保存は modal 内で完了済、in-memory 同期のみ)', () => {
    const state = makeBaseState({ isDirty: false, blockPlacements: null });
    const result = documentEditReducer(state, {
      type: 'UPDATE_BLOCK_PLACEMENTS',
      blockPlacements: { remarks: 'top-left' },
    });
    expect(result.isDirty).toBe(false);
  });

  it('preserves isDirty=true if it was already true', () => {
    // 他フィールドの未保存変更がある状態で BlockPlacementModal を使った場合、
    // isDirty=true は変えずにそのまま保持される
    const state = makeBaseState({ isDirty: true, blockPlacements: null });
    const result = documentEditReducer(state, {
      type: 'UPDATE_BLOCK_PLACEMENTS',
      blockPlacements: { remarks: 'top-left' },
    });
    expect(result.isDirty).toBe(true);
  });

  it('does NOT modify other state fields (values, lineItems, errors, etc.)', () => {
    const state = makeBaseState({
      values: {
        type: 'estimate',
        clientName: '保持される',
        clientAddress: '住所',
        subject: '件名',
        issueDate: '2026-05-01',
        validUntil: '2026-05-31',
        dueDate: '',
        paidAt: '',
        carriedForwardAmount: '1000',
        notes: '備考',
      },
      lineItems: [
        {
          id: 'l1',
          name: '項目A',
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 100,
          taxRate: 10,
        },
      ],
      errors: { clientName: 'エラー保持' },
      errorMessage: 'メッセージ保持',
    });
    const result = documentEditReducer(state, {
      type: 'UPDATE_BLOCK_PLACEMENTS',
      blockPlacements: { bankAccount: 'hidden' },
    });
    expect(result.values).toBe(state.values);
    expect(result.lineItems).toBe(state.lineItems);
    expect(result.errors).toBe(state.errors);
    expect(result.errorMessage).toBe(state.errorMessage);
    expect(result.documentId).toBe(state.documentId);
    expect(result.documentNo).toBe(state.documentNo);
  });
});
