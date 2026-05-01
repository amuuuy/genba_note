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
  applyEffectiveBlockPlacementsToDocument,
  performPreviewShareConfirm,
} from '@/components/document/edit/blockPlacementModalHelpers';
import type { DocumentWithTotals, SensitiveIssuerSnapshot } from '@/types/document';
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

// === applyEffectiveBlockPlacementsToDocument (P5-D iter2 share helper) ===

describe('applyEffectiveBlockPlacementsToDocument (P5-D)', () => {
  // preview.tsx の generateAndSharePdf 呼出経路を pure helper として抽出した
  // 配線担保用 helper。これが pass することで preview/PDF parity が保たれる。
  const baseDoc = {
    id: 'doc-1',
    documentNo: 'INV-001',
    blockPlacements: { bankAccount: 'top-left' as const },
    // 他フィールドは shallow copy で保持されることを担保
    clientName: 'テスト顧客',
    notes: 'メモ',
  };

  it('override === undefined → document を shallow copy、blockPlacements そのまま', () => {
    const result = applyEffectiveBlockPlacementsToDocument(baseDoc, undefined);
    expect(result.blockPlacements).toEqual(baseDoc.blockPlacements);
    expect(result.clientName).toBe(baseDoc.clientName);
    expect(result.notes).toBe(baseDoc.notes);
    // shallow copy であること (mutation 影響回避)
    expect(result).not.toBe(baseDoc);
  });

  it('override === BlockPlacements → effective 値で上書き、他フィールド保持 (saved preview + override → PDF 反映)', () => {
    // saved preview で modal explicit override 後の PDF 共有シナリオ:
    // WebView も PDF も同じ override 配置になる
    const override: BlockPlacements = { remarks: 'bottom-right' };
    const result = applyEffectiveBlockPlacementsToDocument(baseDoc, override);
    expect(result.blockPlacements).toEqual(override);
    expect(result.clientName).toBe(baseDoc.clientName);
    expect(result.notes).toBe(baseDoc.notes);
  });

  it('override === null → blockPlacements を null に reset、他フィールド保持 (saved preview + 「最初の配置に戻す」→ PDF 反映)', () => {
    // saved preview で modal の「最初の配置に戻す」後の PDF 共有シナリオ:
    // WebView も PDF も template default に戻る (両 path で resolveBlockPlacements が
    // null を受けて template default に倒す)
    const result = applyEffectiveBlockPlacementsToDocument(baseDoc, null);
    expect(result.blockPlacements).toBeNull();
    expect(result.clientName).toBe(baseDoc.clientName);
    expect(result.notes).toBe(baseDoc.notes);
  });

  it('does not mutate input document (deep check, P5-D iter3 advisory)', () => {
    // P5-D iter3 advisory: shallow clone 比較では nested mutation を検出できない。
    // blockPlacements を別参照で保持し、deep に変更されていないことを確認。
    const originalBlockPlacements = baseDoc.blockPlacements;
    const originalRef = baseDoc;
    applyEffectiveBlockPlacementsToDocument(baseDoc, { bankAccount: 'hidden' });
    // 同一参照のままで blockPlacements の内容も変わらない
    expect(baseDoc).toBe(originalRef);
    expect(baseDoc.blockPlacements).toBe(originalBlockPlacements);
    expect(baseDoc.blockPlacements).toEqual({ bankAccount: 'top-left' });
    // override 引数も mutate されない (frozen で deep mutation を検出)
    const override: BlockPlacements = { remarks: 'top-right' };
    const frozen = Object.freeze({ ...override });
    expect(() =>
      applyEffectiveBlockPlacementsToDocument(baseDoc, frozen)
    ).not.toThrow();
  });
});

// === performPreviewShareConfirm (P5-D iter3 share workflow) ===
//
// preview.tsx の handleFilenameConfirm が唯一の経路として呼ぶ async helper。
// generateAndSharePdf を deps injection で mock し、blockPlacementsOverride が
// PDF 入力 document.blockPlacements に effective 値で反映されることを担保する。
// preview.tsx で本 helper 呼出を別実装に置き換えた場合に test が落ちる構造。

