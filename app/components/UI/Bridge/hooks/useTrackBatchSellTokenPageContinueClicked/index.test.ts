import { act } from '@testing-library/react-native';
import {
  BatchSellMetricsEventName,
  BatchSellMetricsLocation,
} from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import type { BridgeToken } from '../../types';
import { useTrackBatchSellTokenPageContinueClicked } from './index';

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

function getBridgeControllerMock() {
  return Engine.context.BridgeController as jest.Mocked<
    typeof Engine.context.BridgeController
  >;
}

describe('useTrackBatchSellTokenPageContinueClicked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks the token page continue click with selected source tokens', () => {
    const { result } = renderHookWithProvider(() =>
      useTrackBatchSellTokenPageContinueClicked({
        location: BatchSellMetricsLocation.TradeMenu,
      }),
    );

    act(() => {
      result.current(selectedTokens);
    });

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledWith(
      BatchSellMetricsEventName.BatchSellTokenPageContinueClicked,
      {
        chain_id_destination: 'eip155:1',
        chain_id_source: 'eip155:1',
        location: BatchSellMetricsLocation.TradeMenu,
        source_token_addresses: [
          'eip155:1/erc20:0x1111111111111111111111111111111111111111',
          'eip155:1/erc20:0x2222222222222222222222222222222222222222',
        ],
        source_token_symbols: ['ETH', 'UNI'],
      },
    );
  });

  it('does not track when no source tokens are selected', () => {
    const { result } = renderHookWithProvider(() =>
      useTrackBatchSellTokenPageContinueClicked({
        location: BatchSellMetricsLocation.Deeplink,
      }),
    );

    act(() => {
      result.current([]);
    });

    expect(
      getBridgeControllerMock().trackUnifiedSwapBridgeEvent,
    ).not.toHaveBeenCalled();
  });
});
