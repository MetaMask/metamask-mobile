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
import { FundingStatus, CardFundingToken } from '../types';
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
import BigNumber from 'bignumber.js';
import useMoneyAccountCardLinkage from './useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';

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
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('./useMoneyAccountCardLinkage', () => ({
  __esModule: true,
  default: jest.fn(),
  useMoneyAccountCardLinkage: jest.fn(),
}));

jest.mock('../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
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
const mockUseMoneyAccountCardLinkage =
  useMoneyAccountCardLinkage as jest.MockedFunction<
    typeof useMoneyAccountCardLinkage
  >;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockConfirmLinkInBackground = jest.fn();

const buildLinkageReturn = (
  overrides: Partial<ReturnType<typeof useMoneyAccountCardLinkage>> = {},
) =>
  ({
    hasMoneyAccountRequirements: false,
    isCardAuthenticated: false,
    primaryMoneyAccount: undefined,
    moneyAccountCardToken: null,
    canLink: false,
    status: 'idle',
    isLinking: false,
    error: null,
    startLinkFlow: jest.fn(),
    openLinkCardSheet: jest.fn(),
    confirmLinkInBackground: mockConfirmLinkInBackground,
    reset: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useMoneyAccountCardLinkage>;

const buildBalanceReturn = (
  overrides: Partial<ReturnType<typeof useMoneyAccountBalance>> = {},
) =>
  ({
    musdBalanceQuery: {} as never,
    vaultApyQuery: {} as never,
    musdEquivalentBalanceQuery: {} as never,
    isAggregatedBalanceLoading: false,
    musdFiatFormatted: undefined,
    musdSHFvdFiatFormatted: undefined,
    tokenTotal: new BigNumber(0),
    totalFiatFormatted: '$0.00',
    totalFiatRaw: '0',
    withdrawableMusd: undefined,
    apyDecimal: undefined,
    apyPercent: 4,
    apyPercentFormatted: '4%',
    ...overrides,
  }) as ReturnType<typeof useMoneyAccountBalance>;

// Helper functions
const createMockToken = (
  overrides: Partial<CardFundingToken> = {},
): CardFundingToken => ({
  address: '0x1234567890123456789012345678901234567890',
  caipChainId: LINEA_CAIP_CHAIN_ID,
  decimals: 18,
  symbol: 'USDC',
  name: 'USD Coin',
  fundingStatus: FundingStatus.Enabled,
  spendableBalance: '1000',
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

    mockConfirmLinkInBackground.mockReset().mockResolvedValue(true);
    mockUseMoneyAccountCardLinkage.mockReturnValue(buildLinkageReturn());
    mockUseMoneyAccountBalance.mockReturnValue(buildBalanceReturn());
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

    it('initializes restricted limit from limited initialToken originalSpendingCap', () => {
      const initialToken = createMockToken({
        fundingStatus: FundingStatus.Limited,
        spendingCap: '250',
        originalSpendingCap: '500',
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.limitType).toBe('restricted');
      expect(result.current.customLimit).toBe('500');
    });

    it('initializes restricted limit from limited priorityToken originalSpendingCap', () => {
      const priorityToken = createMockToken({
        fundingStatus: FundingStatus.Limited,
        spendingCap: '300',
        originalSpendingCap: '750',
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ priorityToken })),
      );

      expect(result.current.selectedToken).toEqual(priorityToken);
      expect(result.current.limitType).toBe('restricted');
      expect(result.current.customLimit).toBe('750');
    });

    it('falls back to spendingCap for limited tokens without originalSpendingCap', () => {
      const initialToken = createMockToken({
        fundingStatus: FundingStatus.Limited,
        spendingCap: '275',
      });

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.limitType).toBe('restricted');
      expect(result.current.customLimit).toBe('275');
    });

    it.each([FundingStatus.Enabled, FundingStatus.NotEnabled])(
      'initializes %s token as full limit with empty custom limit',
      (fundingStatus) => {
        const initialToken = createMockToken({ fundingStatus });

        const { result } = renderHook(() =>
          useSpendingLimit(createDefaultParams({ initialToken })),
        );

        expect(result.current.limitType).toBe('full');
        expect(result.current.customLimit).toBe('');
      },
    );

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
        fundingStatus: FundingStatus.NotEnabled,
      });
      const musdToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        fundingStatus: FundingStatus.NotEnabled,
      });
      const enabledToken = createMockToken({
        symbol: 'DAI',
        address: '0xdai',
        fundingStatus: FundingStatus.Enabled,
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
        fundingStatus: FundingStatus.Enabled,
      });
      const notEnabledToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        fundingStatus: FundingStatus.NotEnabled,
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
        fundingStatus: FundingStatus.NotEnabled,
      });
      const usdcToken = createMockToken({
        symbol: 'USDC',
        address: '0xusdc',
        fundingStatus: FundingStatus.NotEnabled,
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
        fundingStatus: FundingStatus.NotEnabled,
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
        fundingStatus: FundingStatus.Enabled,
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
        fundingStatus: FundingStatus.NotEnabled,
      });
      const musdToken = createMockToken({
        symbol: 'mUSD',
        address: '0xmusd',
        fundingStatus: FundingStatus.NotEnabled,
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

    it('sets restricted limit from returned limited token', () => {
      const returnedToken = createMockToken({
        symbol: 'ETH',
        fundingStatus: FundingStatus.Limited,
        spendingCap: '125',
        originalSpendingCap: '425',
      });

      let focusCallback: (() => void) | null = null;
      mockUseFocusEffect.mockImplementation((callback) => {
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

      act(() => {
        if (focusCallback) {
          focusCallback();
        }
      });

      expect(result.current.selectedToken).toEqual(returnedToken);
      expect(result.current.limitType).toBe('restricted');
      expect(result.current.customLimit).toBe('425');
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
    it('navigates to account selector with an onSelectAccount callback', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      act(() => {
        result.current.handleAccountSelect();
      });

      expect(mockCreateAccountSelectorNavDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          disableAddAccountButton: true,
          onSelectAccount: expect.any(Function),
        }),
      );
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });

    it('invoking the picker onSelectAccount callback is a no-op when not in Money Account mode', () => {
      const priorityToken = createMockToken({ symbol: 'USDC' });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ priorityToken })),
      );

      const tokenBefore = result.current.selectedToken;

      act(() => {
        result.current.handleAccountSelect();
      });

      const { onSelectAccount } = mockCreateAccountSelectorNavDetails.mock
        .calls[0][0] as {
        onSelectAccount?: (accountGroup: unknown) => void;
      };
      expect(onSelectAccount).toBeDefined();

      act(() => {
        onSelectAccount?.({ id: 'keyring:wallet1/group1' });
      });

      expect(result.current.selectedToken).toBe(tokenBefore);
      expect(result.current.isMoneyAccountSource).toBe(false);
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
            routeParams: {},
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

  describe('Money Account source (onboarding flow)', () => {
    const MONEY_ACCOUNT_TOKEN: CardFundingToken = {
      address: '0xMonadUsdc',
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
      caipChainId: 'eip155:143',
      walletAddress: undefined,
      fundingStatus: FundingStatus.NotEnabled,
      spendableBalance: '0',
      delegationContract: '0xMonadDelegation',
      priority: undefined,
    };

    const setupFunded = () => {
      mockUseMoneyAccountCardLinkage.mockReturnValue(
        buildLinkageReturn({
          hasMoneyAccountRequirements: true,
          isCardAuthenticated: true,
          moneyAccountCardToken: MONEY_ACCOUNT_TOKEN,
          canLink: true,
        }),
      );
      mockUseMoneyAccountBalance.mockReturnValue(
        buildBalanceReturn({
          tokenTotal: new BigNumber('12.34'),
          totalFiatFormatted: '$12.34',
        }),
      );
    };

    it('preselects Money Account as the source in onboarding flow when funded + requirements met', () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(true);
      expect(result.current.selectedToken).toEqual(MONEY_ACCOUNT_TOKEN);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('does NOT preselect Money Account when balance is zero', () => {
      mockUseMoneyAccountCardLinkage.mockReturnValue(
        buildLinkageReturn({
          hasMoneyAccountRequirements: true,
          isCardAuthenticated: true,
          moneyAccountCardToken: MONEY_ACCOUNT_TOKEN,
          canLink: true,
        }),
      );
      mockUseMoneyAccountBalance.mockReturnValue(
        buildBalanceReturn({ tokenTotal: new BigNumber(0) }),
      );

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('preselects Money Account in the manage flow when funded + requirements met', () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(true);
      expect(result.current.selectedToken).toEqual(MONEY_ACCOUNT_TOKEN);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('does NOT preselect Money Account in the enable flow (managing an existing asset)', () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'enable' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('respects an explicit initialToken on the manage flow (AssetSelectionBottomSheet path) and does NOT preselect Money Account', () => {
      setupFunded();

      const initialToken = createMockToken({ symbol: 'USDT' });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage', initialToken })),
      );

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.selectedToken).toEqual(initialToken);
    });

    it('exits Money Account mode and exposes the switch-back CTA when the user changes account from the picker in the manage flow', () => {
      setupFunded();

      const { result, rerender } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(true);

      mockUseSelector.mockReturnValue({
        id: 'account-2',
        address: '0xaccount2',
        metadata: { name: 'Account 2' },
      });
      rerender();

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(true);
    });

    it('exits Money Account mode when the picker invokes onSelectAccount, even with the same already-selected account', () => {
      setupFunded();

      const priorityToken = createMockToken({ symbol: 'USDC' });
      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({ flow: 'manage', priorityToken }),
        ),
      );

      expect(result.current.isMoneyAccountSource).toBe(true);
      expect(result.current.selectedToken).toEqual(MONEY_ACCOUNT_TOKEN);

      // Open the picker (this captures the onSelectAccount callback)
      act(() => {
        result.current.handleAccountSelect();
      });
      const { onSelectAccount } = mockCreateAccountSelectorNavDetails.mock
        .calls[0][0] as {
        onSelectAccount: (accountGroup: unknown) => void;
      };

      // Simulate the user tapping the SAME currently-selected regular account.
      // Redux state will not change, but the picker still fires the callback —
      // this is the signal we use to exit Money Account mode.
      act(() => {
        onSelectAccount({ id: 'keyring:wallet1/group1' });
      });

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(true);
      expect(result.current.selectedToken).toEqual(priorityToken);
    });

    it('does not re-trigger Money Account auto-preselect after exiting via the picker callback', () => {
      setupFunded();

      const { result, rerender } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(true);

      act(() => {
        result.current.handleAccountSelect();
      });
      const { onSelectAccount } = mockCreateAccountSelectorNavDetails.mock
        .calls[0][0] as {
        onSelectAccount: (accountGroup: unknown) => void;
      };

      act(() => {
        onSelectAccount({ id: 'keyring:wallet1/group1' });
      });

      expect(result.current.isMoneyAccountSource).toBe(false);

      // Subsequent re-renders (while Money Account is still funded + linkable)
      // must NOT silently re-select Money Account — the user just opted out.
      rerender();

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(true);
    });

    it('submit on the manage flow goes back instead of replacing to Card Home (Money Account source path)', async () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'manage' })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
      expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    });

    it('does NOT preselect Money Account when requirements are missing', () => {
      mockUseMoneyAccountCardLinkage.mockReturnValue(
        buildLinkageReturn({
          hasMoneyAccountRequirements: false,
          moneyAccountCardToken: MONEY_ACCOUNT_TOKEN,
          canLink: false,
        }),
      );
      mockUseMoneyAccountBalance.mockReturnValue(
        buildBalanceReturn({ tokenTotal: new BigNumber('5') }),
      );

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('does NOT preselect Money Account or surface the switch-back CTA when the Money Account is already delegated to Card', () => {
      mockUseMoneyAccountCardLinkage.mockReturnValue(
        buildLinkageReturn({
          hasMoneyAccountRequirements: true,
          isCardAuthenticated: true,
          moneyAccountCardToken: MONEY_ACCOUNT_TOKEN,
          canLink: false,
        }),
      );
      mockUseMoneyAccountBalance.mockReturnValue(
        buildBalanceReturn({
          tokenTotal: new BigNumber('12.34'),
          totalFiatFormatted: '$12.34',
        }),
      );

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('exits Money Account mode and exposes the switch-back CTA when the user changes account from the picker', () => {
      setupFunded();

      const { result, rerender } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.isMoneyAccountSource).toBe(true);

      mockUseSelector.mockReturnValue({
        id: 'account-2',
        address: '0xaccount2',
        metadata: { name: 'Account 2' },
      });
      rerender();

      expect(result.current.isMoneyAccountSource).toBe(false);
      expect(result.current.canShowMoneyAccountCta).toBe(true);
    });

    it('re-enters Money Account mode when selectMoneyAccountAsSource is called from the switch-back CTA', () => {
      setupFunded();

      const { result, rerender } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      mockUseSelector.mockReturnValue({
        id: 'account-2',
        address: '0xaccount2',
        metadata: { name: 'Account 2' },
      });
      rerender();

      expect(result.current.canShowMoneyAccountCta).toBe(true);

      act(() => {
        result.current.selectMoneyAccountAsSource();
      });

      expect(result.current.isMoneyAccountSource).toBe(true);
      expect(result.current.selectedToken).toEqual(MONEY_ACCOUNT_TOKEN);
      expect(result.current.canShowMoneyAccountCta).toBe(false);
    });

    it('locks the token picker: handleOtherSelect is a no-op when Money Account is the source', () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      act(() => {
        result.current.handleOtherSelect();
      });

      expect(
        mockCreateAssetSelectionModalNavigationDetails,
      ).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('submit calls confirmLinkInBackground with the chosen amount (Money Account source path) and does NOT call submitDelegation', async () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
      expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
        delegationAmountHuman: BAANX_MAX_LIMIT,
      });
      expect(mockSubmitDelegation).not.toHaveBeenCalled();
      expect(mockFetchCardHomeData).toHaveBeenCalled();
    });

    it('submit still navigates and logs when fetchCardHomeData rejects after a successful Money Account link', async () => {
      setupFunded();

      const fetchError = new Error('Network down');
      mockFetchCardHomeData.mockRejectedValueOnce(fetchError);

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockConfirmLinkInBackground).toHaveBeenCalledTimes(1);
      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
      expect(Logger.error).toHaveBeenCalledWith(
        fetchError,
        expect.stringContaining('Money Account'),
      );
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
    });

    it('submit does NOT navigate when the Money Account link itself fails (confirmLinkInBackground returns false)', async () => {
      setupFunded();

      mockConfirmLinkInBackground.mockResolvedValueOnce(false);

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
      expect(mockNavigation.dispatch).not.toHaveBeenCalled();
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('submit forwards a restricted custom limit through to confirmLinkInBackground', async () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      act(() => {
        result.current.setLimitType('restricted');
      });
      act(() => {
        result.current.setCustomLimit('250');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(mockConfirmLinkInBackground).toHaveBeenCalledWith({
        delegationAmountHuman: '250',
      });
    });

    it('submit goes through the wallet submitDelegation path when Money Account is NOT the source', async () => {
      const usdcToken = createMockToken({ symbol: 'USDC' });
      const { result } = renderHook(() =>
        useSpendingLimit(
          createDefaultParams({
            flow: 'onboarding',
            priorityToken: usdcToken,
          }),
        ),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockSubmitDelegation).toHaveBeenCalledTimes(1);
      expect(mockConfirmLinkInBackground).not.toHaveBeenCalled();
    });

    it('exposes moneyAccountTotalFiatFormatted from the balance hook (used by the locked token row label)', () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.moneyAccountTotalFiatFormatted).toBe('$12.34');
    });

    it('formats moneyAccountApySubline with the APY percent when available', () => {
      setupFunded();

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.moneyAccountApySubline).toBe(
        '4% APY while you spend',
      );
    });

    it('falls back to a generic subline when APY is not yet resolved', () => {
      mockUseMoneyAccountCardLinkage.mockReturnValue(
        buildLinkageReturn({
          hasMoneyAccountRequirements: true,
          isCardAuthenticated: true,
          moneyAccountCardToken: MONEY_ACCOUNT_TOKEN,
          canLink: true,
        }),
      );
      mockUseMoneyAccountBalance.mockReturnValue(
        buildBalanceReturn({
          tokenTotal: new BigNumber('12.34'),
          totalFiatFormatted: '$12.34',
          apyPercent: undefined,
          apyPercentFormatted: undefined,
        }),
      );

      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ flow: 'onboarding' })),
      );

      expect(result.current.moneyAccountApySubline).toBe(
        'Earn while you spend',
      );
    });
  });
});
