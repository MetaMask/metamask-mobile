// Intercepts in-iframe TradingView link clicks and forwards them to React
// Native via CHART_TRADINGVIEW_CLICKED, so the user opens links in the
// system browser instead of letting the iframe navigate.
//
// Ported from chartLogic.js: TV_EXTERNAL_BRIDGE_DEBOUNCE_MS,
// isTradingViewExternalHostname, isTradingViewExternalHref,
// installTradingViewExternalOpenBridge (lines ~2016-2122).

import { postToRN } from '../core/bridge';
import { eachChartDocument } from './tvDomHelpers';

const TV_EXTERNAL_BRIDGE_DEBOUNCE_MS = 600;

interface WindowWithOpenPatch extends Window {
  __mmTvOpenPatched?: boolean;
}

interface DocumentWithCaptureFlag extends Document {
  __mmTvLinkCaptureInstalled?: boolean;
}

// Module-local debounce timestamp; replaces window.__mmLastTvExternalBridgeAt.
let lastBridgeAt = 0;

export function isTradingViewExternalHostname(
  hostname: string | null | undefined,
): boolean {
  if (!hostname) return false;
  const h = String(hostname).toLowerCase();
  return (
    h === 'tradingview.com' ||
    h === 'www.tradingview.com' ||
    h.endsWith('.tradingview.com')
  );
}

export function isTradingViewExternalHref(
  href: string | null | undefined,
): boolean {
  if (!href) return false;
  try {
    const base = window.location?.href ?? 'https://localhost/';
    const u = new URL(href, base);
    return isTradingViewExternalHostname(u.hostname);
  } catch {
    return false;
  }
}

function sendTradingViewClicked(url?: string): void {
  postToRN('CHART_TRADINGVIEW_CLICKED', url ? { url } : {});
}

function handleTradingViewLinkCapture(ev: Event): void {
  const target = ev.target as Element | null;
  if (!target || typeof target.closest !== 'function') return;
  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor?.href || !isTradingViewExternalHref(anchor.href)) {
    return;
  }
  const now = Date.now();
  if (now - lastBridgeAt < TV_EXTERNAL_BRIDGE_DEBOUNCE_MS) return;
  lastBridgeAt = now;
  try {
    ev.preventDefault();
    ev.stopPropagation();
  } catch {
    // preventDefault on a passive listener throws; safe to ignore.
  }
  sendTradingViewClicked(anchor.href);
}

function patchWindowOpen(win: WindowWithOpenPatch | null | undefined): void {
  if (!win?.open || win.__mmTvOpenPatched) return;
  win.__mmTvOpenPatched = true;
  const origOpen = win.open.bind(win);
  win.open = function patchedOpen(
    url?: string | URL,
    target?: string,
    features?: string,
  ): Window | null {
    if (url != null && url !== '' && isTradingViewExternalHref(String(url))) {
      const now = Date.now();
      if (now - lastBridgeAt < TV_EXTERNAL_BRIDGE_DEBOUNCE_MS) {
        return null;
      }
      lastBridgeAt = now;
      sendTradingViewClicked(String(url));
      return null;
    }
    return origOpen(url as string, target as string, features as string);
  };
}

function applyAllOnce(): void {
  patchWindowOpen(window as WindowWithOpenPatch);
  eachChartDocument((doc) => {
    try {
      patchWindowOpen(doc.defaultView as WindowWithOpenPatch | null);
    } catch {
      // defaultView access can fail in detached iframes.
    }
    const flagged = doc as DocumentWithCaptureFlag;
    if (doc?.addEventListener && !flagged.__mmTvLinkCaptureInstalled) {
      flagged.__mmTvLinkCaptureInstalled = true;
      doc.addEventListener('click', handleTradingViewLinkCapture, true);
    }
  });
}

/**
 * Installs the bridge. Safe to call multiple times — each document is
 * tagged with __mmTvLinkCaptureInstalled to avoid duplicate listeners.
 *
 * Reapplies on the iframe `load` event and after 200ms / 800ms / 2000ms
 * because TradingView creates the iframe asynchronously and may swap its
 * contentDocument; we don't have a reliable single signal for "fully loaded".
 */
export function installTradingViewExternalOpenBridge(): void {
  applyAllOnce();
  try {
    const container = document.getElementById('tv_chart_container');
    const iframe = container?.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', applyAllOnce);
    }
  } catch {
    // No-op — container/iframe may not exist yet on early calls.
  }
  setTimeout(applyAllOnce, 200);
  setTimeout(applyAllOnce, 800);
  setTimeout(applyAllOnce, 2000);
}

/** Test-only: reset module state between tests. */
export function __resetExternalLinkBridgeForTests(): void {
  lastBridgeAt = 0;
}
