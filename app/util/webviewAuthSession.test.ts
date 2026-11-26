import Routes from '../constants/navigation/Routes';
import {
  attachWebviewAuthSessionClose,
  dismissWebviewAuthSession,
  handleWebviewAuthRedirect,
  openWebviewAuthSession,
  WEBVIEW_AUTH_MOUNT_TIMEOUT_MS,
  WebviewAuthMountTimeoutError,
} from './webviewAuthSession';

const mockNavigate = jest.fn();

jest.mock('../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

const AUTH_URL = 'https://x.com/i/oauth2/authorize?state=abc';
const REDIRECT_URI = 'https://link.metamask.io/x-oauth-redirect';

function getLastAuthSessionId(): string {
  const [, navParams] = mockNavigate.mock.calls.at(-1) as [
    string,
    { screen: string; params: { authSessionId: string } },
  ];
  return navParams.params.authSessionId;
}

describe('webviewAuthSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to SimpleWebview and resolves when the redirect URI is intercepted', async () => {
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: expect.objectContaining({
        url: AUTH_URL,
        hideShareButton: true,
        useGlassHeader: true,
        authSessionId: expect.any(String),
      }),
    });

    const sessionId = getLastAuthSessionId();
    expect(handleWebviewAuthRedirect(sessionId, 'https://x.com/login')).toBe(
      false,
    );

    const redirectUrl = `${REDIRECT_URI}?code=123&state=abc`;
    const duplicateRedirectUrl = `${REDIRECT_URI}?code=456&state=def`;
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);
    // Repeated redirect attempts while the modal is closing remain blocked.
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);
    expect(handleWebviewAuthRedirect(sessionId, duplicateRedirectUrl)).toBe(
      true,
    );

    dismissWebviewAuthSession(sessionId);
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(false);

    await expect(promise).resolves.toBe(redirectUrl);
  });

  it('returns false from attachWebviewAuthSessionClose if a redirect already settled the session', async () => {
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
    });
    const sessionId = getLastAuthSessionId();
    const redirectUrl = `${REDIRECT_URI}?code=123&state=abc`;

    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);

    expect(attachWebviewAuthSessionClose(sessionId, jest.fn())).toBe(false);
    dismissWebviewAuthSession(sessionId);

    await expect(promise).resolves.toBe(redirectUrl);
  });

  it('keeps blocking matching redirects after abort until the mounted WebView dismisses', async () => {
    const controller = new AbortController();
    const close = jest.fn();
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
      signal: controller.signal,
    });
    const sessionId = getLastAuthSessionId();
    const redirectUrl = `${REDIRECT_URI}?code=123&state=abc`;
    attachWebviewAuthSessionClose(sessionId, close);

    controller.abort();

    expect(close).toHaveBeenCalledTimes(1);
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);
    dismissWebviewAuthSession(sessionId);
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(false);
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves with undefined when the WebView is dismissed before redirecting', async () => {
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
    });
    const sessionId = getLastAuthSessionId();

    dismissWebviewAuthSession(sessionId);

    await expect(promise).resolves.toBeUndefined();
  });

  it('closes the mounted WebView and resolves with undefined when signal aborts', async () => {
    const controller = new AbortController();
    const close = jest.fn();
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
      signal: controller.signal,
    });
    const sessionId = getLastAuthSessionId();

    expect(attachWebviewAuthSessionClose(sessionId, close)).toBe(true);

    controller.abort();

    expect(close).toHaveBeenCalledTimes(1);
    dismissWebviewAuthSession(sessionId);
    await expect(promise).resolves.toBeUndefined();
  });

  it('returns false from attachWebviewAuthSessionClose if aborted before mount', async () => {
    const controller = new AbortController();
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
      signal: controller.signal,
    });
    const sessionId = getLastAuthSessionId();

    controller.abort();

    expect(attachWebviewAuthSessionClose(sessionId, jest.fn())).toBe(false);
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not navigate when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
        signal: controller.signal,
      }),
    ).resolves.toBeUndefined();

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects and cleans up the session when navigation fails', async () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation reference does not exist!');
    });

    await expect(
      openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
      }),
    ).rejects.toThrow('Navigation reference does not exist!');
  });

  it('rejects and cleans up the session when deferred navigation never mounts the screen', async () => {
    jest.useFakeTimers();
    try {
      mockNavigate.mockImplementationOnce(() => {
        // Simulates NavigationService deferring dispatch via requestAnimationFrame
        // where the deferred navigation fails or drops without mounting SimpleWebview.
        setTimeout(() => {
          // Deferred dispatch never mounts the screen.
        }, 0);
      });

      const controller = new AbortController();
      const removeEventListenerSpy = jest.spyOn(
        controller.signal,
        'removeEventListener',
      );
      const promise = openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
        signal: controller.signal,
      });
      const sessionId = getLastAuthSessionId();

      const caughtErrorPromise = promise.catch((caught: unknown) => caught);

      jest.advanceTimersByTime(WEBVIEW_AUTH_MOUNT_TIMEOUT_MS);

      await expect(caughtErrorPromise).resolves.toBeInstanceOf(
        WebviewAuthMountTimeoutError,
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'abort',
        expect.any(Function),
      );
      // Session was removed from the registry so a late mount immediately closes
      // and redirects are not intercepted.
      expect(attachWebviewAuthSessionClose(sessionId, jest.fn())).toBe(false);
      expect(
        handleWebviewAuthRedirect(sessionId, `${REDIRECT_URI}?code=123`),
      ).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears the mount timeout once the WebView screen attaches', async () => {
    jest.useFakeTimers();
    try {
      const promise = openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
      });
      const sessionId = getLastAuthSessionId();
      expect(attachWebviewAuthSessionClose(sessionId, jest.fn())).toBe(true);

      // Users may take longer than the mount timeout to complete login.
      jest.advanceTimersByTime(WEBVIEW_AUTH_MOUNT_TIMEOUT_MS * 10);

      const redirectUrl = `${REDIRECT_URI}?code=123&state=abc`;
      expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);
      dismissWebviewAuthSession(sessionId);

      await expect(promise).resolves.toBe(redirectUrl);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not time out while animation frames are paused before deferred navigation runs', async () => {
    jest.useFakeTimers();
    const pendingFrames: FrameRequestCallback[] = [];
    const rafSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        pendingFrames.push(callback);
        return pendingFrames.length;
      });
    const cancelRafSpy = jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    try {
      let navigationRan = false;
      mockNavigate.mockImplementationOnce(() => {
        requestAnimationFrame(() => {
          navigationRan = true;
        });
      });

      const promise = openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
      });
      const sessionId = getLastAuthSessionId();

      jest.advanceTimersByTime(WEBVIEW_AUTH_MOUNT_TIMEOUT_MS * 10);

      expect(navigationRan).toBe(false);

      pendingFrames.splice(0).forEach((callback) => callback(Date.now()));

      expect(navigationRan).toBe(true);
      expect(attachWebviewAuthSessionClose(sessionId, jest.fn())).toBe(true);

      const redirectUrl = `${REDIRECT_URI}?code=123&state=abc`;
      expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);
      dismissWebviewAuthSession(sessionId);

      await expect(promise).resolves.toBe(redirectUrl);
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('starts the mount timeout only after the deferred navigation frame runs', async () => {
    jest.useFakeTimers();
    const pendingFrames: FrameRequestCallback[] = [];
    const rafSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        pendingFrames.push(callback);
        return pendingFrames.length;
      });
    const cancelRafSpy = jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    try {
      const promise = openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
      });
      const caughtErrorPromise = promise.catch((caught: unknown) => caught);
      let settled = false;
      promise.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );

      jest.advanceTimersByTime(WEBVIEW_AUTH_MOUNT_TIMEOUT_MS * 3);
      await Promise.resolve();

      expect(settled).toBe(false);

      pendingFrames.splice(0).forEach((callback) => callback(Date.now()));
      jest.advanceTimersByTime(WEBVIEW_AUTH_MOUNT_TIMEOUT_MS - 1);
      await Promise.resolve();

      expect(settled).toBe(false);

      jest.advanceTimersByTime(1);

      await expect(caughtErrorPromise).resolves.toBeInstanceOf(
        WebviewAuthMountTimeoutError,
      );
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('cancels the pending animation frame when the WebView attaches before the frame runs', async () => {
    const rafSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockReturnValue(42);
    const cancelRafSpy = jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    try {
      const promise = openWebviewAuthSession({
        url: AUTH_URL,
        redirectUri: REDIRECT_URI,
      });
      const sessionId = getLastAuthSessionId();

      expect(attachWebviewAuthSessionClose(sessionId, jest.fn())).toBe(true);
      expect(cancelRafSpy).toHaveBeenCalledWith(42);

      dismissWebviewAuthSession(sessionId);
      await expect(promise).resolves.toBeUndefined();
    } finally {
      rafSpy.mockRestore();
      cancelRafSpy.mockRestore();
    }
  });

  it('requires exact protocol, host, and pathname match for redirect URIs', async () => {
    const promise = openWebviewAuthSession({
      url: AUTH_URL,
      redirectUri: REDIRECT_URI,
    });
    const sessionId = getLastAuthSessionId();

    expect(
      handleWebviewAuthRedirect(
        sessionId,
        `${REDIRECT_URI}-other?code=123&state=abc`,
      ),
    ).toBe(false);
    expect(
      handleWebviewAuthRedirect(
        sessionId,
        `${REDIRECT_URI}/subpath?code=123&state=abc`,
      ),
    ).toBe(false);
    expect(
      handleWebviewAuthRedirect(
        sessionId,
        'https://link.metamask.io.evil.com/x-oauth-redirect?code=123&state=abc',
      ),
    ).toBe(false);
    expect(
      handleWebviewAuthRedirect(
        sessionId,
        'http://link.metamask.io/x-oauth-redirect?code=123&state=abc',
      ),
    ).toBe(false);
    expect(handleWebviewAuthRedirect(sessionId, 'not-a-valid-url')).toBe(false);

    const exactRedirectUrl = `${REDIRECT_URI}?code=123&state=abc`;
    expect(handleWebviewAuthRedirect(sessionId, exactRedirectUrl)).toBe(true);
    dismissWebviewAuthSession(sessionId);

    await expect(promise).resolves.toBe(exactRedirectUrl);
  });
});
