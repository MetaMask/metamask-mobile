/**
 * Component view tests for PerpsClosePositionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type {
  AccountState,
  PerpsMarketData,
  Position,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import {
  defaultPositionForViews,
  renderPerpsClosePositionView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsClosePositionViewSelectorsIDs } from '../../Perps.testIds';

const TIMEOUT_MS = 5000;

const fundedAccount = (balance: string): AccountState => ({
  spendableBalance: balance,
  withdrawableBalance: balance,
  totalBalance: balance,
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
});

const ethMarket: PerpsMarketData = {
  symbol: 'ETH',
  name: 'Ethereum',
  maxLeverage: '50x',
  price: '$2,500.00',
  change24h: '+$50.00',
  change24hPercent: '+2.0%',
  volume: '$1.5B',
  marketType: 'crypto',
};

const longPosition: Position = {
  ...defaultPositionForViews,
  symbol: 'ETH',
  size: '1',
  marginUsed: '833.33',
  entryPrice: '2500',
  liquidationPrice: '1800',
  unrealizedPnl: '0',
  returnOnEquity: '0',
  leverage: { value: 3, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '0', allTime: '0', sinceChange: '0' },
  positionValue: '2500',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

describe('PerpsClosePositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits a market close for a long position with custom take profit', async () => {
    const takeProfitPosition: Position = {
      ...longPosition,
      takeProfitPrice: '2800',
      takeProfitCount: 1,
    };
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position: takeProfitPosition,
      },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [takeProfitPosition],
        marketData: [ethMarket],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
        },
      });
    });

    const confirmButton = await screen.findByTestId(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );

    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(closePosition).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'market',
          position: expect.objectContaining({ symbol: 'ETH' }),
        }),
      );
    });
  });
});
