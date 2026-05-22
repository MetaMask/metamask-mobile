import {
  MESSAGE_SOURCE,
  type MfaWebviewParams,
  type WebviewToNative,
} from './types';

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
  /^https:\/\/developer\.metamask\.io$/,
  /^https:\/\/metamask-developer-dashboard-web-staging\.vercel\.app$/,
  /^https:\/\/dauh7948dneg6\.cloudfront\.net$/,
  /^https:\/\/[a-z0-9-]+\.cx\.metamask\.io$/,
  /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
];

const isOriginAllowed = (origin: string): boolean =>
  ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));

export const MfaWebviewService = {
  /**
   * `${approvalPageLink}?projectId=...&notificationId=...#token=${bearer}`
   * Bearer goes in the URL fragment so it doesn't hit server logs but is still
   * readable by the SPA's JS for subsequent same-origin XHR.
   */
  buildWebViewUrl(params: MfaWebviewParams, bearerToken: string): string {
    const {
      approvalPageLink,
      projectId,
      notificationId,
      requestId,
      approvalId,
      operationType,
      subjectId,
      server,
      sessionId,
    } = params;

    if (!approvalPageLink) {
      if (!server || !sessionId) {
        throw new Error('Missing approval page link');
      }

      const base = server.replace(/\/+$/, '');
      return `${base}/webview/${encodeURIComponent(
        sessionId,
      )}#token=${encodeURIComponent(bearerToken)}`;
    }

    const url = new URL(approvalPageLink);
    const origin = `${url.protocol}//${url.host}`;
    if (!isOriginAllowed(origin)) {
      throw new Error('Approval page origin is not allowed');
    }

    const canonicalRequestId = notificationId ?? requestId;

    if (projectId) url.searchParams.set('projectId', projectId);
    if (canonicalRequestId) {
      url.searchParams.set('notificationId', canonicalRequestId);
    }
    if (approvalId) url.searchParams.set('approvalId', approvalId);
    if (operationType) url.searchParams.set('operationType', operationType);
    if (subjectId) url.searchParams.set('subjectId', subjectId);
    url.hash = `token=${encodeURIComponent(bearerToken)}`;

    return url.toString();
  },

  isOriginAllowed(origin: string): boolean {
    return isOriginAllowed(origin);
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
    const approvalId =
      typeof obj.approvalId === 'string' && obj.approvalId
        ? obj.approvalId
        : typeof obj.sessionId === 'string' && obj.sessionId
          ? obj.sessionId
          : null;
    if (!approvalId) return null;

    switch (obj.type) {
      case 'approved':
      case 'rejected':
      case 'close':
        return {
          source: MESSAGE_SOURCE,
          type: obj.type,
          approvalId,
        };
      case 'error':
        return {
          source: MESSAGE_SOURCE,
          type: 'error',
          approvalId,
          message:
            typeof obj.message === 'string' ? obj.message : 'Unknown error',
        };
      default:
        return null;
    }
  },
};
