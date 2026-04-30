/**
 * CONSTRUCTION template legacy + override snapshot tests (P4-C-5).
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で代替担保。
 * CONSTRUCTION 特有:
 * - renderIssuerBlock は seal を flexbox の隣に配置 (FORMAL/MODERN に類似)
 * - bank-section / notes-section は独立 section
 * - renderNotesSection は notes 空でも wrapper を出す (FORMAL/ACCOUNTING/CLASSIC と同じ)
 * - default placement: bankAccount='bottom-center', companyStamp='top-right',
 *   remarks='bottom-center' (MODERN と同じ default)
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

const FIXTURE_DIR = path.join(__dirname, '__fixtures__', 'construction');
const UPDATE = process.env.UPDATE_FIXTURES === '1';

const TEST_SEAL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

const FIXED_TS = 1735603200000;

const CONSTRUCTION_DEFAULT: BlockPlacements = {
  bankAccount: 'bottom-center',
  companyStamp: 'top-right',
  remarks: 'bottom-center',
};

interface MakeDocInput {
  issuerOverrides?: Partial<IssuerSnapshot>;
  notes?: string | null;
  type?: 'estimate' | 'invoice';
}

function makeConstructionDoc(input: MakeDocInput = {}): DocumentWithTotals {
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
    templateId: 'CONSTRUCTION',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  return result.html;
}

describe('CONSTRUCTION legacy snapshot (P4-C-5 baseline)', () => {
  it('invoice-richest', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture('invoice-richest', generateForFixture(doc, createTestSensitiveSnapshot()));
  });

  it('invoice-no-seal', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: null },
    });
    compareOrUpdateFixture('invoice-no-seal', generateForFixture(doc, createTestSensitiveSnapshot()));
  });

  it('invoice-no-bank', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture('invoice-no-bank', generateForFixture(doc, null));
  });

  it('invoice-no-notes (CONSTRUCTION: notes wrapper still emits empty)', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    compareOrUpdateFixture('invoice-no-notes', generateForFixture(doc, createTestSensitiveSnapshot()));
  });

  it('estimate-default', () => {
    const doc = makeConstructionDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture('estimate-default', generateForFixture(doc, createTestSensitiveSnapshot()));
  });

  it('invoice-empty-issuer-with-seal', () => {
    const doc = makeConstructionDoc({
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

// === P4-C-5 CONSTRUCTION override branch fixtures ===
describe('CONSTRUCTION override snapshot (P4-C-5)', () => {
  it('override-bank-only-bottom-right', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-bank-only-bottom-right',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        bankAccount: 'bottom-right',
      })
    );
  });

  it('override-seal-only-top-left', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-seal-only-top-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        companyStamp: 'top-left',
      })
    );
  });

  it('override-notes-only-bottom-left', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-notes-only-bottom-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        remarks: 'bottom-left',
      })
    );
  });

  it('override-hidden-bank', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-hidden-bank',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        bankAccount: 'hidden',
      })
    );
  });

  it('override-hidden-seal', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-hidden-seal',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        companyStamp: 'hidden',
      })
    );
  });

  it('override-hidden-notes', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-hidden-notes',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        remarks: 'hidden',
      })
    );
  });

  it('override-bank-focus-preset (bank moved + remarks moved + seal default)', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-bank-focus-preset',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        bankAccount: 'top-center',
        companyStamp: 'top-right',
        remarks: 'top-left',
      })
    );
  });

  it('override-same-cell-stack (top-left に 3 ブロック集約、SAME_CELL_RENDER_ORDER)', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'override-same-cell-stack',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        bankAccount: 'top-left',
        companyStamp: 'top-left',
        remarks: 'top-left',
      })
    );
  });

  it('estimate-bank-override-noop (showBankInfo=false で grid 不在)', () => {
    const doc = makeConstructionDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture(
      'estimate-bank-override-noop',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        bankAccount: 'bottom-right',
      })
    );
  });

  it('estimate-bank-override-noop generates the same HTML as estimate-default (parity assertion)', () => {
    const baseDoc = makeConstructionDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const noopHtml = generateForFixture(baseDoc, sensitive, {
      ...CONSTRUCTION_DEFAULT,
      bankAccount: 'bottom-right',
    });
    const legacyDoc = makeConstructionDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const legacyHtml = generateForFixture(legacyDoc, sensitive);
    expect(normalizeHtmlForSnapshot(noopHtml)).toBe(normalizeHtmlForSnapshot(legacyHtml));
  });

  // doc.notes=null + remarks at default → empty notes box still emits (CONSTRUCTION 互換)
  it('override-bank-only-notes-null (doc.notes=null + remarks default → empty notes-section emits)', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    compareOrUpdateFixture(
      'override-bank-only-notes-null',
      generateForFixture(doc, createTestSensitiveSnapshot(), {
        ...CONSTRUCTION_DEFAULT,
        bankAccount: 'bottom-right',
      })
    );
  });

  // empty issuer + moved seal の edge (P4-C-5 MODERN advisory と同 pattern)
  it('override-empty-issuer-with-moved-seal (legacy issuer absent + seal in grid cell)', () => {
    const doc = makeConstructionDoc({
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
    compareOrUpdateFixture(
      'override-empty-issuer-with-moved-seal',
      generateForFixture(doc, null, {
        ...CONSTRUCTION_DEFAULT,
        companyStamp: 'top-left',
      })
    );
  });
});

describe('CONSTRUCTION default-equivalent inputs route to legacy (P4-C-5)', () => {
  it('undefined caller override → legacy', () => {
    const doc = makeConstructionDoc({
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
    const doc = makeConstructionDoc({
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

  it('partial-matching-default object', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const partialDefault: BlockPlacements = { bankAccount: 'bottom-center' };
    const generated = generateForFixture(doc, sensitive, partialDefault);
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('full-default-object (no override CSS, no grid wrappers)', () => {
    const doc = makeConstructionDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive, CONSTRUCTION_DEFAULT);
    expect(generated).not.toContain('block-layout-top');
    expect(generated).not.toContain('block-layout-bottom');
    expect(generated).not.toContain('.block-layout-cell');
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });
});
