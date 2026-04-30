/**
 * FORMAL_STANDARD legacy snapshot tests (P4-C-2-a baseline freeze).
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で代替担保するための snapshot test。
 * Pre-change FORMAL generator output を fixture として **凍結** し、
 * P4-C-2-c の legacy branch 配線後も diff 0 を維持することをゲートにする。
 *
 * Codex P4-C-2 設計判断 / global concerns 反映:
 * - fixture は refactor 前の generator output から生成 (P4-C-2-a)
 * - parity test は generateHtmlTemplate() 経由で resolver+templateId も検証
 * - HTML 正規化は最小限 (コメント除去 + outer trim のみ、inter-tag whitespace 保持)
 * - omission cases (no-seal / no-bank / no-notes / minimal) も全部カバー
 *
 * 使い方:
 *   - 通常: `npm test __tests__/pdf/formalStandardSnapshot.test.ts`
 *     → fixture と一致しなければ FAIL
 *   - fixture 更新: `UPDATE_FIXTURES=1 npm test __tests__/pdf/formalStandardSnapshot.test.ts`
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
import type { DocumentWithTotals, IssuerSnapshot } from '@/types/document';

const FIXTURE_DIR = path.join(__dirname, '__fixtures__', 'formalStandard');
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

function makeFormalDoc(input: MakeDocInput = {}): DocumentWithTotals {
  resetTestIdCounter();
  return createTestDocumentWithTotals({
    id: 'fixture-doc-1',
    type: input.type ?? 'estimate',
    documentNo: input.type === 'invoice' ? 'INV-001' : 'EST-001',
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

describe('FORMAL_STANDARD legacy snapshot (P4-C-2-a baseline)', () => {
  // generateHtmlTemplate 経由で生成 → resolver+templateId 解決も同時に検証
  // (Codex P4-C-2 global concern 反映)
  function generateForFixture(doc: DocumentWithTotals, sensitive: ReturnType<typeof createTestSensitiveSnapshot> | null): string {
    const result = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: sensitive,
      mode: 'pdf',
      templateId: 'FORMAL_STANDARD',
      sealSize: 'MEDIUM',
      backgroundDesign: 'NONE',
      // blockPlacements は未指定 → doc.blockPlacements (null) → resolveBlockPlacements で
      // FORMAL_STANDARD default (top-center / top-right / bottom-center) に倒れる
      // → P4-C-2-c の legacy branch (= 旧コード完全実行) を通る
    });
    return result.html;
  }

  // Codex P4-C-2 review iter1 blocking 修正:
  // FORMAL は invoice でのみ bank info / 登録番号を出力するため、bank coverage cases
  // は invoice document を使う。estimate も別途 1 ケース確保して経路差を担保。
  it('invoice-richest: invoice + bank + seal + notes (richest, materially affects HTML)', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-richest', generateForFixture(doc, sensitive));
  });

  it('invoice-no-seal: invoice with bank + notes, no seal (seal extraction omission case)', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: null },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('invoice-no-seal', generateForFixture(doc, sensitive));
  });

  it('invoice-no-bank: invoice with seal + notes, no bank (bank extraction omission case)', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    // sensitive=null → renderInfoBox 内 hasBankInfo→false → bank rows omitted
    compareOrUpdateFixture('invoice-no-bank', generateForFixture(doc, null));
  });

  it('invoice-no-notes: invoice with bank + seal, doc.notes=null (notes wrapper still emits empty)', () => {
    // Note: renderNotesSection() always emits the notes wrapper even when doc.notes is null.
    // This fixture freezes that pre-change behavior so P4-C-2-d extraction does not silently change it.
    const doc = makeFormalDoc({
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
    const doc = makeFormalDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('estimate-default', generateForFixture(doc, sensitive));
  });
});

// Codex P4-C-2 review iter1 blocking 反映:
// 全テンプレで non-default override が fail-fast することを担保 (P4-C-2-c stub
// + 中央 generateHtmlTemplate guard の二重防御)。
describe('FORMAL_STANDARD non-default override stub (P4-C-2-c)', () => {
  it('throws when blockPlacements resolves to non-default (fails fast)', () => {
    const doc = makeFormalDoc({ type: 'invoice' });
    expect(() =>
      generateHtmlTemplate({
        document: doc,
        sensitiveSnapshot: createTestSensitiveSnapshot(),
        mode: 'pdf',
        templateId: 'FORMAL_STANDARD',
        sealSize: 'MEDIUM',
        backgroundDesign: 'NONE',
        // partial override that diverges from FORMAL default (top-center)
        blockPlacements: { bankAccount: 'bottom-right' },
      })
    ).toThrow();
  });
});

describe('central guard: non-default override on unimplemented templates throws (Codex iter1 blocking)', () => {
  // 5 unimplemented templates (P4-C-3 以降で実装):
  // ACCOUNTING / SIMPLE / MODERN / CLASSIC / CONSTRUCTION
  const UNIMPLEMENTED_TEMPLATES = [
    'ACCOUNTING',
    'SIMPLE',
    'MODERN',
    'CLASSIC',
    'CONSTRUCTION',
  ] as const;

  it.each(UNIMPLEMENTED_TEMPLATES)(
    '%s rejects non-default blockPlacements with explicit error',
    (templateId) => {
      const doc = makeFormalDoc({ type: 'invoice' });
      expect(() =>
        generateHtmlTemplate({
          document: doc,
          sensitiveSnapshot: createTestSensitiveSnapshot(),
          mode: 'pdf',
          templateId,
          sealSize: 'MEDIUM',
          backgroundDesign: 'NONE',
          // diverge from each template's default to force the guard
          blockPlacements: {
            bankAccount: 'top-left',
            companyStamp: 'bottom-left',
            remarks: 'top-right',
          },
        })
      ).toThrow(/does not yet support non-default blockPlacements override/);
    }
  );

  it.each(UNIMPLEMENTED_TEMPLATES)(
    '%s still works for default placement (legacy path unaffected)',
    (templateId) => {
      const doc = makeFormalDoc({ type: 'invoice' });
      expect(() =>
        generateHtmlTemplate({
          document: doc,
          sensitiveSnapshot: createTestSensitiveSnapshot(),
          mode: 'pdf',
          templateId,
          sealSize: 'MEDIUM',
          backgroundDesign: 'NONE',
          // blockPlacements undefined → resolves to template default → legacy path
        })
      ).not.toThrow();
    }
  );
});
