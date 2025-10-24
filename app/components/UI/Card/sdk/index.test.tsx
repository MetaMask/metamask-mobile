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
import { selectUserCardLocation } from '../../../../core/redux/slices/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';
import { useCardAuthenticationVerification } from '../hooks/useCardAuthenticationVerification';
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

jest.mock('../../../../core/redux/slices/card', () => ({
  setAuthenticatedPriorityToken: jest.fn(),
  setAuthenticatedPriorityTokenLastFetched: jest.fn(),
  setIsAuthenticatedCard: jest.fn(),
  selectUserCardLocation: jest.fn(),
  setUserCardLocation: jest.fn(),
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

jest.mock('../hooks/useCardAuthenticationVerification', () => ({
  useCardAuthenticationVerification: jest.fn(),
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
  const mockSelectUserCardLocation = jest.mocked(selectUserCardLocation);
  const mockUseCardholderCheck = jest.mocked(useCardholderCheck);
  const mockUseCardAuthenticationVerification = jest.mocked(
    useCardAuthenticationVerification,
  );
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
    userCardLocation: 'us' | 'international' | null = null,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectCardFeatureFlag) {
        return featureFlag;
      }
      if (selector === mockSelectUserCardLocation) {
        return userCardLocation;
      }
      return null;
    });
  };

  // Helper: Create mock SDK with custom properties
  const createMockSDK = (
    overrides: Partial<CardSDK> = {},
  ): Partial<CardSDK> => ({
    isCardEnabled: true,
    getSupportedTokensByChainId: jest.fn(() => []),
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
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
    mockUseCardAuthenticationVerification.mockClear();
    mockGetCardBaanxToken.mockClear();
    mockStoreCardBaanxToken.mockClear();
    mockRemoveCardBaanxToken.mockClear();
    mockLogger.log.mockClear();
    mockDispatch.mockClear();

    // Default: no token found
    mockGetCardBaanxToken.mockResolvedValue({
      success: false,
      tokenData: null,
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
        userCardLocation: null,
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

  describe('SDK Initialization', () => {
    it('initializes SDK with user card location from Redux', async () => {
      // Given: feature flag and user location in Redux
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag, 'us');

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: SDK should be initialized with location
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(MockedCardholderSDK).toHaveBeenCalledWith({
        cardFeatureFlag: mockCardFeatureFlag,
        userCardLocation: 'us',
      });
    });

    it('completes loading when SDK is initialized', async () => {
      // Given: feature flag configured
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: loading should complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sdk).not.toBeNull();
    });
  });

  describe('Logout Functionality', () => {
    it('logs out user successfully', async () => {
      // Given: SDK available
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);

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

      // Then: token should be removed and authentication data cleared
      expect(mockRemoveCardBaanxToken).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
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
    it('completes loading when SDK is initialized', async () => {
      // Given: feature flag configured
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag);

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: loading should complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sdk).not.toBeNull();
    });

    it('completes loading when feature flag is missing', async () => {
      // Given: no feature flag
      setupMockUseSelector(null);

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: should complete loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sdk).toBeNull();
    });
  });

  describe('CardVerification', () => {
    it('calls useCardholderCheck hook', () => {
      // When: component renders
      render(<CardVerification />);

      // Then: should call cardholder check
      expect(mockUseCardholderCheck).toHaveBeenCalledTimes(1);
    });

    it('calls useCardAuthenticationVerification hook', () => {
      // When: component renders
      render(<CardVerification />);

      // Then: should call authentication verification
      expect(mockUseCardAuthenticationVerification).toHaveBeenCalledTimes(1);
    });

    it('renders nothing', () => {
      // When: component renders
      const { toJSON } = render(<CardVerification />);

      // Then: should return null
      expect(toJSON()).toBeNull();
    });
  });
});
