/**
 * MODERN template legacy snapshot tests (P4-C-5 baseline freeze).
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で代替担保。
 * MODERN 特有の挙動:
 * - renderIssuer は FORMAL に類似 (seal は flexbox 隣で別レンダリング)
 * - bank-section / notes-section は独立 section (subject/period は client / meta に固定)
 * - renderNotes は SIMPLE と同じく doc.notes 空なら空文字
 * - default placement: bankAccount='bottom-center', companyStamp='top-right',
 *   remarks='bottom-center' (bank と remarks が同 cell default)
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

const FIXTURE_DIR = path.join(__dirname, '__fixtures__', 'modern');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const TEST_SEAL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

const FIXED_TS = 1735603200000;

interface MakeDocInput {
  issuerOverrides?: Partial<IssuerSnapshot>;
  notes?: string | null;
  type?: 'estimate' | 'invoice';
}

function makeModernDoc(input: MakeDocInput = {}): DocumentWithTotals {
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

function generateForFixture(
  doc: DocumentWithTotals,
  sensitive: SensitiveIssuerSnapshot | null,
  blockPlacements?: BlockPlacements | null
): string {
  const result = generateHtmlTemplate({
    document: doc,
    sensitiveSnapshot: sensitive,
    mode: 'pdf',
    templateId: 'MODERN',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  return result.html;
}

describe('MODERN legacy snapshot (P4-C-5 baseline)', () => {
  it('invoice-richest: invoice + bank + seal + notes (richest)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-richest', generateForFixture(doc, sensitive));
  });

  it('invoice-no-seal: invoice with bank + notes, no seal', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: null },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-seal', generateForFixture(doc, sensitive));
  });

  it('invoice-no-bank: invoice with seal + notes, no bank (sensitive=null)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture('invoice-no-bank', generateForFixture(doc, null));
  });

  it('invoice-no-notes: invoice with bank + seal, doc.notes=null (MODERN: notes-section omitted entirely)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-notes', generateForFixture(doc, sensitive));
  });

  it('estimate-default: estimate document, all sections at default', () => {
    const doc = makeModernDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('estimate-default', generateForFixture(doc, sensitive));
  });

  it('invoice-empty-issuer-with-seal: all issuer text fields null, seal present', () => {
    const doc = makeModernDoc({
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
    compareOrUpdateFixture('invoice-empty-issuer-with-seal', generateForFixture(doc, null));
  });
});

// === P4-C-5 MODERN override branch fixtures ===
// MODERN default: bank='bottom-center', seal='top-right', remarks='bottom-center'
// (FORMAL/ACCOUNTING/SIMPLE/CLASSIC とは bank の default が異なる点に注意)
describe('MODERN override snapshot (P4-C-5)', () => {
  const MODERN_DEFAULT: BlockPlacements = {
    bankAccount: 'bottom-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  };

  // --- Single-block move ---

  it('override-bank-only-bottom-right: bank moves bottom-right (default bottom-center)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-bottom-right',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-seal-only-top-left: seal moves to top-left, bank/notes stay', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      companyStamp: 'top-left',
    };
    compareOrUpdateFixture(
      'override-seal-only-top-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-notes-only-bottom-left: notes moves bottom-left (default bottom-center)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      remarks: 'bottom-left',
    };
    compareOrUpdateFixture(
      'override-notes-only-bottom-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Hidden cases ---

  it('override-hidden-bank: bank=hidden — disappears', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      bankAccount: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-bank',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-seal: seal=hidden — disappears', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      companyStamp: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-seal',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-notes: remarks=hidden — disappears', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      remarks: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-notes',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Preset-style multi-block override (seal-stays-while-others-change) ---

  it('override-bank-focus-preset: bank=top-center (moved), seal=top-right (default), remarks=top-left (moved)', () => {
    // MODERN default で seal='top-right' なので「seal-stays-while-others-change」を表現
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      bankAccount: 'top-center',
      companyStamp: 'top-right',
      remarks: 'top-left',
    };
    compareOrUpdateFixture(
      'override-bank-focus-preset',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Same-cell stacking ---

  it('override-same-cell-stack: bank+seal+remarks all moved to top-left (SAME_CELL_RENDER_ORDER)', () => {
    // top-left を選ぶ理由: MODERN default で 3 ブロックとも top-left ではない
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      bankAccount: 'top-left',
      companyStamp: 'top-left',
      remarks: 'top-left',
    };
    compareOrUpdateFixture(
      'override-same-cell-stack',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Estimate path: bank position is no-op ---

  it('estimate-bank-override-noop: estimate + bank=bottom-right has no visible effect', () => {
    const doc = makeModernDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'estimate-bank-override-noop',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('estimate-bank-override-noop generates the same HTML as estimate-default (parity assertion)', () => {
    const baseDoc = makeModernDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const noopHtml = generateForFixture(baseDoc, sensitive, {
      ...MODERN_DEFAULT,
      bankAccount: 'bottom-right',
    });
    const legacyDoc = makeModernDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const legacyHtml = generateForFixture(legacyDoc, sensitive);
    expect(normalizeHtmlForSnapshot(noopHtml)).toBe(normalizeHtmlForSnapshot(legacyHtml));
  });

  // doc.notes=null + remarks at default → notes-section omitted (MODERN: notes 空なら出さない)
  it('override-bank-only-notes-null: bank moves, doc.notes=null + remarks default → notes-section absent (SIMPLE と同 pattern)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const placements: BlockPlacements = {
      ...MODERN_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-notes-null',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });
});

// === Default-equivalent inputs unconditionally route to legacy branch ===
describe('MODERN default-equivalent inputs route to legacy (P4-C-5)', () => {
  it('undefined caller override + doc.blockPlacements=null → legacy', () => {
    const doc = makeModernDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive);
    const fixturePath = path.join(FIXTURE_DIR, 'estimate-default.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('explicit-null caller override resets doc.blockPlacements to template default', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    doc.blockPlacements = { companyStamp: 'top-left' };
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive, null);
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
    expect(generated).not.toContain('block-layout-top');
    expect(generated).not.toContain('block-layout-bottom');
  });

  it('partial-matching-default object produces identical HTML to legacy', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    // MODERN default の bank='bottom-center' に一致
    const partialDefault: BlockPlacements = { bankAccount: 'bottom-center' };
    const generated = generateForFixture(doc, sensitive, partialDefault);
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('full-default-object produces identical HTML to legacy (no override CSS, no grid wrappers)', () => {
    const doc = makeModernDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const fullDefault: BlockPlacements = {
      bankAccount: 'bottom-center',
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
