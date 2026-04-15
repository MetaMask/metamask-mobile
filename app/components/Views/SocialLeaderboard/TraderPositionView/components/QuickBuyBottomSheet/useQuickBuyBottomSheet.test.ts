import { renderHook, act } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import { useQuickBuyBottomSheet } from './useQuickBuyBottomSheet';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import { useBridgeQuoteRequest } from '../../../../../UI/Bridge/hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../../../../UI/Bridge/hooks/useBridgeQuoteData';
import { useRewards } from '../../../../../UI/Bridge/hooks/useRewards';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import useSubmitBridgeTx from '../../../../../../util/bridge/hooks/useSubmitBridgeTx';
import {
  selectIsSubmittingTx,
  selectDestAddress,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
} from '../../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../../selectors/bridge';
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

jest.mock('../../../../../UI/Bridge/hooks/useBridgeQuoteRequest', () => ({
  useBridgeQuoteRequest: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useRewards', () => ({
  useRewards: jest.fn(),
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

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: { resetState: jest.fn() },
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
  selectIsEvmNonEvmBridge: jest.fn(),
  selectIsNonEvmNonEvmBridge: jest.fn(),
}));

jest.mock('../../../../../../selectors/bridge', () => ({
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockDispatch = jest.fn();
const mockCancelQuote = jest.fn();
const mockUpdateQuoteParams = Object.assign(jest.fn(), {
  cancel: mockCancelQuote,
});
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

const setupDefaultMocks = () => {
  (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

  // Each useSelector call is dispatched to the corresponding mocked selector.
  // Selectors are jest.fn() so we set their return values.
  (useSelector as jest.Mock).mockImplementation(
    (selector: (state: unknown) => unknown) => selector({}),
  );
  (selectIsSubmittingTx as jest.Mock).mockReturnValue(false);
  (selectSourceWalletAddress as jest.Mock).mockReturnValue('0xWALLET');
  (selectDestAddress as jest.Mock).mockReturnValue(null);
  (selectIsEvmNonEvmBridge as jest.Mock).mockReturnValue(false);
  (selectIsNonEvmNonEvmBridge as jest.Mock).mockReturnValue(false);

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

  (useBridgeQuoteRequest as jest.Mock).mockReturnValue(mockUpdateQuoteParams);

  (useBridgeQuoteData as jest.Mock).mockReturnValue({
    activeQuote: null,
    isLoading: false,
    isNoQuotesAvailable: false,
    quoteFetchError: null,
    blockaidError: null,
  });

  (useRewards as jest.Mock).mockReturnValue({
    estimatedPoints: undefined,
    isLoading: false,
    shouldShowRewardsRow: false,
    hasError: false,
    accountOptedIn: false,
    rewardsAccountScope: null,
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

    it('accepts decimal input up to 2 places', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20.99');
      });

      expect(result.current.usdAmount).toBe('20.99');
    });

    it('strips non-numeric characters', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('$20abc');
      });

      expect(result.current.usdAmount).toBe('20');
    });

    it('rejects input with more than one decimal point', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20.5');
      });
      act(() => {
        result.current.handleAmountChange('20.5.1');
      });

      expect(result.current.usdAmount).toBe('20.5');
    });

    it('rejects more than 2 decimal places', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20.50');
      });
      act(() => {
        result.current.handleAmountChange('20.503');
      });

      expect(result.current.usdAmount).toBe('20.50');
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

    it('replaces a previously entered amount', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('75');
      });
      act(() => {
        result.current.handlePresetPress('100');
      });

      expect(result.current.usdAmount).toBe('100');
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

    it('returns loading label when setup is fetching token metadata', () => {
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: undefined,
        destToken: undefined,
        isLoading: true,
        isUnsupportedChain: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.quick_buy.loading',
      );
    });

    it('returns insufficient funds label when source balance is too low', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_funds');
    });

    it('returns insufficient gas label when gas estimate exceeds balance', () => {
      (useHasSufficientGas as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_gas');
    });

    it('does not return insufficient gas label when gas status is null (not yet determined)', () => {
      (useHasSufficientGas as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).not.toBe(
        'bridge.insufficient_gas',
      );
    });

    it('returns submitting label while a transaction is in-flight', () => {
      (selectIsSubmittingTx as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'bridge.submitting_transaction',
      );
    });

    it('returns unavailable label when a quote error occurred', () => {
      (useBridgeQuoteData as jest.Mock).mockReturnValue({
        activeQuote: null,
        isLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: new Error('quote failed'),
        blockaidError: null,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.quick_buy.unavailable',
      );
    });

    it('returns unavailable label when no quotes are available', () => {
      (useBridgeQuoteData as jest.Mock).mockReturnValue({
        activeQuote: null,
        isLoading: false,
        isNoQuotesAvailable: true,
        quoteFetchError: null,
        blockaidError: null,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.quick_buy.unavailable',
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

    it('is enabled when amount is valid and all other conditions are met', () => {
      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('is disabled when gas is insufficient (false)', () => {
      (useHasSufficientGas as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is NOT disabled when gas status is null (quote not yet loaded)', () => {
      (useHasSufficientGas as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('is disabled when destToken is undefined (metadata load failed)', () => {
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: undefined,
        isLoading: false,
        isUnsupportedChain: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when balance is insufficient', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when there is a quote error', () => {
      (useBridgeQuoteData as jest.Mock).mockReturnValue({
        activeQuote: null,
        isLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: new Error('network error'),
        blockaidError: null,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when wallet address is not resolved', () => {
      (selectSourceWalletAddress as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });
  });

  describe('isConfirmLoading', () => {
    it('is true while a transaction is being submitted', () => {
      (selectIsSubmittingTx as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.isConfirmLoading).toBe(true);
    });

    it('is true while a quote is loading with a valid amount entered', () => {
      (useBridgeQuoteData as jest.Mock).mockReturnValue({
        activeQuote: null,
        isLoading: true,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        blockaidError: null,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmLoading).toBe(true);
    });

    it('is false while a quote is loading but no amount has been entered', () => {
      (useBridgeQuoteData as jest.Mock).mockReturnValue({
        activeQuote: null,
        isLoading: true,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        blockaidError: null,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      // usdAmount is '' by default
      expect(result.current.isConfirmLoading).toBe(false);
    });
  });

  describe('sourceBalanceFiat', () => {
    it('computes the fiat value from displayBalance and exchange rate', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        atomicBalance: undefined,
        displayBalance: '1.0',
      });
      // createSourceToken has currencyExchangeRate: 2000 — auto-selected as first option

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.sourceBalanceFiat).toBe('$2000.00');
    });

    it('returns undefined when displayBalance is missing', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        atomicBalance: undefined,
        displayBalance: undefined,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.sourceBalanceFiat).toBeUndefined();
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

    it('exposes all available source token options', () => {
      const options = [
        createSourceToken({ symbol: 'ETH' }),
        createSourceToken({ symbol: 'USDC' }),
      ];

      (useSourceTokenOptions as jest.Mock).mockReturnValue({
        options,
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.sourceTokenOptions).toHaveLength(2);
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
