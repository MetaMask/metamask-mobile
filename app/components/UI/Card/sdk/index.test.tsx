import React from 'react';
import {
  renderHook,
  render,
  waitFor,
  act,
} from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  CardSDKProvider,
  useCardSDK,
  ICardSDK,
  CardVerification,
} from './index';
import { CardSDK } from './CardSDK';
import {
  CardFeatureFlag,
  SupportedToken,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';
import {
  getCardBaanxToken,
  storeCardBaanxToken,
  removeCardBaanxToken,
} from '../util/cardTokenVault';
import Logger from '../../../../util/Logger';
import { View } from 'react-native';

jest.mock('./CardSDK', () => ({
  CardSDK: jest.fn().mockImplementation(() => ({
    isCardEnabled: true,
    isBaanxLoginEnabled: true,
    getSupportedTokensByChainId: jest.fn(() => []),
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
    refreshLocalToken: jest.fn(),
  })),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFeatureFlag: jest.fn(),
  selectCardExperimentalSwitch: jest.fn(() => false),
  selectCardSupportedCountries: jest.fn(() => []),
  selectDisplayCardButtonFeatureFlag: jest.fn(() => false),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => null),
}));

// Create a stable mock dispatch function to prevent useEffect retriggering
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => mockDispatch),
}));

jest.mock('../hooks/useCardholderCheck', () => ({
  useCardholderCheck: jest.fn(),
}));

