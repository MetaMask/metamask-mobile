import { renderHook, act } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import { useQuickBuyController } from './hooks/useQuickBuyController';
import { positionToQuickBuyTarget } from './types';
import { selectDefaultSourceToken } from '../../../utils/tokenSelection';
import { useQuickBuySetup } from './hooks/useQuickBuySetup';
import { useSourceTokenOptions } from './hooks/useSourceTokenOptions';
import { useQuickBuyQuotes } from './hooks/useQuickBuyQuotes';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { selectShouldUseSmartTransaction } from '../../../../../../selectors/smartTransactionsController';
import Engine from '../../../../../../core/Engine';
import {
  selectIsSubmittingTx,
  selectDestAddress,
  selectSlippage,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
  selectIsSolanaSourced,
  selectBridgeFeatureFlags,
} from '../../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { usePriceImpactViewData } from '../../../../../UI/Bridge/hooks/usePriceImpactViewData';
import { TextColor } from '@metamask/design-system-react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { ChainId } from '@metamask/bridge-controller';
import Logger from '../../../../../../util/Logger';

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const mockTrackAmountSelected = jest.fn();

jest.mock('./hooks/useQuickBuyAnalytics', () => ({
  useQuickBuyAnalytics: () => ({
    refs: {
      dismissStageRef: { current: 'amount_selection' },
      tradeSubmittedRef: { current: false },
      lastTrackedAmountRef: { current: '' },
      lastInputMethodRef: { current: 'custom_input' },
      submitStartedAtRef: { current: null },
    },
    trackAmountSelected: mockTrackAmountSelected,
    trackTradeSubmitted: jest.fn(),
    trackTradeCompleted: jest.fn(),
    markTradeSubmitted: jest.fn(),
  }),
}));

jest.mock('./hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./hooks/useSourceTokenOptions', () => ({
  useSourceTokenOptions: jest.fn(),
}));

jest.mock('./hooks/useQuickBuyQuotes', () => ({
  useQuickBuyQuotes: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useInitialSlippage', () => ({
  useInitialSlippage: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useRecipientInitialization', () => ({
  useRecipientInitialization: jest.fn(),
}));

jest.mock(
  '../../../../../UI/Bridge/hooks/useIsGasIncludedSTXSendBundleSupported',
  () => ({
    useIsGasIncludedSTXSendBundleSupported: jest.fn(),
  }),
);

jest.mock('../../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(),
}));

jest.mock('../../../../../hooks/useRefreshSmartTransactionsLiveness', () => ({
  useRefreshSmartTransactionsLiveness: jest.fn(),
}));

jest.mock('../../../../confirmations/hooks/gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: { resetState: jest.fn() },
      BridgeStatusController: { submitTx: jest.fn() },
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      },
    },
  },
}));

jest.mock('../../../../../../core/redux/slices/bridge', () => ({
  setSourceAmount: jest.fn((v) => ({
    type: 'bridge/setSourceAmount',
    payload: v,
  })),
  setSourceToken: jest.fn((v) => ({
    type: 'bridge/setSourceToken',
    payload: v,
  })),
  setDestToken: jest.fn((v) => ({ type: 'bridge/setDestToken', payload: v })),
  resetBridgeState: jest.fn(() => ({ type: 'bridge/resetBridgeState' })),
  setIsSubmittingTx: jest.fn((v) => ({
    type: 'bridge/setIsSubmittingTx',
    payload: v,
  })),
  selectIsSubmittingTx: jest.fn(),
  selectDestAddress: jest.fn(),
  selectSlippage: jest.fn(),
  selectIsEvmNonEvmBridge: jest.fn(),
  selectIsNonEvmNonEvmBridge: jest.fn(),
  selectIsSolanaSourced: jest.fn(),
  selectBridgeFeatureFlags: jest.fn(),
}));

