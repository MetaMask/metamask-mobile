import Routes from '../constants/navigation/Routes';
import {
  attachWebviewAuthSessionClose,
  dismissWebviewAuthSession,
  handleWebviewAuthRedirect,
  openWebviewAuthSession,
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
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(true);
    // Subsequent redirect attempts for the completed session are ignored.
    expect(handleWebviewAuthRedirect(sessionId, redirectUrl)).toBe(false);

    await expect(promise).resolves.toBe(redirectUrl);
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
});
