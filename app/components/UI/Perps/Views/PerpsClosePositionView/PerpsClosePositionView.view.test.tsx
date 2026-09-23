/**
 * Component view tests for PerpsClosePositionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsClosePositionView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { resetPerpsCloseLocksForTests } from '../../hooks/usePerpsClosePosition';
import {
  PerpsAmountDisplaySelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsLimitPriceBottomSheetSelectorsIDs,
} from '../../Perps.testIds';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

const TIMEOUT_MS = 5000;

describe('PerpsClosePositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // A filled close stays locked until the stream updates, which these
    // fixtures never do; reset so each test starts unlocked.
    resetPerpsCloseLocksForTests();
  });

  it('opens the shared slippage editor from a market close', async () => {
    const position = createLongPositionForViews();
    renderPerpsClosePositionView({
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });

    fireEvent.press(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.SLIPPAGE_ROW,
      ),
    );

    expect(
      await screen.findByText(strings('perps.slippage.config_title')),
    ).toBeOnTheScreen();
  });

  it('submits a market close for a long position with custom take profit', async () => {
    const takeProfitPosition: Position = {
      ...createLongPositionForViews(),
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
        account: createFundedAccountForViews('10000'),
        positions: [takeProfitPosition],
        marketData: [createEthMarketForViews()],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
          isTradable: true,
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

  it('sends one close order when confirm is double-tapped', async () => {
    const position = createLongPositionForViews();
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;

    const { stream } = renderPerpsClosePositionView({
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
          isTradable: true,
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

    // One act: both taps land before the first re-render disables the button.
    act(() => {
      fireEvent.press(confirmButton);
      fireEvent.press(confirmButton);
    });

    await waitFor(() => {
      expect(closePosition).toHaveBeenCalled();
    });
    expect(closePosition).toHaveBeenCalledTimes(1);
  });

  it('uses the latest live position when take profit partially fills before manual close', async () => {
    const routePosition: Position = {
      ...createLongPositionForViews(),
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
        account: createFundedAccountForViews('10000'),
        positions: [routePosition],
        marketData: [createEthMarketForViews()],
      },
    });

    act(() => {
      stream.emitPositions([partiallyClosedPosition]);
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2800',
          timestamp: Date.now(),
          isTradable: true,
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
    const position = createLongPositionForViews();

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position,
      },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
          isTradable: true,
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

  it('forwards the analytics tracking data to closePosition on a full market close', async () => {
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;
    const position = createLongPositionForViews({ unrealizedPnl: '150' });

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position,
        source: 'position_screen',
      },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
          isTradable: true,
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
          trackingData: expect.objectContaining({
            source: 'position_screen',
            entryPoint: 'position_screen',
            inputMethod: 'default',
            marketPrice: 2500,
            realizedPnl: 150,
            receivedAmount: 833.33,
            totalFee: expect.any(Number),
            metamaskFee: expect.any(Number),
          }),
        }),
      );
    });
  });

  it('forwards the analytics tracking data to closePosition on a partial market close', async () => {
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;
    const position = createLongPositionForViews({ unrealizedPnl: '150' });

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position,
        source: 'position_screen',
      },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
          isTradable: true,
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
          size: '0.5',
          trackingData: expect.objectContaining({
            inputMethod: 'percentage',
            realizedPnl: 75,
          }),
        }),
      );
    });
  });

  it('forwards the limit order type to closePosition when a limit close is submitted', async () => {
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;
    const position = createLongPositionForViews();

    const { stream } = renderPerpsClosePositionView({
      initialParams: {
        position,
        source: 'position_screen',
      },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsClosePositionLimitOrderEnabled: {
                  enabled: true,
                  minimumVersion: '0.0.0',
                },
              },
            },
          },
        },
      } as unknown as DeepPartial<RootState>,
    });

    act(() => {
      stream.emitPrices({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
          isTradable: true,
        },
      });
    });

    fireEvent.press(
      await screen.findByTestId(PerpsOrderHeaderSelectorsIDs.ORDER_TYPE_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(
        PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
      ),
    );

    fireEvent.press(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.LIMIT_PRICE_ROW,
      ),
    );
    fireEvent.press(
      await screen.findByTestId(
        PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID,
      ),
    );
    fireEvent.press(
      await screen.findByTestId(
        PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    );

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
          orderType: 'limit',
          price: '2500',
          usdAmount: undefined,
          maxSlippageBps: undefined,
        }),
      );
    });
  });
});
