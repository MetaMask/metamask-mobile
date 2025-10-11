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
import { selectChainId } from '../../../../selectors/networkController';
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
    supportedTokens: [],
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
    refreshLocalToken: jest.fn(),
  })),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFeatureFlag: jest.fn(),
}));

// Mock react-redux hooks
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
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
  const mockSelectChainId = jest.mocked(selectChainId);
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

  beforeEach(() => {
    jest.clearAllMocks();
    MockedCardholderSDK.mockClear();
    mockSelectChainId.mockClear();
    mockSelectCardFeatureFlag.mockClear();
    mockUseSelector.mockClear();
    mockUseCardholderCheck.mockClear();
    mockGetCardBaanxToken.mockClear();
    mockStoreCardBaanxToken.mockClear();
    mockRemoveCardBaanxToken.mockClear();
    mockLogger.log.mockClear();

    // Default successful token retrieval
    mockGetCardBaanxToken.mockResolvedValue({
      success: false,
      error: 'No token found',
    });
    mockStoreCardBaanxToken.mockResolvedValue({ success: true });
    mockRemoveCardBaanxToken.mockResolvedValue({ success: true });
  });

  const setupMockUseSelector = (
    featureFlag: CardFeatureFlag | null | undefined,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectCardFeatureFlag) {
        return featureFlag;
      }
      return null;
    });
  };

  describe('CardSDKProvider', () => {
    it('should render children without crashing', () => {
      setupMockUseSelector(mockCardFeatureFlag);

      const TestComponent = () => <View>Test Child</View>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).toHaveBeenCalledWith({
        cardFeatureFlag: mockCardFeatureFlag,
      });
    });

    it('should not initialize SDK when card feature flag is missing', () => {
      setupMockUseSelector(null);

      const TestComponent = () => <View>Test Child</View>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should use provided value prop when given', () => {
      setupMockUseSelector(mockCardFeatureFlag);

      const providedValue: ICardSDK = {
        sdk: null,
        isAuthenticated: false,
        setIsAuthenticated: jest.fn(),
        isLoading: false,
        logoutFromProvider: jest.fn(),
        userCardLocation: 'international' as const,
      };

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
    });
  });

  describe('useCardSDK', () => {
    it('should return SDK context when used within provider', async () => {
      setupMockUseSelector(mockCardFeatureFlag);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.sdk).not.toBeNull();
      });

      expect(result.current).toEqual({
        sdk: expect.any(Object),
        isAuthenticated: expect.any(Boolean),
        setIsAuthenticated: expect.any(Function),
        isLoading: expect.any(Boolean),
        logoutFromProvider: expect.any(Function),
        userCardLocation: expect.stringMatching(/^(us|international)$/),
      });
      expect(result.current.sdk).toHaveProperty('isCardEnabled', true);
      expect(result.current.sdk).toHaveProperty('isBaanxLoginEnabled', true);
      expect(result.current.sdk).toHaveProperty('supportedTokens', []);
      expect(result.current.sdk).toHaveProperty('isCardHolder');
      expect(result.current.sdk).toHaveProperty('getGeoLocation');
      expect(result.current.sdk).toHaveProperty('getSupportedTokensAllowances');
      expect(result.current.sdk).toHaveProperty('getPriorityToken');
      expect(result.current.sdk).toHaveProperty('refreshLocalToken');
    });

    it('should throw error when used outside of provider', () => {
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Suppress console error for test
        });

      expect(() => {
        renderHook(() => useCardSDK());
      }).toThrow('useCardSDK must be used within a CardSDKProvider');

      consoleError.mockRestore();
    });
  });

  describe('CardSDK interface', () => {
    it('should have correct interface structure', async () => {
      setupMockUseSelector(mockCardFeatureFlag);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.sdk).not.toBeNull();
      });

      expect(result.current).toHaveProperty('sdk');
      expect(
        typeof result.current.sdk === 'object' || result.current.sdk === null,
      ).toBe(true);

      if (result.current.sdk) {
        expect(result.current.sdk).toHaveProperty('isCardEnabled');
        expect(result.current.sdk).toHaveProperty('isBaanxLoginEnabled');
        expect(result.current.sdk).toHaveProperty('supportedTokens');
        expect(result.current.sdk).toHaveProperty('isCardHolder');
        expect(result.current.sdk).toHaveProperty('getGeoLocation');
        expect(result.current.sdk).toHaveProperty(
          'getSupportedTokensAllowances',
        );
        expect(result.current.sdk).toHaveProperty('getPriorityToken');
        expect(result.current.sdk).toHaveProperty('refreshLocalToken');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined card feature flag gracefully', () => {
      setupMockUseSelector(undefined);

      const TestComponent = () => <View>Test Child</View>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).not.toHaveBeenCalled();
    });

    it('should handle empty card feature flag gracefully', () => {
      setupMockUseSelector({});

      const TestComponent = () => <View>Test Child</View>;

      render(
        <CardSDKProvider>
          <TestComponent />
        </CardSDKProvider>,
      );

      expect(MockedCardholderSDK).toHaveBeenCalledWith({
        cardFeatureFlag: {},
      });
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

    beforeEach(() => {
      // Mock SDK with Baanx login enabled
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: true,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn().mockResolvedValue({
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
              expiresIn: 3600,
            }),
          } as unknown as CardSDK),
      );
    });

    it('should authenticate user with valid token', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: mockValidTokenData,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.userCardLocation).toBe('international');
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCardBaanxToken).toHaveBeenCalled();
    });

    it('should not authenticate user when token retrieval fails', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: false,
        error: 'Keychain error',
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token retrieval failed:',
        'Keychain error',
      );
    });

    it('should not authenticate user when no token data exists', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: undefined,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should refresh expired token successfully', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: mockExpiredTokenData,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
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

    it('should handle token refresh failure', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: mockExpiredTokenData,
      });

      // Mock refresh token failure
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: true,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest
              .fn()
              .mockRejectedValue(new Error('Refresh failed')),
          } as unknown as CardSDK),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error),
      );
    });

    it('should skip authentication when Baanx login is disabled', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      // Mock SDK with Baanx login disabled
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: false,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn(),
          } as unknown as CardSDK),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
    });

    it('should handle authentication errors gracefully', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockRejectedValue(new Error('Unexpected error'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Authentication check failed:',
        expect.any(Error),
      );
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(() => {
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: true,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn(),
          } as unknown as CardSDK),
      );
    });

    it('should logout user successfully', async () => {
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      // Wait for initial authentication
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Perform logout
      await act(async () => {
        await result.current.logoutFromProvider();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
    });

    it('should throw error when SDK is not available for logout', async () => {
      setupMockUseSelector(null); // No feature flag = no SDK

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.sdk).toBeNull();
      });

      await expect(result.current.logoutFromProvider()).rejects.toThrow(
        'SDK not available for logout',
      );
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: true,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn(),
          } as unknown as CardSDK),
      );
    });

    it('should show loading state during authentication', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      // Delay token retrieval to capture loading state
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      // Should start with loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      // Wait for authentication to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should not show loading when Baanx login is disabled', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      // Mock SDK with Baanx login disabled
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: false,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn(),
          } as unknown as CardSDK),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
      });

      // Should never have been in loading state
      expect(mockGetCardBaanxToken).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh Edge Cases', () => {
    beforeEach(() => {
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: true,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn(),
          } as unknown as CardSDK),
      );
    });

    it('should handle invalid token response during refresh', async () => {
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

      // Mock invalid refresh response
      MockedCardholderSDK.mockImplementation(
        () =>
          ({
            isCardEnabled: true,
            isBaanxLoginEnabled: true,
            supportedTokens: [],
            isCardHolder: jest.fn(),
            getGeoLocation: jest.fn(),
            getSupportedTokensAllowances: jest.fn(),
            getPriorityToken: jest.fn(),
            refreshLocalToken: jest.fn().mockResolvedValue({
              accessToken: null, // Invalid response
              refreshToken: 'new-refresh-token',
              expiresIn: 3600,
            }),
          } as unknown as CardSDK),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error),
      );
      expect(mockStoreCardBaanxToken).not.toHaveBeenCalled();
    });

    it('should handle SDK unavailable during token refresh', async () => {
      setupMockUseSelector(mockCardFeatureFlag);
      mockGetCardBaanxToken.mockResolvedValue({
        success: true,
        tokenData: {
          accessToken: 'expired-access-token',
          refreshToken: 'expired-refresh-token',
          expiresAt: Date.now() - 3600000,
          location: 'international' as const,
        },
      });

      // Create provider but force SDK to be null during refresh
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CardSDKProvider>{children}</CardSDKProvider>
      );

      const { result } = renderHook(() => useCardSDK(), { wrapper });

      // Mock SDK becoming null during refresh (edge case)
      const originalSdk = result.current.sdk;
      if (originalSdk) {
        (originalSdk as CardSDK).refreshLocalToken = jest
          .fn()
          .mockImplementation(() => {
            // Simulate SDK becoming unavailable during refresh
            throw new Error('SDK not available for token refresh');
          });
      }

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('CardVerification', () => {
    beforeEach(() => {
      mockUseCardholderCheck.mockClear();
    });

    it('should render without crashing', () => {
      const result = render(<CardVerification />);
      expect(result).toBeTruthy();
    });

    it('should call useCardholderCheck hook', () => {
      render(<CardVerification />);
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(1);
    });

    it('should return null (render nothing)', () => {
      const { toJSON } = render(<CardVerification />);
      expect(toJSON()).toBeNull();
    });

    it('should call useCardholderCheck on every render', () => {
      const { rerender } = render(<CardVerification />);
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(1);

      rerender(<CardVerification />);
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(2);
    });

    it('should be a functional component', () => {
      expect(typeof CardVerification).toBe('function');
      expect(CardVerification.prototype).toEqual({});
    });
  });
});
