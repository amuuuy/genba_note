/**
 * useDocumentPreviewHtml Pure Function Tests (SPEC §6.3).
 *
 * testEnvironment:'node' なので renderHook は使えない。useDocumentEdit と
 * 同じパターンで hook 内部の pure function を抽出してテストする。
 *
 * Hook 自体は preview.tsx と P5 BlockPlacementModal で共用される shared
 * rendering pipeline。本テストでは以下の pure helper を検証:
 *   - resolveTemplateIdFromSettings()
 *   - buildPdfTemplateInput()
 *   - buildWebViewHtml()
 */

// Mock dependencies before imports
jest.mock('@/domain/document', () => ({
  getDocument: jest.fn(),
}));

jest.mock('@/storage/asyncStorageService', () => ({
  getSettings: jest.fn(),
}));

jest.mock('@/pdf/issuerResolverService', () => ({
  resolveIssuerInfo: jest.fn(),
}));

jest.mock('@/utils/imageUtils', () => ({
  resolveBackgroundImageDataUrl: jest.fn(),
}));

import {
  resolveTemplateIdFromSettings,
  buildPdfTemplateInput,
  buildWebViewHtml,
} from '@/hooks/useDocumentPreviewHtml';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import type { DocumentWithTotals } from '@/types/document';
import type { BlockPlacements } from '@/types/blockPlacement';

describe('resolveTemplateIdFromSettings — settings + override resolution', () => {
  it('uses templateIdOverride if provided (overrides settings)', () => {
    const id = resolveTemplateIdFromSettings(
      'estimate',
      { ...DEFAULT_APP_SETTINGS, defaultEstimateTemplateId: 'CONSTRUCTION' },
      'MODERN'
    );
    expect(id).toBe('MODERN');
  });

  it('falls back to settings.defaultEstimateTemplateId for estimate', () => {
    const id = resolveTemplateIdFromSettings(
      'estimate',
      { ...DEFAULT_APP_SETTINGS, defaultEstimateTemplateId: 'CONSTRUCTION' },
      undefined
    );
    expect(id).toBe('CONSTRUCTION');
  });

  it('falls back to settings.defaultInvoiceTemplateId for invoice', () => {
    const id = resolveTemplateIdFromSettings(
      'invoice',
      { ...DEFAULT_APP_SETTINGS, defaultInvoiceTemplateId: 'MODERN' },
      undefined
    );
    expect(id).toBe('MODERN');
  });

  it('falls back to FORMAL_STANDARD when settings is null and type=estimate', () => {
    const id = resolveTemplateIdFromSettings('estimate', null, undefined);
    expect(id).toBe('FORMAL_STANDARD');
  });

  it('falls back to ACCOUNTING when settings is null and type=invoice', () => {
    const id = resolveTemplateIdFromSettings('invoice', null, undefined);
    expect(id).toBe('ACCOUNTING');
  });
});

describe('buildPdfTemplateInput — collects all overrides into PdfTemplateInput shape', () => {
  function makeDoc(): DocumentWithTotals {
    return {
      id: 'doc-1',
      documentNo: 'EST-001',
      type: 'estimate',
      status: 'draft',
      clientName: 'C',
      clientAddress: null,
      customerId: null,
      subject: null,
      issueDate: '2026-01-30',
      validUntil: null,
      dueDate: null,
      paidAt: null,
      lineItems: [],
      carriedForwardAmount: null,
      notes: null,
      issuerSnapshot: {
        companyName: null,
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
      blockPlacements: null,
      lineItemsCalculated: [],
      subtotalYen: 0,
      taxYen: 0,
      totalYen: 0,
      taxBreakdown: [],
    };
  }

  it('includes mode:pdf and the resolved templateId', () => {
    const doc = makeDoc();
    const input = buildPdfTemplateInput(doc, null, 'MODERN', {
      sealSize: 'LARGE',
      backgroundDesign: 'NONE',
      backgroundImageDataUrl: null,
      blockPlacements: null,
    });
    expect(input.mode).toBe('pdf');
    expect(input.templateId).toBe('MODERN');
    expect(input.document).toBe(doc);
  });

  it('passes through sealSize / backgroundDesign / backgroundImageDataUrl', () => {
    const doc = makeDoc();
    const input = buildPdfTemplateInput(doc, null, 'FORMAL_STANDARD', {
      sealSize: 'SMALL',
      backgroundDesign: 'STRIPE',
      backgroundImageDataUrl: 'data:image/png;base64,abc',
      blockPlacements: null,
    });
    expect(input.sealSize).toBe('SMALL');
    expect(input.backgroundDesign).toBe('STRIPE');
    expect(input.backgroundImageDataUrl).toBe('data:image/png;base64,abc');
  });

  it('passes blockPlacements override (P4 で resolveBlockPlacements 配線するための入力)', () => {
    const doc = makeDoc();
    const override: BlockPlacements = { bankAccount: 'top-left' };
    const input = buildPdfTemplateInput(doc, null, 'FORMAL_STANDARD', {
      sealSize: 'MEDIUM',
      backgroundDesign: 'NONE',
      backgroundImageDataUrl: null,
      blockPlacements: override,
    });
    expect(input.blockPlacements).toEqual(override);
  });
});

describe('buildWebViewHtml — applies orientation + CSP injection', () => {
  // Minimal valid HTML (must contain </head> for injectCsp to succeed).
  const baseHtml = '<html><head><meta charset="utf-8"></head><body><div class="document-container">x</div></body></html>';

  it('returns {html:null, cspApplied:false} for empty input', () => {
    expect(buildWebViewHtml('', 'PORTRAIT')).toEqual({ html: null, cspApplied: false });
  });

  it('produces a non-empty string with cspApplied=true when </head> present', () => {
    const result = buildWebViewHtml(baseHtml, 'PORTRAIT');
    expect(result.html).not.toBeNull();
    expect(typeof result.html).toBe('string');
    expect(result.html!.length).toBeGreaterThan(baseHtml.length); // CSP injected
    expect(result.cspApplied).toBe(true);
  });

  it('returns cspApplied=false (fail-closed) when </head> is missing', () => {
    const malformed = '<html><body><div>x</div></body></html>';
    const result = buildWebViewHtml(malformed, 'PORTRAIT');
    expect(result.html).not.toBeNull();
    expect(result.cspApplied).toBe(false); // signals caller to disable JS
  });

  it('produces a different html for landscape vs portrait (orientation effect)', () => {
    const portrait = buildWebViewHtml(baseHtml, 'PORTRAIT');
    const landscape = buildWebViewHtml(baseHtml, 'LANDSCAPE');
    expect(portrait.html).not.toBe(landscape.html);
  });

  it('contains CSP meta in output (defence-in-depth)', () => {
    const out = buildWebViewHtml(baseHtml, 'PORTRAIT');
    expect(out.html).toContain('Content-Security-Policy');
  });
});
