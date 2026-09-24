import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useQuickBuyController } from './useQuickBuyController';
import {
  runQuickBuyControllerCases,
  setupDefaultMocks,
} from './runQuickBuyControllerCases';
import {
  positionToQuickBuyTarget,
  type QuickBuyAnalyticsContext,
  type QuickBuyTarget,
} from '../types';
import { FeatureId } from '@metamask/bridge-controller';
import { BridgeSessionProvider } from '../../Bridge/providers/BridgeSessionProvider';
import { SwapQuotesProvider } from '../../Bridge/providers/SwapQuotesProvider';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { useSwapQuotes } from '../../Bridge/hooks/useSwapQuotes';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
  shallowEqual: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(
    () => 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
  ),
}));

jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('./useQuickBuyAnalytics', () => ({
  useQuickBuyAnalytics: jest.fn(),
}));

jest.mock('./useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./usePayWithTokens', () => ({
  usePayWithTokens: jest.fn(),
}));

jest.mock('./useReceiveTokens', () => ({
  useReceiveTokens: jest.fn(),
}));

jest.mock('./usePositionTokenBalance', () => ({
  usePositionTokenBalance: jest.fn(),
}));

jest.mock('./useDestTokenExchangeRate', () => ({
  useDestTokenExchangeRate: jest.fn(),
}));

jest.mock('./useQuickBuyQuotes', () => ({
  useQuickBuyQuotes: jest.fn(),
}));

