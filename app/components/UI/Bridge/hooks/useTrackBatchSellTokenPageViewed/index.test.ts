import { waitFor } from '@testing-library/react-native';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
  FeatureId,
} from '@metamask/bridge-controller';

import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTrackBatchSellTokenPageViewed } from './index';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        trackUnifiedSwapBridgeEvent: jest.fn(),
      },
    },
  },
}));

const sortedEligibleChains = [
  {
    chainId: 'eip155:1' as const,
    name: 'Ethereum',
    tokenFiatAmount: 10,
  },
];

function getBridgeControllerMock() {
  return Engine.context.BridgeController as jest.Mocked<
    typeof Engine.context.BridgeController
  >;
}

describe('useTrackBatchSellTokenPageViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not track when there are no eligible chains', () => {
    renderHookWithProvider(() =>
      useTrackBatchSellTokenPageViewed({
        location: BatchSellMetricsLocation.TradeMenu,
        sortedEligibleChains: [],
      }),
    );

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).not.toHaveBeenCalled();
  });

  it('tracks once when the highest-value chain is available', async () => {
    const { rerender } = renderHookWithProvider(() =>
      useTrackBatchSellTokenPageViewed({
        location: BatchSellMetricsLocation.Deeplink,
        sortedEligibleChains,
      }),
    );

    await waitFor(() => {
      expect(
        getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith(
        BatchSellMetricsEventName.BatchSellTokenPageViewed,
        {
          location: BatchSellMetricsLocation.Deeplink,
          feature_id: FeatureId.BATCH_SELL,
          chain_id: 'eip155:1',
        },
      );
    });

    rerender(undefined);

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledTimes(1);
  });
});
