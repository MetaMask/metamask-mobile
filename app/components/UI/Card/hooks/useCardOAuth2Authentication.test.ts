import { renderHook, act } from '@testing-library/react-hooks';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useCardOAuth2Authentication } from './useCardOAuth2Authentication';

const mockPromptAsync = jest.fn();

/** When true, `useAuthRequest` yields no request (mirrors expo before the request is ready). */
const oauthTestHarness = { suppressAuthRequest: false };

jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn((config: { state: string }) => [
    oauthTestHarness.suppressAuthRequest
      ? null
      : {
          state: config.state,
          codeVerifier: 'test-code-verifier',
        },
    null,
    mockPromptAsync,
  ]),
  ResponseType: { Code: 'code' },
  Prompt: { Consent: 'consent' },
}));

jest.mock('../util/pkceHelpers', () => ({
  generateState: () => 'fixed-oauth-state',
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('useCardOAuth2Authentication', () => {
  const submitCredentials = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    submitCredentials.mockReset();
    mockPromptAsync.mockReset();
    oauthTestHarness.suppressAuthRequest = false;
    process.env.BAANX_API_URL = 'https://baanx.test';
  });

  afterEach(() => {
    delete process.env.BAANX_API_URL;
  });

  it('exposes isReady false when OAuth auth request object is unavailable', () => {
    oauthTestHarness.suppressAuthRequest = true;

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    expect(result.current.isReady).toBe(false);
  });

  it('login returns null and sets configuration error when not ready', async () => {
    oauthTestHarness.suppressAuthRequest = true;

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    await act(async () => {
      await result.current.login();
    });

    expect(mockPromptAsync).not.toHaveBeenCalled();
    expect(submitCredentials).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'card.card_authentication.errors.configuration_error',
    );
  });

  it('login returns null on cancel without calling submitCredentials', async () => {
    mockPromptAsync.mockResolvedValue({ type: 'cancel' });

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    await act(async () => {
      await result.current.login();
    });

    expect(submitCredentials).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('login calls submitCredentials with oauth2 payload and returns its result', async () => {
    const authResult = { done: true as const, tokenSet: {} as never };
    submitCredentials.mockResolvedValue(authResult);
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: {
        code: 'authorization-code',
        state: 'fixed-oauth-state',
      },
    });

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    let loginResult: Awaited<ReturnType<typeof result.current.login>> = null;
    await act(async () => {
      loginResult = await result.current.login();
    });

    expect(submitCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'oauth2',
        code: 'authorization-code',
        codeVerifier: 'test-code-verifier',
      }),
    );
    expect(
      (submitCredentials.mock.calls[0][0] as { redirectUri: string })
        .redirectUri,
    ).toContain('card-oauth');
    expect(loginResult).toStrictEqual(authResult);
    expect(result.current.error).toBeNull();
  });

  it('login sets server error when authorization state does not match', async () => {
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: {
        code: 'authorization-code',
        state: 'wrong-state',
      },
    });

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    await act(async () => {
      await result.current.login();
    });

    expect(submitCredentials).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'card.card_authentication.errors.server_error',
    );
  });

  it('login rethrows CardProviderError from submitCredentials', async () => {
    const providerError = new CardProviderError(
      CardProviderErrorCode.InvalidCredentials,
      'bad creds',
    );
    submitCredentials.mockRejectedValue(providerError);
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: {
        code: 'authorization-code',
        state: 'fixed-oauth-state',
      },
    });

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    await act(async () => {
      await expect(result.current.login()).rejects.toThrow(providerError);
    });

    expect(submitCredentials).toHaveBeenCalled();
  });

  it('clearError resets error string', async () => {
    oauthTestHarness.suppressAuthRequest = true;

    const { result } = renderHook(() =>
      useCardOAuth2Authentication({
        isUsRegion: false,
        submitCredentials,
      }),
    );

    await act(async () => {
      await result.current.login();
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
