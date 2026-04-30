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

  it('collapses inter-tag whitespace that contains newline + indent (cosmetic)', () => {
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

  // Codex P4-C-1 review iter1 blocking 回帰テスト:
  // inline sibling 間の半角空白は rendering-significant なので保持する。
  // 全削除すると inline 描画で隙間が消えて pixel diff 0 ゲートが false negative になる。
  it('preserves single space between inline siblings (rendering-significant whitespace)', () => {
    const input = '<span>a</span> <span>b</span>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<span>a</span> <span>b</span>');
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

  // Codex P4-C-1 review iter1 blocking 回帰テスト (boundary):
  // inline sibling 間の半角空白は rendering-significant なので、
  // 「半角空白あり」と「なし」は別物と判定すべき (false negative 防止)。
  it('inline sibling with single space ≠ without space (false-negative regression guard)', () => {
    const withSpace = '<span>a</span> <span>b</span>';
    const withoutSpace = '<span>a</span><span>b</span>';
    expect(htmlEquals(withSpace, withoutSpace)).toBe(false);
  });

  // 補完: 改行 + indent は cosmetic として等しく扱う (block-level formatting)
  it('block-level newline + indent between tags is cosmetic (treated equal)', () => {
    const a = '<div>a</div>\n  <div>b</div>';
    const b = '<div>a</div><div>b</div>';
    expect(htmlEquals(a, b)).toBe(true);
  });
});
