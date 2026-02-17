import { renderHook, act } from '@testing-library/react-native';
import { useAuthRequest } from 'expo-auth-session';
import useCardOAuth2Authentication from './useCardOAuth2Authentication';
import { BaanxOAuth2Error, BaanxOAuth2ErrorType } from '../types';
import Logger from '../../../../util/Logger';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import {
  setIsAuthenticatedCard,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';
import { useCardSDK } from '../sdk';

const mockPromptAsync = jest.fn();
const mockDispatch = jest.fn();
const mockExchangeOAuth2Code = jest.fn();

jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [
    { state: 'mock-state', codeVerifier: 'mock-verifier' },
    null,
    mockPromptAsync,
  ]),
  ResponseType: { Code: 'code' },
  Prompt: { Consent: 'consent' },
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(() => 'us'),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../util/cardTokenVault', () => ({
  storeCardBaanxToken: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../util/mapBaanxApiUrl', () => ({
  getBaanxApiBaseUrl: () => 'https://api.test.com',
  DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS: 1209600,
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  selectUserCardLocation: jest.fn(),
  setIsAuthenticatedCard: jest.fn((v) => ({
    type: 'card/setIsAuthenticatedCard',
    payload: v,
  })),
  setUserCardLocation: jest.fn((v) => ({
    type: 'card/setUserCardLocation',
    payload: v,
  })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: { exchangeOAuth2Code: mockExchangeOAuth2Code },
  })),
}));

jest.mock('../util/pkceHelpers', () => ({
  generateState: () => 'mock-state',
}));

const mockUseAuthRequest = jest.mocked(useAuthRequest);
const mockUseCardSDK = jest.mocked(useCardSDK);
const mockStoreCardBaanxToken = jest.mocked(storeCardBaanxToken);
const mockLogger = jest.mocked(Logger);

const buildSuccessResult = (overrides: Record<string, string> = {}) => ({
  type: 'success' as const,
  errorCode: null,
  error: null,
  params: { state: 'mock-state', code: 'auth-code', ...overrides },
  authentication: null,
  url: 'https://redirect.test',
});

const buildErrorResult = (code?: string, description?: string) => ({
  type: 'error' as const,
  errorCode: code ?? null,
  error: code ? { code, description: description ?? '' } : null,
  params: {},
  authentication: null,
  url: '',
});