jest.mock('../../../../../../selectors/bridge', () => ({
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

jest.mock('../../../../../UI/Bridge/hooks/usePriceImpactViewData', () => ({
  usePriceImpactViewData: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockTrack = jest.fn();
jest.mock('../../../analytics', () => {
  const actual = jest.requireActual('../../../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

const mockDispatch = jest.fn();

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'TEST',
    tokenName: 'Test Token',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: 0,
    currentValueUSD: 900,
    pnlValueUsd: 400,
    pnlPercent: 80,
    ...overrides,
  }) as Position;

const createSourceToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    currencyExchangeRate: 2000,
    balance: '1.0',
    balanceFiat: '$2000.00',
    tokenFiatAmount: 2000,
    ...overrides,
  }) as BridgeToken;

const createActiveQuote = (overrides: Record<string, unknown> = {}) => ({
  ...overrides,
  quote: {
    srcTokenAmount: '10000000000000000',
    ...((overrides.quote as Record<string, unknown> | undefined) ?? {}),
  },
  totalNetworkFee: {
    amount: '0.0001',
    ...((overrides.totalNetworkFee as Record<string, unknown> | undefined) ??
      {}),
  },
});

const setupDefaultMocks = () => {
  (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

  // Each useSelector call is dispatched to the corresponding mocked selector.
  // Selectors are jest.fn() so we set their return values.
  (useSelector as jest.Mock).mockImplementation(
    (selector: (state: unknown) => unknown) => selector({}),
  );
  (selectIsSubmittingTx as unknown as jest.Mock).mockReturnValue(false);
  (selectSourceWalletAddress as unknown as jest.Mock).mockReturnValue(
    '0xWALLET',
  );
  (selectDestAddress as unknown as jest.Mock).mockReturnValue(null);
  (selectSlippage as unknown as jest.Mock).mockReturnValue('0.5');
  (selectIsEvmNonEvmBridge as unknown as jest.Mock).mockReturnValue(false);
  (selectIsNonEvmNonEvmBridge as unknown as jest.Mock).mockReturnValue(false);
  (selectIsSolanaSourced as unknown as jest.Mock).mockReturnValue(false);
  (selectBridgeFeatureFlags as unknown as jest.Mock).mockReturnValue({
    priceImpactThreshold: { warning: 0.05, error: 0.25 },
  });
  (
    selectSelectedInternalAccountFormattedAddress as unknown as jest.Mock
  ).mockReturnValue('0xWALLET');
  (selectCurrentCurrency as unknown as jest.Mock).mockReturnValue('USD');
  (usePriceImpactViewData as jest.Mock).mockReturnValue({
    textColor: TextColor.TextAlternative,
    icon: undefined,
    title: 'bridge.price_impact_info_title',
    description: 'bridge.price_impact_info_description',
  });

  (useQuickBuySetup as jest.Mock).mockReturnValue({
    chainId: '0x1',
    destToken: {
      address: '0xDEST',
      chainId: '0x1',
      decimals: 18,
      symbol: 'TARGET',
      name: 'Target Token',
    },
    isLoading: false,
    isUnsupportedChain: false,
  });

  (useSourceTokenOptions as jest.Mock).mockReturnValue({
    options: [createSourceToken()],
    isLoading: false,
  });

  (useQuickBuyQuotes as jest.Mock).mockReturnValue({
    activeQuote: undefined,
    destTokenAmount: undefined,
    isQuoteLoading: false,
    isNoQuotesAvailable: false,
    quoteFetchError: null,
    isActiveQuoteForCurrentTokenPair: true,
  });

  (useLatestBalance as jest.Mock).mockReturnValue({
    atomicBalance: undefined,
    displayBalance: undefined,
  });

  (useIsInsufficientBalance as jest.Mock).mockReturnValue(false);
  (useHasSufficientGas as jest.Mock).mockReturnValue(true);
  (selectShouldUseSmartTransaction as unknown as jest.Mock).mockReturnValue(
    false,
  );
  (
    Engine.context.BridgeStatusController.submitTx as jest.Mock
  ).mockResolvedValue(undefined);
};

describe('useQuickBuyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('handleAmountChange', () => {
    it('accepts valid numeric input', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.usdAmount).toBe('20');
    });

    it('normalizes a leading decimal without digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('.');
      });

      expect(result.current.usdAmount).toBe('0.');
      expect(result.current.hasValidAmount).toBe(false);
    });

    it('normalizes a leading decimal with digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('.5');
      });

      expect(result.current.usdAmount).toBe('0.5');
      expect(result.current.hasValidAmount).toBe(true);
    });

    it('resets slider percent when the user types a custom amount', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleSliderChange(50);
      });

      expect(result.current.sliderPercent).toBe(50);

      act(() => {
        result.current.handleAmountChange('25');
      });

      expect(result.current.usdAmount).toBe('25');
      expect(result.current.sliderPercent).toBe(0);
    });
  });

  describe('handleSliderChange', () => {
    it('sets usdAmount from slider percent of available balance', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleSliderChange(50);
      });

      expect(result.current.sliderPercent).toBe(50);
      expect(Number(result.current.usdAmount)).toBeGreaterThan(0);
    });

    it('tracks amount selected once when the snapped percent is unchanged', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleSliderChange(48);
        result.current.handleSliderChange(49);
        result.current.handleSliderChange(51);
      });

      expect(result.current.sliderPercent).toBe(50);
      expect(mockTrackAmountSelected).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleSelectSourceToken', () => {
    it('updates the selected token and resets amount + slider state', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const usdc = createSourceToken({
        symbol: 'USDC',
        currencyExchangeRate: 1,
      });
      const usdt = createSourceToken({
        symbol: 'USDT',
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        currencyExchangeRate: 1,
      });
      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [usdc, usdt],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleSliderChange(50);
        result.current.handleAmountChange('25');
      });

      expect(result.current.usdAmount).toBe('25');
      expect(result.current.sliderPercent).toBe(0);

      act(() => {
        result.current.handleSelectSourceToken(usdt);
      });

      expect(result.current.selectedSourceToken).toEqual(usdt);
      expect(result.current.usdAmount).toBe('');
      expect(result.current.sliderPercent).toBe(0);
    });
  });

  describe('getButtonLabel', () => {
    it('returns the buy label when all conditions are normal', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.trader_position.buy',
      );
    });

    it('returns the insufficient-funds label when source balance is too low', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.buttonError).toBe('insufficient_balance');
      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_funds');
    });

    it('returns the insufficient-gas label when gas is short', () => {
      (useHasSufficientGas as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.buttonError).toBe('insufficient_gas');
      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_gas');

      (useHasSufficientGas as jest.Mock).mockReturnValue(true);
    });

    it('returns the insufficient-funds label when BTC network fee is unavailable', () => {
      const activeQuote = createActiveQuote({
        quote: {
          srcChainId: ChainId.BTC,
        },
        totalNetworkFee: {
          amount: '0',
        },
      });

      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote,
        destTokenAmount: '1',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.buttonError).toBe('insufficient_balance');
      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_funds');
      expect(useHasSufficientGas).toHaveBeenCalledWith({
        quote: activeQuote,
      });
    });
  });

  describe('quoteOverride wiring', () => {
    it('passes null to useIsInsufficientBalance when there is no active quote', () => {
      renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      expect(useIsInsufficientBalance).toHaveBeenLastCalledWith(
        expect.objectContaining({
          quoteOverride: null,
        }),
      );
    });

    it('passes the active quote to useIsInsufficientBalance when one is available', () => {
      const activeQuote = createActiveQuote();
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote,
        destTokenAmount: '5',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      expect(useIsInsufficientBalance).toHaveBeenLastCalledWith(
        expect.objectContaining({
          quoteOverride: activeQuote,
        }),
      );
    });
  });

  describe('isConfirmDisabled', () => {
    it('is disabled when usdAmount is empty', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when amount is valid and there is no active quote', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when the source token is missing even if a quote exists', () => {
      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [],
        isLoading: false,
      });
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: createActiveQuote(),
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.confirmButtonState).toBe('idle');
    });

    it('is disabled when a destination address is required but missing', () => {
      (selectIsEvmNonEvmBridge as unknown as jest.Mock).mockReturnValue(true);
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: createActiveQuote(),
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.confirmButtonState).toBe('idle');
    });

    it('is enabled after quote loading settles for the entered amount', () => {
      const quoteState: {
        activeQuote: ReturnType<typeof createActiveQuote> | undefined;
        destTokenAmount: string | undefined;
        isQuoteLoading: boolean;
        isNoQuotesAvailable: boolean;
        quoteFetchError: null;
        isActiveQuoteForCurrentTokenPair: boolean;
      } = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: positionToQuickBuyTarget(createPosition()),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        {
          initialProps: props,
        },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      quoteState.isQuoteLoading = true;
      rerender(props);

      quoteState.isQuoteLoading = false;
      quoteState.activeQuote = createActiveQuote();
      rerender(props);
      rerender(props);

      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('is disabled when amount changes after quote loading settles', () => {
      const quoteState: {
        activeQuote: ReturnType<typeof createActiveQuote> | undefined;
        destTokenAmount: string | undefined;
        isQuoteLoading: boolean;
        isNoQuotesAvailable: boolean;
        quoteFetchError: null;
        isActiveQuoteForCurrentTokenPair: boolean;
      } = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: positionToQuickBuyTarget(createPosition()),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        {
          initialProps: props,
        },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      quoteState.isQuoteLoading = true;
      rerender(props);

      quoteState.isQuoteLoading = false;
      quoteState.activeQuote = createActiveQuote();
      rerender(props);
      rerender(props);

      act(() => {
        result.current.handleAmountChange('30');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.confirmButtonState).toBe('idle');
    });

    const settleQuote = () => {
      const quoteState: {
        activeQuote: ReturnType<typeof createActiveQuote> | undefined;
        destTokenAmount: string | undefined;
        isQuoteLoading: boolean;
        isNoQuotesAvailable: boolean;
        quoteFetchError: null;
        isActiveQuoteForCurrentTokenPair: boolean;
      } = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: positionToQuickBuyTarget(createPosition()),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        { initialProps: props },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });
      quoteState.isQuoteLoading = true;
      rerender(props);
      quoteState.isQuoteLoading = false;
      quoteState.activeQuote = createActiveQuote();
      rerender(props);
      rerender(props);

      return { result, rerender, props };
    };

    it('is disabled when a hardware wallet sources from Solana', () => {
      (selectIsSolanaSourced as unknown as jest.Mock).mockReturnValue(true);
      const { isHardwareAccount } = jest.requireMock(
        '../../../../../../util/address',
      );
      isHardwareAccount.mockReturnValue(true);

      const { result } = settleQuote();

      expect(result.current.isHardwareSolanaBlocked).toBe(true);
      expect(result.current.isConfirmDisabled).toBe(true);

      isHardwareAccount.mockReturnValue(false);
    });

    it('is disabled when the price impact exceeds the error threshold', () => {
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => ({
        activeQuote: {
          quote: { priceData: { priceImpact: '0.30' } },
        },
        destTokenAmount: '1',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      }));

      const props = {
        target: positionToQuickBuyTarget(createPosition()),
        onClose: jest.fn(),
      };
      const { result } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        { initialProps: props },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isPriceImpactError).toBe(true);
      expect(result.current.isConfirmDisabled).toBe(true);
    });
  });

  describe('source token auto-selection', () => {
    it('auto-selects the first option when options load (legacy — native on dest chain matches priority 1)', () => {
      const firstToken = createSourceToken({ symbol: 'ETH' });

      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [firstToken, createSourceToken({ symbol: 'USDC' })],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      // createPosition uses chain 'base' → destChainId '0x1' in default mock,
      // and ETH (zero address, chainId '0x1') is native on that chain → priority 1.
      expect(result.current.sourceToken?.symbol).toBe('ETH');
    });
  });

  describe('selectDefaultSourceToken', () => {
    const native = (chainId: string, fiat = 1000): BridgeToken =>
      createSourceToken({
        address: '0x0000000000000000000000000000000000000000',
        chainId: chainId as `0x${string}`,
        symbol: 'ETH',
        tokenFiatAmount: fiat,
      });

    const erc20 = (chainId: string, symbol: string, fiat = 1000): BridgeToken =>
      createSourceToken({
        address: `0xToken${symbol}`,
        chainId: chainId as `0x${string}`,
        symbol,
        tokenFiatAmount: fiat,
      });

    it('returns undefined when options list is empty', () => {
      expect(selectDefaultSourceToken([], '0x1')).toBeUndefined();
    });

    it('priority 1: selects native token on the destination chain', () => {
      const ethOnBase = native('0x2105', 500);
      const usdcOnBase = erc20('0x2105', 'USDC', 3000);
      const ethOnMainnet = native('0x1', 2000);

      // Sorted by highest fiat: USDC on Base, ETH mainnet, ETH on Base
      const result = selectDefaultSourceToken(
        [usdcOnBase, ethOnMainnet, ethOnBase],
        '0x2105',
      );

      expect(result?.symbol).toBe('ETH');
      expect(result?.chainId).toBe('0x2105');
    });

    it('priority 2: selects highest-balance token on the dest chain when no native exists there', () => {
      const usdcOnBase = erc20('0x2105', 'USDC', 3000);
      const usdtOnBase = erc20('0x2105', 'USDT', 1000);
      const ethOnMainnet = native('0x1', 2000);

      // Sorted by highest fiat: USDC on Base, ETH mainnet, USDT on Base
      const result = selectDefaultSourceToken(
        [usdcOnBase, ethOnMainnet, usdtOnBase],
        '0x2105',
      );

      expect(result?.symbol).toBe('USDC');
      expect(result?.chainId).toBe('0x2105');
    });

    it('priority 3: selects the native token with the highest balance when no tokens exist on the dest chain', () => {
      const usdcOnMainnet = erc20('0x1', 'USDC', 5000);
      const ethOnArbitrum = native('0xa4b1', 3000);
      const ethOnMainnet = native('0x1', 2000);

      // Sorted by highest fiat: USDC mainnet, ETH Arbitrum, ETH mainnet
      const result = selectDefaultSourceToken(
        [usdcOnMainnet, ethOnArbitrum, ethOnMainnet],
        '0x2105', // Base — no tokens here
      );

      // ETH on Arbitrum (index 1) is the first native in the sorted list
      expect(result?.symbol).toBe('ETH');
      expect(result?.chainId).toBe('0xa4b1');
    });

    it('priority 3 fallback: returns first option when no native tokens exist on any chain', () => {
      const usdcOnMainnet = erc20('0x1', 'USDC', 5000);
      const usdtOnMainnet = erc20('0x1', 'USDT', 3000);

      const result = selectDefaultSourceToken(
        [usdcOnMainnet, usdtOnMainnet],
        '0x2105', // Base — no tokens here
      );

      expect(result?.symbol).toBe('USDC');
    });

    it('selects native SOL as priority 3 when no EVM native is available', () => {
      const solNative: BridgeToken = createSourceToken({
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        symbol: 'SOL',
        tokenFiatAmount: 2000,
      });
      const usdcOnMainnet = erc20('0x1', 'USDC', 5000);

      const result = selectDefaultSourceToken(
        [usdcOnMainnet, solNative],
        '0x2105',
      );

      // SOL is native (slip44:501) and highest among natives
      expect(result?.symbol).toBe('SOL');
    });

    it('works correctly when destChainId is undefined', () => {
      const ethOnMainnet = native('0x1', 2000);
      const usdcOnMainnet = erc20('0x1', 'USDC', 5000);

      // Without destChainId, skip priorities 1 & 2 and go straight to priority 3
      const result = selectDefaultSourceToken(
        [usdcOnMainnet, ethOnMainnet],
        undefined,
      );

      expect(result?.symbol).toBe('ETH');
    });
  });

  describe('handleClose', () => {
    it('calls the onClose prop', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          onClose,
        ),
      );

      act(() => {
        result.current.handleClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleConfirm', () => {
    it('submits via BridgeStatusController.submitTx with normalised approval and stxEnabled', async () => {
      const activeQuote = {
        ...createActiveQuote(),
        approval: null,
      } as unknown as ReturnType<typeof createActiveQuote>;

      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote,
        destTokenAmount: '1',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });
      (selectShouldUseSmartTransaction as unknown as jest.Mock).mockReturnValue(
        true,
      );

      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          onClose,
        ),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(
        Engine.context.BridgeStatusController.submitTx,
      ).toHaveBeenCalledWith(
        '0xWALLET',
        expect.objectContaining({ approval: undefined }),
        true,
      );
    });

    it('does not call submitTx when there is no active quote', async () => {
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(
        Engine.context.BridgeStatusController.submitTx,
      ).not.toHaveBeenCalled();
    });

    it('logs feature:social when submitTx fails', async () => {
      const submitError = new Error('user rejected');
      (
        Engine.context.BridgeStatusController.submitTx as jest.Mock
      ).mockRejectedValue(submitError);

      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: createActiveQuote(),
        destTokenAmount: '1',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          positionToQuickBuyTarget(createPosition()),
          jest.fn(),
        ),
      );

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(Logger.error).toHaveBeenCalledWith(
        submitError,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'quick_buy',
            operation: 'submit_tx',
            source: 'useQuickBuyController',
          }),
          extras: expect.objectContaining({
            message: 'Error submitting QuickBuy tx at useQuickBuyController',
          }),
        }),
      );
    });
  });
});
