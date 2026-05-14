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
import { strings } from '../../../../../../locales/i18n';
import {
  defaultPositionForViews,
  renderPerpsClosePositionView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsAmountDisplaySelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
} from '../../Perps.testIds';

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

  it('uses the latest live position when take profit partially fills before manual close', async () => {
    const routePosition: Position = {
      ...longPosition,
      takeProfitPrice: '2800',
      takeProfitCount: 1,
    };
    const partiallyClosedPosition: Position = {
      ...routePosition,
      size: '0.4',
      marginUsed: '333.33',
      unrealizedPnl: '120',
      returnOnEquity: '0.36',
      positionValue: '1000',
    };
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position: routePosition,
      },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [routePosition],
        marketData: [ethMarket],
      },
    });

    act(() => {
      stream.emitPositions([partiallyClosedPosition]);
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2800',
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
          position: expect.objectContaining({
            symbol: 'ETH',
            size: '0.4',
            marginUsed: '333.33',
            takeProfitPrice: '2800',
          }),
        }),
      );
    });
  });

  it('submits a partial market close with explicit size and slippage amount', async () => {
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position: longPosition,
      },
      streamOverrides: {
        account: fundedAccount('10000'),
        positions: [longPosition],
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

    fireEvent.press(
      await screen.findByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
    );
    fireEvent.press(screen.getByText('50%'));
    fireEvent.press(screen.getByText(strings('perps.deposit.done_button')));

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
          size: '0.5',
          usdAmount: '1250',
          priceAtCalculation: 2500,
          maxSlippageBps: 300,
          position: expect.objectContaining({
            symbol: 'ETH',
            size: '1',
          }),
        }),
      );
    });
  });
});
