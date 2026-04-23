/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Normalizes an origin-like input into a canonical scheme+host form so that
 * mixed-format inputs (bare hostnames, origins, or full URLs that include a
 * path or query) can be compared for equality without false positives.
 *
 * Callers historically pass a mix of:
 * - scheme + host (e.g. `https://example.com`)
 * - bare hostname (e.g. `example.com`)
 * - full URL (e.g. `https://example.com/swap?chain=1`)
 *
 * Without normalization, strict string equality flags these as different
 * origins even when they refer to the same site. We default bare hostnames
 * to `https://` — the browser WebView only loads `https://` pages today, so
 * this is the safe assumption.
 */
function normalizeOrigin(value: string | undefined | null): string {
  if (!value) {
    return '';
  }
  const input = value.trim();
  if (!input) {
    return '';
  }
  const candidate = input.includes('://') ? input : `https://${input}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return input;
  }
}

/**
 * Derives iframe-related metric properties from iframe detection data.
 *
 * Mobile analogue of the Extension's getIframeProperties, which uses
 * chrome.runtime.MessageSender.frameId. On Mobile we rely on injected JS
 * (`window.self !== window.top`) so there is no numeric frameId — only a
 * boolean `isIframe` flag.
 *
 * `is_cross_origin_iframe` additionally checks whether the iframe's origin
 * differs from the top-level frame's origin. This is the primary security
 * signal (same-origin iframes are trusted by definition). Both origins are
 * normalized before comparison so that mixed input formats don't produce
 * false positives.
 *
 * `iframe_origin` and `top_level_origin` are only populated for cross-origin
 * iframes to avoid leaking redundant information for same-origin cases, and
 * are returned in their normalized scheme+host form.
 *
 * @param options
 * @param options.isIframe - Whether the page is running inside an iframe.
 * @param options.origin - The origin of the sender (the iframe or top-level page).
 * @param options.topLevelOrigin - The origin of the top-level frame, if available.
 * @returns An object with iframe metric properties.
 */
export function getIframeProperties({
  isIframe,
  origin,
  topLevelOrigin,
}: {
  isIframe: boolean;
  origin: string;
  topLevelOrigin?: string;
}): {
  is_iframe: boolean;
  is_cross_origin_iframe: boolean;
  iframe_origin: string | null;
  top_level_origin: string | null;
} {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedTopLevelOrigin =
    typeof topLevelOrigin === 'string' ? normalizeOrigin(topLevelOrigin) : '';

  const isCrossOrigin =
    isIframe &&
    typeof topLevelOrigin === 'string' &&
    normalizedOrigin !== normalizedTopLevelOrigin;

  return {
    is_iframe: isIframe,
    is_cross_origin_iframe: isCrossOrigin,
    iframe_origin: isCrossOrigin ? normalizedOrigin : null,
    top_level_origin: isCrossOrigin ? normalizedTopLevelOrigin : null,
  };
}
