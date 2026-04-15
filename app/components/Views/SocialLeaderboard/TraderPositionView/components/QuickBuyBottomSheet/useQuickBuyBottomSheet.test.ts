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

    it('returns insufficient funds label when source balance is too low', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyBottomSheet(createPosition(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe('bridge.insufficient_funds');
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
