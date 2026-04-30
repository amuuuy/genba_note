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
