import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useNavigation,
  useFocusEffect,
  StackActions,
} from '@react-navigation/native';
import { SolScope } from '@metamask/keyring-api';
import useSpendingLimit, { UseSpendingLimitParams } from './useSpendingLimit';
import { useCardDelegation } from './useCardDelegation';
import { useCardSDK } from '../sdk';
import { AllowanceState, CardTokenAllowance } from '../types';
import { BAANX_MAX_LIMIT } from '../constants';
import { LINEA_CAIP_CHAIN_ID } from '../util/buildTokenList';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { ToastContext } from '../../../../component-library/components/Toast';
import Logger from '../../../../util/Logger';
import { createAssetSelectionModalNavigationDetails } from '../components/AssetSelectionBottomSheet';
import Routes from '../../../../constants/navigation/Routes';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';
import { createSpendingLimitOptionsNavigationDetails } from '../Views/SpendingLimit/components/SpendingLimitOptionsSheet';
import { useSelector } from 'react-redux';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
  StackActions: {
    replace: jest.fn((route, params) => ({ type: 'replace', route, params })),
  },
}));

const mockFetchCardHomeData = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        fetchCardHomeData: (...args: unknown[]) =>
          mockFetchCardHomeData(...args),
      },
    },
  },
}));

// Create the mock class inside the factory to avoid hoisting issues
jest.mock('./useCardDelegation', () => {
  class MockUserCancelledError extends Error {
    constructor(message = 'User cancelled') {
      super(message);
      this.name = 'UserCancelledError';
    }
  }
  return {
    useCardDelegation: jest.fn(),
    UserCancelledError: MockUserCancelledError,
  };
});

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../components/AssetSelectionBottomSheet', () => ({
  createAssetSelectionModalNavigationDetails: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

jest.mock('../../../Views/AccountSelector', () => ({
  createAccountSelectorNavDetails: jest.fn(),
}));

jest.mock(
  '../Views/SpendingLimit/components/SpendingLimitOptionsSheet',
  () => ({
    createSpendingLimitOptionsNavigationDetails: jest.fn(),
  }),
);

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockUseCardDelegation = useCardDelegation as jest.MockedFunction<
  typeof useCardDelegation
>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<
  typeof useAnalytics
>;
const mockCreateAssetSelectionModalNavigationDetails =
  createAssetSelectionModalNavigationDetails as jest.MockedFunction<
    typeof createAssetSelectionModalNavigationDetails
  >;
const mockCreateAccountSelectorNavDetails =
  createAccountSelectorNavDetails as jest.MockedFunction<
    typeof createAccountSelectorNavDetails
  >;
const mockCreateSpendingLimitOptionsNavigationDetails =
  createSpendingLimitOptionsNavigationDetails as jest.MockedFunction<
    typeof createSpendingLimitOptionsNavigationDetails
  >;
const mockUseSelector = useSelector as jest.Mock;

// Helper functions
const createMockToken = (
  overrides: Partial<CardTokenAllowance> = {},
): CardTokenAllowance => ({
  address: '0x1234567890123456789012345678901234567890',
  caipChainId: LINEA_CAIP_CHAIN_ID,
  decimals: 18,
  symbol: 'USDC',
  name: 'USD Coin',
  allowanceState: AllowanceState.Enabled,
  allowance: '1000',
  walletAddress: '0xwallet1',
  delegationContract: '0xdelegation123',
  ...overrides,
});

const createMockDelegationSettings = () => ({
  networks: [
    {
      network: 'linea',
      environment: 'production',
      chainId: '59144',
      delegationContract: '0xlineaDelegation',
      tokens: {
        usdc: { symbol: 'USDC', decimals: 6, address: '0xlineaUsdc' },
        musd: { symbol: 'mUSD', decimals: 18, address: '0xlineaMusd' },
      },
    },
  ],
  count: 1,
  _links: { self: 'https://api.example.com' },
});

const createDefaultParams = (
  overrides: Partial<UseSpendingLimitParams> = {},
): UseSpendingLimitParams => ({
  flow: 'manage',
  allTokens: [createMockToken()],
  delegationSettings: createMockDelegationSettings(),
  ...overrides,
});

