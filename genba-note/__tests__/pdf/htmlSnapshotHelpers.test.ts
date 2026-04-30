/**
 * Tests for HTML snapshot helpers (P4-C-1 foundation).
 */

import {
  normalizeHtmlForSnapshot,
  htmlEquals,
} from './__helpers__/htmlSnapshot';

describe('normalizeHtmlForSnapshot', () => {
  it('removes single-line HTML comments', () => {
    const input = '<div><!-- comment -->content</div>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<div>content</div>');
  });

  it('removes multi-line HTML comments (with newlines inside)', () => {
    const input = '<div><!-- this is\na multi-line\ncomment -->x</div>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<div>x</div>');
  });

  it('collapses inter-tag whitespace (newlines and indentation between tags)', () => {
    const input = `<div>
      <span>x</span>
      <span>y</span>
    </div>`;
    expect(normalizeHtmlForSnapshot(input)).toBe('<div><span>x</span><span>y</span></div>');
  });

  it('preserves whitespace inside text nodes (e.g. 全角空白)', () => {
    const input = '<span>見　積　書</span>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<span>見　積　書</span>');
  });

  it('preserves significant single space inside attributes', () => {
    const input = '<div class="a b c">x</div>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<div class="a b c">x</div>');
  });

  it('trims leading and trailing whitespace from the document', () => {
    const input = '  \n  <div>x</div>  \n  ';
    expect(normalizeHtmlForSnapshot(input)).toBe('<div>x</div>');
  });
});

describe('htmlEquals', () => {
  it('returns true for cosmetically different but equivalent HTML', () => {
    const a = `<div>
      <!-- this comment is fine -->
      <span>x</span>
    </div>`;
    const b = '<div><span>x</span></div>';
    expect(htmlEquals(a, b)).toBe(true);
  });

  it('returns false when meaningful content differs', () => {
    const a = '<div><span>x</span></div>';
    const b = '<div><span>y</span></div>';
    expect(htmlEquals(a, b)).toBe(false);
  });
});
