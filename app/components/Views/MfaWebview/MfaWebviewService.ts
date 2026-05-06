import { MESSAGE_SOURCE, type WebviewToNative } from './types';

/**
 * Pure logic for the MfaWebview screen — URL building + message validation.
 * Mirrors the structure of `app/components/UI/Card/services/DaimoPayService`.
 */

/** Cap message size — defends against the SPA blasting megabytes of JSON. */
export const MAX_MESSAGE_LENGTH = 16 * 1024;

/**
 * Origins the WebView is allowed to render and receive postMessage from.
 * Order roughly: dev mock (host alias on Android emulator + localhost) → real
 * future hosts. Anything outside the list is opened in the OS browser.
 */
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^http:\/\/10\.0\.2\.2(?::\d+)?$/,
  /^http:\/\/localhost(?::\d+)?$/,
  /^https:\/\/link\.metamask\.io$/,
  /^https:\/\/[a-z0-9-]+\.cx\.metamask\.io$/,
  /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
];

export const MfaWebviewService = {
  /**
   * `${server}/webview/${sessionId}#token=${bearer}`
   * Bearer goes in the URL fragment so it doesn't hit server logs but is still
   * readable by the SPA's JS for subsequent same-origin XHR.
   */
  buildWebViewUrl(
    server: string,
    sessionId: string,
    bearerToken: string,
  ): string {
    const base = server.replace(/\/+$/, '');
    return `${base}/webview/${encodeURIComponent(sessionId)}#token=${encodeURIComponent(bearerToken)}`;
  },

  isOriginAllowed(origin: string): boolean {
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  },

  /**
   * Should this URL load inside the WebView, or be handed to the OS browser?
   * Used by `onShouldStartLoadWithRequest`.
   */
  shouldLoadInWebView(url: string): boolean {
    try {
      const u = new URL(url);
      return MfaWebviewService.isOriginAllowed(`${u.protocol}//${u.host}`);
    } catch {
      return false;
    }
  },

  /**
   * Validate + parse a postMessage payload. Returns `null` for anything we
   * can't trust (oversized, malformed JSON, missing discriminator, unknown
   * type). The screen ignores `null` results.
   */
  parseEvent(raw: unknown): WebviewToNative | null {
    if (typeof raw !== 'string') return null;
    if (raw.length > MAX_MESSAGE_LENGTH) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.source !== MESSAGE_SOURCE) return null;
    if (typeof obj.sessionId !== 'string' || !obj.sessionId) return null;

    switch (obj.type) {
      case 'approved':
      case 'rejected':
      case 'close':
        return {
          source: MESSAGE_SOURCE,
          type: obj.type,
          sessionId: obj.sessionId,
        };
      case 'error':
        return {
          source: MESSAGE_SOURCE,
          type: 'error',
          sessionId: obj.sessionId,
          message:
            typeof obj.message === 'string' ? obj.message : 'Unknown error',
        };
      default:
        return null;
    }
  },
};
