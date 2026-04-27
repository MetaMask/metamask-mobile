import '../../../../../../tests/component-view/mocks';
import { setGlobalDevModeChecks } from 'reselect';
import { renderQuoteSelectorView } from '../../../../../../tests/component-view/renderers/quoteSelectorView';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { RequestStatus } from '@metamask/bridge-controller';
import {
  DEFAULT_BRIDGE,
  ETH_SOURCE,
  USDC_DEST,
} from '../../_mocks_/bridgeViewTestConstants';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { QUOTES_PLACEHOLDER_DATA } from './constants';
import { selectSelectedQuoteRequestId } from '../../../../../core/redux/slices/bridge';
import type { RootState } from '../../../../../reducers';

/** Minimal EVM QuoteResponse with a lifi bridge for use in BridgeController.quotes. */
const makeEvmQuote = (requestId = 'req-evm-1') => ({
  quote: {
    requestId,
    srcChainId: 1,
    destChainId: 1,
    bridges: ['lifi'],
    srcAsset: {
      chainId: 1,
      address: ETH_SOURCE.address,
      decimals: ETH_SOURCE.decimals,
      symbol: ETH_SOURCE.symbol,
      name: ETH_SOURCE.name,
    },
    destAsset: {
      chainId: 1,
      address: USDC_DEST.address,
      decimals: USDC_DEST.decimals,
      symbol: USDC_DEST.symbol,
      name: USDC_DEST.name,
    },
    srcTokenAmount: '1000000000000000000', // 1 ETH in wei
    destTokenAmount: '1000000', // 1 USDC (6 decimals)
    feeData: {
      metabridge: {
        amount: '0',
        asset: {
          address: ETH_SOURCE.address,
          chainId: 1,
          decimals: ETH_SOURCE.decimals,
          symbol: ETH_SOURCE.symbol,
          name: ETH_SOURCE.name,
        },
      },
    },
    gasIncluded: false,
    steps: [],
  },
  trade: {
    chainId: 1,
    to: '0x1111111254eeb25477b68fb85ed929f73a960582',
    from: '0x0000000000000000000000000000000000000001',
    value: '0x0',
    data: '0x',
    gasLimit: null,
  },
  totalNetworkFee: { amount: '0.001', valueInCurrency: '2', usd: '2' },
  estimatedProcessingTimeInSeconds: 30,
});

// selectBridgeAppState spreads multiple controller slices into a new object on every call,
// which causes reselect's inputStabilityCheck to throw a false positive in tests.
beforeAll(() => {
  setGlobalDevModeChecks({ inputStabilityCheck: 'never' });
});

describeForPlatforms('QuoteSelectorView', () => {
  it('dispatches setSelectedQuoteRequestId when user selects a quote', async () => {
    const now = Date.now();
    const quote = makeEvmQuote('req-selected');

    const { store, findByText } = renderQuoteSelectorView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          ...DEFAULT_BRIDGE,
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [quote],
              recommendedQuote: quote,
              quotesLastFetched: now,
              quotesLoadingStatus: 'SUCCEEDED',
              quotesRefreshCount: 0,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    fireEvent.press(await findByText('Lifi'));

    expect(
      selectSelectedQuoteRequestId(store.getState() as unknown as RootState),
    ).toBe('req-selected');
  });

  it('hides quote content behind Skeleton rows while quotes are loading', async () => {
    const { queryByText } = renderQuoteSelectorView({
      overrides: {
        engine: {
          backgroundState: {
            BridgeController: {
              quotesLoadingStatus: RequestStatus.LOADING,
              quotes: [],
              recommendedQuote: null,
              quotesLastFetched: 0,
              quotesRefreshCount: 0,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    // Each placeholder row's content is hidden by the Skeleton component while loading.
    // If skeleton rendering broke the content would become visible and these assertions would fail.
    await waitFor(() => {
      QUOTES_PLACEHOLDER_DATA.forEach(({ provider }) => {
        expect(queryByText(provider.name)).toBeNull();
      });
    });
  });

  it('shows provider name and total cost label when quotes are available', async () => {
    const now = Date.now();
    const quote = makeEvmQuote();

    const { findByText } = renderQuoteSelectorView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          ...DEFAULT_BRIDGE,
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [quote],
              recommendedQuote: quote,
              quotesLastFetched: now,
              quotesLoadingStatus: 'SUCCEEDED',
              quotesRefreshCount: 0,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    // Provider name derived via startCase('lifi')
    expect(await findByText('Lifi')).toBeOnTheScreen();
    // Total cost label is part of every loaded quote row
    expect(await findByText(/Total Cost/)).toBeOnTheScreen();
  });

  it('marks the recommended quote with a "Lowest cost" badge', async () => {
    const now = Date.now();
    const bestQuote = makeEvmQuote('req-best');
    const otherQuote = makeEvmQuote('req-other');

    const { findByText } = renderQuoteSelectorView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          ...DEFAULT_BRIDGE,
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [bestQuote, otherQuote],
              recommendedQuote: bestQuote,
              quotesLastFetched: now,
              quotesLoadingStatus: 'SUCCEEDED',
              quotesRefreshCount: 0,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    expect(await findByText(strings('bridge.lowest_cost'))).toBeOnTheScreen();
  });

  it('shows the destination token symbol in the receive amount row', async () => {
    const now = Date.now();
    const quote = makeEvmQuote();

    const { findByText } = renderQuoteSelectorView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          ...DEFAULT_BRIDGE,
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [quote],
              recommendedQuote: quote,
              quotesLastFetched: now,
              quotesLoadingStatus: 'SUCCEEDED',
              quotesRefreshCount: 0,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    // QuoteRow renders "~ {amount} {symbol}" for the receive amount
    await waitFor(async () => {
      await expect(findByText(/USDC/)).resolves.toBeOnTheScreen();
    });
  });
});
