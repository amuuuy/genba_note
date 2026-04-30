/**
 * ACCOUNTING (invoice accounting) legacy snapshot tests (P4-C-3 baseline freeze).
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で代替担保するための snapshot test。
 * Pre-change ACCOUNTING generator output を fixture として **凍結** し、
 * P4-C-3 の fragment 抽出 / override branch 配線後も diff 0 を維持することを
 * ゲートにする (FORMAL_STANDARD と同じ pattern を適用)。
 *
 * 使い方:
 *   - 通常: `npm test __tests__/pdf/accountingSnapshot.test.ts`
 *     → fixture と一致しなければ FAIL
 *   - fixture 更新: `UPDATE_FIXTURES=1 npm test __tests__/pdf/accountingSnapshot.test.ts`
 *     → 現在の generator output を fixture file に書き出す (要レビュー)
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateHtmlTemplate } from '@/pdf/pdfTemplateService';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createTestIssuerSnapshot,
  createTestLineItem,
  resetTestIdCounter,
} from './helpers';
import { normalizeHtmlForSnapshot } from './__helpers__/htmlSnapshot';
import type { DocumentWithTotals, IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { BlockPlacements } from '@/types/blockPlacement';

const FIXTURE_DIR = path.join(__dirname, '__fixtures__', 'accounting');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

// 1x1 transparent PNG (base64) — minimal valid image data URI for seal tests
const TEST_SEAL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

const FIXED_TS = 1735603200000; // 2025-12-31T00:00:00Z, arbitrary fixed value for determinism

interface MakeDocInput {
  issuerOverrides?: Partial<IssuerSnapshot>;
  notes?: string | null;
  type?: 'estimate' | 'invoice';
}

function makeAccountingDoc(input: MakeDocInput = {}): DocumentWithTotals {
  resetTestIdCounter();
  return createTestDocumentWithTotals({
    id: 'fixture-doc-1',
    type: input.type ?? 'invoice',
    documentNo: input.type === 'estimate' ? 'EST-001' : 'INV-001',
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
    issuerSnapshot: createTestIssuerSnapshot(input.issuerOverrides),
    notes: input.notes !== undefined ? input.notes : 'テスト備考欄',
    lineItems: [createTestLineItem({ id: 'fixture-line-1' })],
  });
}

function compareOrUpdateFixture(name: string, generated: string): void {
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }
  const fixturePath = path.join(FIXTURE_DIR, `${name}.html`);

  if (UPDATE) {
    fs.writeFileSync(fixturePath, generated, 'utf-8');
    return;
  }

  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `Fixture missing: ${fixturePath}. Run \`UPDATE_FIXTURES=1 npm test\` to generate.`
    );
  }
  const expected = fs.readFileSync(fixturePath, 'utf-8');
  expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(expected));
}

/**
 * generateHtmlTemplate 経由で ACCOUNTING HTML を生成する fixture-helper。
 * resolver + templateId 解決も同時に検証する。
 *
 * blockPlacements が未指定なら doc.blockPlacements (null) → resolveBlockPlacements で
 * ACCOUNTING default に倒れ legacy branch を通る。明示指定すれば override branch
 * の各ケースをテスト可能。
 */
function generateForFixture(
  doc: DocumentWithTotals,
  sensitive: SensitiveIssuerSnapshot | null,
  blockPlacements?: BlockPlacements | null
): string {
  const result = generateHtmlTemplate({
    document: doc,
    sensitiveSnapshot: sensitive,
    mode: 'pdf',
    templateId: 'ACCOUNTING',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  return result.html;
}

describe('ACCOUNTING legacy snapshot (P4-C-3 baseline)', () => {
  it('invoice-richest: invoice + bank + seal + notes (richest, materially affects HTML)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-richest', generateForFixture(doc, sensitive));
  });

  it('invoice-no-seal: invoice with bank + notes, no seal (seal extraction omission case)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: null },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-seal', generateForFixture(doc, sensitive));
  });

  it('invoice-no-bank: invoice with seal + notes, no bank (bank extraction omission case)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    // sensitive=null → renderInfoBlock 内 hasBankInfo→false → bank row omitted
    compareOrUpdateFixture('invoice-no-bank', generateForFixture(doc, null));
  });

  it('invoice-no-notes: invoice with bank + seal, doc.notes=null (notes wrapper still emits empty)', () => {
    // Note: renderNotesSection() always emits the notes wrapper even when doc.notes is null.
    // This fixture freezes that pre-change behavior so P4-C-3 extraction does not silently change it.
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-notes', generateForFixture(doc, sensitive));
  });

  it('estimate-default: estimate document, all sections at default (estimate path coverage)', () => {
    // Estimate path is intrinsically different from invoice (no bank info/registration number,
    // different greeting etc.). Frozen as a separate baseline.
    const doc = makeAccountingDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('estimate-default', generateForFixture(doc, sensitive));
  });

  // ACCOUNTING の renderIssuerBlock は seal を line array に inline push する。
  // すべての issuer text fields が空 + seal だけある場合の挙動を凍結する
  // (FORMAL の "empty issuer-info + seal" と同じ意図、structural な差異の baseline 確保)。
  it('invoice-empty-issuer-with-seal: all issuer text fields null, seal present', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: {
        companyName: '',
        representativeName: '',
        address: '',
        phone: '',
        fax: null,
        sealImageBase64: TEST_SEAL,
        contactPerson: null,
      },
    });
    // sensitive=null → 登録番号も無し、bank info も無し
    compareOrUpdateFixture('invoice-empty-issuer-with-seal', generateForFixture(doc, null));
  });
});