describe('useSpendingLimit', () => {
  let mockNavigation: {
    navigate: jest.Mock;
    goBack: jest.Mock;
    dispatch: jest.Mock;
    setParams: jest.Mock;
  };
  let mockSubmitDelegation: jest.Mock;
  let mockTrackEvent: jest.Mock;
  let mockCreateEventBuilder: jest.Mock;
  let mockBuild: jest.Mock;
  let mockAddProperties: jest.Mock;
  let mockShowToast: jest.Mock;
  let mockToastRef: { current: { showToast: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockFetchCardHomeData.mockResolvedValue(undefined);

    // Setup navigation mock
    mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      setParams: jest.fn(),
    };
    mockUseNavigation.mockReturnValue(mockNavigation as never);

    // Setup focus effect to call callback immediately
    mockUseFocusEffect.mockImplementation((callback) => {
      callback();
    });

    // Setup delegation mock
    mockSubmitDelegation = jest.fn().mockResolvedValue(undefined);
    mockUseCardDelegation.mockReturnValue({
      submitDelegation: mockSubmitDelegation,
      isLoading: false,
      error: null,
      needsFaucet: false,
      isFaucetCheckLoading: false,
      refetchFaucetCheck: jest.fn(),
    });

    // Setup SDK mock (getSupportedTokensByChainId used when building default token list)
    mockUseCardSDK.mockReturnValue({
      sdk: {
        getSupportedTokensByChainId: jest.fn().mockReturnValue([]),
      },
    } as never);

    // Setup metrics mock
    mockBuild = jest.fn().mockReturnValue({ event: 'mock-event' });
    mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockTrackEvent = jest.fn();
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);

    // Setup toast mock
    mockShowToast = jest.fn();
    mockToastRef = { current: { showToast: mockShowToast } };

    // Mock React.useContext for ToastContext
    jest.spyOn(React, 'useContext').mockImplementation((context) => {
      if (context === ToastContext) {
        return { toastRef: mockToastRef };
      }
      return undefined;
    });

    // Setup asset selection navigation details mock
    mockCreateAssetSelectionModalNavigationDetails.mockReturnValue([
      'AssetSelectionModal',
      { screen: 'AssetSelection' },
    ] as never);

    // Default: no balances (triggers fallback to mUSD + USDC)
    (useTokensWithBalance as jest.Mock).mockReturnValue([]);

    // Setup account selector navigation details mock
    mockCreateAccountSelectorNavDetails.mockReturnValue([
      'AccountSelectorRoute',
      {},
    ] as never);

    // Setup spending limit options navigation details mock
    mockCreateSpendingLimitOptionsNavigationDetails.mockReturnValue([
      'SpendingLimitOptionsRoute',
      {},
    ] as never);

    // Default selected account (all useSelector calls use this by default;
    // selectEvmNetworkConfigurationsByChainId call gets an object whose keys
    // are not real chain IDs, but useTokensWithBalance is mocked so it doesn't matter)
    mockUseSelector.mockReturnValue({
      id: 'account-1',
      address: '0xaccount1',
      metadata: { name: 'Account 1' },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      expect(result.current.limitType).toBe('full');
      expect(result.current.customLimit).toBe('');
      expect(result.current.isLoading).toBe(false);
    });

    it('initializes with initialToken when provided', () => {
      const initialToken = createMockToken({ symbol: 'mUSD' });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.selectedToken).toEqual(initialToken);
    });

    it('initializes with priorityToken when no initialToken', () => {
      const priorityToken = createMockToken({ symbol: 'USDC' });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ priorityToken })),
      );

      expect(result.current.selectedToken).toEqual(priorityToken);
    });

    it('selects Solana priority token when provided', () => {
      const priorityToken = createMockToken({
        symbol: 'SOL',
        caipChainId: SolScope.Mainnet,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ priorityToken })),
      );

      expect(result.current.selectedToken?.symbol).toBe('SOL');
    });
  });

  describe('Default token selection', () => {
    it('defaults to the NotEnabled token with highest fiat balance', () => {
      const usdcToken = createMockToken({
        symbol: 'USDC',
        address: '0xusdc',
        allowanceState: AllowanceState.NotEnabled,
      });
      const musdToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        allowanceState: AllowanceState.NotEnabled,
      });
      const enabledToken = createMockToken({
        symbol: 'DAI',
        address: '0xdai',
        allowanceState: AllowanceState.Enabled,
      });

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        { address: '0xusdc', chainId: '0xe708', tokenFiatAmount: 500 },
        { address: '0xmusd', chainId: '0xe708', tokenFiatAmount: 100 },
        { address: '0xdai', chainId: '0xe708', tokenFiatAmount: 9999 }, // Enabled — excluded
      ]);

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            allTokens: [usdcToken, musdToken, enabledToken],
          }),
        ),
      );

      expect(result.current.selectedToken?.symbol).toBe('USDC');
    });

    it('ignores Enabled tokens when picking the default', () => {
      const enabledToken = createMockToken({
        symbol: 'USDC',
        address: '0xusdc',
        allowanceState: AllowanceState.Enabled,
      });
      const notEnabledToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        allowanceState: AllowanceState.NotEnabled,
      });

      (useTokensWithBalance as jest.Mock).mockReturnValue([
        { address: '0xusdc', chainId: '0xe708', tokenFiatAmount: 9999 },
        { address: '0xmusd', chainId: '0xe708', tokenFiatAmount: 10 },
      ]);

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ allTokens: [enabledToken, notEnabledToken] }),
        ),
      );

      expect(result.current.selectedToken?.symbol).toBe('mUSD');
    });

    it('defaults to mUSD on Linea when all tokens have zero fiat balance', () => {
      const musdToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        caipChainId: LINEA_CAIP_CHAIN_ID,
        allowanceState: AllowanceState.NotEnabled,
      });
      const usdcToken = createMockToken({
        symbol: 'USDC',
        address: '0xusdc',
        allowanceState: AllowanceState.NotEnabled,
      });

      (useTokensWithBalance as jest.Mock).mockReturnValue([]);

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ allTokens: [usdcToken, musdToken] }),
        ),
      );

      expect(result.current.selectedToken?.symbol).toBe('mUSD');
    });

    it('falls back to first sorted token when mUSD on Linea is not present', () => {
      const usdcToken = createMockToken({
        symbol: 'USDC',
        address: '0xusdc',
        allowanceState: AllowanceState.NotEnabled,
      });

      (useTokensWithBalance as jest.Mock).mockReturnValue([]);

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ allTokens: [usdcToken] })),
      );

      expect(result.current.selectedToken?.symbol).toBe('USDC');
    });

    it('uses initialToken when provided, bypassing balance logic', () => {
      const initialToken = createMockToken({
        symbol: 'USDC',
        allowanceState: AllowanceState.Enabled,
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.selectedToken?.symbol).toBe('USDC');
    });
  });

  describe('Limit Type and Custom Limit', () => {
    it('setLimitType changes limit type', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setLimitType('restricted');
      });

      expect(result.current.limitType).toBe('restricted');
    });

    it('setCustomLimit sanitizes input to only numbers and decimal', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setCustomLimit('abc123.45xyz');
      });

      expect(result.current.customLimit).toBe('123.45');
    });

    it('setCustomLimit handles multiple decimal points', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setCustomLimit('123.45.67');
      });

      expect(result.current.customLimit).toBe('123.4567');
    });
  });

  describe('Validation (isValid)', () => {
    it('returns true for full limit type with no token in manage flow', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage' })),
      );

      expect(result.current.isValid).toBe(true);
    });

    it('returns false for onboarding flow without selected token', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            flow: 'onboarding',
            allTokens: [],
            delegationSettings: null,
          }),
        ),
      );

      expect(result.current.isValid).toBe(false);
    });

    it('returns true for onboarding flow with selected token', () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ flow: 'onboarding', initialToken }),
        ),
      );

      expect(result.current.isValid).toBe(true);
    });

    it('returns true when Solana token is selected', () => {
      const initialToken = createMockToken({
        caipChainId: SolScope.Mainnet,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isValid).toBe(true);
    });

    it('returns false for restricted limit with empty custom limit', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setLimitType('restricted');
      });

      expect(result.current.isValid).toBe(false);
    });

    it('returns false for restricted limit with invalid custom limit', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setLimitType('restricted');
        result.current.setCustomLimit('abc');
      });

      expect(result.current.isValid).toBe(false);
    });

    it('returns true for restricted limit with valid custom limit', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setLimitType('restricted');
        result.current.setCustomLimit('100');
      });

      expect(result.current.isValid).toBe(true);
    });

    it('returns true for restricted limit with 0 (revoke approval)', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setLimitType('restricted');
        result.current.setCustomLimit('0');
      });

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('handleOtherSelect', () => {
    it('navigates to asset selection modal', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.handleOtherSelect();
      });

      expect(mockCreateAssetSelectionModalNavigationDetails).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });

    it('tracks button click event', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.handleOtherSelect();
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('excludes the currently selected token from the bottomsheet', () => {
      const usdcToken = createMockToken({
        symbol: 'USDC',
        address: '0xusdc',
        allowanceState: AllowanceState.NotEnabled,
      });
      const musdToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        allowanceState: AllowanceState.NotEnabled,
      });

      // USDC has highest balance → becomes selectedToken by default
      (useTokensWithBalance as jest.Mock).mockReturnValue([
        { address: '0xusdc', chainId: '0xe708', tokenFiatAmount: 200 },
        { address: '0xmusd', chainId: '0xe708', tokenFiatAmount: 50 },
      ]);

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ allTokens: [usdcToken, musdToken] }),
        ),
      );

      act(() => {
        result.current.handleOtherSelect();
      });

      const call =
        mockCreateAssetSelectionModalNavigationDetails.mock.calls[0][0];
      expect(call?.excludedTokens).toHaveLength(1);
      expect(call?.excludedTokens?.[0]?.symbol).toBe('USDC');
    });
  });

  describe('submit', () => {
    it('shows error toast when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({ sdk: null } as never);
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(Logger.error).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('shows error toast when no token is available', async () => {
      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ allTokens: [], delegationSettings: null }),
        ),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockShowToast).toHaveBeenCalled();
    });

    it('calls submitDelegation with full limit amount', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockSubmitDelegation).toHaveBeenCalledWith({
        amount: BAANX_MAX_LIMIT,
        currency: 'USDC',
        network: 'linea',
      });
    });

    it('calls submitDelegation with custom limit amount', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      act(() => {
        result.current.setLimitType('restricted');
        result.current.setCustomLimit('500');
      });

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockSubmitDelegation).toHaveBeenCalledWith({
        amount: '500',
        currency: 'USDC',
        network: 'linea',
      });
    });

    it('refreshes card home data after successful submission', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it('shows success toast for non-onboarding flow', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage', initialToken })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockShowToast).toHaveBeenCalled();
    });

    it('navigates back for non-onboarding flow', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage', initialToken })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates to complete screen for onboarding flow', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ flow: 'onboarding', initialToken }),
        ),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockNavigation.dispatch).toHaveBeenCalled();
    });

    it('handles UserCancelledError gracefully', async () => {
      // Import the mocked UserCancelledError class
      const { UserCancelledError } = jest.requireMock(
        './useCardDelegation',
      ) as {
        UserCancelledError: new (message?: string) => Error;
      };
      mockSubmitDelegation.mockRejectedValue(
        new UserCancelledError('User cancelled'),
      );
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(Logger.log).toHaveBeenCalledWith(
        'User cancelled the delegation transaction',
      );
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('shows error toast on submission failure', async () => {
      mockSubmitDelegation.mockRejectedValue(new Error('Network error'));
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(Logger.error).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();
    });

    it('tracks button click event', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('navigates back', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.cancel();
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('does not navigate when loading', () => {
      mockUseCardDelegation.mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
        error: null,
        needsFaucet: false,
        isFaucetCheckLoading: false,
        refetchFaucetCheck: jest.fn(),
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.cancel();
      });

      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('tracks button click event', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.cancel();
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('skip', () => {
    it('replaces navigation to card home screen', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      act(() => {
        result.current.skip();
      });

      expect(mockNavigation.dispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.CARD.HOME),
      );
    });

    it('does not navigate when loading', () => {
      mockUseCardDelegation.mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
        error: null,
        needsFaucet: false,
        isFaucetCheckLoading: false,
        refetchFaucetCheck: jest.fn(),
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      act(() => {
        result.current.skip();
      });

      expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    });

    it('tracks button click event with skipped property', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      act(() => {
        result.current.skip();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ skipped: true }),
      );
    });
  });

  describe('Screen View Tracking', () => {
    it('tracks screen view on mount for manage flow', () => {
      renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage' })),
      );

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ flow: 'manage' }),
      );
    });

    it('tracks screen view on mount for enable flow', () => {
      renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'enable' })),
      );

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ flow: 'enable' }),
      );
    });

    it('tracks screen view on mount for onboarding flow', () => {
      renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ flow: 'onboarding' }),
      );
    });

    it('includes musd_linea_balance from walletTokens', () => {
      const musdToken = {
        address: '0xmusd',
        symbol: 'mUSD',
        chainId: LINEA_CAIP_CHAIN_ID,
        tokenFiatAmount: 450,
      };
      (useTokensWithBalance as jest.Mock)
        .mockReturnValueOnce([musdToken]) // walletTokens (card)
        .mockReturnValueOnce([]); // allWalletTokens

      renderHook(() => useSpendingLimit(createDefaultParams()));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ musd_linea_balance: 450 }),
      );
    });

    it('emits musd_linea_balance of 0 when mUSD not in wallet', () => {
      (useTokensWithBalance as jest.Mock)
        .mockReturnValueOnce([]) // walletTokens — no mUSD
        .mockReturnValueOnce([]);

      renderHook(() => useSpendingLimit(createDefaultParams()));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ musd_linea_balance: 0 }),
      );
    });

    it('includes top_card_chain_asset for highest-balance card token', () => {
      const lowToken = {
        address: '0xlow',
        symbol: 'USDC',
        chainId: LINEA_CAIP_CHAIN_ID,
        tokenFiatAmount: 50,
      };
      const highToken = {
        address: '0xhigh',
        symbol: 'mUSD',
        chainId: LINEA_CAIP_CHAIN_ID,
        tokenFiatAmount: 500,
      };
      // allTokens must include the same addresses so cardSupportedKeys accepts them
      const allTokens = [
        createMockToken({ address: '0xlow', symbol: 'USDC' }),
        createMockToken({ address: '0xhigh', symbol: 'mUSD' }),
      ];
      (useTokensWithBalance as jest.Mock)
        .mockReturnValueOnce([lowToken, highToken]) // walletTokens (card)
        .mockReturnValueOnce([]);

      renderHook(() => useSpendingLimit(createDefaultParams({ allTokens })));

      // LINEA_CAIP_CHAIN_ID maps to 'linea' in caipChainIdToNetwork
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ top_card_chain_asset: 'linea:musd' }),
      );
    });

    it('emits null for top_card_chain_asset when no card tokens have balance', () => {
      (useTokensWithBalance as jest.Mock)
        .mockReturnValueOnce([]) // walletTokens — empty
        .mockReturnValueOnce([]);

      renderHook(() => useSpendingLimit(createDefaultParams()));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ top_card_chain_asset: null }),
      );
    });

    it('emits null for top_card_chain_asset when wallet token is not in card-supported allTokens', () => {
      // Native SOL has an address but is not in allTokens (card does not support it).
      // allTokens contains only an unrelated USDC token so allTokens.length > 0,
      // which lets the effect fire while still excluding nativeSol from the result.
      const nativeSol = {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        tokenFiatAmount: 1200,
      };
      (useTokensWithBalance as jest.Mock)
        .mockReturnValueOnce([nativeSol]) // walletTokens
        .mockReturnValueOnce([nativeSol]);

      // allTokens has a card-supported token (USDC on Linea) but NOT nativeSol
      renderHook(() => useSpendingLimit(createDefaultParams()));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ top_card_chain_asset: null }),
      );
    });

    it('includes top_wallet_chain_asset from all-wallet tokens', () => {
      const cardToken = {
        address: '0xcard',
        symbol: 'mUSD',
        chainId: LINEA_CAIP_CHAIN_ID,
        tokenFiatAmount: 100,
      };
      const walletToken = {
        address: '0xwallet',
        symbol: 'ETH',
        chainId: '0x1', // Ethereum mainnet — not a card chain
        tokenFiatAmount: 9000,
      };
      (useTokensWithBalance as jest.Mock)
        .mockReturnValueOnce([cardToken]) // walletTokens (card)
        .mockReturnValueOnce([walletToken]); // allWalletTokens

      renderHook(() => useSpendingLimit(createDefaultParams()));

      // 0x1 → eip155:1, not in caipChainIdToNetwork → strips namespace → '1:eth'
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          top_wallet_chain_asset: '1:eth',
          top_wallet_asset_balance: 9000,
        }),
      );
    });
  });

  describe('Returned Token from AssetSelectionBottomSheet', () => {
    it('sets selected token from route params', () => {
      const returnedToken = createMockToken({ symbol: 'ETH' });

      // Store the callback to call it manually after render
      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
        // Only store the first callback, don't execute it during render
        if (!focusCallback) {
          focusCallback = callback;
        }
      });

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            routeParams: { returnedSelectedToken: returnedToken },
          }),
        ),
      );

      // Now call the focus effect callback manually
      act(() => {
        if (focusCallback) {
          focusCallback();
        }
      });

      expect(result.current.selectedToken).toEqual(returnedToken);
      expect(mockNavigation.setParams).toHaveBeenCalledWith({
        returnedSelectedToken: undefined,
        selectedToken: undefined,
      });
    });

    it('does not overwrite user selection when allTokens loads after returning from bottom sheet', () => {
      const userSelectedToken = createMockToken({
        symbol: 'ETH',
        caipChainId: LINEA_CAIP_CHAIN_ID,
      });

      // Store the focus callback
      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      // Start with empty allTokens (simulating async loading)
      const { result, rerender } = renderHook(
        (props: UseSpendingLimitParams) => useSpendingLimit(props),
        {
          initialProps: createDefaultParams({
            allTokens: [],
            delegationSettings: null,
            routeParams: { returnedSelectedToken: userSelectedToken },
          }),
        },
      );

      // Simulate user returning from bottom sheet with their selection
      act(() => {
        if (focusCallback) {
          focusCallback();
        }
      });

      // Verify user's selection is set
      expect(result.current.selectedToken).toEqual(userSelectedToken);

      // Now simulate allTokens loading
      const loadedTokens = [
        createMockToken({ symbol: 'mUSD' }),
        createMockToken({ symbol: 'USDC' }),
      ];

      rerender(
        createDefaultParams({
          allTokens: loadedTokens,
          delegationSettings: createMockDelegationSettings(),
          routeParams: {},
        }),
      );

      // User's selection should NOT be overwritten by mUSD fallback
      expect(result.current.selectedToken).toEqual(userSelectedToken);
    });
  });

  describe('handleAccountSelect', () => {
    it('navigates to account selector', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.handleAccountSelect();
      });

      expect(mockCreateAccountSelectorNavDetails).toHaveBeenCalledWith({
        disableAddAccountButton: true,
      });
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });

  describe('handleLimitSelect', () => {
    it('navigates to spending limit options sheet', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.handleLimitSelect();
      });

      expect(
        mockCreateSpendingLimitOptionsNavigationDetails,
      ).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });

    it('passes current limitType and customLimit to options sheet', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.setLimitType('restricted');
        result.current.setCustomLimit('250');
      });

      act(() => {
        result.current.handleLimitSelect();
      });

      expect(
        mockCreateSpendingLimitOptionsNavigationDetails,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          currentLimitType: 'restricted',
          currentCustomLimit: '250',
          callerRoute: Routes.CARD.SPENDING_LIMIT,
        }),
      );
    });

    it('passes full limitType when no custom limit has been set', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.handleLimitSelect();
      });

      expect(
        mockCreateSpendingLimitOptionsNavigationDetails,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          currentLimitType: 'full',
          currentCustomLimit: '',
        }),
      );
    });
  });

  describe('Account change detection', () => {
    it('resets selectedToken when account changes', () => {
      const initialToken = createMockToken({ symbol: 'USDC' });
      mockUseSelector.mockReturnValue({
        id: 'account-1',
        address: '0xaccount1',
        metadata: { name: 'Account 1' },
      });

      const { result, rerender } = renderHook(
        (props: UseSpendingLimitParams) => useSpendingLimit(props),
        { initialProps: createDefaultParams({ initialToken }) },
      );

      expect(result.current.selectedToken?.symbol).toBe('USDC');

      // Simulate account switch; remove allTokens so no re-selection happens
      mockUseSelector.mockReturnValue({
        id: 'account-2',
        address: '0xaccount2',
        metadata: { name: 'Account 2' },
      });

      rerender(
        createDefaultParams({ allTokens: [], delegationSettings: null }),
      );

      expect(result.current.selectedToken).toBeNull();
    });

    it('does not reset selectedToken when same account re-renders', () => {
      const initialToken = createMockToken({ symbol: 'USDC' });
      const mockAccount = {
        id: 'account-1',
        address: '0xaccount1',
        metadata: { name: 'Account 1' },
      };
      mockUseSelector.mockReturnValue(mockAccount);

      const { result, rerender } = renderHook(
        (props: UseSpendingLimitParams) => useSpendingLimit(props),
        { initialProps: createDefaultParams({ initialToken }) },
      );

      expect(result.current.selectedToken?.symbol).toBe('USDC');

      // Re-render with same account (e.g., other state update)
      mockUseSelector.mockReturnValue(mockAccount);
      rerender(createDefaultParams({ initialToken }));

      expect(result.current.selectedToken?.symbol).toBe('USDC');
    });
  });

  describe('Returned limit type from SpendingLimitOptionsSheet', () => {
    it('sets limitType from returnedLimitType route param', () => {
      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            routeParams: { returnedLimitType: 'restricted' },
          }),
        ),
      );

      act(() => {
        if (focusCallback) focusCallback();
      });

      expect(result.current.limitType).toBe('restricted');
      expect(mockNavigation.setParams).toHaveBeenCalledWith({
        returnedLimitType: undefined,
        returnedCustomLimit: undefined,
      });
    });

    it('sets customLimit from returnedCustomLimit route param', () => {
      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            routeParams: {
              returnedLimitType: 'restricted',
              returnedCustomLimit: '750',
            },
          }),
        ),
      );

      act(() => {
        if (focusCallback) focusCallback();
      });

      expect(result.current.limitType).toBe('restricted');
      expect(result.current.customLimit).toBe('750');
    });

    it('sets limitType to full when returnedLimitType is full', () => {
      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            routeParams: { returnedLimitType: 'full' },
          }),
        ),
      );

      act(() => {
        if (focusCallback) focusCallback();
      });

      expect(result.current.limitType).toBe('full');
      expect(mockNavigation.setParams).toHaveBeenCalledWith({
        returnedLimitType: undefined,
        returnedCustomLimit: undefined,
      });
    });

    it('does not update limitType when returnedLimitType is absent', () => {
      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            routeParams: { returnedSelectedToken: createMockToken() },
          }),
        ),
      );

      act(() => {
        result.current.setLimitType('restricted');
      });

      act(() => {
        if (focusCallback) focusCallback();
      });

      // limitType should remain 'restricted' (not overwritten)
      expect(result.current.limitType).toBe('restricted');
      // setParams should NOT have been called for limit params
      expect(mockNavigation.setParams).not.toHaveBeenCalledWith(
        expect.objectContaining({ returnedLimitType: undefined }),
      );
    });
  });

  describe('isLoading', () => {
    it('returns true when delegation is loading', () => {
      mockUseCardDelegation.mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
        error: null,
        needsFaucet: false,
        isFaucetCheckLoading: false,
        refetchFaucetCheck: jest.fn(),
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when not loading', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      expect(result.current.isLoading).toBe(false);
    });
  });
});
