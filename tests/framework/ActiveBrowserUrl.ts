/**
 * Tracks the active in-app browser page URL for Appium WebView context switching.
 * Set when navigating via BrowserView.navigateToURL; read by PlaywrightWebMatchers.
 */
let activeBrowserUrl: string | null = null;

export function setActiveBrowserUrl(url: string): void {
  activeBrowserUrl = url;
}

export function getActiveBrowserUrl(): string {
  if (!activeBrowserUrl) {
    throw new Error(
      'No active browser URL set. Call setActiveBrowserUrl() after navigating in the browser.',
    );
  }
  return activeBrowserUrl;
}

export function clearActiveBrowserUrl(): void {
  activeBrowserUrl = null;
}

/** Host + pathname fragment used to match Appium WebView contexts. */
export function getWebViewUrlFragment(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}
