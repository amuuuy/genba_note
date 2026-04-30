/**
 * HTML snapshot helpers for P4-C grid wrapper regression tests.
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で検証するための代替手段。
 * - 実 PDF の pixel diff は P4-D で Yuma 実機テスト
 * - jest 内では HTML 正規化後の文字列完全一致を P4-C ゲートとする
 *
 * 正規化方針 (Codex P4-C-1 review iter2 で確定):
 * - HTML コメントのみ除去 (rendering に完全に無関係)
 * - 文字列両端の trim
 * - **inter-tag whitespace は触らない** (改行・インデント・半角空白すべて保持)
 *
 * **重要: rendering-significant な whitespace を全保持**
 *   HTML の whitespace 解釈は文脈依存 (block / inline / inline-text 境界) で、
 *   `<span>a</span>\n<span>b</span>` も inline 文脈では半角空白として描画される。
 *   一見 cosmetic な改行 + インデントも rendering に影響し得るため、
 *   削除すると pixel diff 0 ゲートが false negative になる。
 *
 *   前提: template generator は deterministic で、同じ入力 → 同じ HTML 文字列
 *   (改行 + インデントのパターンも込みで)。fixture との文字列完全一致が
 *   ゲートとして妥当。
 */

/**
 * Normalize an HTML string for snapshot comparison.
 *
 * 正規化は **最小限** に留める方針 (Codex P4-C-1 review iter2 blocking 反映):
 *   1. <!-- ... --> 形式のコメントを除去 (rendering に影響しない、純粋に cosmetic)
 *   2. 文字列両端を trim (caller の保存形式の揺れ吸収)
 *
 * **inter-tag whitespace は触らない**。HTML の whitespace 解釈は文脈依存
 * (block / inline / inline-text 境界) で、`<span>a</span>\n<span>b</span>` も
 * inline 文脈では半角空白として描画される。一見 cosmetic に見える改行 +
 * インデントも rendering に影響し得るため、削除すると pixel diff 0 ゲートが
 * false negative になる。
 *
 * 前提: template generator は deterministic で、同じ入力に対して常に同じ
 * HTML 文字列 (改行 + インデントのパターンも含めて) を出力する。fixture
 * との文字列完全一致を比較対象とすることで、SPEC §5.4 の 1px 不変保証を
 * jest 内で代替担保する。
 */
export function normalizeHtmlForSnapshot(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments (always cosmetic in rendering)
    .trim();
}

/**
 * Quick equivalence check that handles cosmetic whitespace.
 * Returns true if both HTML strings normalize to the same content.
 */
export function htmlEquals(a: string, b: string): boolean {
  return normalizeHtmlForSnapshot(a) === normalizeHtmlForSnapshot(b);
}