jest.mock('../util/cardTokenVault', () => ({
  getCardBaanxToken: jest.fn(),
  storeCardBaanxToken: jest.fn(),
  removeCardBaanxToken: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

describe('CardSDK Context', () => {
  const MockedCardholderSDK = jest.mocked(CardSDK);
  const mockUseSelector = jest.mocked(useSelector);
  const mockSelectCardFeatureFlag = jest.mocked(selectCardFeatureFlag);
  const mockUseCardholderCheck = jest.mocked(useCardholderCheck);
  const mockGetCardBaanxToken = jest.mocked(getCardBaanxToken);
  const mockStoreCardBaanxToken = jest.mocked(storeCardBaanxToken);
  const mockRemoveCardBaanxToken = jest.mocked(removeCardBaanxToken);
  const mockLogger = jest.mocked(Logger);

  const mockSupportedTokens: SupportedToken[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ];

  const mockCardFeatureFlag: CardFeatureFlag = {
    constants: {
      onRampApiUrl: 'https://api.onramp.example.com',
      accountsApiUrl: 'https://api.accounts.example.com',
    },
    chains: {
      'eip155:59144': {
        enabled: true,
        tokens: mockSupportedTokens,
      },
    },
  };

  // Helper: Setup feature flag selector
  const setupMockUseSelector = (
    featureFlag: CardFeatureFlag | null | undefined | Record<string, never>,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectCardFeatureFlag) {
        return featureFlag;
      }
      return null;
    });
  };

  // Helper: Create mock SDK with custom properties
  const createMockSDK = (
    overrides: Partial<CardSDK> = {},
  ): Partial<CardSDK> => ({
    isCardEnabled: true,
    isBaanxLoginEnabled: true,
    getSupportedTokensByChainId: jest.fn(() => []),
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
    refreshLocalToken: jest.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    }),
    ...overrides,
  });

  // Helper: Setup SDK mock
  const setupMockSDK = (sdkProperties: Partial<CardSDK> = {}) => {
    MockedCardholderSDK.mockImplementation(
      () => createMockSDK(sdkProperties) as CardSDK,
    );
  };

  // Helper: Create wrapper component
  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <CardSDKProvider>{children}</CardSDKProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    MockedCardholderSDK.mockClear();
    mockSelectCardFeatureFlag.mockClear();
    mockUseSelector.mockClear();
    mockUseCardholderCheck.mockClear();
    mockGetCardBaanxToken.mockClear();
    mockStoreCardBaanxToken.mockClear();
    mockRemoveCardBaanxToken.mockClear();
    mockLogger.log.mockClear();
    mockDispatch.mockClear();

    // Default: no token found
    mockGetCardBaanxToken.mockResolvedValue({
      success: false,
      error: 'No token found',
    });
    mockStoreCardBaanxToken.mockResolvedValue({ success: true });
    mockRemoveCardBaanxToken.mockResolvedValue({ success: true });
  });

  describe('CardSDKProvider', () => {
    it('initializes SDK when feature flag is available', () => {
      // Given: feature flag is configured
      setupMockUseSelector(mockCardFeatureFlag);

      // When: provider renders
      render(
        <CardSDKProvider>
          <View>Test Child</View>
        </CardSDKProvider>,
      );

      // Then: SDK should be created with feature flag
      expect(MockedCardholderSDK).toHaveBeenCalledWith({
        cardFeatureFlag: mockCardFeatureFlag,
      });
    });

    it('does not initialize SDK when feature flag is missing', () => {
      // Given: no feature flag
      setupMockUseSelector(null);

      // When: provider renders
      render(
        <CardSDKProvider>
          <View>Test Child</View>
        </CardSDKProvider>,
      );

      // Then: SDK should not be created
      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('uses provided value prop when given', () => {
      // Given: a custom context value
      setupMockUseSelector(mockCardFeatureFlag);
      const providedValue: ICardSDK = {
        sdk: null,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        userCardLocation: 'international' as const,
      };

      // When: provider renders with custom value
      const TestComponent = () => {
        const context = useCardSDK();
        expect(context).toEqual(providedValue);
        return <View>Test Child</View>;
      };

      render(
        <CardSDKProvider value={providedValue}>
          <TestComponent />
        </CardSDKProvider>,
      );

      // Then: custom value is used (assertion in TestComponent)
    });
  });

  describe('useCardSDK', () => {
    it('returns SDK context when used within provider', async () => {
      // Given: provider with feature flag
      setupMockUseSelector(mockCardFeatureFlag);

      // When: hook is called within provider
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should return valid context
      await waitFor(() => {
        expect(result.current.sdk).not.toBeNull();
      });

      expect(result.current).toEqual({
        sdk: expect.any(Object),
        isLoading: expect.any(Boolean),
        logoutFromProvider: expect.any(Function),
        userCardLocation: expect.stringMatching(/^(us|international)$/),
      });
    });

    it('throws error when used outside provider', () => {
      // Given: no provider
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console error for test
        });

      // When: hook is called without provider
      // Then: should throw error
      expect(() => {
        renderHook(() => useCardSDK());
      }).toThrow('useCardSDK must be used within a CardSDKProvider');

      consoleError.mockRestore();
    });
  });

  describe('Authentication Logic', () => {
    const mockValidTokenData = {
      accessToken: 'valid-access-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: Date.now() + 3600000, // 1 hour from now
      location: 'international' as const,
    };

    const mockExpiredTokenData = {
      accessToken: 'expired-access-token',
      refreshToken: 'expired-refresh-token',
      expiresAt: Date.now() - 3600000, // 1 hour ago
      location: 'us' as const,
    };

    it('authenticates user with valid token', async () => {
      // Given: valid token available
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: mockValidTokenData,
      });

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: user should be authenticated
      await waitFor(() => {
        expect(result.current.userCardLocation).toBe('international');
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCardBaanxToken).toHaveBeenCalled();
    });

    it('does not authenticate when token retrieval fails', async () => {
      // Given: token retrieval fails
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: false,
        error: 'Keychain error',
      });

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should complete loading without authenticating
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify authentication was cleared via dispatch
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('does not authenticate when token data is missing', async () => {
      // Given: no token data
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: undefined,
      });

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should not authenticate
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('refreshes expired token successfully', async () => {
      // Given: expired token available
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: mockExpiredTokenData,
      });

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: token should be refreshed and stored
      await waitFor(() => {
        expect(result.current.userCardLocation).toBe('us');
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockStoreCardBaanxToken).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: expect.any(Number),
        location: 'us',
      });
    });

    it('logs error when token refresh fails', async () => {
      // Given: expired token and refresh failure
      setupMockSDK({
        refreshLocalToken: jest
          .fn()
          .mockRejectedValue(new Error('Refresh failed')),
      });
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: mockExpiredTokenData,
      });

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should log error
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error),
      );
    });

    it('skips authentication when Baanx login is disabled', async () => {
      // Given: Baanx login disabled
      setupMockSDK({ isBaanxLoginEnabled: false });
      setupMockUseSelector(mockCardFeatureFlag);

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should not attempt authentication
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
    });

    it('handles authentication errors gracefully', async () => {
      // Given: authentication throws error
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockRejectedValue(new Error('Unexpected error'));

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should log error and complete loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Authentication check failed:',
        expect.any(Error),
      );
    });
  });

  describe('Logout Functionality', () => {
    it('logs out user successfully', async () => {
      // Given: authenticated user
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: {
          accessToken: 'valid-access-token',
          refreshToken: 'valid-refresh-token',
          expiresAt: Date.now() + 3600000,
          location: 'international' as const,
        },
      });

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // When: user logs out
      await act(async () => {
        await result.current.logoutFromProvider();
      });

      // Then: token should be removed
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
    });

    it('throws error when SDK is unavailable for logout', async () => {
      // Given: no SDK available
      setupMockUseSelector(null);

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.sdk).toBeNull();
      });

      // When: attempting logout
      // Then: should throw error
      await expect(result.current.logoutFromProvider()).rejects.toThrow(
        'SDK not available for logout',
      );
    });
  });

  describe('Loading States', () => {
    it('shows loading state during authentication', async () => {
      // Given: slow token retrieval
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  tokenData: {
                    accessToken: 'valid-access-token',
                    refreshToken: 'valid-refresh-token',
                    expiresAt: Date.now() + 3600000,
                    location: 'international' as const,
                  },
                }),
              100,
            ),
          ),
      );

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should show loading initially
      expect(result.current.isLoading).toBe(true);

      // And: loading should complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('does not show loading when Baanx login is disabled', async () => {
      // Given: Baanx login disabled
      setupMockSDK({ isBaanxLoginEnabled: false });
      setupMockUseSelector(mockCardFeatureFlag);

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should not be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh Edge Cases', () => {
    it('handles invalid token response during refresh', async () => {
      // Given: expired token and invalid refresh response
      setupMockSDK({
        refreshLocalToken: jest.fn().mockResolvedValue({
          accessToken: null, // Invalid response
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        }),
      });
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: {
          accessToken: 'expired-access-token',
          refreshToken: 'expired-refresh-token',
          expiresAt: Date.now() - 3600000,
          location: 'us' as const,
        },
      });

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should log error and not store invalid token
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error),
      );
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });
  });

  describe('CardVerification', () => {
    it('calls useCardholderCheck hook', () => {
      // When: component renders
      render(<CardVerification />);

      // Then: should call cardholder check
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(1);
    });

    it('renders nothing', () => {
      // When: component renders
      const { toJSON } = render(<CardVerification />);

      // Then: should return null
      expect(toJSON()).toBeNull();
    });
  });
});
