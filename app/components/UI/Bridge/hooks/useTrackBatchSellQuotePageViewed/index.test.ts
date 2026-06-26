import { waitFor } from '@testing-library/react-native';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  FeatureId,
} from '@metamask/bridge-controller';
import { CaipAssetType, Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import type { BridgeToken } from '../../types';
import { DEFAULT_BATCH_SELL_SLIPPAGE } from '../../components/SlippageModal/utils';
import { useTrackBatchSellQuotePageViewed } from './index';

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
let mockBridgeControllerState: { quoteRequest?: { srcChainId?: Hex }[] } = {
  quoteRequest: [{ srcChainId: '0x1' as Hex }],
};

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

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBridgeControllerState: jest.fn(() => mockBridgeControllerState),
}));

function getBridgeControllerMock() {
  return Engine.context.BridgeController as jest.Mocked<
    typeof Engine.context.BridgeController
  >;
}

describe('useTrackBatchSellQuotePageViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBridgeControllerState = {
      quoteRequest: [{ srcChainId: '0x1' as Hex }],
    };
  });

  it('does not track until quote request source chain is available', () => {
    mockBridgeControllerState = { quoteRequest: [{}] };

    renderHookWithProvider(() =>
      useTrackBatchSellQuotePageViewed({
        batchSellSlippages: {},
        hasValidSourceAmounts: true,
        percentsByTokenKey: {
          '0x1:0x1111111111111111111111111111111111111111': 100,
          '0x1:0x2222222222222222222222222222222222222222': 100,
        },
        selectedDestinationToken,
        selectedTokens,
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
        hasValidSourceAmounts: true,
        percentsByTokenKey: {
          '0x1:0x1111111111111111111111111111111111111111': 100,
          '0x1:0x2222222222222222222222222222222222222222': 50,
        },
        selectedDestinationToken,
        selectedTokens,
      }),
    );

    await waitFor(() => {
      expect(
        getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith(
        BatchSellMetricsEventName.BatchSellQuotePageViewed,
        {
          location: BatchSellMetricsLocation.TradeMenu,
          feature_id: FeatureId.BATCH_SELL,
          selected_token_address_list: [ethAssetId, uniAssetId],
          target_token_symbol: 'USDC',
          slider_percentages: [100, 50],
          slippage_percentages: [1, Number(DEFAULT_BATCH_SELL_SLIPPAGE)],
        },
      );
    });

    rerender(undefined);

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledTimes(1);
  });
});
