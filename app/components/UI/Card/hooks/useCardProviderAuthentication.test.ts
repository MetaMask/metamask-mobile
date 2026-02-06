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
import { useDispatch } from 'react-redux';
import {
  setIsAuthenticatedCard,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';

jest.mock('@sentry/core');
jest.mock('../sdk');
jest.mock('../util/cardTokenVault');
jest.mock('../util/pkceHelpers');
jest.mock('../../../../../locales/i18n');
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));
jest.mock('../../../../core/redux/slices/card', () => ({
  setIsAuthenticatedCard: jest.fn(),
  setUserCardLocation: jest.fn(),
}));

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
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetIsAuthenticatedCard =
  setIsAuthenticatedCard as jest.MockedFunction<typeof setIsAuthenticatedCard>;
const mockSetUserCardLocation = setUserCardLocation as jest.MockedFunction<
  typeof setUserCardLocation
>;

describe('useCardProviderAuthentication', () => {
  const mockSdk = {
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
    sendOtpLogin: jest.fn(),
  };
  const mockDispatch = jest.fn();
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
      ...jest.requireMock('../sdk'),
      sdk: mockSdk as unknown as CardSDK,
    });
    mockStrings.mockImplementation((key: string) => `mocked_${key}`);
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetIsAuthenticatedCard.mockReturnValue({
      type: 'card/setIsAuthenticatedCard',
      payload: true,
    } as ReturnType<typeof setIsAuthenticatedCard>);
    mockSetUserCardLocation.mockReturnValue({
      type: 'card/setUserCardLocation',
      payload: 'us',
    } as ReturnType<typeof setUserCardLocation>);
  });

  describe('initial state', () => {
    it('returns initial state with no error and not loading', () => {
      const { result } = renderHook(() => useCardProviderAuthentication());

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.otpError).toBeNull();
      expect(result.current.otpLoading).toBe(false);
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.sendOtpLogin).toBe('function');
      expect(typeof result.current.clearOtpError).toBe('function');
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
        state: mockStateUuid,
        codeChallenge: mockCodeChallenge,
        location: loginParams.location,
      });
      expect(mockSdk.login).toHaveBeenCalledWith({
        email: loginParams.email,
        password: loginParams.password,
        location: loginParams.location,
      });
      expect(mockSdk.authorize).toHaveBeenCalledWith({
        initiateAccessToken: mockInitiateResponse.token,
        loginAccessToken: mockLoginResponse.accessToken,
        location: loginParams.location,
      });
      expect(mockSdk.exchangeToken).toHaveBeenCalledWith({
        code: mockAuthorizeResponse.code,
        codeVerifier: mockCodeVerifier,
        grantType: 'authorization_code',
        location: loginParams.location,
      });
      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: mockExchangeTokenResponse.accessToken,
        refreshToken: mockExchangeTokenResponse.refreshToken,
        accessTokenExpiresAt: mockExchangeTokenResponse.expiresIn,
        refreshTokenExpiresAt: mockExchangeTokenResponse.refreshTokenExpiresIn,
        location: loginParams.location,
      });
      expect(mockSetIsAuthenticatedCard).toHaveBeenCalledWith(true);
      expect(mockSetUserCardLocation).toHaveBeenCalledWith(
        loginParams.location,
      );
      expect(mockDispatch).toHaveBeenCalledTimes(2);
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
        errorType: CardErrorType.VALIDATION_ERROR,
        expectedStringKey:
          'card.card_authentication.errors.invalid_email_or_password',
      },
      {
        errorType: CardErrorType.SERVER_ERROR,
        expectedStringKey: 'card.card_authentication.errors.server_error',
      },
      {
        errorType: CardErrorType.INVALID_OTP_CODE,
        expectedStringKey: 'card.card_authentication.errors.invalid_otp_code',
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

    it('handles validation error with localized message', async () => {
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

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.invalid_email_or_password',
      );
      expect(result.current.error).toBe(
        'mocked_card.card_authentication.errors.invalid_email_or_password',
      );
      expect(result.current.loading).toBe(false);
    });

    it('handles ACCOUNT_DISABLED error with custom message from error', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const accountDisabledMessage =
        'Your account has been disabled. Please contact support.';
      const accountDisabledError = new CardError(
        CardErrorType.ACCOUNT_DISABLED,
        accountDisabledMessage,
      );
      mockSdk.initiateCardProviderAuthentication.mockRejectedValue(
        accountDisabledError,
      );

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        try {
          await result.current.login(loginParams);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(accountDisabledMessage);
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
        ...jest.requireMock('../sdk'),
        sdk: null,
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

  describe('OTP login flow', () => {
    it('returns login response when OTP is required', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
      };

      const mockInitiateResponse = { token: 'initiate-token', url: 'mock-url' };
      const mockLoginResponse = {
        phase: null,
        userId: 'user-123',
        isOtpRequired: true,
        phoneNumber: '+1234567890',
        accessToken: null,
        verificationState: 'pending',
        isLinked: false,
      };

      mockSdk.initiateCardProviderAuthentication.mockResolvedValue(
        mockInitiateResponse,
      );
      mockSdk.login.mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useCardProviderAuthentication());

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login(loginParams);
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
      expect(mockSdk.authorize).not.toHaveBeenCalled();
      expect(mockSdk.exchangeToken).not.toHaveBeenCalled();
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
      expect(loginResult).toEqual(mockLoginResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('completes authentication flow when OTP code is provided', async () => {
      const loginParams = {
        location: 'us' as CardLocation,
        email: 'test@example.com',
        password: 'password123',
        otpCode: '123456',
      };

      const mockInitiateResponse = { token: 'initiate-token', url: 'mock-url' };
      const mockLoginResponse = {
        phase: null,
        userId: 'user-123',
        isOtpRequired: false,
        phoneNumber: '+1234567890',
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

      expect(mockSdk.login).toHaveBeenCalledWith({
        location: loginParams.location,
        email: loginParams.email,
        password: loginParams.password,
        otpCode: loginParams.otpCode,
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
        accessTokenExpiresAt: mockExchangeTokenResponse.expiresIn,
        refreshTokenExpiresAt: mockExchangeTokenResponse.refreshTokenExpiresIn,
        location: loginParams.location,
      });
      expect(mockSetIsAuthenticatedCard).toHaveBeenCalledWith(true);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/setIsAuthenticatedCard',
        payload: true,
      });
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('sendOtpLogin', () => {
    it('sends OTP login request', async () => {
      const otpParams = {
        userId: 'user-123',
        location: 'us' as CardLocation,
      };

      mockSdk.sendOtpLogin.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await result.current.sendOtpLogin(otpParams);
      });

      expect(mockSdk.sendOtpLogin).toHaveBeenCalledWith({
        userId: otpParams.userId,
        location: otpParams.location,
      });
      expect(result.current.otpError).toBeNull();
      expect(result.current.otpLoading).toBe(false);
    });

    it('sets otpLoading to true during OTP request', async () => {
      const otpParams = {
        userId: 'user-123',
        location: 'us' as CardLocation,
      };

      let resolveSendOtp: (() => void) | undefined;
      const sendOtpPromise = new Promise<void>((resolve) => {
        resolveSendOtp = resolve;
      });

      mockSdk.sendOtpLogin.mockReturnValue(sendOtpPromise);

      const { result } = renderHook(() => useCardProviderAuthentication());

      let sendOtpPromiseResult: Promise<void>;
      await act(async () => {
        sendOtpPromiseResult = result.current.sendOtpLogin(otpParams);
        await Promise.resolve();
      });

      expect(result.current.otpLoading).toBe(true);

      await act(async () => {
        resolveSendOtp?.();
        await sendOtpPromiseResult;
      });

      expect(result.current.otpLoading).toBe(false);
    });

    it('handles error when sending OTP fails', async () => {
      const otpParams = {
        userId: 'user-123',
        location: 'us' as CardLocation,
      };

      const cardError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network failed',
      );
      mockSdk.sendOtpLogin.mockRejectedValue(cardError);

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await result.current.sendOtpLogin(otpParams);
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'card.card_authentication.errors.network_error',
      );
      expect(result.current.otpError).toBe(
        'mocked_card.card_authentication.errors.network_error',
      );
      expect(result.current.otpLoading).toBe(false);
    });

    it('handles ACCOUNT_DISABLED error when sending OTP', async () => {
      const otpParams = {
        userId: 'user-123',
        location: 'us' as CardLocation,
      };

      const accountDisabledMessage =
        'Your account has been disabled. Please contact support.';
      const accountDisabledError = new CardError(
        CardErrorType.ACCOUNT_DISABLED,
        accountDisabledMessage,
      );
      mockSdk.sendOtpLogin.mockRejectedValue(accountDisabledError);

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await result.current.sendOtpLogin(otpParams);
      });

      expect(result.current.otpError).toBe(accountDisabledMessage);
      expect(result.current.otpLoading).toBe(false);
    });

    it('throws error when SDK is not initialized', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const otpParams = {
        userId: 'user-123',
        location: 'us' as CardLocation,
      };

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await expect(result.current.sendOtpLogin(otpParams)).rejects.toThrow(
          'Card SDK not initialized',
        );
      });
    });
  });

  describe('clearOtpError functionality', () => {
    it('clears OTP error when clearOtpError is called', async () => {
      const otpParams = {
        userId: 'user-123',
        location: 'us' as CardLocation,
      };

      const cardError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network failed',
      );
      mockSdk.sendOtpLogin.mockRejectedValue(cardError);

      const { result } = renderHook(() => useCardProviderAuthentication());

      await act(async () => {
        await result.current.sendOtpLogin(otpParams);
      });

      expect(result.current.otpError).not.toBeNull();

      act(() => {
        result.current.clearOtpError();
      });

      expect(result.current.otpError).toBeNull();
    });
  });
});