jest.mock('../../Bridge/providers/SwapQuotesProvider', () => ({
  SwapQuotesProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock('../../Bridge/providers/BridgeSessionProvider', () => ({
  BridgeSessionProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock('../../Bridge/hooks/useSwapQuotes', () => ({
  useSwapQuotes: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(() => ({})),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({ colors: {} })),
}));

jest.mock('../../Bridge/hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useInitialSlippage', () => ({
  useInitialSlippage: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useDisplayCurrencyValue', () => ({
  useDisplayCurrencyValue: jest.fn(() => undefined),
}));

jest.mock('../../Bridge/hooks/useFormattedNetworkFee', () => ({
  useFormattedNetworkFee: jest.fn(() => '-'),
}));

jest.mock('../../Bridge/hooks/useRecipientInitialization', () => ({
  useRecipientInitialization: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useIsGasIncludedSTXSendBundleSupported', () => ({
  useIsGasIncludedSTXSendBundleSupported: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useIsGasIncluded7702Supported', () => ({
  useIsGasIncluded7702Supported: jest.fn(),
}));

jest.mock('../../../hooks/useRefreshSmartTransactionsLiveness', () => ({
  useRefreshSmartTransactionsLiveness: jest.fn(),
}));

jest.mock('../../../Views/confirmations/hooks/gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
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

jest.mock('../../../../core/redux/slices/bridge', () => ({
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
  selectIsSlippageUserOverride: jest.fn(),
  selectSlippage: jest.fn(),
  selectIsEvmNonEvmBridge: jest.fn(),
  selectIsNonEvmNonEvmBridge: jest.fn(),
  selectIsSolanaSourced: jest.fn(),
  selectIsNonEvmSourced: jest.fn(),
  selectBridgeFeatureFlags: jest.fn(),
  selectIsGasIncludedSTXSendBundleSupported: jest.fn(),
  selectSourceToken: jest.fn(),
  selectDestToken: jest.fn(),
  selectSourceAmount: jest.fn(),
  selectBridgeBalanceRefreshKey: jest.fn(),
  selectBridgeControllerState: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/bridge', () => ({
  selectSourceWalletAddress: jest.fn(),
  selectGasIncludedQuoteParams: jest.fn(() => ({
    gasIncluded: false,
    gasIncluded7702: false,
  })),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

jest.mock('../../Bridge/hooks/usePriceImpactViewData', () => ({
  usePriceImpactViewData: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../component-library/components/Toast', () => {
  const actualReact = jest.requireActual('react');
  const mockShowToast = jest.fn();
  const toastRef = {
    current: {
      showToast: mockShowToast,
    },
  };

  return {
    __esModule: true,
    mockShowToast,
    toastRef,
    ToastContext: actualReact.createContext({
      toastRef,
    }),
    ToastVariants: { Plain: 'Plain', Icon: 'Icon' },
  };
});

jest.mock('../quickBuyTradeTracker', () => ({
  trackQuickBuyTrade: jest.fn(),
  getTrackedQuickBuyTrade: jest.fn(),
  getTrackedQuickBuyTradeIds: jest.fn(() => []),
  untrackQuickBuyTrade: jest.fn(),
  beginQuickBuySubmission: jest.fn(),
  endQuickBuySubmission: jest.fn(),
}));

jest.mock('../quickBuyToastOptions', () => ({
  buildQuickBuyToastOptions: jest.fn((kind: string) => ({ kind })),
}));

jest.mock('../resolveQuickBuyTerminalToast', () => ({
  resolveQuickBuyTerminalToast: jest.fn(),
}));

jest.mock('../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  playErrorNotification: jest.fn(),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
}));

jest.mock('../../../Views/SocialLeaderboard/analytics', () => ({
  ...jest.requireActual('../../../Views/SocialLeaderboard/analytics'),
  useSocialLeaderboardAnalytics: jest.fn(() => ({ track: jest.fn() })),
}));

const defaultTarget = positionToQuickBuyTarget({
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
  positionId: '123',
});

if (!defaultTarget) {
  throw new Error('useQuickBuyController.test: default target is not mapped');
}

const mockUseQuickBuyQuotes = jest.mocked(useQuickBuyQuotes);
runQuickBuyControllerCases({
  name: 'useQuickBuyController',
  setupQuoteSourceMock: (mockResult: ReturnType<typeof useQuickBuyQuotes>) => {
    mockUseQuickBuyQuotes.mockReturnValue(mockResult);
  },
  mockQuoteSource: mockUseQuickBuyQuotes,
  renderHook: (
    target?: QuickBuyTarget,
    onClose?: () => void,
    analyticsContext?: QuickBuyAnalyticsContext,
    initialProps?: { target: QuickBuyTarget; onClose: () => void },
  ) => {
    const utils = renderHook(
      () =>
        useQuickBuyController(
          target ?? defaultTarget,
          onClose ?? jest.fn(),
          analyticsContext,
        ),
      { initialProps },
    );

    return {
      result: utils.result,
      unmount: utils.unmount,
      rerender: (props?: { target: QuickBuyTarget; onClose: () => void }) => {
        utils.rerender(props ?? { target: defaultTarget, onClose: jest.fn() });
      },
    };
  },
});

const Wrapper = ({
  children,
  featureId,
}: {
  children: React.ReactNode;
  featureId: FeatureId;
}) => {
  return (
    <BridgeSessionProvider featureId={featureId}>
      <SwapQuotesProvider>{children}</SwapQuotesProvider>
    </BridgeSessionProvider>
  );
};

const mockUseSwapQuotes = jest.mocked(useSwapQuotes);

const setupQuoteSourceMock = (
  mockResult: ReturnType<typeof useQuickBuyQuotes>,
) => {
  mockUseSwapQuotes.mockImplementation(
    () =>
      ({
        activeQuote: mockResult.activeQuote,
        validQuotes: mockResult.sortedQuotes,
        destTokenAmount: mockResult.destTokenAmount,
        isLoading: mockResult.isQuoteLoading,
        isNoQuotesAvailable: mockResult.isNoQuotesAvailable,
        quoteFetchError: mockResult.quoteFetchError,
        isActiveQuoteForCurrentTokenPair:
          mockResult.isActiveQuoteForCurrentTokenPair,
        needsNewQuote: mockResult.isQuoteRequestStale,
        formattedQuoteData: {
          priceImpact: undefined,
        },
        shouldShowPriceImpactError:
          Number(
            mockResult.activeQuote?.quote?.priceData?.priceImpact?.amount,
          ) >= 0.25,
        refreshQuotes: mockResult.refetchQuotes,
        debouncedUpdateQuoteParams: Object.assign(jest.fn(), {
          cancel: jest.fn(),
          flush: jest.fn(),
        }),
      }) as unknown as ReturnType<typeof useSwapQuotes>,
  );
};

runQuickBuyControllerCases({
  name: 'useSwapQuotes (QuickBuy)',
  setupQuoteSourceMock,
  mockQuoteSource: mockUseQuickBuyQuotes,
  renderHook: (
    target?: QuickBuyTarget,
    onClose?: () => void,
    analyticsContext?: QuickBuyAnalyticsContext,
    initialProps?: { target: QuickBuyTarget; onClose: () => void },
  ) => {
    const utils = renderHook(
      () =>
        useQuickBuyController(
          target ?? defaultTarget,
          onClose ?? jest.fn(),
          analyticsContext,
        ),
      {
        initialProps,
        wrapper: ({ children }) => (
          <Wrapper featureId={FeatureId.QUICK_BUY_EXPLORE}>{children}</Wrapper>
        ),
      },
    );

    return {
      result: utils.result,
      unmount: utils.unmount,
      rerender: (props?: { target: QuickBuyTarget; onClose: () => void }) => {
        utils.rerender(props ?? { target: defaultTarget, onClose: jest.fn() });
      },
    };
  },
});

describe('formattedPriceImpact', () => {
  beforeEach(() => {
    setupDefaultMocks();
    mockUseQuickBuyQuotes.mockReturnValue({
      activeQuote: undefined,
      sortedQuotes: [],
      destTokenAmount: undefined,
      isQuoteLoading: false,
      isNoQuotesAvailable: false,
      quoteFetchError: null,
      isActiveQuoteForCurrentTokenPair: false,
      isQuoteRequestStale: false,
      quoteCount: 0,
      quotesLastFetchedAt: null,
      refreshCount: 0,
      quoteRefreshRateMs: 30000,
      maxRefreshCount: 5,
      refetchQuotes: jest.fn(),
    });
  });

  it('returns useSwapQuotes formatted price impact', () => {
    mockUseSwapQuotes.mockReturnValue({
      formattedQuoteData: { priceImpact: '-0.20%' },
      shouldShowPriceImpactError: false,
      activeQuote: undefined,
      validQuotes: [],
      isLoading: false,
      isNoQuotesAvailable: false,
      quoteFetchError: null,
      isActiveQuoteForCurrentTokenPair: false,
      needsNewQuote: false,
      refreshQuotes: jest.fn(),
      debouncedUpdateQuoteParams: jest.fn(),
    } as unknown as ReturnType<typeof useSwapQuotes>);

    const { result } = renderHook(() =>
      useQuickBuyController(defaultTarget, jest.fn()),
    );

    expect(result.current.formattedPriceImpact).toBe('-0.20%');
  });
});
