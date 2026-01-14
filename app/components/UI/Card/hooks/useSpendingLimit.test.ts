import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useNavigation,
  useFocusEffect,
  StackActions,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { SolScope } from '@metamask/keyring-api';
import useSpendingLimit, { UseSpendingLimitParams } from './useSpendingLimit';
import { useCardDelegation } from './useCardDelegation';
import { useCardSDK } from '../sdk';
import { AllowanceState, CardTokenAllowance } from '../types';
import { BAANX_MAX_LIMIT } from '../constants';
import { LINEA_CAIP_CHAIN_ID } from '../util/buildTokenList';
import { useMetrics } from '../../../hooks/useMetrics';
import { ToastContext } from '../../../../component-library/components/Toast';
import Logger from '../../../../util/Logger';
import { clearCacheData } from '../../../../core/redux/slices/card';
import { createAssetSelectionModalNavigationDetails } from '../components/AssetSelectionBottomSheet';
import Routes from '../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
  StackActions: {
    replace: jest.fn((route, params) => ({ type: 'replace', route, params })),
  },
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
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

const mockTheme = {
  colors: {
    success: { default: '#00ff00', muted: '#00ff0033' },
    error: { default: '#ff0000', muted: '#ff000033' },
  },
};

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => mockTheme),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_VIEWED: 'CARD_VIEWED',
    CARD_BUTTON_CLICKED: 'CARD_BUTTON_CLICKED',
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  clearCacheData: jest.fn(),
}));

jest.mock('../components/AssetSelectionBottomSheet', () => ({
  createAssetSelectionModalNavigationDetails: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseCardDelegation = useCardDelegation as jest.MockedFunction<
  typeof useCardDelegation
>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockCreateAssetSelectionModalNavigationDetails =
  createAssetSelectionModalNavigationDetails as jest.MockedFunction<
    typeof createAssetSelectionModalNavigationDetails
  >;

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
  let mockDispatch: jest.Mock;
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

    // Setup dispatch mock
    mockDispatch = jest.fn();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Setup delegation mock
    mockSubmitDelegation = jest.fn().mockResolvedValue(undefined);
    mockUseCardDelegation.mockReturnValue({
      submitDelegation: mockSubmitDelegation,
      isLoading: false,
      error: null,
    });

    // Setup SDK mock
    mockUseCardSDK.mockReturnValue({
      sdk: {},
    } as never);

    // Setup metrics mock
    mockBuild = jest.fn().mockReturnValue({ event: 'mock-event' });
    mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockTrackEvent = jest.fn();
    mockUseMetrics.mockReturnValue({
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
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('initializes with default values and pre-selects mUSD', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      // mUSD is pre-selected as fallback when no initialToken or priorityToken
      expect(result.current.selectedToken?.symbol).toBe('mUSD');
      expect(result.current.limitType).toBe('full');
      expect(result.current.customLimit).toBe('');
      expect(result.current.isOtherSelected).toBe(false);
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

    it('falls back to mUSD when Solana is priority token', () => {
      const priorityToken = createMockToken({
        symbol: 'SOL',
        caipChainId: SolScope.Mainnet,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ priorityToken })),
      );

      // mUSD is selected as fallback when priorityToken is Solana
      expect(result.current.selectedToken?.symbol).toBe('mUSD');
    });
  });

  describe('Quick Select Tokens', () => {
    it('builds quick select tokens from allTokens and delegationSettings', () => {
      const allTokens = [
        createMockToken({ symbol: 'mUSD' }),
        createMockToken({ symbol: 'USDC' }),
      ];
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ allTokens })),
      );

      expect(result.current.quickSelectTokens).toHaveLength(2);
      expect(result.current.quickSelectTokens[0].symbol).toBe('mUSD');
      expect(result.current.quickSelectTokens[1].symbol).toBe('USDC');
    });

    it('handleQuickSelectToken selects token from quick select list', () => {
      const allTokens = [
        createMockToken({ symbol: 'mUSD' }),
        createMockToken({ symbol: 'USDC' }),
      ];
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ allTokens })),
      );

      act(() => {
        result.current.handleQuickSelectToken('mUSD');
      });

      expect(result.current.selectedToken?.symbol).toBe('mUSD');
    });

    it('handleQuickSelectToken is case-insensitive', () => {
      const allTokens = [createMockToken({ symbol: 'USDC' })];
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ allTokens })),
      );

      act(() => {
        result.current.handleQuickSelectToken('usdc');
      });

      expect(result.current.selectedToken?.symbol).toBe('USDC');
    });
  });

  describe('isOtherSelected', () => {
    it('returns false when no token is selected', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      expect(result.current.isOtherSelected).toBe(false);
    });

    it('returns false when selected token is in quick select list', () => {
      const initialToken = createMockToken({ symbol: 'USDC' });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isOtherSelected).toBe(false);
    });

    it('returns true when selected token is not in quick select list', () => {
      const initialToken = createMockToken({
        symbol: 'ETH',
        caipChainId: LINEA_CAIP_CHAIN_ID,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isOtherSelected).toBe(true);
    });

    it('returns true when token is on different chain', () => {
      const initialToken = createMockToken({
        symbol: 'USDC',
        caipChainId: 'eip155:8453', // Base chain
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isOtherSelected).toBe(true);
    });
  });

  describe('isSolanaSelected', () => {
    it('returns false when no token is selected', () => {
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams()),
      );

      expect(result.current.isSolanaSelected).toBe(false);
    });

    it('returns true when Solana token is selected', () => {
      const initialToken = createMockToken({
        symbol: 'SOL',
        caipChainId: SolScope.Mainnet,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isSolanaSelected).toBe(true);
    });

    it('returns true when token has solana: prefix', () => {
      const initialToken = createMockToken({
        symbol: 'SOL',
        caipChainId: 'solana:mainnet' as never,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isSolanaSelected).toBe(true);
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

    it('returns false when Solana token is selected', () => {
      const initialToken = createMockToken({
        caipChainId: SolScope.Mainnet,
      });
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      expect(result.current.isValid).toBe(false);
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

    it('clears cache after successful submission', async () => {
      const initialToken = createMockToken();
      const { result } = renderHook(() =>
        useSpendingLimit(createDefaultParams({ initialToken })),
      );

      await act(async () => {
        const submitPromise = result.current.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      expect(mockDispatch).toHaveBeenCalledWith(
        clearCacheData('card-external-wallet-details'),
      );
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
  });

  describe('isLoading', () => {
    it('returns true when delegation is loading', () => {
      mockUseCardDelegation.mockReturnValue({
        submitDelegation: mockSubmitDelegation,
        isLoading: true,
        error: null,
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
