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

  // Codex P4-C-1 review iter2 反映: inter-tag whitespace は文脈依存
  // (block / inline / inline-text 境界) で削除すると false negative。
  // template generator は deterministic なので完全保持で問題ない。
  it('preserves whitespace inside text nodes (e.g. 全角空白)', () => {
    const input = '<span>見　積　書</span>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<span>見　積　書</span>');
  });

  it('preserves single space between inline siblings (rendering-significant)', () => {
    const input = '<span>a</span> <span>b</span>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<span>a</span> <span>b</span>');
  });

  // 改行を含む inter-tag whitespace も保持する (inline 文脈では空白として描画され得る)
  it('preserves newline between inline-context tags (also rendering-significant)', () => {
    const input = '<span>a</span>\n<span>b</span>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<span>a</span>\n<span>b</span>');
  });

  it('preserves block-level newline + indent verbatim (no cosmetic collapse)', () => {
    const input = '<div>a</div>\n  <div>b</div>';
    expect(normalizeHtmlForSnapshot(input)).toBe('<div>a</div>\n  <div>b</div>');
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
  it('treats HTML comment removal as cosmetic (equivalent)', () => {
    const a = '<div><!-- comment --><span>x</span></div>';
    const b = '<div><span>x</span></div>';
    expect(htmlEquals(a, b)).toBe(true);
  });

  it('returns false when meaningful content differs', () => {
    const a = '<div><span>x</span></div>';
    const b = '<div><span>y</span></div>';
    expect(htmlEquals(a, b)).toBe(false);
  });

  // Codex P4-C-1 iter1 blocking 回帰: inline sibling 半角空白あり/なし は rendering-significant
  it('inline sibling with single space ≠ without space (false-negative regression guard)', () => {
    expect(htmlEquals('<span>a</span> <span>b</span>', '<span>a</span><span>b</span>')).toBe(false);
  });

  // Codex P4-C-1 iter2 blocking 回帰: 改行を含む inter-tag whitespace も rendering-significant
  it('inline sibling with newline ≠ without whitespace (false-negative regression guard)', () => {
    expect(htmlEquals('<span>a</span>\n<span>b</span>', '<span>a</span><span>b</span>')).toBe(false);
  });

  it('inline sibling with newline + indent ≠ without whitespace', () => {
    expect(htmlEquals('<span>a</span>\n  <span>b</span>', '<span>a</span><span>b</span>')).toBe(false);
  });

  // inline-text 境界も同様 (text → inline tag に切り替わる位置の whitespace)
  it('inline-text boundary: newline ≠ no whitespace', () => {
    expect(htmlEquals('<span>a</span>\ntext', '<span>a</span>text')).toBe(false);
  });
});
