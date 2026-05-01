/**
 * Security utilities for preview HTML content.
 *
 * Injects Content-Security-Policy to block inline scripts/event handlers.
 * Used by both preview.tsx and tests to ensure parity.
 */

/** CSP meta tag that blocks all inline scripts, event handlers, and script-src. */
const CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="script-src \'none\';">';

/** Scale document body to fit within the viewport height (no scrolling). */
export const FIT_TO_SCREEN_SCRIPT = `
(function() {
  var bodyH = document.body.scrollHeight;
  var viewH = window.innerHeight;
  if (bodyH > viewH) {
    var scale = viewH / bodyH;
    document.body.style.transformOrigin = 'top center';
    document.body.style.transform = 'scale(' + scale + ')';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';
  }
})();
true;
`;

export interface CspInjectionResult {
  /** The HTML with CSP injected, or original HTML if injection failed. */
  html: string;
  /** Whether the CSP meta tag was successfully injected. */
  success: boolean;
}

/**
 * Inject a strict CSP meta tag into HTML to block inline scripts/event handlers.
 *
 * The `script-src 'none'` directive blocks:
 * - `<script>` tags
 * - Inline event handlers (onerror, onclick, etc.)
 * - `javascript:` URLs
 *
 * It does NOT block scripts injected via WebView's native `evaluateJavaScript` API,
 * so `injectedJavaScript` still works.
 *
 * Uses case-insensitive search for `</head>` to handle any casing.
 * Returns { html, success } so callers can disable JS when injection fails.
 */
export function injectCsp(html: string): CspInjectionResult {
  if (!html) return { html: '', success: false };
  const headCloseIdx = html.toLowerCase().indexOf('</head>');
  if (headCloseIdx !== -1) {
    return {
      html: html.slice(0, headCloseIdx) + CSP_META + '\n' + html.slice(headCloseIdx),
      success: true,
    };
  }
  return { html, success: false };
}

/**
 * Normalize HTML for preview/print parity comparison (SPEC §8.5).
 *
 * preview と print の HTML は base template が同じだが、display/security 用の
 * inject パターンが異なる:
 *   - preview のみ: CSP meta タグ (script-src 'none')
 *   - preview のみ or print: viewport meta タグ (width が異なる)
 *   - print のみ: single-page enforcement script (<script>...</script>)
 *
 * 両側で共通に inject される項目 (single-page CSS、landscape CSS) は内容も
 * 位置も同じなので、normalize 不要 (両 HTML 内に同じ markup が入る → diff 0)。
 *
 * 本 normalizer は「片側だけに入る inject」を除去することで、template 本体
 * (mode='pdf' で生成された base HTML) の parity を直接比較可能にする。
 *
 * Codex SPEC §8.5 で `print-color-adjust` プロパティはテンプレ本体 CSS なので
 * 比較対象に残す (normalize しない)。
 *
 * @param html 比較対象の HTML 文字列 (preview 経路 or print 経路の出力)
 * @returns CSP / viewport / single-page script を除去した文字列 (両端 trim)
 */
export function normalizeForParity(html: string): string {
  return (
    html
      // 1. CSP meta tag (preview only) — 前後 whitespace ごと削除
      .replace(/\s*<meta\s+http-equiv="Content-Security-Policy"[^>]*>\s*/gi, '\n')
      // 2. viewport meta tag (preview width=800、print width=device-width 等で異なる)
      .replace(/\s*<meta\s+name="viewport"[^>]*>\s*/gi, '\n')
      // 3. single-page enforcement inline script (print only、内側 `}` のネスト対応で非貪欲)
      .replace(/\s*<script>\s*\(function\(\)\s*\{[\s\S]*?\}\)\(\);\s*<\/script>\s*/g, '\n')
      // 4. SPEC §8.5: 空行・インデント差分は trivial として吸収
      //    inject 削除後に残る連続改行・行末 whitespace を normalize
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{2,}/g, '\n')
      // 5. trim 両端 (caller の保存形式の揺れ吸収)
      .trim()
  );
}
