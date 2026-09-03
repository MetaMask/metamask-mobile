// Pure DOM traversal helpers for TradingView's same-origin iframe layout.
//
// Ported from chartLogic.js: findOuterChartMarkupTable (~line 1977) and
// eachChartDocument (~line 2003). Used by externalLinkBridge and (in later
// phases) by indicator legend overlay layout calculations.

/**
 * Find the outermost `.chart-markup-table` element in a document — the
 * container that wraps the price + time axes. Skips inner panes and axis
 * containers so consumers can reason about chart bounds.
 */
export function findOuterChartMarkupTable(
  doc: Document | null | undefined,
): Element | null {
  if (!doc) {
    return null;
  }
  const list = doc.querySelectorAll('.chart-markup-table');
  for (const el of Array.from(list)) {
    const className = el.className ? String(el.className) : '';
    if (el.classList.contains('pane')) continue;
    if (className.includes('price-axis-container')) continue;
    if (className.includes('time-axis')) continue;
    return el;
  }
  return list.length ? list[0] : null;
}

/**
 * Run `fn(document)` and `fn(iframe.contentDocument)` for the TradingView
 * same-origin iframe. TradingView's chart can mount in either the host doc
 * or a same-origin iframe depending on `iframe_loading_same_origin`; helpers
 * that traverse DOM should hit both.
 */
export function eachChartDocument(fn: (doc: Document) => void): void {
  try {
    fn(document);
  } catch {
    // Continue to the iframe document.
  }
  try {
    const container = document.getElementById('tv_chart_container');
    const iframe = container?.querySelector('iframe');
    if (iframe?.contentDocument) {
      fn(iframe.contentDocument);
    }
  } catch {
    // No-op — iframe access can fail for cross-origin or detached frames.
  }
}