describe('performPreviewShareConfirm (P5-D)', () => {
  function makeDoc(
    overrides: Partial<DocumentWithTotals> = {}
  ): DocumentWithTotals {
    return {
      id: 'doc-1',
      documentNo: 'INV-001',
      type: 'invoice',
      status: 'draft',
      clientName: 'テスト顧客',
      clientAddress: null,
      customerId: null,
      subject: null,
      issueDate: '2026-05-01',
      validUntil: null,
      dueDate: '2026-05-31',
      paidAt: null,
      lineItems: [],
      lineItemsCalculated: [],
      subtotalYen: 0,
      taxYen: 0,
      totalYen: 0,
      taxBreakdown: [],
      notes: null,
      issuerSnapshot: {
        companyName: 'テスト',
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      },
      createdAt: 0,
      updatedAt: 0,
      carriedForwardAmount: null,
      blockPlacements: null,
      ...overrides,
    };
  }

  const sensitive: SensitiveIssuerSnapshot = {
    invoiceNumber: null,
    bankName: null,
    branchName: null,
    accountType: null,
    accountNumber: null,
    accountHolderName: null,
  };

  it('blockPlacementsOverride === undefined → document.blockPlacements (saved-doc) が PDF 入力に渡る', async () => {
    const doc = makeDoc({ blockPlacements: { bankAccount: 'top-left' } });
    const mockShare = jest.fn().mockResolvedValue({ success: true });
    await performPreviewShareConfirm(
      {
        document: doc,
        blockPlacementsOverride: undefined,
        sensitiveSnapshot: sensitive,
        orientation: 'PORTRAIT',
        customFilename: 'test.pdf',
      },
      { generateAndSharePdf: mockShare }
    );
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare.mock.calls[0][0].document.blockPlacements).toEqual({
      bankAccount: 'top-left',
    });
  });

  it('blockPlacementsOverride === BlockPlacements → effective override が PDF 入力に渡る (saved preview + modal explicit override → PDF parity)', async () => {
    const doc = makeDoc({ blockPlacements: { bankAccount: 'top-left' } });
    const override: BlockPlacements = { companyStamp: 'top-center' };
    const mockShare = jest.fn().mockResolvedValue({ success: true });
    await performPreviewShareConfirm(
      {
        document: doc,
        blockPlacementsOverride: override,
        sensitiveSnapshot: sensitive,
        orientation: 'PORTRAIT',
        customFilename: 'test.pdf',
      },
      { generateAndSharePdf: mockShare }
    );
    // override が doc の保存値より優先されて PDF 入力に渡る
    expect(mockShare.mock.calls[0][0].document.blockPlacements).toEqual(
      override
    );
    // 他フィールドは doc の値が保持される
    expect(mockShare.mock.calls[0][0].document.id).toBe('doc-1');
    expect(mockShare.mock.calls[0][0].document.documentNo).toBe('INV-001');
  });

  it('blockPlacementsOverride === null → null reset が PDF 入力に渡る (saved preview + 「最初の配置に戻す」→ PDF parity)', async () => {
    const doc = makeDoc({ blockPlacements: { bankAccount: 'top-left' } });
    const mockShare = jest.fn().mockResolvedValue({ success: true });
    await performPreviewShareConfirm(
      {
        document: doc,
        blockPlacementsOverride: null,
        sensitiveSnapshot: sensitive,
        orientation: 'PORTRAIT',
        customFilename: 'test.pdf',
      },
      { generateAndSharePdf: mockShare }
    );
    // explicit null は doc の保存値より優先されて null として渡る
    // (resolveBlockPlacements が template default に倒す)
    expect(mockShare.mock.calls[0][0].document.blockPlacements).toBeNull();
  });

  it('passes orientation and customFilename through options', async () => {
    const doc = makeDoc();
    const mockShare = jest.fn().mockResolvedValue({ success: true });
    await performPreviewShareConfirm(
      {
        document: doc,
        blockPlacementsOverride: undefined,
        sensitiveSnapshot: sensitive,
        orientation: 'LANDSCAPE',
        customFilename: 'invoice-001.pdf',
      },
      { generateAndSharePdf: mockShare }
    );
    expect(mockShare.mock.calls[0][1]).toEqual({
      orientation: 'LANDSCAPE',
      customFilename: 'invoice-001.pdf',
    });
  });

  it('passes through generateAndSharePdf result (success / failure pass-through)', async () => {
    const doc = makeDoc();
    // failure case
    const failureResult = {
      success: false,
      error: { code: 'VALIDATION_FAILED' as const, message: 'no-no' },
    };
    const mockShare = jest.fn().mockResolvedValue(failureResult);
    const result = await performPreviewShareConfirm(
      {
        document: doc,
        blockPlacementsOverride: undefined,
        sensitiveSnapshot: sensitive,
        orientation: 'PORTRAIT',
        customFilename: 'test.pdf',
      },
      { generateAndSharePdf: mockShare }
    );
    expect(result).toEqual(failureResult);
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
