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
import {
  selectUserCardLocation,
  selectOnboardingId,
} from '../../../../core/redux/slices/card';
import { useCardholderCheck } from '../hooks/useCardholderCheck';
import { useCardAuthenticationVerification } from '../hooks/useCardAuthenticationVerification';
import {
  getCardBaanxToken,
  storeCardBaanxToken,
  removeCardBaanxToken,
} from '../util/cardTokenVault';
import Logger from '../../../../util/Logger';
import { View } from 'react-native';
import { UserResponse } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';

jest.mock('./CardSDK', () => ({
  CardSDK: jest.fn().mockImplementation(() => ({
    isCardEnabled: true,
    getSupportedTokensByChainId: jest.fn(() => []),
    isCardHolder: jest.fn(),
    getGeoLocation: jest.fn(),
    getSupportedTokensAllowances: jest.fn(),
    getPriorityToken: jest.fn(),
    refreshLocalToken: jest.fn(),
    getRegistrationStatus: jest.fn(),
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
  selectOnboardingId: jest.fn(),
  resetOnboardingState: jest.fn(() => ({
    type: 'card/resetOnboardingState',
  })),
  resetAuthenticatedData: jest.fn(() => ({
    type: 'card/resetAuthenticatedData',
  })),
  clearAllCache: jest.fn(() => ({
    type: 'card/clearAllCache',
  })),
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

jest.mock('../util/getErrorMessage', () => ({
  getErrorMessage: jest.fn(),
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
  const mockGetErrorMessage = jest.mocked(getErrorMessage);

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

  const mockSelectOnboardingId = jest.mocked(selectOnboardingId);

  // Helper: Setup feature flag selector
  const setupMockUseSelector = (
    featureFlag: CardFeatureFlag | null | undefined | Record<string, never>,
    userCardLocation: 'us' | 'international' | null = null,
    onboardingId: string | null = null,
  ) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectCardFeatureFlag) {
        return featureFlag;
      }
      if (selector === mockSelectUserCardLocation) {
        return userCardLocation;
      }
      if (selector === mockSelectOnboardingId) {
        return onboardingId;
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
    getRegistrationStatus: jest.fn(),
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
        enableLogs: false,
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
        user: null,
        setUser: jest.fn(),
        fetchUserData: jest.fn(),
        logoutFromProvider: jest.fn(),
        isReturningSession: false,
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
        user: null,
        setUser: expect.any(Function),
        fetchUserData: expect.any(Function),
        isReturningSession: expect.any(Boolean),
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
        enableLogs: false,
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

  describe('User State Management', () => {
    it('initializes with null user state', () => {
      // Given: CardSDK provider is rendered
      setupMockUseSelector(mockCardFeatureFlag);
      setupMockSDK();

      // When: hook is rendered
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: user should be null initially
      expect(result.current.user).toBe(null);
    });

    it('provides setUser function', () => {
      // Given: CardSDK provider is rendered
      setupMockUseSelector(mockCardFeatureFlag);
      setupMockSDK();

      // When: hook is rendered
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: setUser function should be available
      expect(result.current.setUser).toBeDefined();
      expect(typeof result.current.setUser).toBe('function');
    });

    it('updates user state when setUser is called', () => {
      // Given: CardSDK provider is rendered
      setupMockUseSelector(mockCardFeatureFlag);
      setupMockSDK();

      const mockUser: UserResponse = {
        id: 'test-user-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
        phoneCountryCode: '+1',
        verificationState: 'VERIFIED',
        dateOfBirth: '1990-01-01',
        addressLine1: '123 Main St',
        city: 'Anytown',
        usState: 'CA',
        zip: '12345',
        countryOfResidence: 'US',
      };

      // When: hook is rendered and setUser is called
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      act(() => {
        result.current.setUser(mockUser);
      });

      // Then: user state should be updated
      expect(result.current.user).toEqual(mockUser);
    });

    it('clears user data when logoutFromProvider is called', async () => {
      // Given: CardSDK provider is rendered with user data
      setupMockUseSelector(mockCardFeatureFlag);
      setupMockSDK();

      const mockUser: UserResponse = {
        id: 'test-user-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
        phoneCountryCode: '+1',
        verificationState: 'VERIFIED',
        dateOfBirth: '1990-01-01',
        addressLine1: '123 Main St',
        city: 'Anytown',
        usState: 'CA',
        zip: '12345',
        countryOfResidence: 'US',
      };

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Set user first
      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);

      // When: logoutFromProvider is called
      await act(async () => {
        await result.current.logoutFromProvider();
      });

      // Then: user should be cleared
      expect(result.current.user).toBe(null);
    });

    it('can set user to null explicitly', () => {
      // Given: CardSDK provider is rendered with user data
      setupMockUseSelector(mockCardFeatureFlag);
      setupMockSDK();

      const mockUser: UserResponse = {
        id: 'test-user-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
        phoneCountryCode: '+1',
        verificationState: 'VERIFIED',
        dateOfBirth: '1990-01-01',
        addressLine1: '123 Main St',
        city: 'Anytown',
        usState: 'CA',
        zip: '12345',
        countryOfResidence: 'US',
      };

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Set user first
      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);

      // When: setUser is called with null
      act(() => {
        result.current.setUser(null);
      });

      // Then: user should be null
      expect(result.current.user).toBe(null);
    });
  });

  describe('Fetch User on Mount', () => {
    const mockUserResponse: UserResponse = {
      id: 'test-user-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      phoneCountryCode: '+1',
      verificationState: 'VERIFIED',
      dateOfBirth: '1990-01-01',
      addressLine1: '123 Main St',
      city: 'Anytown',
      usState: 'CA',
      zip: '12345',
      countryOfResidence: 'US',
    };

    it('fetches user data when SDK and onboardingId are available', async () => {
      // Given: SDK with getRegistrationStatus and onboardingId available
      const mockGetRegistrationStatus = jest
        .fn()
        .mockResolvedValue(mockUserResponse);
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, 'test-onboarding-id');

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: user data should be fetched and set
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).toHaveBeenCalledWith(
        'test-onboarding-id',
      );
      expect(result.current.user).toEqual(mockUserResponse);
    });

    it('does not fetch user data when SDK is not available', async () => {
      // Given: no SDK available but onboardingId exists
      setupMockUseSelector(
        null, // Pass null to indicate no card feature flag
        null,
        'test-onboarding-id',
      );

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: no user data should be fetched
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.sdk).toBe(null);
      expect(result.current.user).toBe(null);
    });

    it('does not fetch user data when onboardingId is not available', async () => {
      // Given: SDK available but no onboardingId
      const mockGetRegistrationStatus = jest.fn();
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, null);

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: no user data should be fetched
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
      expect(result.current.user).toBe(null);
    });

    it('handles errors during user data fetch', async () => {
      // Given: SDK that throws error on getRegistrationStatus
      const mockGetRegistrationStatus = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, 'test-onboarding-id');

      // When: provider initializes
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: error should be handled gracefully
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).toHaveBeenCalledWith(
        'test-onboarding-id',
      );
      expect(result.current.user).toBe(null);
    });

    it('resets onboarding state when "Invalid onboarding ID" error occurs', async () => {
      // Given: SDK that throws "Invalid onboarding ID" error
      const mockError = new Error('Invalid onboarding ID');
      const mockGetRegistrationStatus = jest.fn().mockRejectedValue(mockError);
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, 'test-onboarding-id');

      // Mock getErrorMessage to return the error message
      mockGetErrorMessage.mockReturnValue('Invalid onboarding ID');

      // When: provider initializes and fetches user data
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: error should be handled and onboarding state should be reset
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).toHaveBeenCalledWith(
        'test-onboarding-id',
      );
      expect(mockGetErrorMessage).toHaveBeenCalledWith(mockError);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'card/resetOnboardingState',
      });
      expect(result.current.user).toBe(null);
    });

    it('does not reset onboarding state for other errors', async () => {
      // Given: SDK that throws a different error
      const mockError = new Error('Network timeout');
      const mockGetRegistrationStatus = jest.fn().mockRejectedValue(mockError);
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, 'test-onboarding-id');

      // Mock getErrorMessage to return a different error message
      mockGetErrorMessage.mockReturnValue('Network timeout');

      // Clear any previous dispatch calls
      mockDispatch.mockClear();

      // When: provider initializes and fetches user data
      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      // Then: error should be handled but onboarding state should NOT be reset
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).toHaveBeenCalledWith(
        'test-onboarding-id',
      );
      expect(mockGetErrorMessage).toHaveBeenCalledWith(mockError);
      // Verify resetOnboardingState was NOT dispatched
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: 'card/resetOnboardingState',
      });
      expect(result.current.user).toBe(null);
    });
  });

  describe('hasInitialOnboardingId - Race Condition Prevention', () => {
    const mockUserResponse: UserResponse = {
      id: 'test-user-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      phoneCountryCode: '+1',
      verificationState: 'VERIFIED',
      dateOfBirth: '1990-01-01',
      addressLine1: '123 Main St',
      city: 'Anytown',
      usState: 'CA',
      zip: '12345',
      countryOfResidence: 'US',
    };

    it('does not auto-fetch user data when onboardingId is set after mount', async () => {
      const mockGetRegistrationStatus = jest
        .fn()
        .mockResolvedValue(mockUserResponse);
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, null);

      const { result, rerender } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();

      setupMockUseSelector(mockCardFeatureFlag, null, 'new-onboarding-id');
      rerender(undefined);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
      expect(result.current.user).toBe(null);
    });

    it('auto-fetches user data when onboardingId exists at mount', async () => {
      const mockGetRegistrationStatus = jest
        .fn()
        .mockResolvedValue(mockUserResponse);
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, 'existing-onboarding-id');

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRegistrationStatus).toHaveBeenCalledWith(
        'existing-onboarding-id',
      );
      expect(result.current.user).toEqual(mockUserResponse);
    });

    it('allows manual fetchUserData call regardless of initial onboardingId state', async () => {
      const mockGetRegistrationStatus = jest
        .fn()
        .mockResolvedValue(mockUserResponse);
      setupMockSDK({ getRegistrationStatus: mockGetRegistrationStatus });
      setupMockUseSelector(mockCardFeatureFlag, null, 'test-onboarding-id');

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetRegistrationStatus.mockClear();

      await act(async () => {
        await result.current.fetchUserData();
      });

      expect(mockGetRegistrationStatus).toHaveBeenCalledWith(
        'test-onboarding-id',
      );
      expect(result.current.user).toEqual(mockUserResponse);
    });

    it('exposes isReturningSession as true when onboardingId exists at mount', async () => {
      setupMockSDK({
        getRegistrationStatus: jest.fn().mockResolvedValue(mockUserResponse),
      });
      setupMockUseSelector(mockCardFeatureFlag, null, 'existing-onboarding-id');

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isReturningSession).toBe(true);
    });

    it('exposes isReturningSession as false when no onboardingId exists at mount', async () => {
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag, null, null);

      const { result } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isReturningSession).toBe(false);
    });

    it('keeps isReturningSession as false when onboardingId is set after mount', async () => {
      setupMockSDK();
      setupMockUseSelector(mockCardFeatureFlag, null, null);

      const { result, rerender } = renderHook(() => useCardSDK(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isReturningSession).toBe(false);

      // Simulate onboardingId being set after mount (e.g., after email verification)
      setupMockUseSelector(mockCardFeatureFlag, null, 'new-onboarding-id');
      rerender(undefined);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // isReturningSession should still be false since it was captured at mount
      expect(result.current.isReturningSession).toBe(false);
    });
  });
});
