import { ChainId } from '@metamask/bridge-controller';
import { TextColor } from '@metamask/design-system-react-native';
import type { Position } from '@metamask/social-controllers';
import { act, renderHook } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import {
  selectBridgeFeatureFlags,
  selectDestAddress,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
  selectIsNonEvmSourced,
  selectIsSolanaSourced,
  selectIsSubmittingTx,
  selectSlippage,
} from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectSourceWalletAddress } from '../../../../../../selectors/bridge';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { selectShouldUseSmartTransaction } from '../../../../../../selectors/smartTransactionsController';
import {
  ImpactMoment,
  playErrorNotification,
  playImpact,
} from '../../../../../../util/haptics';
import Logger from '../../../../../../util/Logger';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import { toAssetId } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { usePriceImpactViewData } from '../../../../../UI/Bridge/hooks/usePriceImpactViewData';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import {
  isSameAsset,
  selectDefaultSourceToken,
} from '../../../utils/tokenSelection';
import { useDestTokenExchangeRate } from './hooks/useDestTokenExchangeRate';
import { usePayWithTokens } from './hooks/usePayWithTokens';
import { usePositionTokenBalance } from './hooks/usePositionTokenBalance';
import { useQuickBuyController } from './hooks/useQuickBuyController';
import {
  useQuickBuyQuotes,
  type EnrichedQuickBuyQuote,
  type UseQuickBuyQuotesResult,
} from './hooks/useQuickBuyQuotes';
import { useQuickBuySetup } from './hooks/useQuickBuySetup';
import { useReceiveTokens } from './hooks/useReceiveTokens';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';
import {
  trackQuickBuyTrade,
  beginQuickBuySubmission,
  endQuickBuySubmission,
} from './quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from './resolveQuickBuyTerminalToast';
import { positionToQuickBuyTarget } from './types';

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
const mockGoToBuy = jest.fn().mockResolvedValue(undefined);
const mockTrackTradeSubmitted = jest.fn();
const mockTrackTradeCompleted = jest.fn();
const mockTrackQuoteSelected = jest.fn();
const mockTrackPayWithSelected = jest.fn();
const mockTrackReceiveTokenSelected = jest.fn();
const mockTrackSlippageChanged = jest.fn();

jest.mock('../../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(
    () => 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
  ),
}));

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: mockGoToBuy }),
}));

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
    trackTradeModeToggled: jest.fn(),
    trackQuoteSelected: mockTrackQuoteSelected,
    trackPayWithSelected: mockTrackPayWithSelected,
    trackReceiveTokenSelected: mockTrackReceiveTokenSelected,
    trackSlippageChanged: mockTrackSlippageChanged,
    trackTradeSubmitted: mockTrackTradeSubmitted,
    trackTradeCompleted: mockTrackTradeCompleted,
    markTradeSubmitted: jest.fn(),
  }),
}));

jest.mock('./hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./hooks/usePayWithTokens', () => ({
  usePayWithTokens: jest.fn(),
}));

jest.mock('./hooks/useReceiveTokens', () => ({
  useReceiveTokens: jest.fn().mockReturnValue([]),
}));

jest.mock('./hooks/usePositionTokenBalance', () => ({
  usePositionTokenBalance: jest.fn().mockReturnValue(undefined),
}));

