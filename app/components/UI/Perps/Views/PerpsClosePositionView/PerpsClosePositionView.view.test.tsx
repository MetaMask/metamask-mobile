/**
 * Component view tests for PerpsClosePositionView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native';
import React, { useEffect, type ComponentType } from 'react';
import {
  PERPS_ERROR_CODES,
  type Position,
  type PriceUpdate,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import {
  renderPerpsClosePositionView,
  renderPerpsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { resetPerpsCloseLocksForTests } from '../../hooks/usePerpsClosePosition';
import { resetLastCloseOrderType } from '../../hooks/usePerpsClosePositionForm';
import {
  PerpsAmountDisplaySelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsOrderHeaderSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
  PerpsLimitPriceBottomSheetSelectorsIDs,
} from '../../Perps.testIds';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import PerpsClosePositionView from './PerpsClosePositionView';

const TIMEOUT_MS = 5000;

const CLOSE_POSITION_JOURNEY_START_ROUTE = 'PerpsClosePositionJourneyStart';
const CLOSE_POSITION_JOURNEY_START_PROBE = 'route-close-position-journey-start';

/** A 0.145% close fee quote (protocol 0.045% + MetaMask 0.1%). */
const quoteCloseFee = (): jest.Mock =>
  (Engine.context.PerpsController.calculateFees as jest.Mock).mockResolvedValue(
    {
      feeRate: 0.00145,
      feeAmount: 0,
      protocolFeeRate: 0.00045,
      protocolFeeAmount: 0,
      metamaskFeeRate: 0.001,
      metamaskFeeAmount: 0,
    },
  );

const emitEthPrice = (
  stream: { emitPrices: (prices: Record<string, PriceUpdate>) => void },
  price: string,
): void =>
  act(() => {
    stream.emitPrices({
      ETH: { symbol: 'ETH', price, timestamp: Date.now(), isTradable: true },
    });
  });

const POST_ONLY_WINDOW_ERROR = PERPS_ERROR_CODES.ORDER_POST_ONLY_WINDOW;

const limitCloseEnabledOverrides = {
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
} as unknown as DeepPartial<RootState>;

const selectMidLimitClosePrice = async (): Promise<void> => {
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
};

