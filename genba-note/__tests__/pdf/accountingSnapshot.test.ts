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
