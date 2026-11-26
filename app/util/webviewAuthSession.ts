import NavigationService from '../core/NavigationService';
import Routes from '../constants/navigation/Routes';

interface ActiveWebviewAuthSession {
  redirectUri: string;
  finish: (redirectUrl?: string) => void;
  close?: () => void;
  settled: boolean;
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
  if (!session || session.settled) {
    return false;
  }
  session.close = close;
  return true;
}

/**
 * Checks whether a URL loaded by the WebView matches the session's expected
 * OAuth redirect URI. When matched, completes the session (once) and returns
 * `true` so the WebView cancels the navigation and closes.
 *
 * The session remains registered until `dismissWebviewAuthSession` runs on
 * WebView unmount so subsequent `onShouldStartLoadWithRequest` calls for the
 * same redirect URI while the modal is closing continue to return `true` and
 * stay blocked.
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
 * modal or navigated back before completing authorization) and removes the
 * session once the WebView screen unmounts.
 */
export function dismissWebviewAuthSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  activeSessions.delete(sessionId);
  session?.finish();
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
    let onAbort: (() => void) | undefined;

    const session: ActiveWebviewAuthSession = {
      redirectUri,
      settled: false,
      finish: (redirectUrl?: string) => {
        if (session.settled) {
          return;
        }
        session.settled = true;
        if (signal && onAbort) {
          signal.removeEventListener('abort', onAbort);
        }
        resolve(redirectUrl);
      },
    };
    activeSessions.set(sessionId, session);

    if (signal) {
      onAbort = () => {
        const closeScreen = session.close;
        session.finish();
        if (!closeScreen) {
          activeSessions.delete(sessionId);
        }
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
      session.settled = true;
      reject(error);
    }
  });
}
