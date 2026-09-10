import { renderHook } from '@testing-library/react-native';
import { useQuickBuyController } from './useQuickBuyController';
import { runQuickBuyControllerCases } from './runQuickBuyControllerCases';
import {
  positionToQuickBuyTarget,
  type QuickBuyAnalyticsContext,
  type QuickBuyTarget,
} from '../types';
import type { Position } from '@metamask/social-controllers';

jest.mock('../../../../util/Logger', () => ({
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

jest.mock('../../Bridge/hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../Bridge/hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
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
}));

jest.mock('../../../../selectors/bridge', () => ({
  selectSourceWalletAddress: jest.fn(),
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
} as Position);

if (!defaultTarget) {
  throw new Error('useQuickBuyController.test: default target is not mapped');
}

runQuickBuyControllerCases({
  name: 'useQuickBuyController',
  renderHook: (
    target?: QuickBuyTarget,
    onClose?: (() => void) | undefined,
    analyticsContext?: QuickBuyAnalyticsContext | undefined,
    initialProps?:
      | {
          target: QuickBuyTarget | undefined;
          onClose?: (() => void) | undefined;
        }
      | undefined,
  ) =>
    renderHook(
      () =>
        useQuickBuyController(
          target ?? defaultTarget,
          onClose ?? jest.fn(),
          analyticsContext,
        ),
      {
        initialProps,
      },
    ),
});