jest.mock('./hooks/useDestTokenExchangeRate', () => ({
  useDestTokenExchangeRate: jest.fn().mockReturnValue(undefined),
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

jest.mock('../../../../../UI/Bridge/hooks/useDisplayCurrencyValue', () => ({
  useDisplayCurrencyValue: jest.fn(() => undefined),
}));

jest.mock('../../../../../UI/Bridge/hooks/useFormattedNetworkFee', () => ({
  useFormattedNetworkFee: jest.fn(() => '-'),
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
  selectIsNonEvmSourced: jest.fn(),
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
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
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

const mockShowToast = jest.fn();
jest.mock('../../../../../../component-library/components/Toast', () => {
  const actualReact = jest.requireActual('react');
  return {
    __esModule: true,
    ToastContext: actualReact.createContext({
      // Defer to mockShowToast lazily: this object is built at mock-factory
      // eval time, before the `mockShowToast` const is initialised.
      toastRef: {
        current: {
          showToast: (...args: unknown[]) => mockShowToast(...args),
        },
      },
    }),
    ToastVariants: { Plain: 'Plain', Icon: 'Icon' },
  };
});

jest.mock('./quickBuyTradeTracker', () => ({
  trackQuickBuyTrade: jest.fn(),
  getTrackedQuickBuyTrade: jest.fn(),
  getTrackedQuickBuyTradeIds: jest.fn(() => []),
  untrackQuickBuyTrade: jest.fn(),
  beginQuickBuySubmission: jest.fn(),
  endQuickBuySubmission: jest.fn(),
}));

jest.mock('./quickBuyToastOptions', () => ({
  buildQuickBuyToastOptions: jest.fn((kind: string) => ({ kind })),
}));

jest.mock('./resolveQuickBuyTerminalToast', () => ({
  resolveQuickBuyTerminalToast: jest.fn(),
}));

jest.mock('../../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  playErrorNotification: jest.fn(),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
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

const createTarget = (overrides: Partial<Position> = {}) => {
  const target = positionToQuickBuyTarget(createPosition(overrides));
  if (!target) throw new Error('createTarget: position chain is not mapped');
  return target;
};

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

const createActiveQuote = (
  overrides: Record<string, unknown> = {},
): EnrichedQuickBuyQuote =>
  ({
    ...overrides,
    quote: {
      srcTokenAmount: '10000000000000000',
      ...((overrides.quote as Record<string, unknown> | undefined) ?? {}),
    },
    // The full wallet deduction (routing amount + src-token fees), in decimal
    // token units. 0.01 ETH matches the $20 / $2000 amount the disabled-state
    // tests enter, and is what `isActiveQuoteForCurrentAmount` compares against
    // (not the post-fee `quote.srcTokenAmount`, which lags for gas-included
    // quotes).
    sentAmount: {
      amount: '0.01',
      ...((overrides.sentAmount as Record<string, unknown> | undefined) ?? {}),
    },
    totalNetworkFee: {
      amount: '0.0001',
      ...((overrides.totalNetworkFee as Record<string, unknown> | undefined) ??
        {}),
    },
  }) as EnrichedQuickBuyQuote;

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
  (selectIsNonEvmSourced as unknown as jest.Mock).mockReturnValue(false);
  (selectBridgeFeatureFlags as unknown as jest.Mock).mockReturnValue({
    priceImpactThreshold: { warning: 0.05, error: 0.25 },
  });
  (
    selectSelectedInternalAccountFormattedAddress as unknown as jest.Mock
  ).mockReturnValue('0xWALLET');
  (selectCurrentCurrency as unknown as jest.Mock).mockReturnValue('USD');
  // Native-currency rates + network configs power the fiat->USD conversion for
  // `amount_usd` analytics. conversionRate === usdConversionRate keeps the USD
  // case a 1:1 conversion (entered USD amount == amount_usd).
  (selectCurrencyRates as unknown as jest.Mock).mockReturnValue({
    ETH: { conversionRate: 2000, usdConversionRate: 2000 },
  });
  (selectNetworkConfigurations as unknown as jest.Mock).mockReturnValue({
    '0x1': { nativeCurrency: 'ETH' },
  });
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

  (useReceiveTokens as jest.Mock).mockReturnValue([]);
  (usePositionTokenBalance as jest.Mock).mockReturnValue(undefined);
  (useDestTokenExchangeRate as jest.Mock).mockReturnValue(undefined);
  (usePayWithTokens as jest.Mock).mockReturnValue({
    options: [createSourceToken()],
    isLoading: false,
  });

  (useQuickBuyQuotes as jest.Mock).mockReturnValue({
    activeQuote: undefined,
    sortedQuotes: [],
    destTokenAmount: undefined,
    isQuoteLoading: false,
    isNoQuotesAvailable: false,
    quoteFetchError: null,
    isActiveQuoteForCurrentTokenPair: true,
    isQuoteRequestStale: false,
    quoteCount: 0,
    quotesLastFetchedAt: null,
    refreshCount: 0,
    quoteRefreshRateMs: 30000,
    maxRefreshCount: 5,
    refetchQuotes: jest.fn(),
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
  (buildQuickBuyToastOptions as jest.Mock).mockImplementation(
    (kind: string) => ({ kind }),
  );
  (toAssetId as jest.Mock).mockReturnValue(
    'eip155:1/erc20:0x0000000000000000000000000000000000000000',
  );
  mockGoToBuy.mockResolvedValue(undefined);
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
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.fiatAmount).toBe('20');
    });

    it('normalizes a leading decimal without digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('.');
      });

      expect(result.current.fiatAmount).toBe('0.');
      expect(result.current.hasValidAmount).toBe(false);
    });

    it('normalizes a leading decimal with digits', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('.5');
      });

      expect(result.current.fiatAmount).toBe('0.5');
      expect(result.current.hasValidAmount).toBe(true);
    });

    it('resets slider percent when the user types a custom amount', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSliderChange(50);
      });

      expect(result.current.sliderPercent).toBe(50);

      act(() => {
        result.current.handleAmountChange('25');
      });

      expect(result.current.fiatAmount).toBe('25');
      expect(result.current.sliderPercent).toBe(0);
    });
  });

  describe('handleSliderChange', () => {
    it('updates display state (sliderPercent, fiatAmount) on every 1% tick', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSliderChange(50);
      });

      expect(result.current.sliderPercent).toBe(50);
      expect(Number(result.current.fiatAmount)).toBeGreaterThan(0);
    });

    it('does not fire analytics during drag — only updates display', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );
      mockTrackAmountSelected.mockClear();

      act(() => {
        result.current.handleSliderChange(48);
        result.current.handleSliderChange(49);
        result.current.handleSliderChange(51);
      });

      expect(result.current.sliderPercent).toBe(51);
      expect(mockTrackAmountSelected).not.toHaveBeenCalled();
    });
  });

  describe('sheet open defaults', () => {
    it('defaults the slider to 50% when spendable balance is available', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.sliderPercent).toBe(50);
      expect(Number(result.current.fiatAmount)).toBe(50);
    });
  });

  describe('handleSliderDragEnd', () => {
    it('commits the amount and fires analytics once when the user lifts their finger', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );
      mockTrackAmountSelected.mockClear();

      act(() => {
        result.current.handleSliderChange(48);
        result.current.handleSliderChange(49);
        result.current.handleSliderChange(51);
      });
      act(() => {
        result.current.handleSliderDragEnd(51);
      });

      expect(result.current.sliderPercent).toBe(51);
      expect(mockTrackAmountSelected).toHaveBeenCalledTimes(1);
    });

    it('deduplicates identical commit values (Tap + Pan double-fire guard)', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSliderDragEnd(50);
        result.current.handleSliderDragEnd(50);
      });

      expect(mockTrackAmountSelected).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleQuickAmountPress', () => {
    it('commits the fiat amount, syncs the slider, and tracks PRESET analytics', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '10',
        atomicBalance: '10000000000000000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 200 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleQuickAmountPress(50, 50);
      });

      expect(result.current.fiatAmount).toBe('50.00');
      expect(result.current.sliderPercent).toBe(3);
      expect(mockTrackAmountSelected).toHaveBeenCalledWith(
        expect.any(Number),
        'preset',
        expect.any(String),
        undefined,
        undefined,
        50,
      );
    });

    it('enables Add Funds when a pill exceeds the available balance', () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '0.1',
        atomicBalance: '100000000000000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 2000 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleQuickAmountPress(250, 250);
      });

      expect(result.current.fiatAmount).toBe('250.00');
      expect(result.current.sliderPercent).toBe(100);
      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.quick_buy.add_funds',
      );
      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('routes to Ramp buy when Add Funds is confirmed', async () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '0.1',
        atomicBalance: '100000000000000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 2000 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });
      const onClose = jest.fn();

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), onClose),
      );

      act(() => {
        result.current.handleQuickAmountPress(250, 250);
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockGoToBuy).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: expect.any(String) }),
        { buyFlowOrigin: 'tokenInfo' },
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('does not close the sheet when pay-with asset id cannot be resolved', async () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '0.1',
        atomicBalance: '100000000000000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 2000 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });
      const onClose = jest.fn();
      (toAssetId as jest.Mock).mockReturnValueOnce(undefined);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), onClose),
      );

      act(() => {
        result.current.handleQuickAmountPress(250, 250);
      });

      await act(async () => {
        await result.current.handleConfirm();
      });

      expect(mockGoToBuy).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('exposes usdToCurrentCurrencyRate from native currency rates', () => {
      (selectCurrencyRates as unknown as jest.Mock).mockReturnValue({
        ETH: { conversionRate: 1000, usdConversionRate: 1200 },
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.usdToCurrentCurrencyRate).toBeCloseTo(1000 / 1200);
    });
  });

  describe('user-currency (non-USD)', () => {
    it('formats the headline in the user currency while emitting amount_usd in USD', () => {
      // EUR display currency; native ETH worth €1,000 / $1,200 → USD = EUR * 1.2.
      (selectCurrentCurrency as unknown as jest.Mock).mockReturnValue('EUR');
      (selectCurrencyRates as unknown as jest.Mock).mockReturnValue({
        ETH: { conversionRate: 1000, usdConversionRate: 1200 },
      });
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );
      mockTrackAmountSelected.mockClear();

      act(() => {
        result.current.handleAmountChange('20');
      });

      // Headline is localized to the user's display currency, not hardcoded USD.
      expect(result.current.fiatAmount).toBe('20');
      expect(result.current.fiatAmountLabel).toBe('€20.00');

      // Committing via the slider emits analytics in USD (20 EUR * 1.2 = 24 USD).
      act(() => {
        result.current.handleSliderDragEnd(20);
      });

      expect(mockTrackAmountSelected).toHaveBeenCalledTimes(1);
      expect(mockTrackAmountSelected.mock.calls[0][0]).toBeCloseTo(24);
    });

    it('uses two-decimal fiat state for JPY (same as Bridge fiat input)', () => {
      (selectCurrentCurrency as unknown as jest.Mock).mockReturnValue('JPY');
      (selectCurrencyRates as unknown as jest.Mock).mockReturnValue({
        ETH: { conversionRate: 1000, usdConversionRate: 1000 },
      });
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: '100',
        atomicBalance: '100000000',
      });
      const sourceWithRate = createSourceToken({ currencyExchangeRate: 1 });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [sourceWithRate],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSliderChange(33);
      });

      // 33% of a ¥100 cap = ¥33.00 in state (FIAT_INPUT_DECIMALS); headline
      // still formats via Intl as whole yen.
      expect(result.current.fiatAmount).toBe('33.00');
      expect(result.current.fiatAmountLabel).toBe('¥33');
    });
  });

  describe('max ("sell all") source amount', () => {
    // A near-$1 stablecoin whose rate is fractionally below 1. The fiat
    // round-trip (balance → cent-rounded USD → tokens) reconstructs an amount
    // slightly ABOVE the real balance, which previously tripped the
    // insufficient-funds gate when selling the entire balance.
    const NEAR_DOLLAR_RATE = 0.9997;
    const FULL_BALANCE = '0.10003';

    const renderWithStablecoin = () => {
      (useLatestBalance as jest.Mock).mockReturnValue({
        displayBalance: FULL_BALANCE,
        atomicBalance: '100030000000000000',
      });
      const stablecoin = createSourceToken({
        symbol: 'MUSD',
        currencyExchangeRate: NEAR_DOLLAR_RATE,
        balance: FULL_BALANCE,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [stablecoin],
      });
      return renderHook(() => useQuickBuyController(createTarget(), jest.fn()));
    };

    it('spends the exact on-chain balance instead of the fiat round-trip at 100%', () => {
      const { result } = renderWithStablecoin();

      act(() => {
        result.current.handleSliderChange(100);
      });
      act(() => {
        result.current.handleSliderDragEnd(100);
      });

      // Exact balance — not `usd / rate`, which would exceed FULL_BALANCE.
      expect(result.current.sourceTokenAmount).toBe(FULL_BALANCE);
    });

    it('passes the exact balance to the insufficient-balance check at 100%', () => {
      const { result } = renderWithStablecoin();

      act(() => {
        result.current.handleSliderChange(100);
      });
      act(() => {
        result.current.handleSliderDragEnd(100);
      });

      expect(useIsInsufficientBalance).toHaveBeenLastCalledWith(
        expect.objectContaining({ amount: FULL_BALANCE }),
      );
    });

    it('still derives the amount from fiat below 100%', () => {
      const { result } = renderWithStablecoin();

      act(() => {
        result.current.handleSliderChange(50);
      });
      act(() => {
        result.current.handleSliderDragEnd(50);
      });

      expect(result.current.sourceTokenAmount).not.toBe(FULL_BALANCE);
      expect(Number(result.current.sourceTokenAmount)).toBeCloseTo(0.05, 2);
    });

    it('clears the max flag once the user types a custom amount', () => {
      const { result } = renderWithStablecoin();

      act(() => {
        result.current.handleSliderChange(100);
      });
      act(() => {
        result.current.handleSliderDragEnd(100);
      });
      expect(result.current.sourceTokenAmount).toBe(FULL_BALANCE);

      act(() => {
        result.current.handleAmountChange('0.05');
      });

      expect(result.current.sourceTokenAmount).not.toBe(FULL_BALANCE);
      expect(Number(result.current.sourceTokenAmount)).toBeCloseTo(0.05, 2);
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
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [usdc, usdt],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSliderChange(50);
        result.current.handleAmountChange('25');
      });

      expect(result.current.fiatAmount).toBe('25');
      expect(result.current.sliderPercent).toBe(0);

      act(() => {
        result.current.handleSelectSourceToken(usdt);
      });

      expect(result.current.selectedSourceToken).toEqual(usdt);
      expect(result.current.fiatAmount).toBe('');
      expect(result.current.sliderPercent).toBe(0);
    });

    it('tracks pay_with_selected when the user picks a different token', () => {
      const usdc = createSourceToken({
        symbol: 'USDC',
        currencyExchangeRate: 1,
      });
      const usdt = createSourceToken({
        symbol: 'USDT',
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        currencyExchangeRate: 1,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [usdc, usdt],
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSelectSourceToken(usdt);
      });

      expect(mockTrackPayWithSelected).toHaveBeenCalledWith('USDT', 'USDC');
    });
  });

  describe('getButtonLabel', () => {
    it('returns the buy label when all conditions are normal', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.getButtonLabel()).toBe(
        'social_leaderboard.trader_position.buy',
      );
    });

    it('returns the insufficient-funds label when source balance is too low', () => {
      (useIsInsufficientBalance as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
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
        useQuickBuyController(createTarget(), jest.fn()),
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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
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
      renderHook(() => useQuickBuyController(createTarget(), jest.fn()));

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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      renderHook(() => useQuickBuyController(createTarget(), jest.fn()));

      expect(useIsInsufficientBalance).toHaveBeenLastCalledWith(
        expect.objectContaining({
          quoteOverride: activeQuote,
        }),
      );
    });
  });

  describe('isConfirmDisabled', () => {
    it('is disabled when fiatAmount is empty', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when amount is valid and there is no active quote', () => {
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
    });

    it('is disabled when the source token is missing even if a quote exists', () => {
      (usePayWithTokens as jest.Mock).mockReturnValue({
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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.confirmButtonState).toBe('idle');
    });

    it('is enabled after quote loading settles for the entered amount', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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

    it('enables the CTA on the same render the loader clears when the quote arrives', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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

      expect(result.current.isBlockingQuoteLoad).toBe(true);
      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.confirmButtonState).toBe('loading');

      // A single render with the matching quote both clears the loader and
      // enables the CTA — no extra render needed (regression: the button used to
      // lag the loader by a render because settling lived in a post-commit ref).
      quoteState.isQuoteLoading = false;
      quoteState.activeQuote = createActiveQuote();
      rerender(props);

      expect(result.current.isBlockingQuoteLoad).toBe(false);
      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('enables the CTA for a gas-included quote whose srcTokenAmount is the post-fee amount', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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
      // Requested amount is 0.01 ETH ($20 / $2000). For a gas-included quote the
      // bridge deducts the fee from the routing amount, so quote.srcTokenAmount
      // comes back smaller than requested (0.009 here). sentAmount adds the fee
      // back, reconstructing the requested 0.01 — that is what must be matched.
      quoteState.activeQuote = createActiveQuote({
        quote: { srcTokenAmount: '9000000000000000' },
        sentAmount: { amount: '0.01' },
      });
      rerender(props);
      rerender(props);

      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('is disabled when amount changes after quote loading settles', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };

      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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

    it('sets isPriceImpactError when price impact exceeds error threshold, but does NOT disable the button (intercept handled by context)', () => {
      // Use the same settle cycle as the hardware-Solana test so that
      // settledSourceTokenAmountRef is properly updated and isPendingQuoteRefresh = false.
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        { initialProps: props },
      );

      act(() => {
        result.current.handleAmountChange('20');
      });

      // Simulate quote loading cycle so settledSourceTokenAmountRef is settled.
      quoteState.isQuoteLoading = true;
      rerender(props);
      quoteState.isQuoteLoading = false;
      // Inject a high-price-impact active quote. The spread keeps the default
      // sentAmount (0.01) so the quote still matches the requested amount
      // (isPendingQuoteRefresh = false).
      quoteState.activeQuote = {
        ...createActiveQuote(),
        quote: {
          srcTokenAmount: '10000000000000000',
          priceData: { priceImpact: '0.30' },
        },
      } as never;
      rerender(props);
      rerender(props);

      expect(result.current.isPriceImpactError).toBe(true);
      // The Buy button is ENABLED at error tier — the intercept lives in
      // QuickBuyContext.handleBuy which routes to priceImpactConfirm instead.
      expect(result.current.isConfirmDisabled).toBe(false);
    });

    it('keeps the CTA enabled during a background refresh of a usable quote', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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

      expect(result.current.isConfirmDisabled).toBe(false);

      quoteState.isQuoteLoading = true;
      rerender(props);

      expect(result.current.isBlockingQuoteLoad).toBe(false);
      expect(result.current.isConfirmDisabled).toBe(false);
      expect(result.current.isTotalLoading).toBe(false);
    });

    it('blocks the CTA on the initial load when no usable quote exists yet', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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

      expect(result.current.isBlockingQuoteLoad).toBe(true);
      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.isTotalLoading).toBe(true);
    });

    it('blocks the CTA when a request input change makes the displayed quote stale', () => {
      const quoteState: UseQuickBuyQuotesResult = {
        activeQuote: undefined,
        destTokenAmount: undefined,
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      };
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => quoteState);

      const props = {
        target: createTarget(),
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

      expect(result.current.isConfirmDisabled).toBe(false);

      // Slippage/destination address/gas settings changed: the quotes hook keeps
      // the prior activeQuote but flags the request as stale. The CTA must
      // disable even before a new fetch starts (no blocking load reported yet).
      quoteState.isQuoteRequestStale = true;
      rerender(props);

      expect(result.current.isBlockingQuoteLoad).toBe(false);
      expect(result.current.isConfirmDisabled).toBe(true);
      expect(result.current.isTotalLoading).toBe(true);
    });
  });

  describe('formattedExchangeRate', () => {
    it('shows pay-with token on the left in buy mode pre-quote', () => {
      const solToken = createSourceToken({
        symbol: 'SOL',
        currencyExchangeRate: 150,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [solToken],
        isLoading: false,
      });
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: '0xDEST',
          chainId: '0x1',
          decimals: 18,
          symbol: 'GIGA',
          name: 'Gigachad',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      (usePositionTokenBalance as jest.Mock).mockReturnValue({
        currencyExchangeRate: 0.006375,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget({ tokenSymbol: 'GIGA' }), jest.fn()),
      );

      expect(result.current.formattedExchangeRate).toMatch(/^1 SOL = /);
      expect(result.current.formattedExchangeRate).not.toMatch(/^1 GIGA = /);
    });

    it('shows the pre-quote rate from the balance-independent lookup when the user holds no balance of the buy token', () => {
      const solToken = createSourceToken({
        symbol: 'SOL',
        currencyExchangeRate: 150,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [solToken],
        isLoading: false,
      });
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: '0xDEST',
          chainId: '0x1',
          decimals: 18,
          symbol: 'GIGA',
          name: 'Gigachad',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      // User holds no balance of GIGA, so the position-token rate is undefined…
      (usePositionTokenBalance as jest.Mock).mockReturnValue(undefined);
      // …but the display-only lookup still resolves a price for it.
      (useDestTokenExchangeRate as jest.Mock).mockReturnValue(0.006375);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget({ tokenSymbol: 'GIGA' }), jest.fn()),
      );

      expect(result.current.formattedExchangeRate).toMatch(/^1 SOL = /);
    });

    it('shows the pre-quote rate from the host-supplied token price when the user holds no balance and no market data exists', () => {
      const solToken = createSourceToken({
        symbol: 'SOL',
        currencyExchangeRate: 150,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [solToken],
        isLoading: false,
      });
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: '0xDEST',
          chainId: '0x1',
          decimals: 18,
          symbol: 'GIGA',
          name: 'Gigachad',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      // No balance and no cached market-data rate…
      (usePositionTokenBalance as jest.Mock).mockReturnValue(undefined);
      (useDestTokenExchangeRate as jest.Mock).mockReturnValue(undefined);

      // …but the host passes the chart price for the buy token.
      const { result } = renderHook(() =>
        useQuickBuyController(
          createTarget({ tokenSymbol: 'GIGA' }),
          jest.fn(),
          {
            tokenPriceFiat: 0.95625,
          },
        ),
      );

      expect(result.current.formattedExchangeRate).toMatch(/^1 SOL = /);
    });

    it('does not render a pre-quote rate when neither the lookup nor the held balance resolves a price', () => {
      const solToken = createSourceToken({
        symbol: 'SOL',
        currencyExchangeRate: 150,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [solToken],
        isLoading: false,
      });
      (usePositionTokenBalance as jest.Mock).mockReturnValue(undefined);
      (useDestTokenExchangeRate as jest.Mock).mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget({ tokenSymbol: 'GIGA' }), jest.fn()),
      );

      expect(result.current.formattedExchangeRate).toBeUndefined();
    });
  });

  describe('source token auto-selection', () => {
    it('auto-selects the first option when options load (legacy — native on dest chain matches priority 1)', () => {
      const firstToken = createSourceToken({ symbol: 'ETH' });

      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [firstToken, createSourceToken({ symbol: 'USDC' })],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      // createPosition uses chain 'base' → destChainId '0x1' in default mock,
      // and ETH (zero address, chainId '0x1') is native on that chain → priority 1.
      expect(result.current.sourceToken?.symbol).toBe('ETH');
    });

    it('defers source preselection until setup resolves so the normalised dest address is used', () => {
      const destAddress = '0x0000000000000000000000000000000000000000';
      const destChainId = '0x1';

      const ethOnMainnet = createSourceToken({
        address: destAddress,
        chainId: destChainId,
        symbol: 'ETH',
        tokenFiatAmount: 2000,
      });
      const usdcOnMainnet = createSourceToken({
        address: '0xTokenUSDC',
        chainId: destChainId,
        symbol: 'USDC',
        tokenFiatAmount: 1000,
      });

      // While setup is loading, the auto-select effect must NOT run — picking
      // against the raw `target.tokenAddress` could let a CAIP-19-wrapped EVM
      // dest (e.g. `eip155:137/slip44:966`) leak through the address filter,
      // and the `selectedSourceToken` guard would prevent self-correction
      // once setup lands.
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: destChainId,
        destToken: undefined,
        isLoading: true,
        isUnsupportedChain: false,
      });

      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [ethOnMainnet, usdcOnMainnet],
        isLoading: false,
      });

      const { result, rerender } = renderHook(() =>
        useQuickBuyController(
          createTarget({ tokenAddress: destAddress }),
          jest.fn(),
        ),
      );

      // No selection while setup is loading.
      expect(result.current.sourceToken).toBeUndefined();

      // Setup resolves with the normalised dest token; selection now picks
      // USDC, never ETH (which matches the dest).
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: destChainId,
        destToken: {
          address: destAddress,
          chainId: destChainId,
          symbol: 'ETH',
          name: 'Ether',
          decimals: 18,
          image: '',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      rerender(undefined);

      expect(result.current.sourceToken?.symbol).toBe('USDC');
    });

    it('does not preselect the destination token (non-EVM) once setup resolves with the normalised dest address', () => {
      // For non-EVM natives, `useQuickBuySetup` resolves synchronously via
      // `getNativeSourceToken`, so the lookup key matches source candidates
      // exactly (both share the canonical `…/slip44:NNN` form). The selector
      // filters SOL by address and the next-best option (USDC) is preselected.
      const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const canonicalSolAddress = `${solChainId}/slip44:501`;

      const solNative = createSourceToken({
        address: canonicalSolAddress,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'SOL',
        tokenFiatAmount: 2,
      });
      const usdcOnSolana = createSourceToken({
        address: `${solChainId}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'USDC',
        tokenFiatAmount: 50,
      });

      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: solChainId,
        destToken: {
          address: canonicalSolAddress,
          chainId: solChainId as BridgeToken['chainId'],
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          image: '',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });

      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [usdcOnSolana, solNative],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          createTarget({
            chain: 'solana',
            tokenAddress: 'So11111111111111111111111111111111111111112',
            tokenSymbol: 'SOL',
          }),
          jest.fn(),
        ),
      );

      expect(result.current.sourceToken?.symbol).toBe('USDC');
    });
  });

  describe('live available balances (TSA-632)', () => {
    interface LatestBalanceArgs {
      address?: string;
      decimals?: number;
      chainId?: string;
      balance?: string;
      refreshKey?: string | number;
    }

    const lastLatestBalanceArgs = (): LatestBalanceArgs =>
      (useLatestBalance as jest.Mock).mock.calls.at(
        -1,
      )?.[0] as LatestBalanceArgs;

    // `useLatestBalance` is mocked to echo the `balance` it is fed, so the
    // displayed source fiat tracks whatever balance the controller resolves.
    const echoLatestBalance = () => {
      (useLatestBalance as jest.Mock).mockImplementation(
        (args: LatestBalanceArgs) => ({
          displayBalance: args.balance,
          atomicBalance: undefined,
        }),
      );
    };

    const createReceiveToken = (
      overrides: Partial<BridgeToken> = {},
    ): BridgeToken =>
      ({
        address: '0xUSDC',
        chainId: '0x1',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        currencyExchangeRate: 1,
        balance: '100',
        balanceFiat: '$100.00',
        tokenFiatAmount: 100,
        ...overrides,
      }) as BridgeToken;

    describe('source (Pay with) balance', () => {
      it('updates the displayed source balance when the underlying balance changes (external transfer)', () => {
        // Arrange — sheet opens; ETH auto-selected with a live 1.0 balance.
        echoLatestBalance();
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '1.0' })],
          isLoading: false,
        });
        const { result, rerender } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );
        // 1.0 ETH * $2000 rate.
        expect(result.current.sourceBalanceFiat).toBe('$2,000.00');

        // Act — an external transfer (NOT via QuickBuy) lands: the reactive
        // usePayWithTokens list recomputes with a higher balance while the
        // selected token snapshot is unchanged.
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '1.5' })],
          isLoading: false,
        });
        rerender(undefined);

        // Assert — the displayed available balance reflects the new state.
        expect(lastLatestBalanceArgs().balance).toBe('1.5');
        expect(result.current.sourceBalanceFiat).toBe('$3,000.00');
      });

      it('re-keys the on-chain fetch off the live balance so any change re-fetches', () => {
        // Arrange
        echoLatestBalance();
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '1.0' })],
          isLoading: false,
        });
        const { rerender } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );
        // The key is derived from the live balance itself, NOT from any
        // QuickBuy-specific state.
        const initialRefreshKey = lastLatestBalanceArgs().refreshKey;
        expect(initialRefreshKey).toBe('1.0');

        // Act — any balance change (external or QuickBuy) updates the live value.
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '0.75' })],
          isLoading: false,
        });
        rerender(undefined);

        // Assert — the key changes, forcing a fresh on-chain read.
        expect(lastLatestBalanceArgs().refreshKey).toBe('0.75');
        expect(lastLatestBalanceArgs().balance).toBe('0.75');
      });

      it('falls back to the snapshot balance when the selected token leaves the options list', () => {
        // Arrange
        echoLatestBalance();
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '1.0' })],
          isLoading: false,
        });
        const { result, rerender } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        // Act — the user spent the whole balance, so the held-token list no
        // longer contains the selected token.
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [],
          isLoading: false,
        });
        rerender(undefined);

        // Assert — no live match: degrade to the snapshot value rather than
        // blanking out.
        expect(lastLatestBalanceArgs().balance).toBe('1.0');
        expect(result.current.sourceBalanceFiat).toBe('$2,000.00');
      });

      it('updates the displayed fiat balance when the exchange rate refreshes without a balance change', () => {
        echoLatestBalance();
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [
            createSourceToken({ balance: '1.0', currencyExchangeRate: 2000 }),
          ],
          isLoading: false,
        });
        const { result, rerender } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        expect(result.current.sourceBalanceFiat).toBe('$2,000.00');

        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [
            createSourceToken({ balance: '1.0', currencyExchangeRate: 2500 }),
          ],
          isLoading: false,
        });
        rerender(undefined);

        expect(result.current.sourceBalanceFiat).toBe('$2,500.00');
      });

      it('updates the source balance when a QuickBuy swap settles (existing behaviour preserved)', () => {
        // Arrange
        echoLatestBalance();
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '1.0' })],
          isLoading: false,
        });
        const { result, rerender } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );
        expect(result.current.sourceBalanceFiat).toBe('$2,000.00');

        // Act — a QuickBuy swap settles: TokenBalancesController updates Redux
        // and usePayWithTokens recomputes the same token with a lower balance.
        (usePayWithTokens as jest.Mock).mockReturnValue({
          options: [createSourceToken({ balance: '0.75' })],
          isLoading: false,
        });
        rerender(undefined);

        // Assert
        expect(result.current.sourceBalanceFiat).toBe('$1,500.00');
      });
    });

    describe('dest (Receive) balance', () => {
      const renderSellMode = () => {
        const utils = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );
        act(() => {
          utils.result.current.setTradeMode('sell');
        });
        return utils;
      };

      it('updates the displayed dest balance when the underlying balance changes (external transfer)', () => {
        // Arrange — sell mode; USDC receive token auto-selected at $100.
        (useReceiveTokens as jest.Mock).mockReturnValue([
          createReceiveToken({ balanceFiat: '$100.00' }),
        ]);
        const { result, rerender } = renderSellMode();
        expect(result.current.destBalanceFiat).toBe('$100.00');

        // Act — an external transfer lands: the reactive useReceiveTokens list
        // recomputes with a higher balance while the selection is unchanged.
        (useReceiveTokens as jest.Mock).mockReturnValue([
          createReceiveToken({ balance: '150', balanceFiat: '$150.00' }),
        ]);
        rerender(undefined);

        // Assert — the displayed receive balance reflects the new state.
        expect(result.current.destBalanceFiat).toBe('$150.00');
      });

      it('updates the dest balance when a QuickBuy swap settles (existing behaviour preserved)', () => {
        // Arrange
        (useReceiveTokens as jest.Mock).mockReturnValue([
          createReceiveToken({ balanceFiat: '$100.00' }),
        ]);
        const { result, rerender } = renderSellMode();
        expect(result.current.destBalanceFiat).toBe('$100.00');

        // Act — a QuickBuy sell settles into the receive token, raising its
        // balance; the reactive list recomputes.
        (useReceiveTokens as jest.Mock).mockReturnValue([
          createReceiveToken({ balance: '125', balanceFiat: '$125.00' }),
        ]);
        rerender(undefined);

        // Assert
        expect(result.current.destBalanceFiat).toBe('$125.00');
      });

      it('falls back to the snapshot balance when the selected receive token leaves the list', () => {
        // Arrange
        (useReceiveTokens as jest.Mock).mockReturnValue([
          createReceiveToken({ balanceFiat: '$100.00' }),
        ]);
        const { result, rerender } = renderSellMode();

        // Act — the list no longer contains the selected token.
        (useReceiveTokens as jest.Mock).mockReturnValue([]);
        rerender(undefined);

        // Assert — degrade to the snapshot's fiat rather than blanking out.
        expect(result.current.destBalanceFiat).toBe('$100.00');
      });
    });
  });

  describe('sell mode availability', () => {
    const createPositionToken = () =>
      createSourceToken({
        address: '0xDEST',
        chainId: '0x1',
        symbol: 'TARGET',
      });

    it('resets tradeMode to buy when the position token balance becomes zero', () => {
      (usePositionTokenBalance as jest.Mock).mockReturnValue(
        createPositionToken(),
      );
      const { result, rerender } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.setTradeMode('sell');
      });
      expect(result.current.tradeMode).toBe('sell');

      (usePositionTokenBalance as jest.Mock).mockReturnValue(undefined);
      rerender(undefined);

      expect(result.current.tradeMode).toBe('buy');
    });

    it('exposes hasSellableBalance false when there is no position token', () => {
      (usePositionTokenBalance as jest.Mock).mockReturnValue(undefined);
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.hasSellableBalance).toBe(false);
    });

    it('exposes hasSellableBalance true when a position token exists', () => {
      (usePositionTokenBalance as jest.Mock).mockReturnValue(
        createPositionToken(),
      );
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.hasSellableBalance).toBe(true);
    });
  });

  describe('receive token auto-selection', () => {
    const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
    const USDC_DEST = '0xDEST'; // matches the default-mock position token

    it('defaults the receive token to the chain native instead of the token being sold', () => {
      // Selling 0xDEST on chain 0x1. The receive options are stablecoins-first,
      // so options[0] is the very token being sold — the default must skip it
      // and pick the chain's native token instead.
      const usdcDest = createSourceToken({
        address: USDC_DEST,
        chainId: '0x1',
        symbol: 'USDC',
      });
      const nativeDest = createSourceToken({
        address: NATIVE_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
      });
      (useReceiveTokens as jest.Mock).mockReturnValue([usdcDest, nativeDest]);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.selectedDestStable?.symbol).toBe('ETH');
    });

    it('falls back to the first non-sold candidate when selling the native token', () => {
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: NATIVE_ADDRESS,
          chainId: '0x1',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ether',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      const nativeDest = createSourceToken({
        address: NATIVE_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
      });
      const usdcDest = createSourceToken({
        address: USDC_DEST,
        chainId: '0x1',
        symbol: 'USDC',
      });
      (useReceiveTokens as jest.Mock).mockReturnValue([nativeDest, usdcDest]);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.selectedDestStable?.symbol).toBe('USDC');
    });

    it('excludes the token being sold from the receive options entirely', () => {
      const usdcDest = createSourceToken({
        address: USDC_DEST,
        chainId: '0x1',
        symbol: 'USDC',
      });
      const nativeDest = createSourceToken({
        address: NATIVE_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
      });
      (useReceiveTokens as jest.Mock).mockReturnValue([usdcDest, nativeDest]);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      const symbols = result.current.sellDestTokenOptions.map((t) => t.symbol);
      expect(symbols).not.toContain('USDC');
      expect(symbols).toEqual(['ETH']);
    });

    it('does not auto-select while setup is still loading', () => {
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: undefined,
        isLoading: true,
        isUnsupportedChain: false,
      });
      const usdcDest = createSourceToken({
        address: USDC_DEST,
        chainId: '0x1',
        symbol: 'USDC',
      });
      (useReceiveTokens as jest.Mock).mockReturnValue([usdcDest]);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      expect(result.current.selectedDestStable).toBeUndefined();
    });
  });

  describe('sourceTokenOptions destination filtering (TSA-660)', () => {
    it('excludes the asset being bought from the pay-with options (case-insensitive address match)', () => {
      const destChecksumAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: destChecksumAddress,
          chainId: '0x1',
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      const usdcOnMainnet = createSourceToken({
        address: destChecksumAddress.toLowerCase(),
        chainId: '0x1',
        symbol: 'USDC',
        tokenFiatAmount: 3000,
      });
      const ethOnMainnet = createSourceToken({
        symbol: 'ETH',
        tokenFiatAmount: 2000,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [usdcOnMainnet, ethOnMainnet],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          createTarget({
            tokenAddress: destChecksumAddress,
            tokenSymbol: 'USDC',
          }),
          jest.fn(),
        ),
      );

      expect(result.current.sourceTokenOptions).toEqual([ethOnMainnet]);
    });

    it('keeps a same-address token on a different chain in the pay-with options', () => {
      const sharedAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: sharedAddress,
          chainId: '0x1',
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      const usdcOnBase = createSourceToken({
        address: sharedAddress.toLowerCase(),
        chainId: '0x2105',
        symbol: 'USDC',
        tokenFiatAmount: 3000,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [usdcOnBase],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          createTarget({ tokenAddress: sharedAddress, tokenSymbol: 'USDC' }),
          jest.fn(),
        ),
      );

      expect(result.current.sourceTokenOptions).toEqual([usdcOnBase]);
    });

    it('excludes the non-EVM destination when CAIP forms differ but the symbol matches', () => {
      const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const solNative = createSourceToken({
        address: `${solChainId}/slip44:501`,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'SOL',
        tokenFiatAmount: 5000,
      });
      const usdcOnSolana = createSourceToken({
        address: `${solChainId}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'USDC',
        tokenFiatAmount: 1000,
      });
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: solChainId,
        destToken: {
          address: 'So11111111111111111111111111111111111111112',
          chainId: solChainId as BridgeToken['chainId'],
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
          image: '',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [solNative, usdcOnSolana],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          createTarget({
            chain: 'solana',
            tokenAddress: 'So11111111111111111111111111111111111111112',
            tokenSymbol: 'SOL',
          }),
          jest.fn(),
        ),
      );

      expect(result.current.sourceTokenOptions).toEqual([usdcOnSolana]);
    });

    it('returns no pay-with options and no selection when the destination is the only holding', () => {
      const nativeAddress = '0x0000000000000000000000000000000000000000';
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: nativeAddress,
          chainId: '0x1',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ether',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [createSourceToken()],
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useQuickBuyController(
          createTarget({ tokenAddress: nativeAddress, tokenSymbol: 'ETH' }),
          jest.fn(),
        ),
      );

      expect(result.current.sourceTokenOptions).toEqual([]);
      expect(result.current.sourceToken).toBeUndefined();
    });

    it('falls back to another token when the selected pay token resolves to the destination asset', () => {
      const nativeAddress = '0x0000000000000000000000000000000000000000';
      const ethOnMainnet = createSourceToken({
        symbol: 'ETH',
        tokenFiatAmount: 2000,
      });
      const usdcOnMainnet = createSourceToken({
        address: '0xTokenUSDC',
        symbol: 'USDC',
        tokenFiatAmount: 1000,
      });
      (usePayWithTokens as jest.Mock).mockReturnValue({
        options: [ethOnMainnet, usdcOnMainnet],
        isLoading: false,
      });

      // Setup initially resolves a non-ETH destination, so ETH (native on the
      // dest chain) is auto-selected as the pay-with token.
      const { result, rerender } = renderHook(() =>
        useQuickBuyController(
          createTarget({ tokenAddress: nativeAddress, tokenSymbol: 'ETH' }),
          jest.fn(),
        ),
      );
      expect(result.current.sourceToken?.symbol).toBe('ETH');

      // The destination then normalises to native ETH — the very token that is
      // selected. The selection must fall back to another holding instead of
      // keeping an invalid same-token pair.
      (useQuickBuySetup as jest.Mock).mockReturnValue({
        chainId: '0x1',
        destToken: {
          address: nativeAddress,
          chainId: '0x1',
          decimals: 18,
          symbol: 'ETH',
          name: 'Ether',
        },
        isLoading: false,
        isUnsupportedChain: false,
      });
      rerender(undefined);

      expect(result.current.sourceTokenOptions).toEqual([usdcOnMainnet]);
      expect(result.current.sourceToken?.symbol).toBe('USDC');
    });
  });

  describe('isSameAsset', () => {
    const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    it('matches EVM addresses case-insensitively on the same chain', () => {
      const token = createSourceToken({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
        symbol: 'USDC',
      });

      const result = isSameAsset(token, {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: '0x1' as BridgeToken['chainId'],
      });

      expect(result).toBe(true);
    });

    it('treats the same address on a different chain as a different asset', () => {
      const token = createSourceToken({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x2105',
        symbol: 'USDC',
      });

      const result = isSameAsset(token, {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1' as BridgeToken['chainId'],
      });

      expect(result).toBe(false);
    });

    it('falls back to symbol matching on non-EVM chains when address forms differ', () => {
      const token = createSourceToken({
        address: `${solChainId}/slip44:501`,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'SOL',
      });

      const result = isSameAsset(token, {
        address: 'So11111111111111111111111111111111111111112',
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'SOL',
      });

      expect(result).toBe(true);
    });

    it('does NOT fall back to symbol matching on EVM chains', () => {
      const token = createSourceToken({
        address: '0xfakefakefakefakefakefakefakefakefakefake',
        chainId: '0x1',
        symbol: 'USDC',
      });

      const result = isSameAsset(token, {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1' as BridgeToken['chainId'],
        symbol: 'USDC',
      });

      expect(result).toBe(false);
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

    // ── destToken deprioritization ────────────────────────────────────────────

    it('deprioritizes the destination token: skips SOL when buying SOL and picks USDC instead', () => {
      const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const solAddress = `${solChainId}/slip44:501`;

      const solNative: BridgeToken = createSourceToken({
        address: solAddress,
        chainId: solChainId,
        symbol: 'SOL',
        tokenFiatAmount: 5000,
      });
      const usdcOnSolana: BridgeToken = createSourceToken({
        address: `${solChainId}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
        chainId: solChainId,
        symbol: 'USDC',
        tokenFiatAmount: 1000,
      });

      const destToken: Pick<BridgeToken, 'address' | 'chainId'> = {
        address: solAddress,
        chainId: solChainId as BridgeToken['chainId'],
      };
      const result = selectDefaultSourceToken(
        [solNative, usdcOnSolana],
        solChainId,
        destToken,
      );

      expect(result?.symbol).toBe('USDC');
      expect(result?.chainId).toBe(solChainId);
    });

    it('deprioritizes destination token on EVM: skips ETH on mainnet when buying ETH on mainnet', () => {
      const ethOnMainnet = native('0x1', 2000);
      const ethOnBase = native('0x2105', 1500);
      const destToken: Pick<BridgeToken, 'address' | 'chainId'> = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1' as BridgeToken['chainId'],
      };

      const result = selectDefaultSourceToken(
        [ethOnMainnet, ethOnBase],
        '0x1',
        destToken,
      );

      // ETH on mainnet is the dest token; ETH on Base (native on non-dest chain) is tier 3
      expect(result?.symbol).toBe('ETH');
      expect(result?.chainId).toBe('0x2105');
    });

    it('treats cross-chain same-symbol as a different token: USDC on Base is NOT filtered when buying USDC on Ethereum', () => {
      const usdcOnBase = createSourceToken({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase(),
        chainId: '0x2105',
        symbol: 'USDC',
        tokenFiatAmount: 3000,
      });
      const destToken: Pick<BridgeToken, 'address' | 'chainId'> = {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: '0x1' as BridgeToken['chainId'],
      };

      const result = selectDefaultSourceToken([usdcOnBase], '0x1', destToken);

      // usdcOnBase is on a different chain → not the dest token → should be selected
      expect(result?.symbol).toBe('USDC');
      expect(result?.chainId).toBe('0x2105');
    });

    it('last-resort fallback: returns destination token when it is the only holding', () => {
      const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const solAddress = `${solChainId}/slip44:501`;

      const solNative: BridgeToken = createSourceToken({
        address: solAddress,
        chainId: solChainId,
        symbol: 'SOL',
        tokenFiatAmount: 5000,
      });

      const destToken: Pick<BridgeToken, 'address' | 'chainId'> = {
        address: solAddress,
        chainId: solChainId as BridgeToken['chainId'],
      };
      const result = selectDefaultSourceToken(
        [solNative],
        solChainId,
        destToken,
      );

      // Only holding is the dest token — fall back rather than returning undefined
      expect(result?.symbol).toBe('SOL');
    });

    it('address comparison is case-insensitive: filters dest token when source address is lowercase and dest address is checksum', () => {
      const checksumAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const lowercaseAddress = checksumAddress.toLowerCase();

      const usdcOnMainnet = createSourceToken({
        address: lowercaseAddress,
        chainId: '0x1',
        symbol: 'USDC',
        tokenFiatAmount: 3000,
      });
      const usdtOnMainnet = createSourceToken({
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        chainId: '0x1',
        symbol: 'USDT',
        tokenFiatAmount: 1000,
      });

      // destToken uses checksum address; source candidate uses lowercase
      const destToken: Pick<BridgeToken, 'address' | 'chainId'> = {
        address: checksumAddress,
        chainId: '0x1' as BridgeToken['chainId'],
      };
      const result = selectDefaultSourceToken(
        [usdcOnMainnet, usdtOnMainnet],
        '0x1',
        destToken,
      );

      // USDC (matching dest) is filtered; USDT is selected
      expect(result?.symbol).toBe('USDT');
    });

    it('non-EVM symbol fallback: filters dest token when source/dest CAIP forms differ but symbol matches on the same non-EVM chain', () => {
      const solChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

      // Source uses canonical native CAIP form
      const solNative: BridgeToken = createSourceToken({
        address: `${solChainId}/slip44:501`,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'SOL',
        tokenFiatAmount: 5000,
      });
      const usdcOnSolana: BridgeToken = createSourceToken({
        address: `${solChainId}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'USDC',
        tokenFiatAmount: 1000,
      });

      // Dest uses a different form (e.g. wrapped SOL mint from the position payload)
      const destToken: Pick<BridgeToken, 'address' | 'chainId' | 'symbol'> = {
        address: 'So11111111111111111111111111111111111111112',
        chainId: solChainId as BridgeToken['chainId'],
        symbol: 'SOL',
      };

      const result = selectDefaultSourceToken(
        [solNative, usdcOnSolana],
        solChainId,
        destToken,
      );

      // Address comparison fails, but non-EVM symbol fallback filters SOL → USDC picked.
      expect(result?.symbol).toBe('USDC');
    });

    it('does NOT use symbol fallback on EVM chains (protects against fake-token symbol collisions)', () => {
      const realUsdc = createSourceToken({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1' as BridgeToken['chainId'],
        symbol: 'USDC',
        tokenFiatAmount: 5000,
      });
      const fakeUsdc = createSourceToken({
        address: '0xfakefakefakefakefakefakefakefakefakefake',
        chainId: '0x1' as BridgeToken['chainId'],
        symbol: 'USDC', // hijacked symbol
        tokenFiatAmount: 1000,
      });

      const destToken: Pick<BridgeToken, 'address' | 'chainId' | 'symbol'> = {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1' as BridgeToken['chainId'],
        symbol: 'USDC',
      };

      const result = selectDefaultSourceToken(
        [realUsdc, fakeUsdc],
        '0x1',
        destToken,
      );

      // Real USDC matches by address (filtered). Fake USDC matches only by symbol —
      // on EVM that is NOT considered the dest, so it gets selected.
      expect(result?.address).toBe(
        '0xfakefakefakefakefakefakefakefakefakefake',
      );
    });

    it('ignores destToken parameter when it is undefined (backward-compatible)', () => {
      const ethOnBase = native('0x2105', 500);
      const usdcOnBase = erc20('0x2105', 'USDC', 3000);

      const result = selectDefaultSourceToken(
        [usdcOnBase, ethOnBase],
        '0x2105',
        undefined,
      );

      // No filtering — priority 1 native on dest chain is selected
      expect(result?.symbol).toBe('ETH');
      expect(result?.chainId).toBe('0x2105');
    });
  });

  describe('selectedQuoteRequestId', () => {
    const quoteWithRequestId = (requestId: string) =>
      createActiveQuote({
        quote: { requestId, srcTokenAmount: '10000000000000000' },
      });

    it('clears manual selection when requestId is not in the current quote batch', () => {
      let sortedQuotes = [quoteWithRequestId('quote-a')];
      (useQuickBuyQuotes as jest.Mock).mockImplementation(() => ({
        activeQuote: sortedQuotes[0],
        sortedQuotes,
        destTokenAmount: '1',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        quoteCount: sortedQuotes.length,
        quotesLastFetchedAt: Date.now(),
        refreshCount: 1,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      }));

      const props = {
        target: createTarget(),
        onClose: jest.fn(),
      };
      const { result, rerender } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        { initialProps: props },
      );

      act(() => {
        result.current.setSelectedQuoteRequestId('quote-a');
      });
      expect(result.current.selectedQuoteRequestId).toBe('quote-a');

      sortedQuotes = [quoteWithRequestId('quote-b')];
      rerender(props);

      expect(result.current.selectedQuoteRequestId).toBeUndefined();
    });

    it('tracks quote_selected with index when user selects a quote', () => {
      const sortedQuotes = [
        quoteWithRequestId('quote-a'),
        quoteWithRequestId('quote-b'),
      ];
      (useQuickBuyQuotes as jest.Mock).mockReturnValue({
        activeQuote: sortedQuotes[0],
        sortedQuotes,
        destTokenAmount: '1',
        isQuoteLoading: false,
        isNoQuotesAvailable: false,
        quoteFetchError: null,
        isActiveQuoteForCurrentTokenPair: true,
        isQuoteRequestStale: false,
        quoteCount: sortedQuotes.length,
        quotesLastFetchedAt: Date.now(),
        refreshCount: 1,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      act(() => {
        result.current.handleSelectQuote('quote-b');
      });

      expect(mockTrackQuoteSelected).toHaveBeenCalledWith(1, 2);
      expect(result.current.selectedQuoteRequestId).toBe('quote-b');
    });
  });

  describe('quick buy interacted analytics', () => {
    it('does not track slippage_changed on initial mount', () => {
      renderHook(() => useQuickBuyController(createTarget(), jest.fn()));
      expect(mockTrackSlippageChanged).not.toHaveBeenCalled();
    });

    it('tracks slippage_changed when slippage updates after mount', () => {
      const props = {
        target: createTarget(),
        onClose: jest.fn(),
      };
      const { rerender } = renderHook(
        ({ target, onClose }) => useQuickBuyController(target, onClose),
        { initialProps: props },
      );

      (selectSlippage as unknown as jest.Mock).mockReturnValue('2');
      rerender(props);

      expect(mockTrackSlippageChanged).toHaveBeenCalledWith('2', '0.5');
    });

    it('tracks receive_token_selected when the user picks a receive token', () => {
      const usdc = createSourceToken({
        symbol: 'USDC',
        address: '0xusdc',
        currencyExchangeRate: 1,
      });
      const eth = createSourceToken({
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        currencyExchangeRate: 2000,
      });
      (useReceiveTokens as jest.Mock).mockReturnValue([usdc, eth]);

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
      );

      const previousSymbol = result.current.selectedDestStable?.symbol;
      const nextToken = previousSymbol === 'USDC' ? eth : usdc;

      act(() => {
        result.current.handleSelectDestStable(nextToken);
      });

      expect(mockTrackReceiveTokenSelected).toHaveBeenCalledWith(
        nextToken.symbol,
        previousSymbol ?? '',
      );
    });
  });

  describe('handleClose', () => {
    it('calls the onClose prop', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), onClose),
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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });
      (selectShouldUseSmartTransaction as unknown as jest.Mock).mockReturnValue(
        true,
      );

      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), onClose),
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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
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
        isQuoteRequestStale: false,
        sortedQuotes: [],
        quoteCount: 0,
        quotesLastFetchedAt: null,
        refreshCount: 0,
        quoteRefreshRateMs: 30000,
        maxRefreshCount: 5,
        refetchQuotes: jest.fn(),
      });

      const { result } = renderHook(() =>
        useQuickBuyController(createTarget(), jest.fn()),
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

    describe('trade-level analytics', () => {
      const mockSuccessfulSubmit = () => {
        (useQuickBuyQuotes as jest.Mock).mockReturnValue({
          activeQuote: createActiveQuote(),
          destTokenAmount: '1',
          isQuoteLoading: false,
          isNoQuotesAvailable: false,
          quoteFetchError: null,
          isActiveQuoteForCurrentTokenPair: true,
          isQuoteRequestStale: false,
          sortedQuotes: [],
          quoteCount: 0,
          quotesLastFetchedAt: null,
          refreshCount: 0,
          quoteRefreshRateMs: 30000,
          maxRefreshCount: 5,
          refetchQuotes: jest.fn(),
        });
      };

      it('tracks trade submitted and completed when no trader is in context (asset details entry)', async () => {
        mockSuccessfulSubmit();

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn(), {
            source: 'asset_details',
          }),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(mockTrackTradeSubmitted).toHaveBeenCalledWith(
          expect.objectContaining({ caip19: expect.any(String) }),
        );
        expect(mockTrackTradeCompleted).toHaveBeenCalledWith(
          expect.objectContaining({ caip19: expect.any(String) }),
        );
      });

      it('omits trader_address from trade props when no trader is in context', async () => {
        mockSuccessfulSubmit();

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn(), {
            source: 'asset_details',
          }),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(mockTrackTradeSubmitted).toHaveBeenCalledWith(
          expect.not.objectContaining({ trader_address: expect.anything() }),
        );
      });

      it('includes trader_address in trade props when a trader is in context', async () => {
        mockSuccessfulSubmit();

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn(), {
            traderAddress: '0xTRADER',
            source: 'leaderboard',
          }),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(mockTrackTradeSubmitted).toHaveBeenCalledWith(
          expect.objectContaining({ trader_address: '0xTRADER' }),
        );
      });
    });

    describe('stay-on-screen swap toasts', () => {
      const mockUsableQuote = () => {
        (useQuickBuyQuotes as jest.Mock).mockReturnValue({
          activeQuote: createActiveQuote(),
          destTokenAmount: '1',
          isQuoteLoading: false,
          isNoQuotesAvailable: false,
          quoteFetchError: null,
          isActiveQuoteForCurrentTokenPair: true,
          isQuoteRequestStale: false,
          sortedQuotes: [],
          quoteCount: 0,
          quotesLastFetchedAt: null,
          refreshCount: 0,
          quoteRefreshRateMs: 30000,
          maxRefreshCount: 5,
          refetchQuotes: jest.fn(),
        });
      };

      it('closes the sheet immediately on confirm', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'tx-1', hash: '0xabc' });
        const onClose = jest.fn();

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), onClose),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('shows the pending toast immediately on close, before submit resolves', async () => {
        mockUsableQuote();
        let resolveSubmit: (value: unknown) => void = () => undefined;
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockReturnValue(
          new Promise((resolve) => {
            resolveSubmit = resolve;
          }),
        );
        const onClose = jest.fn();

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), onClose),
        );

        let confirmPromise: Promise<void> | undefined;
        act(() => {
          confirmPromise = result.current.handleConfirm();
        });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('pending', {
          trade: expect.objectContaining({
            tokenSymbol: 'TEST',
            tradeMode: 'buy',
          }),
          theme: expect.any(Object),
        });
        expect(mockShowToast).toHaveBeenCalledWith({ kind: 'pending' });
        expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);

        await act(async () => {
          resolveSubmit({ id: 'tx-1', hash: '0xabc' });
          await confirmPromise;
        });
      });

      it('tracks the trade and shows a pending toast on successful submit', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'tx-1', hash: '0xabc' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(trackQuickBuyTrade).toHaveBeenCalledWith(
          'tx-1',
          expect.objectContaining({ tokenSymbol: 'TEST', tradeMode: 'buy' }),
        );
        expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('pending', {
          trade: expect.objectContaining({
            tokenSymbol: 'TEST',
            tradeMode: 'buy',
          }),
          theme: expect.any(Object),
        });
        expect(mockShowToast).toHaveBeenCalledWith({ kind: 'pending' });
      });

      it('tracks an EVM swap with isNonEvmSwap false and the tx hash as the signature', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'tx-1', hash: '0xabc' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(trackQuickBuyTrade).toHaveBeenCalledWith(
          'tx-1',
          expect.objectContaining({
            isNonEvmSwap: false,
            txSignature: '0xabc',
          }),
        );
      });

      it('tracks a same-chain Solana swap with isNonEvmSwap true and the signature', async () => {
        mockUsableQuote();
        (selectIsSolanaSourced as unknown as jest.Mock).mockReturnValue(true);
        (selectIsNonEvmSourced as unknown as jest.Mock).mockReturnValue(true);
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'sig-1', hash: 'sig-1' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(trackQuickBuyTrade).toHaveBeenCalledWith(
          'sig-1',
          expect.objectContaining({ isNonEvmSwap: true, txSignature: 'sig-1' }),
        );
      });

      it('tracks a same-chain Tron swap with isNonEvmSwap true and the signature', async () => {
        mockUsableQuote();
        (selectIsNonEvmSourced as unknown as jest.Mock).mockReturnValue(true);
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'trx-sig', hash: 'trx-sig' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(trackQuickBuyTrade).toHaveBeenCalledWith(
          'trx-sig',
          expect.objectContaining({
            isNonEvmSwap: true,
            txSignature: 'trx-sig',
          }),
        );
      });

      it('tracks a same-chain Bitcoin swap with isNonEvmSwap true and the signature', async () => {
        mockUsableQuote();
        (selectIsNonEvmSourced as unknown as jest.Mock).mockReturnValue(true);
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'btc-sig', hash: 'btc-sig' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(trackQuickBuyTrade).toHaveBeenCalledWith(
          'btc-sig',
          expect.objectContaining({
            isNonEvmSwap: true,
            txSignature: 'btc-sig',
          }),
        );
      });

      it('tracks a cross-chain non-EVM bridge with isNonEvmSwap false', async () => {
        mockUsableQuote();
        (selectIsSolanaSourced as unknown as jest.Mock).mockReturnValue(true);
        (selectIsNonEvmSourced as unknown as jest.Mock).mockReturnValue(true);
        (selectIsNonEvmNonEvmBridge as unknown as jest.Mock).mockReturnValue(
          true,
        );
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'sig-1', hash: 'sig-1' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(trackQuickBuyTrade).toHaveBeenCalledWith(
          'sig-1',
          expect.objectContaining({ isNonEvmSwap: false }),
        );
      });

      it('reconciles against the current bridge status right after tracking', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'tx-1', hash: '0xabc' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(resolveQuickBuyTerminalToast).toHaveBeenCalledWith(
          'tx-1',
          expect.any(Function),
          expect.any(Object),
        );
      });

      it('shows a failed toast and does not track the trade when submit throws', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockRejectedValue(new Error('user rejected'));
        const onClose = jest.fn();

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), onClose),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(buildQuickBuyToastOptions).toHaveBeenCalledWith('failed', {
          trade: expect.objectContaining({
            tokenSymbol: 'TEST',
            tradeMode: 'buy',
          }),
          theme: expect.any(Object),
        });
        expect(mockShowToast).toHaveBeenCalledWith({ kind: 'failed' });
        expect(playErrorNotification).toHaveBeenCalledTimes(1);
        expect(trackQuickBuyTrade).not.toHaveBeenCalled();
      });

      it('marks the submission in flight before submit and clears it after success', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockResolvedValue({ id: 'tx-1', hash: '0xabc' });

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(beginQuickBuySubmission).toHaveBeenCalledTimes(1);
        expect(endQuickBuySubmission).toHaveBeenCalledTimes(1);
        const beginOrder = (beginQuickBuySubmission as jest.Mock).mock
          .invocationCallOrder[0];
        const trackOrder = (trackQuickBuyTrade as jest.Mock).mock
          .invocationCallOrder[0];
        const endOrder = (endQuickBuySubmission as jest.Mock).mock
          .invocationCallOrder[0];
        expect(beginOrder).toBeLessThan(trackOrder);
        expect(trackOrder).toBeLessThan(endOrder);
      });

      it('clears the in-flight submission marker when submit throws', async () => {
        mockUsableQuote();
        (
          Engine.context.BridgeStatusController.submitTx as jest.Mock
        ).mockRejectedValue(new Error('user rejected'));

        const { result } = renderHook(() =>
          useQuickBuyController(createTarget(), jest.fn()),
        );

        await act(async () => {
          await result.current.handleConfirm();
        });

        expect(beginQuickBuySubmission).toHaveBeenCalledTimes(1);
        expect(endQuickBuySubmission).toHaveBeenCalledTimes(1);
      });
    });
  });
});
