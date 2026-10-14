import '../../../../../../tests/component-view/mocks';
import { renderPredictPortfolioScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import { fireEvent, waitFor, within, act } from '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import {
  composePredictNextOrderService,
  configurePredictNextFeeds,
  makePredictNextFill,
  makePredictNextPosition,
  makePredictNextSellPreview,
  makePredictNextSellReceipt,
  makePredictNextSettlement,
  messengerCall,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../../core/Engine';
import { KALSHI_VENUE_ID } from '../../types';
import { PredictOrderFlowTestIds } from '../PredictOrderFlow/internal/PredictOrderFlow.testIds';
// eslint-disable-next-line import-x/no-namespace -- spy on named `endTrace` export
import * as Trace from '../../../../../util/trace';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictEventScreenTestIds } from '../PredictEvent/PredictEventScreen.testIds';
import { PredictPortfolioScreenTestIds } from './PredictPortfolioScreen.testIds';

describe('PredictPortfolioScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurePredictNextFeeds();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    onlineManager.setOnline(true);
  });

  it('loads and rounds the available Balance', async () => {
    const endTraceSpy = jest.spyOn(Trace, 'endTrace');
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toHaveTextContent('$123.13');
    await view.findByTestId(PredictPortfolioScreenTestIds.EMPTY_STATE);

    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getBalance',
      KALSHI_VENUE_ID,
    );
    expect(endTraceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: Trace.TraceName.PredictNextPortfolioView,
        data: { success: true },
      }),
    );
  });

  it('masks the available Balance in privacy mode', async () => {
    const view = renderPredictPortfolioScreen(
      { venueId: KALSHI_VENUE_ID },
      true,
    );

    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    expect(view.queryByText('$123.13')).not.toBeOnTheScreen();
  });

  it('retries a failed Balance read', async () => {
    let fails = true;
    messengerCall.mockImplementation((action: string) =>
      action === 'PredictPortfolioService:getBalance'
        ? fails
          ? Promise.reject(new Error('Balance failed'))
          : Promise.resolve({
              venueId: 'kalshi',
              currency: 'USD',
              available: '5',
            })
        : Promise.resolve({
            venueId: 'kalshi',
            positions: [],
            activity: [],
          }),
    );
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_ERROR);

    fails = false;
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_RETRY),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toHaveTextContent('$5.00');
  });

  it('keeps the cached Balance visible when a later refetch fails', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    messengerCall.mockClear();
    messengerCall.mockImplementation((action: string) =>
      action === 'PredictPortfolioService:getBalance'
        ? Promise.reject(new Error('Balance refetch failed'))
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
        'PredictPortfolioService:getBalance',
        KALSHI_VENUE_ID,
      ),
    );
    // Let the failed refetch settle before asserting the cached amount
    // survives it.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictPortfolioScreenTestIds.BALANCE_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('keeps loading while the first Balance read is offline', async () => {
    const endTraceSpy = jest.spyOn(Trace, 'endTrace');
    onlineManager.setOnline(false);

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await waitFor(() =>
      expect(
        view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_LOADING),
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
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

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

    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('returns to Home from the empty-state CTA', async () => {
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

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
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictPortfolioService:getBalance') {
        return Promise.resolve({
          venueId: 'kalshi',
          currency: 'USD',
          available: '123.125',
        });
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return new Promise(() => undefined);
      }
      return Promise.resolve({ venueId: 'kalshi', activity: [] });
    });

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
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

  it('renders open Positions on the Positions tab', async () => {
    configurePredictNextFeeds({ positions: [makePredictNextPosition()] });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_LIST),
    ).toBeOnTheScreen();
    expect(view.getByText('Lakers vs Celtics')).toBeOnTheScreen();
    expect(view.getByText('Will the Lakers win?')).toBeOnTheScreen();
    expect(view.getByText('Lakers · 75 shares')).toBeOnTheScreen();
    expect(view.getByText('$41.25')).toBeOnTheScreen();
    expect(view.getByText('-$2.50')).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      KALSHI_VENUE_ID,
      { limit: 20 },
    );
  });

  it('renders Fills and Settlements on the Activity tab', async () => {
    configurePredictNextFeeds({
      activity: [makePredictNextFill(), makePredictNextSettlement()],
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST),
    ).toBeOnTheScreen();
    // Fills carry exposure semantics only: the outcome label, no buy/sell
    // claim (Kalshi's canonical fields cannot distinguish buying Yes from
    // selling No).
    expect(view.getByText('Lakers')).toBeOnTheScreen();
    expect(view.getByText('75 @ $0.55')).toBeOnTheScreen();
    expect(view.getByText('Settled')).toBeOnTheScreen();
    expect(view.getByText('+$10.00')).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getActivity',
      KALSHI_VENUE_ID,
      { limit: 20 },
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
      view.getByText('Your fills and settlements will appear here.'),
    ).toBeOnTheScreen();
  });

  it('fetches the next Positions page on end reached', async () => {
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictPortfolioService:getBalance') {
        return Promise.resolve({
          venueId: 'kalshi',
          currency: 'USD',
          available: '123.125',
        });
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
      messengerCall.mockImplementation((action: string) => {
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
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictPortfolioService:getBalance') {
        return Promise.resolve({
          venueId: 'kalshi',
          currency: 'USD',
          available: '123.125',
        });
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({ venueId: 'kalshi', positions: [] });
      }
      if (action === 'PredictPortfolioService:getActivity') {
        return Promise.resolve({
          venueId: 'kalshi',
          activity: [makePredictNextFill()],
          nextCursor: 'page-2',
        });
      }
      return Promise.resolve(undefined);
    });

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });
    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST);

    let resolveNextPage: (value: unknown) => void = () => undefined;
    await act(async () => {
      messengerCall.mockImplementation((action: string) => {
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

  it('retries a failed Activity read independently of Balance', async () => {
    configurePredictNextFeeds({
      activity: new Error('Activity failed'),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE);
    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_ERROR);
    // Balance stays independently loaded.
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toBeOnTheScreen();

    configurePredictNextFeeds({
      activity: [makePredictNextFill()],
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
            outcomeId: 'nfl-1-yes',
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
    messengerCall.mockImplementation(() => new Promise(() => undefined));

    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.BALANCE_LOADING),
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

  it('retries a failed Positions read independently of Balance', async () => {
    configurePredictNextFeeds({
      positions: new Error('Positions failed'),
    });
    const view = renderPredictPortfolioScreen({ venueId: KALSHI_VENUE_ID });

    await view.findByTestId(PredictPortfolioScreenTestIds.POSITIONS_ERROR);
    // Balance stays independently loaded.
    expect(
      view.getByTestId(PredictPortfolioScreenTestIds.BALANCE_VALUE),
    ).toBeOnTheScreen();

    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({
          venueId: 'kalshi',
          positions: [makePredictNextPosition()],
        });
      }
      if (action === 'PredictPortfolioService:getActivity') {
        return Promise.resolve({ venueId: 'kalshi', activity: [] });
      }
      if (action === 'PredictPortfolioService:getBalance') {
        return Promise.resolve({
          venueId: 'kalshi',
          currency: 'USD',
          available: '123.125',
        });
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
            outcomeId: 'nfl-1-yes',
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

    expect(view.queryByText('$41.25')).not.toBeOnTheScreen();
    expect(view.queryByText('-$2.50')).not.toBeOnTheScreen();
    expect(view.queryByText('Lakers · 75 shares')).not.toBeOnTheScreen();
    expect(view.getByText('Lakers vs Celtics')).toBeOnTheScreen();

    fireEvent.press(
      view.getByTestId(PredictPortfolioScreenTestIds.ACTIVITY_TAB),
    );
    await view.findByTestId(PredictPortfolioScreenTestIds.ACTIVITY_LIST);

    expect(view.queryByText('+$10.00')).not.toBeOnTheScreen();
    expect(view.getByText('Settled')).toBeOnTheScreen();
  });

  describe('Cash Out', () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

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
  });
});
