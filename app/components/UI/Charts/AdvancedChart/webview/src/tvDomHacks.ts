/**
 * TradingView DOM traversal, injected CSS, and external link bridge.
 *
 * These functions reach into TV's internal DOM to hide/show elements,
 * inject CSS overrides, and intercept external link navigations.
 */

import { sendToReactNative } from './bridge';
import type { TvDomPatchedWindow, TvDomPatchedDocument } from './types';

export function findOuterChartMarkupTable(doc: Document): HTMLElement | null {
  if (!doc || !doc.querySelectorAll) return null;

  const list = doc.querySelectorAll('.chart-markup-table'); // eslint-disable-line @typescript-eslint/no-deprecated
  for (const item of Array.from(list)) {
    const el = item as HTMLElement;
    const cn = el.className ? String(el.className) : '';
    if (el.classList.contains('pane')) continue;
    if (cn.indexOf('price-axis-container') !== -1) continue;
    if (cn.indexOf('time-axis') !== -1) continue;
    return el;
  }
  return list.length ? (list[0] as HTMLElement) : null;
}

/** Run fn(document) and fn(iframe.contentDocument) when the chart lives in TV's same-origin iframe. */
export function eachChartDocument(fn: (doc: Document) => void): void {
  try {
    fn(document);
  } catch {
    // swallow
  }
  try {
    const container = document.getElementById('tv_chart_container');
    const iframe = container?.querySelector(
      'iframe',
    ) as HTMLIFrameElement | null;
    if (iframe?.contentDocument) {
      fn(iframe.contentDocument);
    }
  } catch {
    // swallow
  }
}

export const TV_EXTERNAL_BRIDGE_DEBOUNCE_MS = 600;

export function isTradingViewExternalHostname(hostname: string): boolean {
  if (!hostname) return false;
  const h = String(hostname).toLowerCase();
  return (
    h === 'tradingview.com' ||
    h === 'www.tradingview.com' ||
    /\.tradingview\.com$/.test(h)
  );
}

export function isTradingViewExternalHref(href: string): boolean {
  if (!href) return false;
  try {
    const base =
      typeof window !== 'undefined' && window.location
        ? window.location.href
        : 'https://localhost/';
    const u = new URL(href, base);
    return isTradingViewExternalHostname(u.hostname);
  } catch {
    return false;
  }
}

export function removeInjectedStyleByIdFromChartDocs(styleId: string): void {
  eachChartDocument((d) => {
    const node = d.getElementById(styleId);
    if (node) node.remove();
  });
}

export function removeLineChartMarkupStyle(): void {
  removeInjectedStyleByIdFromChartDocs('tv-line-chart-markup');
}

/** CSS selector prefix: top window uses `#tv_chart_container `; chart iframe document uses none. */
export function tvScopedDomSelectors(targetDoc: Document): {
  overflowRule: string;
  chartRootSel: string;
  screenSel: string;
  widgetSel: string;
} {
  const top = targetDoc === document;
  const p = top ? '#tv_chart_container ' : '';
  return {
    overflowRule:
      buildChartDomUnclipCss(targetDoc) +
      (top
        ? '#tv_chart_container{overflow:visible!important;}'
        : '.chart-widget{overflow:visible!important;}'),
    chartRootSel: p + '.chart-widget > .chart-markup-table',
    screenSel: p + '.chart-container-border [class^="screen-"]',
    widgetSel: p + '.chart-widget',
  };
}

export function buildChartDomUnclipCss(targetDoc: Document): string {
  const top = targetDoc === document;
  const p = top ? '#tv_chart_container ' : '';
  return (
    p +
    '.layout__area--center,' +
    p +
    '.layout__area--right,' +
    p +
    '.js-rootresizer__contents,' +
    p +
    '.chart-container,' +
    p +
    '.chart-container-border{' +
    'overflow:visible!important;clip-path:none!important;}' +
    p +
    '.chart-widget > .chart-markup-table > div:first-child .pane{' +
    'overflow:visible!important;clip-path:none!important;}' +
    p +
    '.chart-widget > .chart-markup-table > div:first-child .pane .chart-gui-wrapper{' +
    'overflow:visible!important;clip-path:none!important;}'
  );
}

export function injectChartContainerOverflowUnclip(targetDoc: Document): void {
  if (!targetDoc?.getElementById) return;
  const id = 'tv-chart-container-unclip';
  const css = buildChartDomUnclipCss(targetDoc);
  let node = targetDoc.getElementById(id) as HTMLStyleElement | null;
  if (!node) {
    node = targetDoc.createElement('style') as HTMLStyleElement;
    node.id = id;
    (targetDoc.head || targetDoc.documentElement).appendChild(node);
  }
  node.textContent = css;
}

export function applyChartContainerOverflowUnclip(): void {
  eachChartDocument(injectChartContainerOverflowUnclip);
}

