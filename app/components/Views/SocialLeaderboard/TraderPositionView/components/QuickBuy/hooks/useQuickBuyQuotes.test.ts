import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../../core/Engine';
import {
  selectBridgeFeatureFlags,
  selectDestAddress,
  selectSlippage,
} from '../../../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../../../selectors/bridge';
import { selectSocialAIQuickBuyStreamQuotesEnabled } from '../../../../../../../selectors/featureFlagController/socialLeaderboard';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import {
  isQuoteStreamingEnabled,
  streamQuickBuyQuotes,
} from '../utils/streamQuickBuyQuotes';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  shallowEqual: jest.fn(),
}));

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  // Run the debounced fetch synchronously so tests only manage the refresh
  // timer, not the input debounce.
  debounce: (fn: (...args: unknown[]) => unknown) => {
    const wrapped = (...args: unknown[]) => fn(...args);
    wrapped.cancel = () => undefined;
    return wrapped;
  },
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToCaipReference: (address: string) => address,
  isNonEvmChainId: () => false,
  selectBridgeQuotes: jest.fn(() => ({
    sortedQuotes: [],
    recommendedQuote: undefined,
  })),
  SortOrder: { COST_ASC: 'COST_ASC' },
}));

jest.mock('../../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: { fetchQuotes: jest.fn() },
    },
  },
}));

jest.mock('../../../../../../../core/redux/slices/bridge', () => ({
  selectBridgeFeatureFlags: jest.fn(),
  selectDestAddress: jest.fn(),
  selectSlippage: jest.fn(),
}));

jest.mock('../../../../../../../selectors/bridge', () => ({
  selectGasIncludedQuoteParams: jest.fn(),
  selectSourceWalletAddress: jest.fn(),
}));

jest.mock('../../../../../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(),
}));

jest.mock(
  '../../../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialAIQuickBuyStreamQuotesEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../../../util/number/bigint', () => ({
  fromTokenMinimalUnit: jest.fn(() => '1'),
}));

jest.mock('../../../../../../../util/address', () => ({
  areAddressesEqual: jest.fn(() => true),
}));

jest.mock('../../../../../../../util/transactions', () => ({
  calcTokenValue: jest.fn(() => ({ toFixed: () => '1000' })),
}));

jest.mock('../../../../../../../util/analytics/analytics', () => ({
  analytics: { isEnabled: () => false },
}));

jest.mock('../../../../../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => 1),
}));

jest.mock('../../../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../../../../../../../util/social/socialServiceTelemetry', () => ({
  buildSocialLoggerErrorOptions: jest.fn(() => ({})),
}));

jest.mock('../analytics', () => ({
  QuickBuyEventProperties: {},
}));

jest.mock('../../../../analytics', () => {
  // Stable `track` reference — a fresh one each render would churn the
  // `fetchQuotes` callback identity and re-trigger the fetch effect endlessly.
  const track = jest.fn();
  return { useSocialLeaderboardAnalytics: () => ({ track }) };
});

jest.mock('../../../../../../../core/Analytics', () => ({
  MetaMetricsEvents: {},
}));

jest.mock('../../../../../../UI/Bridge/utils/quoteUtils', () => ({
  getQuoteRefreshRate: jest.fn(() => 10000),
}));

jest.mock('../utils/getQuickBuyFeatureId', () => ({
  getQuickBuyFeatureId: jest.fn(() => 'FEATURE'),
}));

jest.mock('../utils/streamQuickBuyQuotes', () => ({
  isQuoteStreamingEnabled: jest.fn(),
  streamQuickBuyQuotes: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockFetchQuotes = Engine.context.BridgeController
  .fetchQuotes as jest.Mock;
const mockStreamQuotes = streamQuickBuyQuotes as jest.Mock;
const mockIsStreamingEnabled = isQuoteStreamingEnabled as jest.Mock;

const REFRESH_RATE_MS = 10000;

// Stable reference so the hook's metadata `useSelector` doesn't churn memos.
const METADATA_STUB = {
  bridgeController: { quoteRequest: [{}] },
  gasFeeEstimatesByChainId: {},
  multichainAssetsRates: {},
  tokenRates: {},
  currencyRate: {},
  bridgeConfig: {},
};

interface Scenario {
  slippage?: string;
  destAddress?: string;
  walletAddress?: string;
  bridgeFeatureFlags: Record<string, unknown>;
  streamFlag: boolean;
}

let scenario: Scenario;

const applySelectorMock = () => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    switch (selector) {
      case selectSlippage:
        return scenario.slippage;
      case selectDestAddress:
        return scenario.destAddress;
      case selectSourceWalletAddress:
        return scenario.walletAddress;
      case selectGasIncludedQuoteParams:
        return { gasIncluded: false, gasIncluded7702: false };
      case selectBridgeFeatureFlags:
        return scenario.bridgeFeatureFlags;
      case selectSocialAIQuickBuyStreamQuotesEnabled:
        return scenario.streamFlag;
      default:
        // The only remaining call is `selectQuoteMetadataDeps` (a module-local
        // selector we can't reference by identity).
        return METADATA_STUB;
    }
  });
};