describe('PerpsClosePositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // A filled close stays locked until the stream updates, which these
    // fixtures never do; reset so each test starts unlocked.
    resetPerpsCloseLocksForTests();
    // The form reopens on the last Market/Limit choice for the session.
    resetLastCloseOrderType();
    // The close waits for a fee quote, so every test starts with one.
    quoteCloseFee();
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
          price: '2650',
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
            marketPrice: 2650,
            // Core estimateCloseReceive at 2650: PnL (2650 - 2500) × 1, margin
            // without its unrealized PnL plus that PnL, less the 0.145% fee
            realizedPnl: 150,
            receivedAmount: 829.49,
            totalFee: 3.8425,
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
          price: '2650',
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

  it('shows Core receive for a winning cross position, keeping P&L out of its margin', async () => {
    const position = createLongPositionForViews({
      unrealizedPnl: '150',
      leverage: { value: 3, type: 'cross' },
    });

    const { stream } = renderPerpsClosePositionView({
      crossMarginEnabled: true,
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });
    emitEthPrice(stream, '2650');

    // Cross margin is taken as reported (833.33), plus the PnL at 2650 (150),
    // less the 0.145% fee (3.8425 → 3.84). The pre-Core formula subtracted
    // the unrealized PnL here and showed $829.49.
    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsClosePositionViewSelectorsIDs.RECEIVE_VALUE),
      ).toHaveTextContent('$979.49');
    });
    expect(
      screen.getByTestId(PerpsClosePositionViewSelectorsIDs.MARGIN_VALUE),
    ).toHaveTextContent('$833.33');
    expect(
      screen.getByText(strings('perps.close_position.pnl')),
    ).toBeOnTheScreen();
  });

  it('estimates a partial close on the size the order sends, rounded to the market decimals', async () => {
    const position = createLongPositionForViews({
      size: '0.33',
      marginUsed: '275',
      unrealizedPnl: '49.5',
      positionValue: '825',
      leverage: { value: 3, type: 'cross' },
    });

    const { stream } = renderPerpsClosePositionView({
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });
    emitEthPrice(stream, '2650');

    fireEvent.press(
      await screen.findByTestId(PerpsAmountDisplaySelectorsIDs.TOUCHABLE),
    );
    fireEvent.press(screen.getByText('50%'));
    fireEvent.press(screen.getByText(strings('perps.deposit.done_button')));

    // ETH sizes have 2 decimals, so half of 0.33 sends 0.17, not 0.165:
    // margin 275 × 0.17 / 0.33 plus PnL 150 × 0.17, less the fee on 0.17
    // at 2650. On the unrounded 0.165 it would read $161.62.
    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsClosePositionViewSelectorsIDs.RECEIVE_VALUE),
      ).toHaveTextContent('$166.52');
    });
  });

  it('shows the receive amount as unavailable and holds the close until the fee is quoted', async () => {
    (Engine.context.PerpsController.calculateFees as jest.Mock).mockReturnValue(
      new Promise(() => undefined),
    );
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;
    const position = createLongPositionForViews({ unrealizedPnl: '150' });

    const { stream } = renderPerpsClosePositionView({
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });
    emitEthPrice(stream, '2650');

    expect(
      await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.RECEIVE_VALUE,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toHaveTextContent('--');

    // An unquoted fee would be tracked as 0, so the close waits for the quote.
    const confirmButton = screen.getByTestId(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
    );

    fireEvent.press(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(closePosition).not.toHaveBeenCalled();
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

  it.each(['market', 'limit'] as const)(
    'explains the post-only network-upgrade window when a %s close is rejected',
    async (orderType) => {
      const closePosition = Engine.context.PerpsController
        .closePosition as jest.Mock;
      closePosition.mockResolvedValueOnce({
        success: false,
        error: POST_ONLY_WINDOW_ERROR,
      });
      const position = createLongPositionForViews();

      const { stream } = renderPerpsClosePositionView({
        includeToasts: true,
        initialParams: { position },
        streamOverrides: {
          account: createFundedAccountForViews('10000'),
          positions: [position],
          marketData: [createEthMarketForViews()],
        },
        overrides: limitCloseEnabledOverrides,
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

      if (orderType === 'limit') {
        await selectMidLimitClosePrice();
      }

      const confirmButton = await screen.findByTestId(
        PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        {},
        { timeout: TIMEOUT_MS },
      );
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });

      // The close hook rethrows after showing its failure toast.
      await act(async () => {
        await expect(fireEvent.press(confirmButton)).rejects.toThrow(
          strings('perps.errors.postOnlyWindow'),
        );
      });

      expect(
        await screen.findByText(
          strings('perps.errors.postOnlyWindow'),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(closePosition).toHaveBeenCalledWith(
        expect.objectContaining({ orderType }),
      );
      expect(
        screen.getByText(
          strings('perps.close_position.failed_to_close_position'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(
          strings('perps.close_position.your_position_is_still_active'),
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryAllByText(/only post-only orders allowed/i),
      ).toHaveLength(0);
      expect(screen.queryAllByText(/\[missing/iu)).toHaveLength(0);
    },
  );

  it('shows the already-closed toast instead of the failure toast when the close result reports POSITION_NOT_FOUND', async () => {
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;
    closePosition.mockResolvedValueOnce({
      success: false,
      error: 'Position is no longer available',
      errorCode: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
    });
    const position = createLongPositionForViews();

    const { stream } = renderPerpsClosePositionView({
      includeToasts: true,
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });
    emitEthPrice(stream, '2500');
    const confirmButton = await screen.findByTestId(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
    );
    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(
      await screen.findByText(strings('perps.close_position.already_closed')),
    ).toBeOnTheScreen();
    expect(closePosition).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(
        strings('perps.close_position.failed_to_close_position'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('keeps Close disabled when the fee quote rejects, instead of closing without a fee', async () => {
    // A rejected quote leaves the fee unknown. Core close tracking takes a
    // numeric fee, so the close waits for a quote (a fresh input re-fetches)
    // rather than submitting with a fabricated 0. The previous test is the
    // control: the same setup with a quote enables Close.
    const calculateFees = Engine.context.PerpsController
      .calculateFees as jest.Mock;
    calculateFees.mockRejectedValue(new Error('quote failed'));
    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;
    const position = createLongPositionForViews();

    const { stream } = renderPerpsClosePositionView({
      initialParams: { position },
      streamOverrides: {
        account: createFundedAccountForViews('10000'),
        positions: [position],
        marketData: [createEthMarketForViews()],
      },
    });
    emitEthPrice(stream, '2500');

    // Wait for the quote to be requested, then let its rejection settle, so
    // the assertion sees the post-rejection state rather than the loading one.
    await waitFor(() => {
      expect(calculateFees).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Re-query: the held node from before the rejection may have detached.
    const confirmButton = screen.getByTestId(
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
    );
    expect(confirmButton).toBeDisabled();

    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(closePosition).not.toHaveBeenCalled();
  });

  it('goes back with the already-closed toast when only another venue still holds the symbol', async () => {
    // The route position was opened on Lighter while the positions stream
    // reports the symbol only on Hyperliquid, so this venue's position is
    // gone. The close screen mounts as a pushed route so the dismissal's
    // goBack is observable as a return to the start probe behind it.
    const routePosition = {
      ...createLongPositionForViews(),
      providerId: 'lighter' as const,
    };
    const otherVenuePosition = {
      ...createLongPositionForViews(),
      providerId: 'hyperliquid' as const,
    };
    let hasPushedCloseScreen = false;
    const ClosePositionJourneyStart = () => {
      const navigation = useNavigation<AppNavigationProp>();
      useEffect(() => {
        if (hasPushedCloseScreen) {
          return;
        }
        hasPushedCloseScreen = true;
        navigation.navigate(Routes.PERPS.CLOSE_POSITION, {
          position: routePosition,
        });
      }, [navigation]);
      return <Text testID={CLOSE_POSITION_JOURNEY_START_PROBE} />;
    };

    const closePosition = Engine.context.PerpsController
      .closePosition as jest.Mock;

    renderPerpsView(
      ClosePositionJourneyStart,
      CLOSE_POSITION_JOURNEY_START_ROUTE,
      {
        includeToasts: true,
        streamOverrides: {
          account: createFundedAccountForViews('10000'),
          positions: [otherVenuePosition],
          marketData: [createEthMarketForViews()],
        },
        extraRoutes: [
          {
            name: Routes.PERPS.CLOSE_POSITION,
            Component:
              PerpsClosePositionView as unknown as ComponentType<unknown>,
          },
        ],
      },
    );

    // The stream holds the symbol only on the other venue, so the close
    // screen reconciles the route position as gone right away: the
    // already-closed toast shows and the screen returns to the route it was
    // pushed from, without submitting a close.
    expect(
      await screen.findByText(strings('perps.close_position.already_closed')),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        screen.getByTestId(CLOSE_POSITION_JOURNEY_START_PROBE),
      ).toBeOnTheScreen();
    });
    expect(closePosition).not.toHaveBeenCalled();
  });
});
