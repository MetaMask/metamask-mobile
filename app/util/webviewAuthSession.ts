import NavigationService from '../core/NavigationService';
import Routes from '../constants/navigation/Routes';

/**
 * Maximum time to wait for `SimpleWebview` to mount and attach its close
 * handler once `NavigationService`'s `requestAnimationFrame`-deferred
 * navigation frame runs. Bounds session cleanup if the deferred dispatch fails
 * or is dropped without timing out while animation frames are paused in the
 * background.
 */
export const WEBVIEW_AUTH_MOUNT_TIMEOUT_MS = 5000;

export class WebviewAuthMountTimeoutError extends Error {
  constructor() {
    super('WebView auth session timed out waiting for screen to mount');
    this.name = 'WebviewAuthMountTimeoutError';
  }
}

interface ActiveWebviewAuthSession {
  redirectUri: string;
  finish: (redirectUrl?: string) => void;
  clearMountTimeout: () => void;
  close?: () => void;
  readonly settled: boolean;
}

const activeSessions = new Map<string, ActiveWebviewAuthSession>();
let nextSessionId = 0;

function matchesRedirectUri(
  candidateUrl: string,
  redirectUri: string,
): boolean {
  try {
    const candidate = new URL(candidateUrl);
    const expected = new URL(redirectUri);
    return (
      candidate.protocol === expected.protocol &&
      candidate.host === expected.host &&
      candidate.pathname === expected.pathname
    );
  } catch {
    return false;
  }
}

/**
 * Attaches the WebView screen's close callback to an active auth session.
 * Returns `false` if the session was already resolved, timed out, or aborted
 * before the screen mounted, signaling the screen to dismiss itself
 * immediately.
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
  session.clearMountTimeout();
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
  if (!session || !matchesRedirectUri(url, session.redirectUri)) {
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
    let settled = false;
    let onAbort: (() => void) | undefined;
    let mountFrame: number | undefined;
    let mountTimeout: ReturnType<typeof setTimeout> | undefined;

    const clearMountTimeout = (): void => {
      if (mountFrame !== undefined) {
        cancelAnimationFrame(mountFrame);
        mountFrame = undefined;
      }
      if (mountTimeout !== undefined) {
        clearTimeout(mountTimeout);
        mountTimeout = undefined;
      }
    };

    const settleSession = (): void => {
      settled = true;
      clearMountTimeout();
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const finish = (redirectUrl?: string): void => {
      if (settled) {
        return;
      }
      settleSession();
      resolve(redirectUrl);
    };

    const fail = (error: unknown): void => {
      if (settled) {
        return;
      }
      settleSession();
      activeSessions.delete(sessionId);
      reject(error);
    };

    const session: ActiveWebviewAuthSession = {
      redirectUri,
      get settled(): boolean {
        return settled;
      },
      clearMountTimeout,
      finish,
    };
    activeSessions.set(sessionId, session);

    if (signal) {
      onAbort = () => {
        const closeScreen = session.close;
        finish();
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
      fail(error);
      return;
    }

    if (settled || session.close) {
      return;
    }

    mountFrame = requestAnimationFrame(() => {
      mountFrame = undefined;
      if (settled || session.close) {
        return;
      }
      mountTimeout = setTimeout(() => {
        mountTimeout = undefined;
        fail(new WebviewAuthMountTimeoutError());
      }, WEBVIEW_AUTH_MOUNT_TIMEOUT_MS);
    });
  });
}
