import { renderHook } from '@testing-library/react-native';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { runQuickBuyQuotesCases } from './runQuickBuyQuotesCases';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  shallowEqual: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        fetchQuotes: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
  },
}));

jest.mock('../../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({ bridgeConfig: {} })),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  selectDestAddress: jest.fn(),
  selectIsSlippageUserOverride: jest.fn(() => false),
  selectSlippage: jest.fn(),
  selectBridgeFeatureFlags: jest.fn(() => ({
    maxRefreshCount: 5,
    refreshRate: 30000,
    chains: {},
  })),
}));

jest.mock('../../../../selectors/bridge', () => ({
  selectGasIncludedQuoteParams: jest.fn(),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../utils/streamQuickBuyQuotes', () => ({
  isQuoteStreamingEnabled: jest.fn(() => false),
  streamQuickBuyQuotes: jest.fn(),
}));

jest.mock('../../../Views/SocialLeaderboard/analytics', () => {
  const actual = jest.requireActual(
    '../../../Views/SocialLeaderboard/analytics',
  );
  const mockTrack = jest.fn();

  return {
    ...actual,
    mockTrack,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  const mockSelectBridgeQuotesBase = jest.fn();

  return {
    ...actual,
    mockSelectBridgeQuotesBase,
    selectBridgeQuotes: (...args: unknown[]) =>
      mockSelectBridgeQuotesBase(...args),
  };
});

runQuickBuyQuotesCases({
  name: 'useQuickBuyQuotes',
  renderHook: (params) =>
    renderHook((hookParams) => useQuickBuyQuotes(hookParams), {
      initialProps: params,
    }),
});