const token = (symbol: string): BridgeToken =>
  ({
    address: `0x${symbol.toLowerCase()}`,
    chainId: '0x1',
    symbol,
    name: symbol,
    decimals: 18,
  }) as BridgeToken;

const sourceToken = token('USDC');
const destToken = token('WETH');

const makeStreamedQuote = (requestId: string) =>
  ({ quote: { requestId } }) as never;

const renderQuotes = () =>
  renderHook(() =>
    useQuickBuyQuotes({
      sourceToken,
      destToken,
      sourceTokenAmount: '1',
    }),
  );

describe('useQuickBuyQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    scenario = {
      walletAddress: '0xwallet',
      bridgeFeatureFlags: {},
      streamFlag: true,
    };
    applySelectorMock();
    mockFetchQuotes.mockResolvedValue([]);
    mockStreamQuotes.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('streaming gate', () => {
    it('streams when the QuickBuy flag and bridge SSE are both enabled', async () => {
      scenario.streamFlag = true;
      mockIsStreamingEnabled.mockReturnValue(true);

      renderQuotes();

      await waitFor(() => expect(mockStreamQuotes).toHaveBeenCalledTimes(1));
      expect(mockFetchQuotes).not.toHaveBeenCalled();
    });

    it('falls back to the one-shot fetch when the QuickBuy flag is disabled', async () => {
      scenario.streamFlag = false;
      mockIsStreamingEnabled.mockReturnValue(true);

      renderQuotes();

      await waitFor(() => expect(mockFetchQuotes).toHaveBeenCalledTimes(1));
      expect(mockStreamQuotes).not.toHaveBeenCalled();
    });

    it('falls back to the one-shot fetch when bridge SSE is disabled even if the flag is on', async () => {
      scenario.streamFlag = true;
      mockIsStreamingEnabled.mockReturnValue(false);

      renderQuotes();

      await waitFor(() => expect(mockFetchQuotes).toHaveBeenCalledTimes(1));
      expect(mockStreamQuotes).not.toHaveBeenCalled();
    });
  });

  describe('auto-refresh timing', () => {
    it('anchors the next stream on the stream close, not the fetch start', async () => {
      scenario.streamFlag = true;
      mockIsStreamingEnabled.mockReturnValue(true);

      // Hold the first stream open so its close lands well after its start.
      let closeFirstStream: () => void = () => undefined;
      mockStreamQuotes.mockImplementationOnce(
        async (
          _params: unknown,
          _featureId: unknown,
          _signal: unknown,
          { onQuote }: { onQuote: (q: never) => void },
        ) => {
          onQuote(makeStreamedQuote('r1'));
          await new Promise<void>((resolve) => {
            closeFirstStream = resolve;
          });
        },
      );

      renderQuotes();
      await waitFor(() => expect(mockStreamQuotes).toHaveBeenCalledTimes(1));

      // Stream stays open for 5s, then closes. The close `act` flushes the
      // settle + refresh scheduling without moving the clock further.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5000);
      });
      await act(async () => {
        closeFirstStream();
        await Promise.resolve();
      });

      // Start-anchored code would re-fetch at start+10s (i.e. 5s after close).
      // Settle-anchored code must wait a full 10s from the close.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(REFRESH_RATE_MS - 1);
      });
      expect(mockStreamQuotes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(mockStreamQuotes).toHaveBeenCalledTimes(2);
    });

    it('refetches a full refresh interval after a one-shot fetch settles', async () => {
      scenario.streamFlag = false;
      mockIsStreamingEnabled.mockReturnValue(false);

      const { result } = renderQuotes();
      // Flush the immediate fetch settle + refresh scheduling without moving the
      // clock, so the refresh timer is measured from a known point.
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetchQuotes).toHaveBeenCalledTimes(1);
      expect(result.current.quotesLastFetchedAt).not.toBeNull();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(REFRESH_RATE_MS - 1);
      });
      expect(mockFetchQuotes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(mockFetchQuotes).toHaveBeenCalledTimes(2);
    });
  });
});