// === P4-C-3 ACCOUNTING override branch fixtures ===
//
// SPEC §7.2 (block-by-block override + dual anchor) を実装した override branch の
// 出力を凍結する。FORMAL_STANDARD の override fixture と同じカバレッジで、ACCOUNTING
// の structure 特性 (seal が issuer-block 内 inline 挿入、bank が table-row、grid
// cell に配置時は `<table>` wrapper を介する) を担保する。
describe('ACCOUNTING override snapshot (P4-C-3)', () => {
  // Helper: full default placement reference (ACCOUNTING)
  const ACCOUNTING_DEFAULT: BlockPlacements = {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  };

  // --- Single-block move (1 block moves, others stay at legacy DOM) ---

  it('override-bank-only-bottom-right: bank moves to bottom-right, seal/notes stay (Codex iter2 #1: bank in cell uses <table> wrapper)', () => {
    // bank が moved → info-block から row が抜け、grid cell に <table> wrapper つきで配置
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-bottom-right',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-seal-only-top-left: seal moves to top-left, bank/notes stay', () => {
    // seal が moved → issuer-block から seal line が抜け、grid cell に配置
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      companyStamp: 'top-left',
    };
    compareOrUpdateFixture(
      'override-seal-only-top-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-notes-only-bottom-left: notes moves to bottom-left, bank/seal stay', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      remarks: 'bottom-left',
    };
    compareOrUpdateFixture(
      'override-notes-only-bottom-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Hidden cases (block disappears entirely) ---

  it('override-hidden-bank: bank=hidden — disappears from info-block and grid', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      bankAccount: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-bank',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-seal: seal=hidden — disappears from issuer-block and grid', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      companyStamp: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-seal',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-notes: remarks=hidden — disappears from notes-section and grid (Codex global concern: distinct from doc.notes=null which still emits the box)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      remarks: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-notes',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Preset-style multi-block override (matches §3.6 BLOCK_PLACEMENT_PRESETS) ---

  it('override-bank-focus-preset: bank=bottom-center, seal=top-right (default), remarks=top-left (preset shape, seal-stays-while-others-change)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      bankAccount: 'bottom-center',
      companyStamp: 'top-right',
      remarks: 'top-left',
    };
    compareOrUpdateFixture(
      'override-bank-focus-preset',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Same-cell stacking (multiple blocks share one cell, render order固定) ---

  it('override-same-cell-stack: bank+seal+remarks all moved to bottom-left (SAME_CELL_RENDER_ORDER fixed: bank → seal → remarks)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      bankAccount: 'bottom-left',
      companyStamp: 'bottom-left',
      remarks: 'bottom-left',
    };
    compareOrUpdateFixture(
      'override-same-cell-stack',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Estimate path: bank position is no-op (showBankInfo=false) ---

  it('estimate-bank-override-noop: estimate + bank=bottom-right has no visible effect (showBankInfo=false, override branch fragments empty)', () => {
    // ACCOUNTING テンプレで estimate を生成。bank override は showBankInfo=false で
    // 空 fragment になるため、override branch に入っても見た目は legacy と同形
    // (BLOCK_LAYOUT_GRID_CSS は inject されない、grid wrapper も出ない)。
    const doc = makeAccountingDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'estimate-bank-override-noop',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- doc.notes=null + remarks at default → empty notes box still emits ---

  it('override-bank-only-notes-null: bank moves, doc.notes=null + remarks default → empty notes-section still emits at legacy position', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const placements: BlockPlacements = {
      ...ACCOUNTING_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-notes-null',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });
});

// === Default-equivalent inputs unconditionally route to legacy branch ===
// FORMAL_STANDARD と同じ tri-state coverage を ACCOUNTING でも担保。
describe('ACCOUNTING default-equivalent inputs route to legacy (P4-C-3)', () => {
  it('undefined caller override + doc.blockPlacements=null → legacy (saved-doc fallback path)', () => {
    const doc = makeAccountingDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive); // omit blockPlacements arg
    const fixturePath = path.join(FIXTURE_DIR, 'estimate-default.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('explicit-null caller override resets doc.blockPlacements to template default (tri-state reset path)', () => {
    // FORMAL と同じ visible-override pattern: doc に companyStamp='top-left' を保存。
    // - 正しい実装なら invoice-richest.html (legacy) と一致
    // - broken 実装 (`blockPlacements ?? doc.blockPlacements`) なら override-seal-only-top-left.html
    //   と一致して fail (= test が semantics を distinguish する)
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    doc.blockPlacements = { companyStamp: 'top-left' };
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive, null); // explicit null reset

    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
    expect(generated).not.toContain('block-layout-top');
    expect(generated).not.toContain('block-layout-bottom');
  });

  it('partial-matching-default object produces identical HTML to legacy', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    // Only bank specified, matching ACCOUNTING default (top-center)
    const partialDefault: BlockPlacements = { bankAccount: 'top-center' };
    const generated = generateForFixture(doc, sensitive, partialDefault);
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('full-default-object produces identical HTML to legacy (no override CSS, no grid wrappers)', () => {
    const doc = makeAccountingDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const fullDefault: BlockPlacements = {
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'bottom-center',
    };
    const generated = generateForFixture(doc, sensitive, fullDefault);
    expect(generated).not.toContain('block-layout-top');
    expect(generated).not.toContain('block-layout-bottom');
    expect(generated).not.toContain('.block-layout-cell');
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });
});
