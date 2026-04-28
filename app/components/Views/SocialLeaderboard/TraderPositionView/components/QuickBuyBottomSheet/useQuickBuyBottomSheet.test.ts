import { renderHook, act } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import useSubmitBridgeTx from '../../../../../../util/bridge/hooks/useSubmitBridgeTx';
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
import { usePriceImpactViewData } from '../../../../../UI/Bridge/hooks/usePriceImpactViewData';
import { TextColor } from '@metamask/design-system-react-native';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('./useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./useSourceTokenOptions', () => ({
  useSourceTokenOptions: jest.fn(),
}));

jest.mock('./useQuickBuyQuotes', () => ({
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

jest.mock('../../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: jest.fn(),
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
const mockSubmitBridgeTx = jest.fn();

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

const createActiveQuote = () => ({
  quote: {
    srcTokenAmount: '10000000000000000',
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
  (useSubmitBridgeTx as jest.Mock).mockReturnValue({
    submitBridgeTx: mockSubmitBridgeTx,
  });
};

describe('useQuickBuyBottomSheet', () => {
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
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.usdAmount).toBe('20');
    });

    it('normalizes a leading decimal without digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('.');
      });

      expect(result.current.usdAmount).toBe('0.');
      expect(result.current.hasValidAmount).toBe(false);
    });

    it('normalizes a leading decimal with digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('.5');
      });

      expect(result.current.usdAmount).toBe('0.5');
      expect(result.current.hasValidAmount).toBe(true);
    });
  });

  describe('handlePresetPress', () => {
    it('sets usdAmount to the preset value', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handlePresetPress('50');
      });

      expect(result.current.usdAmount).toBe('50');
    });
  });

  describe('getButtonLabel', () => {
    it('returns the buy label when all conditions are normal', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.trader_position.buy',
      );
    });

    it('returns the insufficient-funds label when source balance is too low', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.buttonError).toBe('insufficient_balance');
      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_funds');
    });

    it('returns the insufficient-gas label when gas is short', () => {
      (useHasSufficientGas as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.buttonError).toBe('insufficient_gas');
      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_gas');

      (useHasSufficientGas as jest.Mock).mockReturnValue(true);
    });
  });

  describe('quoteOverride wiring', () => {
    it('passes null to useIsInsufficientBalance when there is no active quote', () => {
      renderHook(() => useQuickBuyBottomSheet(createPosition(), jest.fn()));

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

      renderHook(() => useQuickBuyBottomSheet(createPosition(), jest.fn()));

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
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when amount is valid and there is no active quote', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
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
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
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
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
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
        position: createPosition(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ position, onClose }) => useQuickBuyBottomSheet(position, onClose),
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
        position: createPosition(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ position, onClose }) => useQuickBuyBottomSheet(position, onClose),
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
        position: createPosition(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ position, onClose }) => useQuickBuyBottomSheet(position, onClose),
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
        position: createPosition(),
        onClose: jest.fn(),
      };
      const { result } = renderHook(
        ({ position, onClose }) => useQuickBuyBottomSheet(position, onClose),
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
    it('auto-selects the first option when options load', () => {
      const firstToken = createSourceToken({ symbol: 'ETH' });

      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options: [firstToken, createSourceToken({ symbol: 'USDC' })],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.sourceToken?.symbol).toBe('ETH');
    });
  });

  describe('handleClose', () => {
    it('calls the onClose prop', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), onClose),
      );

      act(() => {
        result.current.handleClose();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