describe('useCardOAuth2Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthRequest.mockReturnValue([
      { state: 'mock-state', codeVerifier: 'mock-verifier' } as ReturnType<
        typeof useAuthRequest
      >[0],
      null,
      mockPromptAsync,
    ]);

    mockUseCardSDK.mockReturnValue({
      sdk: { exchangeOAuth2Code: mockExchangeOAuth2Code },
    } as unknown as ReturnType<typeof useCardSDK>);
  });

  describe('initialization', () => {
    it('returns initial state with no error and not loading', () => {
      const { result } = renderHook(() => useCardOAuth2Authentication());

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.isReady).toBe(true);
    });

    it('is not ready when auth request is null', () => {
      mockUseAuthRequest.mockReturnValue([null, null, mockPromptAsync]);

      const { result } = renderHook(() => useCardOAuth2Authentication());

      expect(result.current.isReady).toBe(false);
    });

    it('configures useAuthRequest with correct parameters', () => {
      renderHook(() => useCardOAuth2Authentication());

      expect(mockUseAuthRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: expect.any(String),
          responseType: 'code',
          usePKCE: true,
          state: 'mock-state',
          scopes: [
            'openid',
            'profile',
            'email',
            'platform:full',
            'offline_access',
          ],
        }),
        expect.objectContaining({
          authorizationEndpoint:
            'https://api.test.com/v1/auth/oauth2/authorize',
        }),
      );
    });
  });

  describe('successful login flow', () => {
    it('exchanges code, stores tokens, and dispatches auth actions', async () => {
      mockPromptAsync.mockResolvedValue(buildSuccessResult());
      mockExchangeOAuth2Code.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(mockExchangeOAuth2Code).toHaveBeenCalledWith({
        code: 'auth-code',
        codeVerifier: 'mock-verifier',
        redirectUri: expect.any(String),
        location: 'us',
      });

      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accessTokenExpiresAt: 3600,
        refreshTokenExpiresAt: 1209600,
        location: 'us',
      });

      expect(mockDispatch).toHaveBeenCalledWith(setIsAuthenticatedCard(true));
      expect(mockDispatch).toHaveBeenCalledWith(setUserCardLocation('us'));
      expect(result.current.error).toBeNull();
    });

    it('uses default expiresIn when not provided in token response', async () => {
      mockPromptAsync.mockResolvedValue(buildSuccessResult());
      mockExchangeOAuth2Code.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: undefined,
      });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith(
        expect.objectContaining({ accessTokenExpiresAt: 600 }),
      );
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('sets loading to true during login and false after', async () => {
      let resolvePrompt: (value: unknown) => void = () => undefined;
      mockPromptAsync.mockReturnValue(
        new Promise((resolve) => {
          resolvePrompt = resolve;
        }),
      );

      const { result } = renderHook(() => useCardOAuth2Authentication());

      expect(result.current.loading).toBe(false);

      let loginPromise: Promise<void>;
      act(() => {
        loginPromise = result.current.login();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePrompt({ type: 'cancel' });
        await loginPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('sets loading to false even when an error occurs', async () => {
      mockPromptAsync.mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('guard conditions', () => {
    it('sets configuration error when not ready', async () => {
      mockUseAuthRequest.mockReturnValue([null, null, mockPromptAsync]);

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.configuration_error',
      );
      expect(mockPromptAsync).not.toHaveBeenCalled();
    });

    it('sets configuration error when SDK is null', async () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
      } as unknown as ReturnType<typeof useCardSDK>);

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.configuration_error',
      );
    });
  });

  describe('cancel and dismiss', () => {
    it('does not set error on cancel', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBeNull();
      expect(mockExchangeOAuth2Code).not.toHaveBeenCalled();
    });

    it('does not set error on dismiss', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'dismiss' });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('state mismatch', () => {
    it('sets server error and logs when state does not match', async () => {
      mockPromptAsync.mockResolvedValue(
        buildSuccessResult({ state: 'tampered-state' }),
      );

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.server_error',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('state mismatch'),
        }),
        expect.objectContaining({
          tags: { feature: 'card', operation: 'oauth2Login' },
        }),
      );
      expect(mockExchangeOAuth2Code).not.toHaveBeenCalled();
    });
  });

  describe('missing code or codeVerifier', () => {
    it('sets unknown error when authorization code is missing', async () => {
      mockPromptAsync.mockResolvedValue({
        ...buildSuccessResult(),
        params: { state: 'mock-state' },
      });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.unknown_error',
      );
      expect(mockExchangeOAuth2Code).not.toHaveBeenCalled();
    });

    it('sets unknown error when codeVerifier is missing', async () => {
      mockUseAuthRequest.mockReturnValue([
        {
          state: 'mock-state',
          codeVerifier: undefined,
        } as unknown as ReturnType<typeof useAuthRequest>[0],
        null,
        mockPromptAsync,
      ]);
      mockPromptAsync.mockResolvedValue(buildSuccessResult());

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.unknown_error',
      );
    });
  });

  describe('token exchange failures', () => {
    it('sets server error when accessToken is missing from response', async () => {
      mockPromptAsync.mockResolvedValue(buildSuccessResult());
      mockExchangeOAuth2Code.mockResolvedValue({
        accessToken: null,
        refreshToken: 'refresh',
        expiresIn: 3600,
      });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.server_error',
      );
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });

    it('sets network error when exchangeOAuth2Code throws', async () => {
      mockPromptAsync.mockResolvedValue(buildSuccessResult());
      mockExchangeOAuth2Code.mockRejectedValue(new Error('Network down'));

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.network_error',
      );
    });

    it('maps BaanxOAuth2Error from exchangeOAuth2Code to its error type', async () => {
      mockPromptAsync.mockResolvedValue(buildSuccessResult());
      mockExchangeOAuth2Code.mockRejectedValue(
        new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.TOKEN_EXCHANGE_FAILED,
          'Exchange failed',
        ),
      );

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.server_error',
      );
    });
  });

  describe('OAuth auth error code mapping', () => {
    it.each([
      ['access_denied', 'card.card_authentication.errors.access_denied'],
      [
        'temporarily_unavailable',
        'card.card_authentication.errors.temporarily_unavailable',
      ],
      ['login_required', 'card.card_authentication.errors.login_required'],
      ['consent_required', 'card.card_authentication.errors.login_required'],
      [
        'interaction_required',
        'card.card_authentication.errors.login_required',
      ],
      [
        'account_selection_required',
        'card.card_authentication.errors.login_required',
      ],
      ['invalid_grant', 'card.card_authentication.errors.session_expired'],
    ])('maps %s to %s', async (code, expectedMessage) => {
      mockPromptAsync.mockResolvedValue(buildErrorResult(code));

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(expectedMessage);
    });

    it.each([
      'invalid_request',
      'unauthorized_client',
      'unsupported_response_type',
      'invalid_scope',
      'server_error',
      'invalid_request_uri',
      'invalid_request_object',
      'request_not_supported',
      'request_uri_not_supported',
      'registration_not_supported',
    ])('maps internal error %s to generic unknown error', async (code) => {
      mockPromptAsync.mockResolvedValue(buildErrorResult(code));

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.unknown_error',
      );
    });

    it('maps missing error code to generic unknown error', async () => {
      mockPromptAsync.mockResolvedValue(buildErrorResult());

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBe(
        'card.card_authentication.errors.unknown_error',
      );
    });

    it('logs the raw error details for all auth errors', async () => {
      mockPromptAsync.mockResolvedValue(
        buildErrorResult('access_denied', 'User clicked deny'),
      );

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('access_denied'),
        }),
        expect.objectContaining({
          tags: { feature: 'card', operation: 'oauth2Login' },
        }),
      );
      expect(result.current.error).toBe(
        'card.card_authentication.errors.access_denied',
      );
    });
  });

  describe('clearError', () => {
    it('clears a previously set error', async () => {
      mockPromptAsync.mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('clears error before a new login attempt', async () => {
      mockPromptAsync
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce({ type: 'cancel' });

      const { result } = renderHook(() => useCardOAuth2Authentication());

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).not.toBeNull();

      await act(async () => {
        await result.current.login();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
