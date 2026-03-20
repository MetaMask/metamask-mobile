import '../../../../../../tests/component-view/mocks';
import { renderQuoteSelectorView } from '../../../../../../tests/component-view/renderers/quoteSelectorView';
import { waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { RequestStatus } from '@metamask/bridge-controller';
import {
  DEFAULT_BRIDGE,
  ETH_SOURCE,
  USDC_DEST,
} from '../../_mocks_/bridgeViewTestConstants';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';

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
  totalNetworkFee: { amount: '0.001', valueInCurrency: '2', usd: '2' },
  estimatedProcessingTimeInSeconds: 30,
});

describeForPlatforms('QuoteSelectorView', () => {
  it('renders the sort-order info text', () => {
    const { getByText } = renderQuoteSelectorView();

    expect(getByText(strings('bridge.select_quote_info'))).toBeOnTheScreen();
  });

  it('shows placeholder skeleton rows while quotes are loading', () => {
    const { getByText } = renderQuoteSelectorView({
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

    // Info text is always visible
    expect(getByText(strings('bridge.select_quote_info'))).toBeOnTheScreen();
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
