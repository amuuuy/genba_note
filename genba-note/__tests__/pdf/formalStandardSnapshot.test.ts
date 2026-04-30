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
import type { DocumentWithTotals, IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { BlockPlacements } from '@/types/blockPlacement';

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

/**
 * generateHtmlTemplate 経由で FORMAL_STANDARD HTML を生成する fixture-helper。
 * resolver + templateId 解決も同時に検証 (Codex P4-C-2 global concern 反映)。
 *
 * blockPlacements が未指定なら doc.blockPlacements (null) → resolveBlockPlacements で
 * FORMAL_STANDARD default に倒れ legacy branch を通る。明示指定すれば override branch
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
    templateId: 'FORMAL_STANDARD',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  return result.html;
}

describe('FORMAL_STANDARD legacy snapshot (P4-C-2-a baseline)', () => {

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

  // Codex P4-C-2-d review iter2 advisory 反映:
  // buildIssuerInfoLines が空 (issuer text 全 null) で seal だけが残るケースは
  // legacy renderIssuerHeader の "empty .issuer-info wrapper + seal" 分岐を通る。
  // shared primitive (renderIssuerInfoText) 化後も whitespace 完全一致を保つことを
  // fixture で凍結する。
  it('invoice-empty-issuer-with-seal: all issuer text fields null, seal present (empty .issuer-info edge)', () => {
    const doc = makeFormalDoc({
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
    // sensitive=null → 登録番号も無し → infoLines.length === 0 が確定
    compareOrUpdateFixture('invoice-empty-issuer-with-seal', generateForFixture(doc, null));
  });
});

// === P4-C-2-d FORMAL override branch fixtures ===
//
// SPEC §7.2 (block-by-block override + dual anchor) を実装した override branch の
// 出力を凍結する。各 fixture は「block を 1 つだけ動かす」「複数動かす」「同じ
// セルに集める」「hidden」など代表シナリオをカバーし、legacy → override の挙動
// 差分を visual / text 両面で確認できるようにする。
describe('FORMAL_STANDARD override snapshot (P4-C-2-d)', () => {
  // Helper: full default placement reference (FORMAL_STANDARD)
  const FORMAL_DEFAULT: BlockPlacements = {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  };

  // --- Single-block move (1 block moves, others stay at legacy DOM) ---

  it('override-bank-only-bottom-right: bank moves to bottom-right, seal/notes stay', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-bottom-right',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-seal-only-top-left: seal moves to top-left, bank/notes stay', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      companyStamp: 'top-left',
    };
    compareOrUpdateFixture(
      'override-seal-only-top-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-notes-only-bottom-left: notes moves to bottom-left, bank/seal stay', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      remarks: 'bottom-left',
    };
    compareOrUpdateFixture(
      'override-notes-only-bottom-left',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Hidden cases (block disappears entirely) ---

  it('override-hidden-bank: bank=hidden — disappears from info-box and grid', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      bankAccount: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-bank',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-seal: seal=hidden — disappears from header and grid', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      companyStamp: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-seal',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  it('override-hidden-notes: remarks=hidden — disappears from notes-section and grid (Codex global concern: distinct from doc.notes=null which still emits the box)', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      remarks: 'hidden',
    };
    compareOrUpdateFixture(
      'override-hidden-notes',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // --- Preset-style multi-block override (matches §3.6 BLOCK_PLACEMENT_PRESETS) ---

  it('override-bank-focus-preset: bank=bottom-center, seal=top-right (default), remarks=top-left (preset shape)', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    // bankFocus 風: bank を bottom-center に動かし remarks を top-left に動かす。
    // seal は default 維持 → header に残る (Codex iter1 notes #4: "seal-stays-while-others-change")
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
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    // 全 3 blocks を bottom-left に集める (FORMAL default とは異なる位置)。
    // SAME_CELL_RENDER_ORDER (bankAccount → companyStamp → remarks) で stack 順が固定。
    // bottom-left を選ぶ理由: FORMAL default で 3 ブロック共 bottom-left ではない
    // (bank=top-center, seal=top-right, remarks=bottom-center) ため確実に 3 つとも moved。
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
    // Codex global concern: estimate で bank position をいじっても見た目は変わらない
    // (showBankInfo=false により bank fragment が空 → grid セルに配置されない、
    // legacy info-box にも bank は出ない)。それでも override branch を通る (isDefault=false)。
    // 結果: BLOCK_LAYOUT_GRID_CSS は inject されず legacy 同形の HTML が出る。
    const doc = makeFormalDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'estimate-bank-override-noop',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });

  // Codex P4-C-4 advisory 反映: parity を fixture 同一性ではなく生成 HTML 比較で担保。
  it('estimate-bank-override-noop generates the same HTML as estimate-default (parity assertion)', () => {
    const baseDoc = makeFormalDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    const noopHtml = generateForFixture(baseDoc, sensitive, {
      ...FORMAL_DEFAULT,
      bankAccount: 'bottom-right',
    });
    const legacyDoc = makeFormalDoc({
      type: 'estimate',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const legacyHtml = generateForFixture(legacyDoc, sensitive);
    expect(normalizeHtmlForSnapshot(noopHtml)).toBe(normalizeHtmlForSnapshot(legacyHtml));
  });

  // --- doc.notes=null + remarks at default → empty notes box still emits ---

  it('override-bank-only-notes-null: bank moves, doc.notes=null + remarks default → empty notes-section still emits at legacy position', () => {
    // Codex global concern: doc.notes=null と remarks=hidden の区別を明確化。
    // remarks at default (untouched) で doc.notes=null なら legacy renderNotesSection が
    // 空 box を出力 (legacy 互換)。これに対し remarks=hidden なら notes-section 自体が消える
    // (override-hidden-notes fixture 参照)。
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
      notes: null,
    });
    const placements: BlockPlacements = {
      ...FORMAL_DEFAULT,
      bankAccount: 'bottom-right',
    };
    compareOrUpdateFixture(
      'override-bank-only-notes-null',
      generateForFixture(doc, createTestSensitiveSnapshot(), placements)
    );
  });
});

// === Default-equivalent inputs unconditionally route to legacy branch ===
// Codex iter1 notes_for_next_review #4: default-equivalent inputs は generator
// level でも確実に legacy branch を通り、override CSS / grid wrapper を一切
// emit しないことを担保する。tri-state input (undefined / null / partial /
// full default object) を網羅的にカバー。
describe('FORMAL_STANDARD default-equivalent inputs route to legacy (P4-C-2-d)', () => {
  it('undefined caller override + doc.blockPlacements=null → legacy (saved-doc fallback path)', () => {
    // caller が blockPlacements を渡さない → resolveBlockPlacements は doc.blockPlacements
    // (null) を見て template default に倒す。SPEC §3.4 lazy resolve の baseline path。
    const doc = makeFormalDoc({
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
    // SPEC §3.3.1 tri-state: caller が explicit null を渡したら、document に保存された
    // override を **無視** して template default に倒す。doc に non-default override が
    // 保存されていても caller=null なら legacy 出力になることを担保する。
    //
    // テスト設計 (Codex iter2 blocking 反映): doc.blockPlacements には **visible** な
    // override を入れる (broken `blockPlacements ?? doc.blockPlacements` 実装なら
    // override fixture と一致して fail する形に)。invoice + companyStamp='top-left' は
    // override-seal-only-top-left.html を生成する visible override で、estimate +
    // bank='bottom-right' のような showBankInfo=false の no-op とは異なる。
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    // doc に visible override を持たせる (broken 実装なら seal が top-left 移動し
    // override-seal-only-top-left.html と一致してしまう)
    doc.blockPlacements = { companyStamp: 'top-left' };
    const sensitive = createTestSensitiveSnapshot();
    const generated = generateForFixture(doc, sensitive, null); // explicit null reset

    // 正しい実装なら invoice-richest.html (legacy) と一致する (= seal が default の
    // top-right、grid wrapper 不在)。broken 実装なら override-seal-only-top-left.html
    // と一致して **この expect で fail する** (= テストが正しく distinguish できる)。
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
    // override CSS / grid wrapper が emit されないことも確認 (broken 実装なら
    // block-layout-top に seal が出てしまう)
    expect(generated).not.toContain('block-layout-top');
    expect(generated).not.toContain('block-layout-bottom');
  });

  it('partial-matching-default object produces identical HTML to legacy', () => {
    const doc = makeFormalDoc({
      type: 'invoice',
      issuerOverrides: { sealImageBase64: TEST_SEAL },
    });
    const sensitive = createTestSensitiveSnapshot();
    // Only bank specified, matching FORMAL default (top-center) — should resolve to default
    const partialDefault: BlockPlacements = { bankAccount: 'top-center' };
    const generated = generateForFixture(doc, sensitive, partialDefault);
    const fixturePath = path.join(FIXTURE_DIR, 'invoice-richest.html');
    const fixture = fs.readFileSync(fixturePath, 'utf-8');
    expect(normalizeHtmlForSnapshot(generated)).toBe(normalizeHtmlForSnapshot(fixture));
  });

  it('full-default-object produces identical HTML to legacy (no override CSS, no grid wrappers)', () => {
    const doc = makeFormalDoc({
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

describe('central guard: non-default override on unimplemented templates throws (Codex iter1 blocking)', () => {
  // 3 unimplemented templates (P4-C-4/5 で実装):
  // MODERN / CLASSIC / CONSTRUCTION
  // (FORMAL_STANDARD: P4-C-2-d、ACCOUNTING: P4-C-3、SIMPLE: P4-C-4 で実装済)
  const UNIMPLEMENTED_TEMPLATES = [
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
