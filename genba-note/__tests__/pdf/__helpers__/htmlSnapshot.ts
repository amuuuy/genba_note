/**
 * HTML snapshot helpers for P4-C grid wrapper regression tests.
 *
 * SPEC §5.4 の pixel diff 0 を jest 内で検証するための代替手段。
 * - 実 PDF の pixel diff は P4-D で Yuma 実機テスト
 * - jest 内では HTML 正規化後の文字列完全一致を P4-C ゲートとする
 *
 * 正規化方針 (Codex P4-C 設計判断の global concern 反映):
 * - HTML コメントを除去 (cosmetic な揺れを排除)
 * - 連続空白 (改行・インデント含む) を 1 つに圧縮
 * - 各タグ前後の空白を整形
 * - trim 全体
 *
 * 注意: 重要な空白 (テキスト内の意図的な全角スペース「見　積　書」等) は保持する。
 * そのため、タグ内テキストの空白は触らず、タグ間 (= ホワイトスペースだけの間)
 * の空白のみ正規化する。
 */

/**
 * Normalize an HTML string for snapshot comparison.
 *
 * 正規化:
 *   1. <!-- ... --> 形式のコメントを除去 (改行を含むコメントも対応)
 *   2. **改行を含む** タグ間ホワイトスペース (= cosmetic な改行 + インデント) のみ除去
 *   3. 文字列両端を trim
 *
 * **保持されるもの (rendering-significant)**:
 *   - inline sibling 間の半角空白: `<span>a</span> <span>b</span>` ≠ `<span>a</span><span>b</span>`
 *     (前者は inline 描画で半角空白の隙間が出る)
 *   - テキストノード内空白 (全角スペース「見　積　書」等)
 *   - 属性内の空白 (class="a b c")
 *
 * **除去されるもの (cosmetic)**:
 *   - HTML コメント (改行を含む multi-line も)
 *   - 改行を含むタグ間ホワイトスペース (block 整形のための改行 + インデント)
 *
 * Codex P4-C-1 review iter1 blocking 反映: 全 inter-tag whitespace を消すと
 * inline sibling 間の半角空白で false negative が出るため、改行を含む場合のみ
 * 除去するように限定した。
 */
export function normalizeHtmlForSnapshot(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
    .replace(/>\s*\n[\s\n]*</g, '><') // remove inter-tag whitespace that contains newline (cosmetic only)
    .trim();
}

/**
 * Quick equivalence check that handles cosmetic whitespace.
 * Returns true if both HTML strings normalize to the same content.
 */
export function htmlEquals(a: string, b: string): boolean {
  return normalizeHtmlForSnapshot(a) === normalizeHtmlForSnapshot(b);
}
