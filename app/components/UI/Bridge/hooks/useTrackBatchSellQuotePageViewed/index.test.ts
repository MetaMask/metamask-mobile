import { waitFor } from '@testing-library/react-native';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  formatAddressToAssetId,
  toBridgeAssetV2,
} from '@metamask/bridge-controller';
import { CaipAssetType, Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import type { BridgeToken } from '../../types';
import { DEFAULT_BATCH_SELL_SLIPPAGE } from '../../components/SlippageModal/utils';
import { useTrackBatchSellQuotePageViewed } from './index';
import type { BatchSellQuoteTokenDataByAssetId } from '../useBatchSellQuoteData';

const ethAssetId =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
const uniAssetId =
  'eip155:1/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType;
const selectedTokens: BridgeToken[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'ETH',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'UNI',
  },
];
const selectedAssets = selectedTokens.map(({ address, chainId, ...rest }) => ({
  address,
  chainId,
  name: 'TOKEN',
  ...rest,
  assetId: formatAddressToAssetId(address, chainId),
}));
const selectedDestinationToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
  name: 'DESTINATION_TOKEN',
  assetId: formatAddressToAssetId(
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0x1',
  ),
};
const selectedTokenQuotes = [
  {
    quote: {
      src: { asset: toBridgeAssetV2(selectedAssets[0]), usd: '1000' },
      dest: { asset: toBridgeAssetV2(selectedDestinationToken) },
    },
  },
  {
    quote: {
      src: { asset: toBridgeAssetV2(selectedAssets[1]), usd: '200' },
      dest: { asset: toBridgeAssetV2(selectedDestinationToken) },
    },
  },
];

function getTokenDataByAssetId(
  quoteOverrides: Partial<
    Record<CaipAssetType, (typeof selectedTokenQuotes)[number] | null>
  > = {
    [ethAssetId]: selectedTokenQuotes[0],
    [uniAssetId]: selectedTokenQuotes[1],
  },
) {
  return {
    [ethAssetId]: {
      key: ethAssetId,
      tokenSymbol: 'ETH',
      slippage: '1%',
      receivedAmount: '123 USDC',
      receivedAmountFiat: '$123.45',
      quote: quoteOverrides[ethAssetId] ?? null,
      isLoading: false,
      isHighPriceImpact: false,
      isQuoteUnavailable: quoteOverrides[ethAssetId] === null,
    },
    [uniAssetId]: {
      key: uniAssetId,
      tokenSymbol: 'UNI',
      slippage: `${DEFAULT_BATCH_SELL_SLIPPAGE}%`,
      receivedAmount: '77 USDC',
      receivedAmountFiat: '$77.89',
      quote: quoteOverrides[uniAssetId] ?? null,
      isLoading: false,
      isHighPriceImpact: false,
      isQuoteUnavailable: quoteOverrides[uniAssetId] === null,
    },
  } as BatchSellQuoteTokenDataByAssetId;
}

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        getLocation: jest.fn(() => 'trade_menu'),
        trackUnifiedSwapBridgeEvent: jest.fn(),
      },
    },
  },
}));

function getBridgeControllerMock() {
  return Engine.context.BridgeController as jest.Mocked<
    typeof Engine.context.BridgeController
  >;
}

describe('useTrackBatchSellQuotePageViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not track until token data has at least one quote', () => {
    renderHookWithProvider(() =>
      useTrackBatchSellQuotePageViewed({
        batchSellSlippages: {},
        selectedTokens,
        tokenData: getTokenDataByAssetId({
          [ethAssetId]: null,
          [uniAssetId]: null,
        }),
      }),
    );

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).not.toHaveBeenCalled();
  });

  it('tracks once with quote-page properties', async () => {
    const { rerender } = renderHookWithProvider(() =>
      useTrackBatchSellQuotePageViewed({
        batchSellSlippages: {
          [ethAssetId]: '1',
        },
        selectedTokens,
        tokenData: getTokenDataByAssetId(),
      }),
    );

    await waitFor(() => {
      expect(
        getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith(
        BatchSellMetricsEventName.BatchSellQuotePageViewed,
        {
          chain_id_destination: 'eip155:1',
          chain_id_source: 'eip155:1',
          destination_token_address:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          destination_token_symbol: 'USDC',
          location: BatchSellMetricsLocation.TradeMenu,
          source_token_addresses: [ethAssetId, uniAssetId],
          source_token_slippages: [1, Number(DEFAULT_BATCH_SELL_SLIPPAGE)],
          source_token_symbols: ['ETH', 'UNI'],
          usd_amount_source_tokens: [1000, 200],
          usd_amount_source_total: 1200,
        },
      );
    });

    rerender(undefined);

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledTimes(1);
  });

  it.only('adds a USD placeholder when a selected token is missing a quote', async () => {
    renderHookWithProvider(() =>
      useTrackBatchSellQuotePageViewed({
        batchSellSlippages: {
          [ethAssetId]: '1',
        },
        selectedTokens,
        tokenData: getTokenDataByAssetId({
          [ethAssetId]: selectedTokenQuotes[0],
          [uniAssetId]: null,
        }),
      }),
    );

    await waitFor(() => {
      expect(
        getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith(
        BatchSellMetricsEventName.BatchSellQuotePageViewed,
        expect.objectContaining({
          source_token_addresses: [ethAssetId, uniAssetId],
          source_token_symbols: ['ETH', 'UNI'],
          usd_amount_source_tokens: [1000, 0],
          usd_amount_source_total: 1000,
        }),
      );
    });
  });
});
