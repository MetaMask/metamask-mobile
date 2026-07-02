import { act } from '@testing-library/react-native';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
} from '@metamask/bridge-controller';
import { CaipAssetType, Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import type { BridgeToken } from '../../types';
import { DEFAULT_BATCH_SELL_SLIPPAGE } from '../../components/SlippageModal/utils';
import type { BatchSellQuoteTokenDataByAssetId } from '../useBatchSellQuoteData';
import { useTrackBatchSellQuotePageReviewClicked } from './index';

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
const selectedDestinationToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};
const selectedTokenQuotes = [
  {
    quote: {
      srcAsset: {
        address: selectedTokens[0].address,
        symbol: selectedTokens[0].symbol,
      },
      srcChainId: 1,
      destAsset: {
        address: selectedDestinationToken.address,
        symbol: selectedDestinationToken.symbol,
      },
      destChainId: 1,
    },
    sentAmount: {
      usd: '1000',
    },
  },
  {
    quote: {
      srcAsset: {
        address: selectedTokens[1].address,
        symbol: selectedTokens[1].symbol,
      },
      srcChainId: 1,
      destAsset: {
        address: selectedDestinationToken.address,
        symbol: selectedDestinationToken.symbol,
      },
      destChainId: 1,
    },
    sentAmount: {
      usd: '200',
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

describe('useTrackBatchSellQuotePageReviewClicked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks with the quote-page properties', () => {
    const { result } = renderHookWithProvider(() =>
      useTrackBatchSellQuotePageReviewClicked({
        batchSellSlippages: {
          [ethAssetId]: '1',
        },
        selectedTokens,
        tokenData: getTokenDataByAssetId(),
      }),
    );

    act(() => {
      result.current();
    });

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledWith(
      BatchSellMetricsEventName.BatchSellQuotePageReviewClicked,
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

  it('does not track until token data has at least one quote', () => {
    const { result } = renderHookWithProvider(() =>
      useTrackBatchSellQuotePageReviewClicked({
        batchSellSlippages: {},
        selectedTokens,
        tokenData: getTokenDataByAssetId({
          [ethAssetId]: null,
          [uniAssetId]: null,
        }),
      }),
    );

    act(() => {
      result.current();
    });

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).not.toHaveBeenCalled();
  });
});