export function scheduleChartDomUnclip(): void {
  function run() {
    applyChartContainerOverflowUnclip();
  }
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  } catch {
    setTimeout(run, 0);
  }
  setTimeout(run, 100);
  setTimeout(run, 280);
}

export function getChartMarkupTableContext(): {
  doc: Document;
  table: HTMLElement;
} | null {
  const container = document.getElementById('tv_chart_container');
  if (!container) return null;
  let table = findOuterChartMarkupTable(document);
  let doc: Document = document;
  if (!table || !container.contains(table)) {
    table = null;
  }
  if (!table) {
    try {
      const iframe = container.querySelector(
        'iframe',
      ) as HTMLIFrameElement | null;
      if (iframe?.contentDocument) {
        table = findOuterChartMarkupTable(iframe.contentDocument);
        if (table) doc = iframe.contentDocument;
      }
    } catch {
      // swallow
    }
  }
  return table ? { doc, table } : null;
}

export function injectHidePriceScaleModeButtonsStyle(
  targetDoc: Document,
): void {
  if (!targetDoc?.getElementById) return;
  const id = 'tv-hide-price-scale-mode-buttons';
  if (targetDoc.getElementById(id)) return;
  const style = targetDoc.createElement('style');
  style.id = id;
  style.textContent =
    '[class*="priceScaleModeButtons"]{' +
    'display:none!important;visibility:hidden!important;pointer-events:none!important;' +
    'width:0!important;height:0!important;overflow:hidden!important;opacity:0!important;}';
  (targetDoc.head || targetDoc.documentElement).appendChild(style);
}

export function applyHidePriceScaleModeButtons(): void {
  eachChartDocument(injectHidePriceScaleModeButtonsStyle);
}

export function scheduleHidePriceScaleModeButtons(): void {
  applyHidePriceScaleModeButtons();
  try {
    requestAnimationFrame(() => {
      requestAnimationFrame(applyHidePriceScaleModeButtons);
    });
  } catch {
    // swallow
  }
  setTimeout(applyHidePriceScaleModeButtons, 450);
}

export function removeCandleVolumeScaleMarkup(): void {
  removeInjectedStyleByIdFromChartDocs('tv-candle-volume-markup');
}

export function installTradingViewExternalOpenBridge(): void {
  function sendTvClicked(url?: string) {
    sendToReactNative('CHART_TRADINGVIEW_CLICKED', url ? { url } : {});
  }

  function handleTradingViewLinkCapture(ev: Event) {
    const t = ev.target as HTMLElement | null;
    if (!t || typeof t.closest !== 'function') return;
    const a = t.closest('a') as HTMLAnchorElement | null;
    if (!a?.href || !isTradingViewExternalHref(a.href)) return;
    const now = Date.now();
    if (
      now - ((window as TvDomPatchedWindow).__mmLastTvExternalBridgeAt || 0) <
      TV_EXTERNAL_BRIDGE_DEBOUNCE_MS
    ) {
      return;
    }
    (window as TvDomPatchedWindow).__mmLastTvExternalBridgeAt = now;
    try {
      ev.preventDefault();
      ev.stopPropagation();
    } catch {
      // swallow
    }
    sendTvClicked(a.href);
  }

  function patchWindowOpen(win: TvDomPatchedWindow | null) {
    if (!win?.open || win.__mmTvOpenPatched) return;
    win.__mmTvOpenPatched = true;
    const origOpen = win.open.bind(win);
    win.open = function (url?: string | URL, name?: string, specs?: string) {
      if (url != null && url !== '' && isTradingViewExternalHref(String(url))) {
        const now2 = Date.now();
        if (
          now2 -
            ((window as TvDomPatchedWindow).__mmLastTvExternalBridgeAt || 0) <
          TV_EXTERNAL_BRIDGE_DEBOUNCE_MS
        ) {
          return null;
        }
        (window as TvDomPatchedWindow).__mmLastTvExternalBridgeAt = now2;
        sendTvClicked(String(url));
        return null;
      }
      return origOpen(url, name, specs);
    };
  }

  function applyAll() {
    patchWindowOpen(window);
    eachChartDocument((doc) => {
      try {
        patchWindowOpen((doc as TvDomPatchedDocument).defaultView);
      } catch {
        // swallow
      }
      const patchedDoc = doc as TvDomPatchedDocument;
      if (doc?.addEventListener && !patchedDoc.__mmTvLinkCaptureInstalled) {
        patchedDoc.__mmTvLinkCaptureInstalled = true;
        doc.addEventListener('click', handleTradingViewLinkCapture, true);
      }
    });
  }

  applyAll();
  try {
    const container = document.getElementById('tv_chart_container');
    const iframe = container?.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', applyAll);
    }
  } catch {
    // swallow
  }
  setTimeout(applyAll, 200);
  setTimeout(applyAll, 800);
  setTimeout(applyAll, 2000);
}
