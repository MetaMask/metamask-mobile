import '../../../../../../tests/component-view/mocks';
import { renderPredictPortfolioScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import { createComponentViewQueryClient } from '../../../../../../tests/component-view/render';
import { fireEvent, waitFor, within, act } from '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  composePredictNextOrderService,
  composePredictNextPortfolioTrading,
  configurePredictNextFeeds,
  makePredictNextPosition,
  makePredictNextSellPreview,
  makePredictNextSellReceipt,
  makePredictNextSettlement,
  makePredictNextSummary,
  makePredictNextTrade,
  messengerCall,
  mockPredictNextMessenger,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../../core/Engine';
import { KALSHI_VENUE_ID } from '../../adapters/remote/KalshiRemoteAdapter';
import { PredictOrderFlowTestIds } from '../PredictOrderFlow/internal/PredictOrderFlow.testIds';
// eslint-disable-next-line import-x/no-namespace -- spy on named `endTrace` export
import * as Trace from '../../../../../util/trace';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictEventScreenTestIds } from '../PredictEvent/PredictEventScreen.testIds';
import { PredictPortfolioScreenTestIds } from './PredictPortfolioScreen.testIds';

/**
 * Routes the renderer's UI query client to real Predict services: its
 * messenger adapter calls the Engine controller messenger, so point the
 * portfolio actions and cache events at the composition root the composed
 * services share. Every other action keeps the fixture answers.
 *
 * @param rootMessenger - The composition root the real services run on.
 * @returns A restore function for the caller's cleanup.
 */
const routePredictPortfolioServicesTo = (
  rootMessenger: ReturnType<
    typeof composePredictNextPortfolioTrading
  >['rootMessenger'],
) => {
  const controllerMessenger = Engine.controllerMessenger as unknown as {
    call: (action: string, ...params: unknown[]) => Promise<unknown>;
    subscribe: (event: string, callback: (...args: unknown[]) => void) => void;
    unsubscribe: (
      event: string,
      callback: (...args: unknown[]) => void,
    ) => void;
  };
  const originalCall = controllerMessenger.call;
  const originalSubscribe = controllerMessenger.subscribe;
  const originalUnsubscribe = controllerMessenger.unsubscribe;
  // Direct property swap, not jest.spyOn: the mocked controllerMessenger's
  // methods are already Jest mocks, and a spy here can re-enter itself when
  // the fixture delegate is the same mock.
  controllerMessenger.call = (action: string, ...params: unknown[]) => {
    if (action.startsWith('PredictPortfolioService:')) {
      // The composition root is a MockAnyNamespace messenger: it accepts any
      // action the real services registered.
      return (
        rootMessenger.call as unknown as (
          action: string,
          ...params: unknown[]
        ) => Promise<unknown>
      )(action, ...params);
    }
    return originalCall(action, ...params);
  };
  controllerMessenger.subscribe = (event, callback) => {
    if (event.startsWith('PredictPortfolioService:')) {
      (
        rootMessenger.subscribe as unknown as (
          event: string,
          callback: (...args: unknown[]) => void,
        ) => void
      )(event, callback);
    }
  };
  controllerMessenger.unsubscribe = (event, callback) => {
    if (event.startsWith('PredictPortfolioService:')) {
      (
        rootMessenger.unsubscribe as unknown as (
          event: string,
          callback: (...args: unknown[]) => void,
        ) => void
      )(event, callback);
    }
  };
  return () => {
    controllerMessenger.call = originalCall;
    controllerMessenger.subscribe = originalSubscribe;
    controllerMessenger.unsubscribe = originalUnsubscribe;
  };
};

