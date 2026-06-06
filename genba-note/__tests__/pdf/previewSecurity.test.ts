/**
 * @jest-environment jsdom
 */
/**
 * Tests for Preview Security: CSP injection, previewData validation,
 * and FIT_TO_SCREEN_SCRIPT DOM behaviour.
 *
 * Uses jsdom environment for DOM-based tests of the fit-to-screen script.
 */

import { deriveDisplayHtml, generateHtmlTemplate } from '@/pdf/pdfTemplateService';
import { validatePreviewDocument } from '@/utils/previewDataValidator';
import { injectCsp, FIT_TO_SCREEN_SCRIPT } from '@/utils/previewHtmlSecurity';
import { createTestTemplateInput, createTestDocument, resetTestIdCounter } from './helpers';

describe('Preview Security', () => {
  beforeEach(() => {
    resetTestIdCounter();
  });

  // --- CSP injection (shared function) ---

  describe('CSP injection (injectCsp)', () => {
    it('injects script-src none CSP into portrait displayHtml', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectCsp(deriveDisplayHtml(html, 'PORTRAIT'));
      expect(result.success).toBe(true);
      expect(result.html).toContain('Content-Security-Policy');
      expect(result.html).toContain("script-src 'none'");
    });

    it('injects script-src none CSP into landscape displayHtml', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectCsp(deriveDisplayHtml(html, 'LANDSCAPE'));
      expect(result.success).toBe(true);
      expect(result.html).toContain("script-src 'none'");
    });

    it('CSP meta appears before </head>', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectCsp(deriveDisplayHtml(html, 'PORTRAIT'));
      const cspIdx = result.html.indexOf("script-src 'none'");
      const headCloseIdx = result.html.indexOf('</head>');
      expect(cspIdx).toBeGreaterThan(-1);
      expect(headCloseIdx).toBeGreaterThan(-1);
      expect(cspIdx).toBeLessThan(headCloseIdx);
    });

    it('returns success=false for empty input', () => {
      const result = injectCsp('');
      expect(result.html).toBe('');
      expect(result.success).toBe(false);
    });

    it('returns success=false when no </head> tag (fail-closed)', () => {
      const noHead = '<div>no head</div>';
      const result = injectCsp(noHead);
      expect(result.html).toBe(noHead);
      expect(result.success).toBe(false);
    });

    it('handles uppercase </HEAD> (case-insensitive)', () => {
      const html = '<html><HEAD><title>Test</title></HEAD><body></body></html>';
      const result = injectCsp(html);
      expect(result.success).toBe(true);
      expect(result.html).toContain("script-src 'none'");
      const cspIdx = result.html.indexOf("script-src 'none'");
      const headCloseIdx = result.html.indexOf('</HEAD>');
      expect(cspIdx).toBeLessThan(headCloseIdx);
    });

    it('handles mixed-case </HeAd> (case-insensitive)', () => {
      const html = '<html><head></HeAd><body></body></html>';
      const result = injectCsp(html);
      expect(result.success).toBe(true);
      expect(result.html).toContain("script-src 'none'");
    });
  });

  // --- FIT_TO_SCREEN_SCRIPT DOM behaviour (jsdom) ---

  describe('FIT_TO_SCREEN_SCRIPT (DOM)', () => {
    // Pin the viewport explicitly so expectations do not depend on jsdom defaults.
    const VIEW_W = 1024;
    const VIEW_H = 768;
    const setViewport = (w: number, h: number) => {
      Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
    };
    const setBody = (scrollWidth: number, scrollHeight: number) => {
      Object.defineProperty(document.body, 'scrollWidth', { value: scrollWidth, configurable: true });
      Object.defineProperty(document.body, 'scrollHeight', { value: scrollHeight, configurable: true });
    };

    beforeEach(() => setViewport(VIEW_W, VIEW_H));

    it('height-only overflow: scales by height, keeps top center', () => {
      document.body.innerHTML = '<div class="document-container">content</div>';
      setBody(500, 1200); // width fits, height overflows → height-bound

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      const expectedScale = VIEW_H / 1200;
      expect(document.body.style.transform).toBe(`scale(${expectedScale})`);
      // Height-bound: centered preview preserved (no regression).
      expect(document.body.style.transformOrigin).toBe('top center');
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.documentElement.style.height).toBe('100vh');
    });

    it('width-only overflow: scales by width, anchors top left (no right-edge clip)', () => {
      document.body.innerHTML = '<div class="document-container">wide</div>';
      setBody(2048, 500); // width overflows, height fits → width-bound

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      const expectedScale = VIEW_W / 2048;
      expect(document.body.style.transform).toBe(`scale(${expectedScale})`);
      // Width-bound: left anchor so scaled width [0, viewW] is flush.
      expect(document.body.style.transformOrigin).toBe('top left');
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('both overflow, width-bound: uses min scale and anchors top left', () => {
      document.body.innerHTML = '<div class="document-container">big</div>';
      setBody(2048, 1200); // scaleW = 1024/2048 = 0.5 < scaleH = 768/1200 = 0.64

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      const expectedScale = Math.min(VIEW_H / 1200, VIEW_W / 2048); // 0.5 (width-bound)
      expect(document.body.style.transform).toBe(`scale(${expectedScale})`);
      expect(document.body.style.transformOrigin).toBe('top left');
    });

    it('both overflow, height-bound but width also overflows: anchors top left (no right clip)', () => {
      document.body.innerHTML = '<div class="document-container">tall</div>';
      setBody(1100, 3000); // scaleH = 768/3000 = 0.256 < scaleW = 1024/1100 ≈ 0.93, but bodyW > viewW

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      const expectedScale = Math.min(VIEW_H / 3000, VIEW_W / 1100); // height-bound min
      expect(document.body.style.transform).toBe(`scale(${expectedScale})`);
      // Width still overflows the viewport → center origin would clip the right edge.
      expect(document.body.style.transformOrigin).toBe('top left');
    });

    it('both overflow, equal scale (tie): anchors top left', () => {
      document.body.innerHTML = '<div class="document-container">square</div>';
      setBody(2048, 1536); // scaleW = 1024/2048 = 0.5 === scaleH = 768/1536 = 0.5

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      expect(document.body.style.transform).toBe('scale(0.5)');
      expect(document.body.style.transformOrigin).toBe('top left');
    });

    it('does NOT apply transform when body fits within viewport', () => {
      document.body.innerHTML = '<div>short</div>';
      setBody(500, 500);
      document.body.style.transform = '';

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      expect(document.body.style.transform).toBe('');
    });

    it('returns true (WebView injectedJavaScript contract)', () => {
      document.body.innerHTML = '<div>content</div>';
      setBody(500, 500);

      // eslint-disable-next-line no-eval
      const ret = eval(FIT_TO_SCREEN_SCRIPT);
      expect(ret).toBe(true);
    });

    afterEach(() => {
      // Reset DOM state
      document.body.innerHTML = '';
      document.body.removeAttribute('style');
      document.documentElement.removeAttribute('style');
    });
  });

  // --- validatePreviewDocument ---

  describe('validatePreviewDocument', () => {
    it('accepts a valid document', () => {
      const doc = createTestDocument();
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('estimate');
      expect(result!.clientName).toBe('テスト顧客');
    });

    it('rejects null', () => {
      expect(validatePreviewDocument(null)).toBeNull();
    });

    it('rejects non-object', () => {
      expect(validatePreviewDocument('string')).toBeNull();
      expect(validatePreviewDocument(42)).toBeNull();
    });

    it('rejects invalid type enum', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).type = 'invalid';
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects invalid status enum', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).status = 'cancelled';
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects missing clientName', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).clientName = 123;
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects missing lineItems', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).lineItems = 'not-array';
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects lineItems containing non-objects', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).lineItems = [null];
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    // --- Numeric normalisation ---

    it('normalises non-finite quantityMilli to 0', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).quantityMilli = 'NaN';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].quantityMilli).toBe(0);
    });

    it('normalises non-finite unitPrice to 0', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).unitPrice = Infinity;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].unitPrice).toBe(0);
    });

    it('normalises invalid taxRate to 10', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).taxRate = 5;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].taxRate).toBe(10);
    });

    it('preserves valid taxRate 0', () => {
      const doc = createTestDocument();
      doc.lineItems[0].taxRate = 0;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].taxRate).toBe(0);
    });

    it('preserves a string spec value', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).spec = 't=50';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].spec).toBe('t=50');
    });

    it('normalises a non-string spec to null', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).spec = 123;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].spec).toBeNull();
    });

    it('normalises an empty-string spec to null', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).spec = '';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].spec).toBeNull();
    });

    it('normalises a whitespace-only spec to null and trims a real value', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).spec = '   ';
      expect(validatePreviewDocument(doc)!.lineItems[0].spec).toBeNull();

      const doc2 = createTestDocument();
      (doc2.lineItems[0] as unknown as Record<string, unknown>).spec = '  t=50  ';
      expect(validatePreviewDocument(doc2)!.lineItems[0].spec).toBe('t=50');
    });

    it('normalises a missing spec to null', () => {
      const doc = createTestDocument();
      delete (doc.lineItems[0] as unknown as Record<string, unknown>).spec;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].spec).toBeNull();
    });

    it('normalises invalid carriedForwardAmount to null', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).carriedForwardAmount = 'bad';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.carriedForwardAmount).toBeNull();
    });

    it('normalises non-string name/unit to empty string', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).name = 123;
      (doc.lineItems[0] as unknown as Record<string, unknown>).unit = null;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].name).toBe('');
      expect(result!.lineItems[0].unit).toBe('');
    });

    it('normalises XSS payload in numeric fields', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).unitPrice = '<img onerror=alert(1)>';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].unitPrice).toBe(0);
    });

    // --- Optional string field normalisation ---

    it('normalises non-string optional fields to null', () => {
      const doc = createTestDocument();
      const d = doc as unknown as Record<string, unknown>;
      d.clientAddress = 42;
      d.subject = { malicious: true };
      d.notes = ['array'];
      d.validUntil = true;
      d.dueDate = 999;
      d.paidAt = {};
      d.customerId = 123;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.clientAddress).toBeNull();
      expect(result!.subject).toBeNull();
      expect(result!.notes).toBeNull();
      expect(result!.validUntil).toBeNull();
      expect(result!.dueDate).toBeNull();
      expect(result!.paidAt).toBeNull();
      expect(result!.customerId).toBeNull();
    });

    it('preserves valid optional string fields', () => {
      const doc = createTestDocument();
      const d = doc as unknown as Record<string, unknown>;
      d.clientAddress = '東京都';
      d.subject = '工事件名';
      d.notes = '備考';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.clientAddress).toBe('東京都');
      expect(result!.subject).toBe('工事件名');
      expect(result!.notes).toBe('備考');
    });

    it('normalises non-string id to empty string', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).id = 12345;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('');
    });

    it('normalises non-string lineItem id to empty string', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).id = null;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].id).toBe('');
    });

    it('normalises non-finite createdAt/updatedAt to current time', () => {
      const doc = createTestDocument();
      const d = doc as unknown as Record<string, unknown>;
      d.createdAt = 'bad';
      d.updatedAt = NaN;
      const before = Date.now();
      const result = validatePreviewDocument(doc);
      const after = Date.now();
      expect(result).not.toBeNull();
      expect(result!.createdAt).toBeGreaterThanOrEqual(before);
      expect(result!.createdAt).toBeLessThanOrEqual(after);
      expect(result!.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result!.updatedAt).toBeLessThanOrEqual(after);
    });

    it('does not pass through unknown extra fields', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).__proto_pollute__ = 'evil';
      (doc as unknown as Record<string, unknown>).extraField = { dangerous: true };
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect((result as unknown as Record<string, unknown>).__proto_pollute__).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).extraField).toBeUndefined();
    });

    // --- issuerSnapshot normalisation ---

    it('normalises missing issuerSnapshot to safe defaults', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).issuerSnapshot = undefined;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.issuerSnapshot).toEqual({
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      });
    });

    it('normalises non-string issuerSnapshot fields to null', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).issuerSnapshot = {
        companyName: 123,
        representativeName: true,
        address: 'valid address',
        phone: null,
        fax: undefined,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.issuerSnapshot.companyName).toBeNull();
      expect(result!.issuerSnapshot.representativeName).toBeNull();
      expect(result!.issuerSnapshot.address).toBe('valid address');
    });

    it('does not share issuerSnapshot reference between calls (no mutation leak)', () => {
      const doc1 = createTestDocument();
      (doc1 as unknown as Record<string, unknown>).issuerSnapshot = undefined;
      const doc2 = createTestDocument();
      (doc2 as unknown as Record<string, unknown>).issuerSnapshot = undefined;

      const result1 = validatePreviewDocument(doc1);
      const result2 = validatePreviewDocument(doc2);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      // Must be structurally equal but distinct references
      expect(result1!.issuerSnapshot).toEqual(result2!.issuerSnapshot);
      expect(result1!.issuerSnapshot).not.toBe(result2!.issuerSnapshot);
    });
  });
});
