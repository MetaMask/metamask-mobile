/* eslint-disable @typescript-eslint/naming-convention */

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
 * signal (same-origin iframes are trusted by definition).
 *
 * `iframe_origin` and `top_level_origin` are only populated for cross-origin
 * iframes to avoid leaking redundant information for same-origin cases.
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
  const isCrossOrigin =
    isIframe && typeof topLevelOrigin === 'string' && origin !== topLevelOrigin;

  return {
    is_iframe: isIframe,
    is_cross_origin_iframe: isCrossOrigin,
    iframe_origin: isCrossOrigin ? origin : null,
    top_level_origin: isCrossOrigin ? topLevelOrigin : null,
  };
}
