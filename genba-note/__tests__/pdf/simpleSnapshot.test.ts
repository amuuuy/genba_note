/**
 * SIMPLE template legacy snapshot tests (P4-C-4 baseline freeze).
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で代替担保するための snapshot test。
 * Pre-change SIMPLE generator output を fixture として **凍結** し、
 * P4-C-4 の fragment 抽出 / override branch 配線後も diff 0 を維持することを
 * ゲートにする (FORMAL_STANDARD / ACCOUNTING と同じ pattern を適用)。
 *
 * SIMPLE 特有の挙動:
 * - renderIssuerBlock は seal を line array に inline push (ACCOUNTING と類似)
 * - renderInfoBlock は `<div class="info-row">` を rows として組み立て (FORMAL は info-box-row)
 * - renderNotesSection は doc.notes が空なら空文字を返す (FORMAL/ACCOUNTING は
 *   空でも wrapper を出すが、SIMPLE は出さない) → fixture でこの挙動を凍結
 *
 * 使い方:
 *   - 通常: `npm test __tests__/pdf/simpleSnapshot.test.ts`
 *   - fixture 更新: `UPDATE_FIXTURES=1 npm test __tests__/pdf/simpleSnapshot.test.ts`
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

const FIXTURE_DIR = path.join(__dirname, '__fixtures__', 'simple');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

// 1x1 transparent PNG (base64)
const TEST_SEAL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

const FIXED_TS = 1735603200000; // 2025-12-31T00:00:00Z

interface MakeDocInput {
  issuerOverrides?: Partial<IssuerSnapshot>;
  notes?: string | null;
  type?: 'estimate' | 'invoice';
}

function makeSimpleDoc(input: MakeDocInput = {}): DocumentWithTotals {
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
    templateId: 'SIMPLE',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  return result.html;
}

describe('SIMPLE legacy snapshot (P4-C-4 baseline)', () => {
  it('invoice-richest: invoice + bank + seal + notes (richest)', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-richest', generateForFixture(doc, sensitive));
  });

  it('invoice-no-seal: invoice with bank + notes, no seal', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: null },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-seal', generateForFixture(doc, sensitive));
  });

  it('invoice-no-bank: invoice with seal + notes, no bank (sensitive=null)', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture('invoice-no-bank', generateForFixture(doc, null));
  });

  it('invoice-no-notes: invoice with bank + seal, doc.notes=null (SIMPLE renderNotesSection returns empty string for null notes)', () => {
    // SIMPLE 特有: doc.notes が空 → renderNotesSection は空文字を返す
    // (FORMAL/ACCOUNTING は wrapper を残すが、SIMPLE は wrapper 自体出さない)
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-notes', generateForFixture(doc, sensitive));
  });

  it('estimate-default: estimate document, all sections at default', () => {
    const doc = makeSimpleDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('estimate-default', generateForFixture(doc, sensitive));
  });

  it('invoice-empty-issuer-with-seal: all issuer text fields null, seal present', () => {
    const doc = makeSimpleDoc({
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

// === P4-C-4 SIMPLE override branch fixtures ===
//
// SPEC §7.2 (block-by-block override + dual anchor) を実装した override branch
// の出力を凍結する。FORMAL/ACCOUNTING の override fixture と同じカバレッジ。
describe('SIMPLE override snapshot (P4-C-4)', () => {
  const SIMPLE_DEFAULT: BlockPlacements = {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  };

  // --- Single-block move ---

  it('override-bank-only-bottom-right: bank moves, seal/notes stay (bank in cell uses info-block wrapper)', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-bottom-right',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-seal-only-top-left: seal moves to top-left, bank/notes stay', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      companyStamp: 'top-left',
    };
    compareOrUpdateFixture(
      'override-seal-only-top-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // CSS scope regression check: `.issuer-block .issuer-seal` の scope 化が
  // legacy 復帰したらこの fixture が壊れる (P4-C-3 ACCOUNTING の同等 test)。
  it('override-seal-only-top-center: seal moves to top-center (CSS scope regression check)', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      companyStamp: 'top-center',
    };
    const generated = generateForFixture(
      doc,
      createTestSensitiveSnapshot(),
      placements
    );
    compareOrUpdateFixture('override-seal-only-top-center', generated);
    expect(generated).toContain('.issuer-block .issuer-seal');
    expect(generated).not.toMatch(/^\s*\.issuer-seal\s*\{/m);
  });

  it('override-notes-only-bottom-left: notes moves to bottom-left, bank/seal stay', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      remarks: 'bottom-left',
    };
    compareOrUpdateFixture(
      'override-notes-only-bottom-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Hidden cases ---

  it('override-hidden-bank: bank=hidden — disappears from info-block and grid', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      bankAccount: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-bank',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-seal: seal=hidden — disappears from issuer-block and grid', () => {
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      companyStamp: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-seal',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-notes: remarks=hidden — disappears from notes-section and grid', () => {
    // SIMPLE は doc.notes が空なら元から notes-section 出ないので、hidden=空 と
    // notes=null の visible 差分はない。それでも remarks=hidden は generator level
    // で notes-section を完全省略する経路を担保する (broken impl で notes が出ない
    // ことを担保)。
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      remarks: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-notes',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Preset-style multi-block override (seal-stays-while-others-change) ---

  it('override-bank-focus-preset: bank=bottom-center, seal=top-right (default), remarks=top-left', () => {
    const doc = makeSimpleDoc({
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

  // --- Same-cell stacking (SAME_CELL_RENDER_ORDER fixed) ---

  it('override-same-cell-stack: bank+seal+remarks all moved to bottom-left (SAME_CELL_RENDER_ORDER: bank → seal → remarks)', () => {
    const doc = makeSimpleDoc({
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

  it('estimate-bank-override-noop: estimate + bank=bottom-right has no visible effect', () => {
    const doc = makeSimpleDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...SIMPLE_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'estimate-bank-override-noop',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });
});

// === Default-equivalent inputs unconditionally route to legacy branch ===
describe('SIMPLE default-equivalent inputs route to legacy (P4-C-4)', () => {
  it('undefined caller override + doc.blockPlacements=null → legacy (saved-doc fallback path)', () => {
    const doc = makeSimpleDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive);
    const fixturePath = path.join(FIXTURE_DIR, 'estimate-default.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('explicit-null caller override resets doc.blockPlacements to template default (visible-override pattern)', () => {
    const doc = makeSimpleDoc({
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
    const doc = makeSimpleDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const partialDefault: BlockPlacements = { bankAccount: 'top-center' };
    const generated = generateForFixture(doc, sensitive, partialDefault);
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('full-default-object produces identical HTML to legacy (no override CSS, no grid wrappers)', () => {
    const doc = makeSimpleDoc({
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