describe('PredictPortfolioScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurePredictNextFeeds();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    onlineManager.setOnline(true);
  });

  it('renders the Portfolio Summary read, not a sum of loaded rows', async () => {
    const endTraceSpy = jest.spyOn(Trace, 'endTrace');
    // The loaded page values one Position at $45.00; the Summary covers
    // every holding, so its figures differ and are the ones shown.
    configurePredictNextFeeds({
      positions: [makePredictNextPosition()],
      summary: makePredictNextSummary({
        availableBalance: '120.50',
        positionsValue: '33.00',
        totalValue: '153.50',
        unrealizedPnl: '0.64',
        unrealizedPnlPercent: '2.32',
      }),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toHaveTextContent('$153.50');

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toHaveTextContent('$120.50');
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_VALUE),
    ).toHaveTextContent('$33.00');
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.UNREALIZED_PNL),
    ).toHaveTextContent('+$0.64 (+2.32%)');
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.SUMMARY_INCOMPLETE),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.CLAIMABLE_VALUE),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPortfolioSummary',
      KALSHI_VENUE_ID,
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictPortfolioService:getBalance',
      KALSHI_VENUE_ID,
    );
    await waitFor(() =>
      expect(endTraceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: Trace.TraceName.PredictNextPortfolioView,
          data: { success: true },
        }),
      ),
    );
  });

  it('flags an incomplete Summary instead of hiding or zeroing it', async () => {
    configurePredictNextFeeds({
      summary: makePredictNextSummary({
        availableBalance: '50.00',
        positionsValue: '24.40',
        totalValue: '74.40',
        unrealizedPnl: '1.78',
        unrealizedPnlPercent: '7.85',
        complete: false,
      }),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.SUMMARY_INCOMPLETE),
    ).toHaveTextContent(
      "Partial total: some positions couldn't be valued right now.",
    );
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toHaveTextContent('$74.40');
  });

  it('renders a Summary PnL without a percent when the backend sends none', async () => {
    configurePredictNextFeeds({
      summary: makePredictNextSummary({
        positionsValue: '0',
        totalValue: '123.13',
        unrealizedPnl: '0',
        unrealizedPnlPercent: undefined,
      }),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.UNREALIZED_PNL),
    ).toHaveTextContent('$0.00');
    expect(view.queryByText(/%/u)).not.toBeOnTheScreen();
  });

  it('masks the Summary in privacy mode', async () => {
    const view = renderPredictPortfolioScreen(
      { venueId: KALSHI_VENUE_ID },
      true,
    );

    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);

    expect(view.queryByText('$168.13')).not.toBeOnTheScreen();
    expect(view.queryByText('$123.13')).not.toBeOnTheScreen();
    expect(view.queryByText('+$3.75 (+9.09%)')).not.toBeOnTheScreen();
  });

  it('retries a failed Summary read', async () => {
    let fails = true;
    mockPredictNextMessenger((action: string) =>
      action === 'PredictPortfolioService:getPortfolioSummary'
        ? fails
          ? Promise.reject(new Error('Summary failed'))
          : Promise.resolve(
              makePredictNextSummary({
                availableBalance: '5',
                positionsValue: '0',
                totalValue: '5',
              }),
            )
        : Promise.resolve({
            venueId: 'kalshi',
            positions: [],
            activity: [],
          }),
    );
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.SUMMARY_ERROR);
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).not.toBeOnTheScreen();

    fails = false;
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.SUMMARY_RETRY),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toHaveTextContent('$5.00');
  });

  it('keeps the cached Summary visible when a later refetch fails', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);

    messengerCall.mockClear();
    mockPredictNextMessenger((action: string) =>
      action === 'PredictPortfolioService:getPortfolioSummary'
        ? Promise.reject(new Error('Summary refetch failed'))
        : Promise.resolve({
            venueId: 'kalshi',
            positions: [],
            activity: [],
          }),
    );
    now.mockReturnValue(61_001);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictPortfolioService:getPortfolioSummary',
        KALSHI_VENUE_ID,
      ),
    );
    // Let the failed refetch settle before asserting the cached Summary
    // survives it.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toHaveTextContent('$168.13');
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.SUMMARY_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('keeps loading while the first Summary read is offline', async () => {
    const endTraceSpy = jest.spyOn(Trace, 'endTrace');
    onlineManager.setOnline(false);

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await waitFor(() =>
      expect(
        view.getByTestId(PredictPortfolioScreenTestIds.SUMMARY_LOADING),
      ).toBeOnTheScreen(),
    );
    expect(endTraceSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: Trace.TraceName.PredictNextPortfolioView,
        data: { success: true },
      }),
    );
  });

  it('switches between mounted empty-state tabs', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );

    expect(
      await within(
        view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_CONTENT),
      ).findByText('No activity yet'),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_CONTENT, {
        includeHiddenElements: true,
      }),
    ).toHaveProp('pointerEvents', 'none');
  });

  it('opens the Activity tab from route params', async () => {
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'activity',
    });

    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('returns to Home from the empty-state CTA', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.BROWSE_MARKETS),
    );

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });

  it('does not fetch Activity until the History tab is opened', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.EMPTY_STATE);

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByText('No activity yet');

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
  });

  it('does not fetch Positions when Portfolio opens on History', async () => {
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'activity',
    });
    await view.findByText('No activity yet');

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
  });

  it('does not complete Portfolio TTI while the active list is still loading', async () => {
    const endTraceSpy = jest.spyOn(Trace, 'endTrace');
    mockPredictNextMessenger((action: string) => {
      if (action === 'PredictPortfolioService:getPortfolioSummary') {
        return Promise.resolve(makePredictNextSummary());
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return new Promise(() => undefined);
      }
      return Promise.resolve({ venueId: 'kalshi', activity: [] });
    });

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_LOADING),
    ).toBeOnTheScreen();
    expect(endTraceSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: Trace.TraceName.PredictNextPortfolioView,
        data: { success: true },
      }),
    );
  });

  it('renders every valued field of open and resolved Positions', async () => {
    configurePredictNextFeeds({
      positions: [
        makePredictNextPosition(),
        makePredictNextPosition({
          marketId: 'KXNBAGAME-20MAY01-LALBOS-LAL',
          status: 'settled',
          shares: '5',
          costBasis: '3.22',
          currentValue: '5.00',
          unrealizedPnl: '1.78',
          unrealizedPnlPercent: '55.28',
        }),
      ],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST);
    const [open, settled] = view.getAllByTestId(
      PredictPortfolioScreenTestIds.POSITION_ROW,
    );

    expect(within(open).getByText('Lakers vs Celtics')).toBeOnTheScreen();
    expect(within(open).getByText('Will the Lakers win?')).toBeOnTheScreen();
    expect(within(open).getByText('Lakers · 75 shares')).toBeOnTheScreen();
    expect(
      within(open).getByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_VALUE,
      ),
    ).toHaveTextContent('$45.00');
    expect(
      within(open).getByTestId(PredictPortfolioScreenTestIds.POSITION_ROW_PNL),
    ).toHaveTextContent('+$3.75 (+9.09%)');
    expect(
      within(open).getByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_CASH_OUT,
      ),
    ).toBeOnTheScreen();
    expect(
      within(settled).getByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_STATUS,
      ),
    ).toHaveTextContent('Settled');
    expect(
      within(settled).getByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_VALUE,
      ),
    ).toHaveTextContent('$5.00');
    expect(
      within(settled).queryByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_CASH_OUT,
      ),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
  });

  it('shows an unquoted Position as having no price, never $0.00', async () => {
    configurePredictNextFeeds({
      positions: [
        makePredictNextPosition({
          currentValue: undefined,
          unrealizedPnl: undefined,
          unrealizedPnlPercent: undefined,
        }),
      ],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    const row = await view.findByTestId(
      PredictPortfolioScreenTestIds.POSITION_ROW,
    );

    expect(
      within(row).getByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_VALUE_UNAVAILABLE,
      ),
    ).toHaveTextContent('No price');
    expect(
      within(row).queryByTestId(
        PredictPortfolioScreenTestIds.POSITION_ROW_VALUE,
      ),
    ).not.toBeOnTheScreen();
    expect(
      within(row).queryByTestId(PredictPortfolioScreenTestIds.POSITION_ROW_PNL),
    ).not.toBeOnTheScreen();
    expect(within(row).queryByText(/\$0\.00/u)).not.toBeOnTheScreen();
  });

  it('shows the latest copy of a Position repeated across pages', async () => {
    configurePredictNextFeeds({
      positionPages: [
        {
          positions: [makePredictNextPosition()],
          nextCursor: 'page-2',
        },
        {
          cursor: 'page-2',
          positions: [
            makePredictNextPosition({
              status: 'settled',
              currentValue: '75.00',
              unrealizedPnl: '33.75',
              unrealizedPnlPercent: '81.82',
            }),
          ],
        },
      ],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST);

    await act(async () => {
      fireEvent(
        view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST),
        'onEndReached',
      );
    });

    await waitFor(() =>
      expect(
        view.getByTestId(PredictPortfolioScreenTestIds.POSITION_ROW_STATUS),
      ).toHaveTextContent('Settled'),
    );
    expect(
      view.getAllByTestId(PredictPortfolioScreenTestIds.POSITION_ROW),
    ).toHaveLength(1);
  });

  it('renders a Position without catalog context with neutral copy, never its ticker', async () => {
    configurePredictNextFeeds({
      positions: [makePredictNextPosition({ context: undefined, side: 'no' })],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    const row = await view.findByTestId(
      PredictPortfolioScreenTestIds.POSITION_ROW,
    );

    expect(
      within(row).getByText('Market details unavailable'),
    ).toBeOnTheScreen();
    expect(within(row).getByText('No · 75 shares')).toBeOnTheScreen();
    expect(within(row).queryByText(/KXNBAGAME/u)).not.toBeOnTheScreen();
  });

  it('renders trades and Settlements in the pinned order with their amounts', async () => {
    const timestamp = '2026-09-01T12:00:00.000Z';
    configurePredictNextFeeds({
      // The backend's pinned order: newest first, then trades before
      // Settlements at an equal timestamp.
      activity: [
        makePredictNextTrade({ timestamp }),
        makePredictNextSettlement({ timestamp }),
        makePredictNextTrade({
          id: '0199e2b4-1f0d-7c55-8a10-6b7c8d9e0f1a',
          action: 'buy',
          shares: '50',
          price: '0.55',
          amount: '28.28',
          fee: '0.78',
          realizedPnl: undefined,
          timestamp: '2026-08-30T16:30:02.118Z',
        }),
      ],
    });
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'activity',
    });

    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST);
    const rows = view.getAllByTestId(
      PredictPortfolioScreenTestIds.ACTIVITY_ROW,
    );

    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Sold Lakers')).toBeOnTheScreen();
    expect(
      within(rows[0]).getByTestId(
        PredictPortfolioScreenTestIds.ACTIVITY_ROW_AMOUNT,
      ),
    ).toHaveTextContent('+$5.93');
    expect(within(rows[0]).getByText('10 @ $0.61')).toBeOnTheScreen();
    expect(within(rows[1]).getByText('Settled · Lakers')).toBeOnTheScreen();
    expect(
      within(rows[1]).getByTestId(
        PredictPortfolioScreenTestIds.ACTIVITY_ROW_AMOUNT,
      ),
    ).toHaveTextContent('+$10.00');
    expect(within(rows[2]).getByText('Bought Lakers')).toBeOnTheScreen();
    expect(
      within(rows[2]).getByTestId(
        PredictPortfolioScreenTestIds.ACTIVITY_ROW_AMOUNT,
      ),
    ).toHaveTextContent('-$28.28');
    expect(
      view.queryByTestId(
        PredictPortfolioScreenTestIds.ACTIVITY_SETTLEMENTS_HORIZON,
      ),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
  });

  it('renders a losing Settlement without context as $0.00 with neutral copy', async () => {
    configurePredictNextFeeds({
      activity: [
        makePredictNextSettlement({
          side: 'no',
          result: 'yes',
          proceeds: '0',
          realizedPnl: '-3.36',
          context: undefined,
        }),
      ],
    });
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'activity',
    });

    const row = await view.findByTestId(
      PredictPortfolioScreenTestIds.ACTIVITY_ROW,
    );

    expect(within(row).getByText('Settled · No')).toBeOnTheScreen();
    expect(
      within(row).getByText('Market details unavailable'),
    ).toBeOnTheScreen();
    expect(
      within(row).getByTestId(
        PredictPortfolioScreenTestIds.ACTIVITY_ROW_AMOUNT,
      ),
    ).toHaveTextContent('$0.00');
  });

  it('says from when Settlements are complete when a page reaches the archive', async () => {
    const horizon = '2026-08-27T00:00:00.000Z';
    configurePredictNextFeeds({
      activity: [makePredictNextTrade()],
      settlementsCompleteFrom: horizon,
    });
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'activity',
    });

    const notice = await view.findByTestId(
      PredictPortfolioScreenTestIds.ACTIVITY_SETTLEMENTS_HORIZON,
    );

    const date = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(horizon));
    expect(notice).toHaveTextContent(
      `Settlements are complete from ${date}. Earlier ones may be missing.`,
    );
  });

  it('renders deliberate empty states on both tabs', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(view.getByText('No positions yet')).toBeOnTheScreen();

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );

    expect(await view.findByText('No activity yet')).toBeOnTheScreen();
    expect(
      view.getByText('Your trades and settlements will appear here.'),
    ).toBeOnTheScreen();
  });

  it('fetches the next Positions page on end reached', async () => {
    mockPredictNextMessenger((action: string) => {
      if (action === 'PredictPortfolioService:getPortfolioSummary') {
        return Promise.resolve(makePredictNextSummary());
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({
          venueId: 'kalshi',
          positions: [makePredictNextPosition()],
          nextCursor: 'page-2',
        });
      }
      if (action === 'PredictPortfolioService:getActivity') {
        return Promise.resolve({ venueId: 'kalshi', activity: [] });
      }
      return Promise.resolve(undefined);
    });

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST);

    let resolveNextPage: (value: unknown) => void = () => undefined;
    await act(async () => {
      mockPredictNextMessenger((action: string) => {
        if (action === 'PredictPortfolioService:getPositions') {
          return new Promise((resolve) => {
            resolveNextPage = resolve;
          });
        }
        return Promise.resolve(undefined);
      });
      fireEvent(
        view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST),
        'onEndReached',
      );
    });

    expect(
      await view.findByTestId(
        PredictPortfolioScreenTestIds.POSITIONS_NEXT_PAGE_LOADING,
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveNextPage({
        venueId: 'kalshi',
        positions: [makePredictNextPosition({ marketId: 'market-2' })],
      });
    });

    await waitFor(() =>
      expect(
        view.queryByTestId(
          PredictPortfolioScreenTestIds.POSITIONS_NEXT_PAGE_LOADING,
        ),
      ).not.toBeOnTheScreen(),
    );
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST),
    ).toBeOnTheScreen();
  });

  it('fetches the next Activity page on end reached', async () => {
    mockPredictNextMessenger((action: string) => {
      if (action === 'PredictPortfolioService:getPortfolioSummary') {
        return Promise.resolve(makePredictNextSummary());
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({ venueId: 'kalshi', positions: [] });
      }
      if (action === 'PredictPortfolioService:getActivity') {
        return Promise.resolve({
          venueId: 'kalshi',
          activity: [makePredictNextTrade()],
          nextCursor: 'page-2',
        });
      }
      return Promise.resolve(undefined);
    });

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST);

    let resolveNextPage: (value: unknown) => void = () => undefined;
    await act(async () => {
      mockPredictNextMessenger((action: string) => {
        if (action === 'PredictPortfolioService:getActivity') {
          return new Promise((resolve) => {
            resolveNextPage = resolve;
          });
        }
        return Promise.resolve(undefined);
      });
      fireEvent(
        view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST),
        'onEndReached',
      );
    });

    expect(
      await view.findByTestId(
        PredictPortfolioScreenTestIds.ACTIVITY_NEXT_PAGE_LOADING,
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveNextPage({
        venueId: 'kalshi',
        activity: [makePredictNextSettlement()],
      });
    });

    await waitFor(() =>
      expect(
        view.queryByTestId(
          PredictPortfolioScreenTestIds.ACTIVITY_NEXT_PAGE_LOADING,
        ),
      ).not.toBeOnTheScreen(),
    );
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST),
    ).toBeOnTheScreen();
  });

  it('retries a failed Activity read independently of the Summary', async () => {
    configurePredictNextFeeds({
      activity: new Error('Activity failed'),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await view.findByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE);
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_ERROR);
    // The Summary stays independently loaded.
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toBeOnTheScreen();

    configurePredictNextFeeds({
      activity: [makePredictNextTrade()],
    });
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_RETRY),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST),
    ).toBeOnTheScreen();
  });

  it('navigates an Activity entry to its Event when catalog identity is available', async () => {
    configurePredictNextFeeds({
      activity: [
        makePredictNextSettlement({
          context: {
            eventId: 'nfl-1',
            eventTitle: 'Lakers vs Celtics',
            marketQuestion: 'Will the Lakers win?',
            outcomeLabel: 'Lakers',
          },
        }),
      ],
    });
    const view = renderPredictPortfolioScreen({
      venueId: KALSHI_VENUE_ID,
      initialTab: 'activity',
    });

    fireEvent.press(
      await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_ROW),
    );

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getEvent',
        'kalshi',
        'nfl-1',
      ),
    );
    expect(
      await view.findByTestId(PredictEventScreenTestIds.GAME_HEADER),
    ).toBeOnTheScreen();
  });

  it('renders first-load skeletons for Positions and Activity', async () => {
    // Never-resolving reads keep both panels in their loading state.
    mockPredictNextMessenger(() => new Promise(() => undefined));

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.SUMMARY_LOADING),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_LOADING),
    ).toBeOnTheScreen();
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LOADING),
    ).toBeOnTheScreen();
  });

  it('retries a failed Positions read independently of the Summary', async () => {
    configurePredictNextFeeds({
      positions: new Error('Positions failed'),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_ERROR);
    // The Summary stays independently loaded.
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
    ).toBeOnTheScreen();

    mockPredictNextMessenger((action: string) => {
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({
          venueId: 'kalshi',
          positions: [makePredictNextPosition()],
        });
      }
      if (action === 'PredictPortfolioService:getActivity') {
        return Promise.resolve({ venueId: 'kalshi', activity: [] });
      }
      if (action === 'PredictPortfolioService:getPortfolioSummary') {
        return Promise.resolve(makePredictNextSummary());
      }
      return Promise.resolve(undefined);
    });

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_RETRY),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST),
    ).toBeOnTheScreen();
    expect(view.getByText('Lakers vs Celtics')).toBeOnTheScreen();
  });

  it('keeps Activity failing on its own when Positions load', async () => {
    configurePredictNextFeeds({
      positions: [makePredictNextPosition()],
      activity: new Error('Activity failed'),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST),
    ).toBeOnTheScreen();

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_ERROR),
    ).toBeOnTheScreen();
    // The hidden Positions panel keeps its loaded rows.
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.POSITIONS_ERROR, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });

  it('navigates a Position to its Event when catalog identity is available', async () => {
    configurePredictNextFeeds({
      positions: [
        makePredictNextPosition({
          context: {
            eventId: 'nfl-1',
            eventTitle: 'Lakers vs Celtics',
            marketQuestion: 'Will the Lakers win?',
            outcomeLabel: 'Lakers',
          },
        }),
      ],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    fireEvent.press(
      await view.findByTestId(PredictPortfolioScreenTestIds.POSITION_ROW),
    );

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getEvent',
        'kalshi',
        'nfl-1',
      ),
    );
    expect(
      await view.findByTestId(PredictEventScreenTestIds.GAME_HEADER),
    ).toBeOnTheScreen();
  });

  it('does not navigate a degraded Position without catalog identity', async () => {
    configurePredictNextFeeds({
      positions: [makePredictNextPosition({ context: undefined })],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    fireEvent.press(
      await view.findByTestId(PredictPortfolioScreenTestIds.POSITION_ROW),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getEvent',
      'kalshi',
      'KXNBAGAME-26MAY12-LALBOS',
    );
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.POSITIONS_CONTENT),
    ).toBeOnTheScreen();
  });

  it('masks Position and Activity amounts in privacy mode', async () => {
    configurePredictNextFeeds({
      positions: [makePredictNextPosition()],
      activity: [makePredictNextSettlement()],
    });
    const view = renderPredictPortfolioScreen(
      { venueId: KALSHI_VENUE_ID },
      true,
    );

    await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST);

    expect(view.queryByText('$45.00')).not.toBeOnTheScreen();
    expect(view.queryByText('+$3.75 (+9.09%)')).not.toBeOnTheScreen();
    expect(view.queryByText('Lakers · 75 shares')).not.toBeOnTheScreen();
    expect(view.getByText('Lakers vs Celtics')).toBeOnTheScreen();

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST);

    expect(view.queryByText('+$10.00')).not.toBeOnTheScreen();
    expect(view.getByText('Settled · Lakers')).toBeOnTheScreen();
  });

  describe('Cash Out', () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
    /** Composed real services to destroy after each test. */
    const composedServices: ReturnType<
      typeof composePredictNextPortfolioTrading
    >[] = [];
    /** Engine boundary restorations registered by a test. */
    const testRestores: (() => void)[] = [];

    /** Stubs the sell (Cash Out) preview and commit routes. The preview
     * echoes the requested contract count; the commit replies with the
     * given receipt overrides. */
    const stubCashOutFetch = (receiptOverrides: Record<string, unknown>) => {
      fetchMock.mockImplementation(async (url, init) => {
        const isCommit = String(url).endsWith('/orders/commit');
        if (isCommit) {
          return {
            ok: true,
            status: 200,
            json: async () => makePredictNextSellReceipt(receiptOverrides),
          } as Response;
        }
        // Echo the requested Market and contract count: the adapter binds
        // the quote to the exact intent.
        const body = JSON.parse(String(init?.body)) as {
          marketId: string;
          contracts: string;
        };
        return {
          ok: true,
          status: 200,
          json: async () =>
            makePredictNextSellPreview({
              marketId: body.marketId,
              requestedContracts: Number(body.contracts),
            }),
        } as Response;
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    };

    /** Renders a Portfolio with one open 75-share Position and drives the
     * shared Order flow to a terminal receipt via the Max chip. */
    const cashOutMax = async (receiptOverrides: Record<string, unknown>) => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000);
      configurePredictNextFeeds({ positions: [makePredictNextPosition()] });
      stubCashOutFetch(receiptOverrides);
      (Engine.context as Record<string, unknown>).PredictOrderService =
        composePredictNextOrderService();

      const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
      fireEvent.press(
        await view.findByTestId(
          PredictPortfolioScreenTestIds.POSITION_ROW_CASH_OUT,
        ),
      );
      await view.findByTestId(PredictOrderFlowTestIds.SHEET);

      fireEvent.press(
        view.getByTestId(PredictOrderFlowTestIds.QUICK_CONTRACT('max')),
      );
      await waitFor(() =>
        expect(view.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
      );
      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.REVIEW));
      await waitFor(() =>
        expect(
          view.getByTestId(PredictOrderFlowTestIds.APPROVAL),
        ).toBeOnTheScreen(),
      );
      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.APPROVE));
      // Both filled and partially_filled receipts render the Done control.
      await view.findByTestId(PredictOrderFlowTestIds.DONE);
      return view;
    };

    /** Refocuses after the Position read went stale, forcing the refetch a
     * real terminal receipt triggers through the portfolio invalidation. */
    const refreshPositions = async () => {
      (Date.now as jest.Mock).mockReturnValue(61_001);
      await act(async () => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    afterEach(() => {
      testRestores.splice(0).forEach((restore) => restore());
      composedServices.splice(0).forEach((composed) => composed.destroy());
      delete (Engine.context as Record<string, unknown>).PredictOrderService;
    });

    it('opens the shared Order flow in sell mode with the Position as the bound', async () => {
      configurePredictNextFeeds({ positions: [makePredictNextPosition()] });
      (Engine.context as Record<string, unknown>).PredictOrderService =
        composePredictNextOrderService();
      globalThis.fetch = jest.fn() as unknown as typeof fetch;

      const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
      fireEvent.press(
        await view.findByTestId(
          PredictPortfolioScreenTestIds.POSITION_ROW_CASH_OUT,
        ),
      );

      expect(
        await view.findByTestId(PredictOrderFlowTestIds.SHEET),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictOrderFlowTestIds.HELD_CONTRACTS),
      ).toHaveTextContent('You hold 75 contracts');
      expect(
        view.getByTestId(PredictOrderFlowTestIds.OUTCOME_LABEL),
      ).toHaveTextContent('Lakers');
      expect(
        view.queryByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT),
      ).toBeOnTheScreen();
    });

    it('leaves the reduced Position visible after a partial Cash Out', async () => {
      const view = await cashOutMax({
        status: 'partially_filled',
        filledContracts: '42.00',
        averageFillPrice: '0.4700',
        fee: '0.20',
        actualProceeds: '19.74',
        netProceeds: '19.54',
      });

      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.DONE));

      configurePredictNextFeeds({
        positions: [makePredictNextPosition({ shares: '33.00' })],
      });
      await refreshPositions();

      expect(view.getByText('Lakers · 33 shares')).toBeOnTheScreen();
      expect(view.queryByText('Lakers · 75 shares')).not.toBeOnTheScreen();
    });

    it('removes the Position after a full Cash Out', async () => {
      const view = await cashOutMax({});

      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.DONE));

      configurePredictNextFeeds({ positions: [] });
      await refreshPositions();

      expect(
        view.getByTestId(PredictPortfolioScreenTestIds.EMPTY_STATE),
      ).toBeOnTheScreen();
      expect(view.queryByText('Lakers · 75 shares')).not.toBeOnTheScreen();
    });

    it('updates the mounted Position and Summary reads after a Cash Out', async () => {
      // Real services over the stubbed transport: the reads the screen
      // observes run through the real Portfolio service cache and its
      // cacheUpdated events, the way the Engine composes them.
      let positionsBody: unknown = {
        venueId: 'kalshi',
        positions: [makePredictNextPosition()],
      };
      let balanceBody: unknown = {
        venueId: 'kalshi',
        currency: 'USD',
        available: '123.12',
      };
      let summaryBody: unknown = makePredictNextSummary({
        availableBalance: '123.12',
        totalValue: '168.12',
      });
      fetchMock.mockImplementation(async (url, init) => {
        if (String(url).endsWith('/orders/commit')) {
          return {
            ok: true,
            status: 200,
            json: async () => makePredictNextSellReceipt(),
          } as Response;
        }
        if (String(url).endsWith('/orders/preview')) {
          const body = JSON.parse(String(init?.body)) as {
            marketId: string;
            contracts: string;
          };
          return {
            ok: true,
            status: 200,
            json: async () =>
              makePredictNextSellPreview({
                marketId: body.marketId,
                requestedContracts: Number(body.contracts),
              }),
          } as Response;
        }
        if (String(url).includes('/venues/kalshi/positions')) {
          return {
            ok: true,
            status: 200,
            json: async () => positionsBody,
          } as Response;
        }
        if (String(url).includes('/venues/kalshi/balance')) {
          return {
            ok: true,
            status: 200,
            json: async () => balanceBody,
          } as Response;
        }
        if (String(url).includes('/venues/kalshi/portfolio/summary')) {
          return {
            ok: true,
            status: 200,
            json: async () => summaryBody,
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const trading = composePredictNextPortfolioTrading();
      composedServices.push(trading);
      (Engine.context as Record<string, unknown>).PredictOrderService =
        trading.orderService;

      // The shared renderer's UI query client delegates its messenger
      // adapter to the Engine controller messenger: route the Predict
      // service actions and cache events to the real services' root. The
      // remaining actions keep the fixture answers.
      testRestores.push(routePredictPortfolioServicesTo(trading.rootMessenger));

      const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

      await waitFor(() =>
        expect(
          view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
        ).toHaveTextContent('$123.12'),
      );
      await waitFor(() =>
        expect(view.getByText('Lakers · 75 shares')).toBeOnTheScreen(),
      );

      fireEvent.press(
        view.getByTestId(PredictPortfolioScreenTestIds.POSITION_ROW_CASH_OUT),
      );
      await view.findByTestId(PredictOrderFlowTestIds.SHEET);
      fireEvent.press(
        view.getByTestId(PredictOrderFlowTestIds.QUICK_CONTRACT('max')),
      );
      await waitFor(() =>
        expect(view.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
      );
      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.REVIEW));
      await waitFor(() =>
        expect(
          view.getByTestId(PredictOrderFlowTestIds.APPROVAL),
        ).toBeOnTheScreen(),
      );
      // Real elapsed time between the pre-trade reads and the receipt, so
      // the refreshed snapshot's dataUpdatedAt is strictly newer — the
      // property the UI cache's hydration applies.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // The venue reports the post-trade reads while the sheet is up: the
      // terminal receipt's invalidation must refresh them through the
      // service without any focus or staleTime workaround.
      positionsBody = {
        venueId: 'kalshi',
        positions: [
          makePredictNextPosition({
            shares: '33.00',
            costBasis: '18.15',
            currentValue: '19.80',
            unrealizedPnl: '1.65',
          }),
        ],
      };
      balanceBody = {
        venueId: 'kalshi',
        currency: 'USD',
        available: '153.75',
      };
      summaryBody = makePredictNextSummary({
        availableBalance: '153.75',
        positionsValue: '19.80',
        totalValue: '173.55',
        unrealizedPnl: '1.65',
      });

      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.APPROVE));
      await view.findByTestId(PredictOrderFlowTestIds.DONE);
      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.DONE));

      await waitFor(() =>
        expect(view.getByText('Lakers · 33 shares')).toBeOnTheScreen(),
      );
      await waitFor(() =>
        expect(
          view.getByTestId(PredictPortfolioScreenTestIds.TOTAL_VALUE),
        ).toHaveTextContent('$173.55'),
      );
      expect(
        view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
      ).toHaveTextContent('$153.75');
    });
  });

  describe('platform reset', () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
    const composedServices: ReturnType<
      typeof composePredictNextPortfolioTrading
    >[] = [];
    const testRestores: (() => void)[] = [];

    afterEach(() => {
      testRestores.splice(0).forEach((restore) => restore());
      composedServices.splice(0).forEach((composed) => composed.destroy());
      delete (Engine.context as Record<string, unknown>).PredictOrderService;
    });

    it('shows no previous Summary on a screen that remounts after a reset', async () => {
      // Real services over the stubbed transport, as the Engine composes
      // them: both caches under test are real.
      let balance = '123.12';
      fetchMock.mockImplementation(async (url) => {
        const payload = String(url).includes('/portfolio/summary')
          ? makePredictNextSummary({
              availableBalance: balance,
              positionsValue: '0',
              totalValue: balance,
            })
          : String(url).includes('/positions')
            ? { venueId: 'kalshi', positions: [] }
            : { venueId: 'kalshi', activity: [] };
        return {
          ok: true,
          status: 200,
          json: async () => payload,
        } as Response;
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const trading = composePredictNextPortfolioTrading();
      composedServices.push(trading);
      (Engine.context as Record<string, unknown>).PredictOrderService =
        trading.orderService;
      testRestores.push(routePredictPortfolioServicesTo(trading.rootMessenger));

      // One shared UI query client for both mounts: it stands in for the
      // app-wide cache, which survives the reset in production.
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictPortfolioScreen(
        { venueId: KALSHI_VENUE_ID },
        false,
        queryClient,
      );
      await waitFor(() =>
        expect(
          view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
        ).toHaveTextContent('$123.12'),
      );

      // The reset: the portfolio purge, then the shared client clear.
      balance = '500.00';
      await act(async () => {
        await trading.portfolioService.clearAccountData();
        queryClient.clear();
      });

      // The reset lands on onboarding, so the screen remounts afterwards.
      // Neither cache may answer for the new person first.
      view.unmount();
      const remounted = renderPredictPortfolioScreen(
        { venueId: KALSHI_VENUE_ID },
        false,
        queryClient,
      );
      expect(remounted.queryByText('$123.12')).not.toBeOnTheScreen();
      await waitFor(() =>
        expect(
          remounted.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
        ).toHaveTextContent('$500.00'),
      );
    });
  });
});
