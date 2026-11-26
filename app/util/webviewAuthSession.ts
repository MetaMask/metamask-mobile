import NavigationService from '../core/NavigationService';
import Routes from '../constants/navigation/Routes';

interface ActiveWebviewAuthSession {
  redirectUri: string;
  finish: (redirectUrl?: string) => void;
  close?: () => void;
}

const activeSessions = new Map<string, ActiveWebviewAuthSession>();
let nextSessionId = 0;

/**
 * Attaches the WebView screen's close callback to an active auth session.
 * Returns `false` if the session was already resolved or aborted before the
 * screen mounted, signaling the screen to dismiss itself immediately.
 */
export function attachWebviewAuthSessionClose(
  sessionId: string,
  close: () => void,
): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }
  session.close = close;
  return true;
}

/**
 * Checks whether a URL loaded by the WebView matches the session's expected
 * OAuth redirect URI. When matched, completes the session and returns `true`
 * so the WebView can cancel the navigation and close.
 */
export function handleWebviewAuthRedirect(
  sessionId: string,
  url: string,
): boolean {
  const session = activeSessions.get(sessionId);
  if (!session || !url.startsWith(session.redirectUri)) {
    return false;
  }
  session.finish(url);
  return true;
}

/**
 * Marks an active WebView auth session as dismissed (e.g. user closed the
 * modal or navigated back before completing authorization).
 */
export function dismissWebviewAuthSession(sessionId: string): void {
  activeSessions.get(sessionId)?.finish(undefined);
}

/**
 * Opens an OAuth authorization URL in MetaMask's in-app `SimpleWebview` modal
 * and resolves with the intercepted `redirectUri` URL (carrying `code` and
 * `state`), or `undefined` if the user dismisses the screen or `signal` aborts.
 */
export async function openWebviewAuthSession(options: {
  url: string;
  redirectUri: string;
  signal?: AbortSignal;
}): Promise<string | undefined> {
  const { url, redirectUri, signal } = options;

  if (signal?.aborted) {
    return undefined;
  }

  const sessionId = `webview-auth-${++nextSessionId}`;

  return await new Promise<string | undefined>((resolve, reject) => {
    let settled = false;
    let onAbort: (() => void) | undefined;

    const finish = (redirectUrl?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      activeSessions.delete(sessionId);
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve(redirectUrl);
    };

    const session: ActiveWebviewAuthSession = { redirectUri, finish };
    activeSessions.set(sessionId, session);

    if (signal) {
      onAbort = () => {
        const closeScreen = session.close;
        finish(undefined);
        closeScreen?.();
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      NavigationService.navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url,
          hideShareButton: true,
          useGlassHeader: true,
          authSessionId: sessionId,
        },
      });
    } catch (error) {
      activeSessions.delete(sessionId);
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      settled = true;
      reject(error);
    }
  });
}
