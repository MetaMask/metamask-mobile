import { renderHook, act } from '@testing-library/react-hooks';
import { uuid4 } from '@sentry/core';
import useCardProviderAuthentication from './useCardProviderAuthentication';
import { useCardSDK } from '../sdk';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import { generatePKCEPair, generateState } from '../util/pkceHelpers';
import {
  CardError,
  CardErrorType,
  CardLocation,
  CardLoginInitiateResponse,
} from '../types';
import { CardSDK } from '../sdk/CardSDK';
import { strings } from '../../../../../locales/i18n';

jest.mock('@sentry/core');
jest.mock('../sdk');
jest.mock('../util/cardTokenVault');
jest.mock('../util/pkceHelpers');
jest.mock('../../../../../locales/i18n');

const mockUuid4 = uuid4 as jest.MockedFunction<typeof uuid4>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockStoreCardBaanxToken = storeCardBaanxToken as jest.MockedFunction<
  typeof storeCardBaanxToken
>;
const mockGeneratePKCEPair = generatePKCEPair as jest.MockedFunction<
  typeof generatePKCEPair
>;
const mockGenerateState = generateState as jest.MockedFunction<
  typeof generateState
>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('useCardProviderAuthentication', () => {
  const mockSdk = {
    get isBaanxLoginEnabled() {
      return true;
    },
    get isCardEnabled() {
      return true;
    },
    get supportedTokens() {
      return [];
    },
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
    initiateCardProviderAuthentication: jest.fn(),
    login: jest.fn(),
    authorize: jest.fn(),
    exchangeToken: jest.fn(),
    refreshLocalToken: jest.fn(),
  };
  const mockSetIsAuthenticated = jest.fn();
  const mockStateUuid = 'mock-state-uuid';
  const mockCodeVerifier = 'mock-code-verifier';
  const mockCodeChallenge = 'mock-code-challenge';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUuid4.mockReturnValue(mockStateUuid);
    mockGeneratePKCEPair.mockResolvedValue({
      codeVerifier: mockCodeVerifier,
      codeChallenge: mockCodeChallenge,
    });
    mockGenerateState.mockReturnValue(mockStateUuid);
    mockUseCardSDK.mockReturnValue({
      sdk: mockSdk as unknown as CardSDK,
      isAuthenticated: false,
      setIsAuthenticated: mockSetIsAuthenticated,
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
    });
    mockStrings.mockImplementation((key: string) => `mocked_${key}`);
  });

  describe('initial state', () => {
    it('returns initial state with no error and not loading', () => {
      const { result } = renderHook(() => useCardProviderAuthentication());

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('successful login flow', () => {
    it('completes authentication flow and stores token', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const mockInitiateResponse = { token: 'initiate-token', url: 'mock-url' };
      const mockLoginResponse = {
        phase: null,
        userId: 'user-123',
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-access-token',
        verificationState: 'verified',
        isLinked: true,
      };
      const mockAuthorizeResponse = {
        state: mockStateUuid,
        url: 'authorize-url',
        code: 'auth-code',
      };
      const mockExchangeTokenResponse = {
        accessToken: 'final-access-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'refresh-token',
        refreshTokenExpiresIn: 86400,
      };

      mockSdk.initiateCardProviderAuthentication.mockResolvedValue(
        mockInitiateResponse,
      );
      mockSdk.login.mockResolvedValue(mockLoginResponse);
      mockSdk.authorize.mockResolvedValue(mockAuthorizeResponse);
      mockSdk.exchangeToken.mockResolvedValue(mockExchangeTokenResponse);
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await result.current.login(loginParams);
      });

      expect(mockSdk.initiateCardProviderAuthentication).toHaveBeenCalledWith({
        location: loginParams.location,
        state: mockStateUuid,
        codeChallenge: mockCodeChallenge,
      });
      expect(mockSdk.login).toHaveBeenCalledWith({
        location: loginParams.location,
        email: loginParams.email,
        password: loginParams.password,
      });
      expect(mockSdk.authorize).toHaveBeenCalledWith({
        location: loginParams.location,
        initiateAccessToken: mockInitiateResponse.token,
        loginAccessToken: mockLoginResponse.accessToken,
      });
      expect(mockSdk.exchangeToken).toHaveBeenCalledWith({
        location: loginParams.location,
        code: mockAuthorizeResponse.code,
        codeVerifier: mockCodeVerifier,
        grantType: 'authorization_code',
      });
      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: mockExchangeTokenResponse.accessToken,
        refreshToken: mockExchangeTokenResponse.refreshToken,
        expiresAt: expect.any(Number),
        location: loginParams.location,
      });
      expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('loading state management', () => {
    it('sets loading to true during authentication flow', async () => {
      const loginParams = {
        location: 'international' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      let resolveLogin:
        | ((value: CardLoginInitiateResponse) => void)
        | undefined;
      const loginPromise = new Promise<CardLoginInitiateResponse>((resolve) => {
        resolveLogin = resolve;
      });

      mockSdk.initiateCardProviderAuthentication.mockImplementation(
        () => loginPromise,
      );
      mockSdk.login.mockResolvedValue({
        phase: null,
        userId: 'test-user',
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-token',
        verificationState: 'verified',
        isLinked: true,
      });
      mockSdk.authorize.mockResolvedValue({
        state: mockStateUuid,
        url: 'auth-url',
        code: 'auth-code',
      });
      mockSdk.exchangeToken.mockResolvedValue({
        accessToken: 'final-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        refreshToken: 'refresh-token',
        refreshTokenExpiresIn: 86400,
      });
      mockStoreCardBaanxToken.mockResolvedValue({ success: true });

      const { result, waitForNextUpdate } = renderHook(() =>
        useCardProviderAuthentication(),
      );

      act(() => {
        result.current.login(loginParams);
      });

      await waitForNextUpdate();

      expect(result.current.loading).toBe(true);

      act(() => {
        resolveLogin?.({ token: 'test-token', url: 'test-url' });
      });

      await waitForNextUpdate();

      expect(result.current.loading).toBe(false);
    });
  });

  describe('error handling', () => {
    const testCases = [
      {
        errorType: CardErrorType.INVALID_CREDENTIALS,
        expectedStringKey:
          'card.card_authentication.errors.invalid_credentials',
      },
      {
        errorType: CardErrorType.NETWORK_ERROR,
        expectedStringKey: 'card.card_authentication.errors.network_error',
      },
      {
        errorType: CardErrorType.TIMEOUT_ERROR,
        expectedStringKey: 'card.card_authentication.errors.timeout_error',
      },
      {
        errorType: CardErrorType.API_KEY_MISSING,
        expectedStringKey:
          'card.card_authentication.errors.configuration_error',
      },
      {
        errorType: CardErrorType.SERVER_ERROR,
        expectedStringKey: 'card.card_authentication.errors.server_error',
      },
      {
        errorType: CardErrorType.UNKNOWN_ERROR,
        expectedStringKey: 'card.card_authentication.errors.unknown_error',
      },
    ] as const;

    it.each(testCases)(
      'handles $errorType error and sets appropriate error message',
      async ({ errorType, expectedStringKey }) => {
        const loginParams = {
          location: 'us' as CardLocation,
          email: 'test@example.com',
          password: 'password123',
        };

        const cardError = new CardError(errorType, 'Test error message');
        mockSdk.initiateCardProviderAuthentication.mockRejectedValue(cardError);

        const { result } = renderHook(() => useCardProviderAuthentication());

        await act(async () => {
          try {
            await result.current.login(loginParams);
          } catch {
            // Expected to throw
          }
        });

        expect(mockStrings).toHaveBeenCalledWith(expectedStringKey);
        expect(result.current.error).toBe(`mocked_${expectedStringKey}`);
        expect(result.current.loading).toBe(false);
      },
    );

    it('handles validation error with specific message', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const validationError = new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Email format is invalid',
      );
      mockSdk.initiateCardProviderAuthentication.mockRejectedValue(
        validationError,
      );

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        try {
          await result.current.login(loginParams);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Email format is invalid');
      expect(result.current.loading).toBe(false);
    });

    it('handles non-CardError instances with unknown error message', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const genericError = new Error('Something went wrong');
      mockSdk.initiateCardProviderAuthentication.mockRejectedValue(
        genericError,
      );

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        try {
          await result.current.login(loginParams);
        } catch {
          // Expected to throw
        }
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.unknown_error',
      );
      expect(result.current.error).toBe(
        'mocked_card.card_authentication.errors.unknown_error',
      );
      expect(result.current.loading).toBe(false);
    });

    it('throws error when SDK is not initialized', async () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isAuthenticated: false,
        setIsAuthenticated: mockSetIsAuthenticated,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        userCardLocation: 'international',
      });

      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await expect(result.current.login(loginParams)).rejects.toThrow(
          'Card SDK not initialized',
        );
      });
    });
  });

  describe('state validation', () => {
    it('throws error when authorize response state does not match', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const mockInitiateResponse = { token: 'initiate-token', url: 'mock-url' };
      const mockLoginResponse = {
        phase: null,
        userId: 'user-123',
        isOtpRequired: false,
        phoneNumber: null,
        accessToken: 'login-access-token',
        verificationState: 'verified',
        isLinked: true,
      };
      const mockAuthorizeResponse = {
        state: 'different-state-uuid', // Different from mockStateUuid
        url: 'authorize-url',
        code: 'auth-code',
      };

      mockSdk.initiateCardProviderAuthentication.mockResolvedValue(
        mockInitiateResponse,
      );
      mockSdk.login.mockResolvedValue(mockLoginResponse);
      mockSdk.authorize.mockResolvedValue(mockAuthorizeResponse);

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await expect(result.current.login(loginParams)).rejects.toThrow(
          'Invalid state',
        );
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('clearError functionality', () => {
    it('clears error when clearError is called', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const cardError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network failed',
      );
      mockSdk.initiateCardProviderAuthentication.mockRejectedValue(cardError);

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        try {
          await result.current.login(loginParams);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
