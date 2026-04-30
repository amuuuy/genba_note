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

  it('all-present: seal + bank + notes — richest case (Codex recommends RED/GREEN starts here)', () => {
    const doc = makeFormalDoc({
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('all-present', generateForFixture(doc, sensitive));
  });

  it('no-seal: bank + notes only (omission case)', () => {
    const doc = makeFormalDoc({
      issuerOverrides: { sealImageBase64: null },
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('no-seal', generateForFixture(doc, sensitive));
  });

  it('no-bank: seal + notes only (omission case)', () => {
    const doc = makeFormalDoc({
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    compareOrUpdateFixture('no-bank', generateForFixture(doc, null));
  });

  it('no-notes: seal + bank only (omission case)', () => {
    const doc = makeFormalDoc({
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const sensitive = createTestSensitiveSnapshot();
    compareOrUpdateFixture('no-notes', generateForFixture(doc, sensitive));
  });

  it('minimal: all 3 omitted (most spartan case)', () => {
    const doc = makeFormalDoc({
      issuerOverrides: { sealImageBase64: null },
      notes: null,
    });
    compareOrUpdateFixture('minimal', generateForFixture(doc, null));
  });
});
