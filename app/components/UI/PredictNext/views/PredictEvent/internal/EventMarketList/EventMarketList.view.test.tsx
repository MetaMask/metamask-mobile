import '../../../../../../../../tests/component-view/mocks';
import {
  configurePredictNextFeeds,
  makePredictNextCompositeGameEvent,
  makePredictNextMultiMarketEvent,
  makePredictNextPosition,
  makePredictNextTotalsEvent,
  messengerCall,
  mockPredictNextMessenger,
} from '../../../../../../../../tests/component-view/fixtures/predictNext';
import { renderEventMarketList } from '../../../../../../../../tests/component-view/renderers/predictNext';
import { createComponentViewQueryClient } from '../../../../../../../../tests/component-view/render';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import type { InfiniteData } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../../../locales/i18n';
import { MarketStandardCardTestIds } from '../../../../events/markets/MarketStandardCard.testIds';
import { MarketGroupCardTestIds } from '../../../../events/markets/MarketGroupCard.testIds';
import { portfolioQueries } from '../../../../queries/portfolioQueries';
import type { PredictEvent, PredictPositionsPage } from '../../../../types';
import { EventMarketListTestIds } from './EventMarketList.testIds';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

describe('EventMarketList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messengerCall.mockReset();
    configurePredictNextFeeds();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  });

  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
  });

  it('treats unknown transport as online and pauses the page walk when it becomes offline', async () => {
    const event = makePredictNextMultiMarketEvent();
    let resolveFirstPage: (page: PredictPositionsPage) => void = () =>
      undefined;
    const firstPage = new Promise<PredictPositionsPage>((resolve) => {
      resolveFirstPage = resolve;
    });
    mockPredictNextMessenger((action, _venueId, _params, cursor) => {
      if (action !== 'PredictPortfolioService:getPositions') {
        return Promise.resolve(undefined);
      }
      return cursor
        ? Promise.resolve({ venueId: event.venueId, positions: [] })
        : firstPage;
    });
    const queryClient = createComponentViewQueryClient();
    const key = portfolioQueries.getPositions(event.venueId, {
      limit: 20,
    }).queryKey;
    const props = {
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    netInfoMock.__setMockNetInfo({
      type: 'unknown',
      isInternetReachable: null,
    });
    const view = renderEventMarketList(props, { queryClient });

    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(1));
    act(() => {
      netInfoMock.__setMockNetInfo({
        type: 'none',
        isInternetReachable: false,
      });
      view.updateProps({ ...props });
    });
    await act(async () =>
      resolveFirstPage({
        venueId: event.venueId,
        positions: [makePredictNextPosition({ marketId: event.markets[0].id })],
        nextCursor: 'page-2',
      }),
    );
    await waitFor(() => {
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('1'),
      ).toBeOnTheScreen();
    });

    expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle');
    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
    view.unmount();
    queryClient.clear();
  });

  it.each([false, true])(
    'does not fetch initial or next pages offline and preserves cached availability (cached: %s)',
    async (hasCache) => {
      const event = makePredictNextMultiMarketEvent();
      const queryClient = createComponentViewQueryClient();
      const key = portfolioQueries.getPositions(event.venueId, {
        limit: 20,
      }).queryKey;
      if (hasCache) {
        queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(key, {
          pages: [
            {
              venueId: event.venueId,
              positions: [
                makePredictNextPosition({ marketId: event.markets[0].id }),
              ],
              nextCursor: 'page-2',
            },
          ],
          pageParams: [undefined],
        });
      }
      netInfoMock.__setMockNetInfo({
        type: 'none',
        isInternetReachable: false,
      });
      const onOrder = jest.fn();
      const view = renderEventMarketList(
        { event, onOrder, onRulesPress: jest.fn(), onCashOut: jest.fn() },
        { queryClient },
      );

      fireEvent.press(
        await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
      );
      fireEvent.press(
        view.getByTestId(
          MarketStandardCardTestIds.yesButton(event.markets[0].id),
        ),
      );

      expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle');
      expect(messengerCall).not.toHaveBeenCalled();
      expect(onOrder).toHaveBeenCalledWith(
        event.markets[0],
        event.markets[0].outcomes[0],
      );
      if (hasCache) {
        expect(
          within(
            view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
          ).getByText('1'),
        ).toBeOnTheScreen();
      } else {
        expect(
          view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).not.toBeOnTheScreen();
      }
      view.unmount();
      queryClient.clear();
    },
  );

  it('consumes shared cached pages past the discovery cap and retains their badge after refresh failure', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const queryClient = createComponentViewQueryClient();
    const key = portfolioQueries.getPositions(event.venueId, {
      limit: 20,
    }).queryKey;
    const cached: InfiniteData<PredictPositionsPage> = {
      pages: Array.from({ length: 6 }, (_, index) => ({
        venueId: event.venueId,
        positions: index === 5 ? [position] : [],
        nextCursor: `page-${index + 2}`,
      })),
      pageParams: [undefined, 'page-2', 'page-3', 'page-4', 'page-5', 'page-6'],
    };
    queryClient.setQueryData(key, cached);
    configurePredictNextFeeds({ positions: new Error('refresh unavailable') });
    const view = renderEventMarketList(
      {
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      },
      { queryClient },
    );

    await waitFor(() =>
      expect(queryClient.getQueryState(key)?.status).toBe('error'),
    );
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    expect(
      within(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB)).getByText(
        '1',
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(
      queryClient.getQueryData<InfiniteData<PredictPositionsPage>>(key)?.pages,
    ).toHaveLength(6);
    expect(messengerCall).toHaveBeenCalledTimes(1);
    view.unmount();
    queryClient.clear();
  });

  it('keeps cached holdings during a shared refresh and discovers only its refreshed cursor', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const nextPosition = makePredictNextPosition({
      marketId: event.markets[1].id,
    });
    const queryClient = createComponentViewQueryClient();
    const key = portfolioQueries.getPositions(event.venueId, {
      limit: 20,
    }).queryKey;
    queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(key, {
      pages: [
        {
          venueId: event.venueId,
          positions: [position],
          nextCursor: 'stale-page-2',
        },
      ],
      pageParams: [undefined],
    });
    let resolveRefresh: (page: PredictPositionsPage) => void = () => undefined;
    const refresh = new Promise<PredictPositionsPage>((resolve) => {
      resolveRefresh = resolve;
    });
    mockPredictNextMessenger((action, _venueId, _params, cursor) => {
      if (action !== 'PredictPortfolioService:getPositions') {
        return Promise.resolve(undefined);
      }
      if (!cursor) {
        return refresh;
      }
      if (cursor === 'refreshed-page-2') {
        return Promise.resolve({
          venueId: event.venueId,
          positions: [nextPosition],
        });
      }
      return Promise.reject(new Error('Stale cursor requested'));
    });
    const props = {
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    const view = renderEventMarketList(props, { queryClient });

    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(1));
    act(() => view.updateProps({ ...props, event: { ...event } }));
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    expect(
      within(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB)).getByText(
        '1',
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);

    await act(async () =>
      resolveRefresh({
        venueId: event.venueId,
        positions: [position],
        nextCursor: 'refreshed-page-2',
      }),
    );
    await waitFor(() => {
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('2'),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      view.getByTestId(
        MarketStandardCardTestIds.yesButton(event.markets[0].id),
      ),
    );

    expect(props.onOrder).toHaveBeenCalledWith(
      event.markets[0],
      event.markets[0].outcomes[0],
    );
    expect(messengerCall.mock.calls).toEqual([
      ['PredictPortfolioService:getPositions', event.venueId, { limit: 20 }],
      [
        'PredictPortfolioService:getPositions',
        event.venueId,
        { limit: 20 },
        'refreshed-page-2',
      ],
    ]);
    view.unmount();
    queryClient.clear();
  });

  it.each([false, true])(
    'keeps Markets usable after an exhausted empty read or initial failure (failure: %s)',
    async (fails) => {
      const event = makePredictNextMultiMarketEvent();
      configurePredictNextFeeds({
        positions: fails ? new Error('unavailable') : [],
      });
      const queryClient = createComponentViewQueryClient();
      const key = portfolioQueries.getPositions(event.venueId, {
        limit: 20,
      }).queryKey;
      const onOrder = jest.fn();
      const view = renderEventMarketList(
        { event, onOrder, onRulesPress: jest.fn(), onCashOut: jest.fn() },
        { queryClient },
      );

      await waitFor(() =>
        expect(queryClient.getQueryState(key)?.status).toBe(
          fails ? 'error' : 'success',
        ),
      );
      fireEvent.press(
        view.getByTestId(
          MarketStandardCardTestIds.yesButton(event.markets[0].id),
        ),
      );

      expect(
        view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
      expect(onOrder).toHaveBeenCalledWith(
        event.markets[0],
        event.markets[0].outcomes[0],
      );
      expect(messengerCall).toHaveBeenCalledTimes(1);
      view.unmount();
      queryClient.clear();
    },
  );

  it('requests discovery pages serially without interrupting a pending read on rerenders', async () => {
    const event = makePredictNextMultiMarketEvent();
    let resolveNextPage: (page: PredictPositionsPage) => void = () => undefined;
    const nextPage = new Promise<PredictPositionsPage>((resolve) => {
      resolveNextPage = resolve;
    });
    mockPredictNextMessenger((action, _venueId, _params, cursor) => {
      if (action !== 'PredictPortfolioService:getPositions') {
        return Promise.resolve(undefined);
      }
      if (cursor === 'page-2') {
        return nextPage;
      }
      return Promise.resolve({
        venueId: event.venueId,
        positions: [],
        nextCursor: cursor ? undefined : 'page-2',
      });
    });
    const queryClient = createComponentViewQueryClient();
    const key = portfolioQueries.getPositions(event.venueId, {
      limit: 20,
    }).queryKey;
    const props = {
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    const view = renderEventMarketList(props, { queryClient });

    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(2));
    act(() => view.updateProps({ ...props, event: { ...event } }));
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(2);

    await act(async () =>
      resolveNextPage({
        venueId: event.venueId,
        positions: [makePredictNextPosition({ marketId: event.markets[0].id })],
        nextCursor: 'page-3',
      }),
    );
    await waitFor(() => {
      expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle');
      expect(
        queryClient.getQueryData<InfiniteData<PredictPositionsPage>>(key)
          ?.pages,
      ).toHaveLength(3);
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('1'),
      ).toBeOnTheScreen();
    });

    expect(messengerCall).toHaveBeenCalledTimes(3);
    view.unmount();
    queryClient.clear();
  });

  it.each([false, true])(
    'stops after a failed next page without discarding available holdings (known holdings: %s)',
    async (hasHoldings) => {
      const event = makePredictNextMultiMarketEvent();
      configurePredictNextFeeds({
        positionPages: [
          {
            positions: [
              makePredictNextPosition({
                marketId: hasHoldings ? event.markets[0].id : 'unrelated',
              }),
            ],
            nextCursor: 'unavailable-page',
          },
        ],
      });
      const queryClient = createComponentViewQueryClient();
      const key = portfolioQueries.getPositions(event.venueId, {
        limit: 20,
      }).queryKey;
      const props = {
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      };
      const view = renderEventMarketList(props, { queryClient });

      await waitFor(() =>
        expect(queryClient.getQueryState(key)?.status).toBe('error'),
      );
      act(() => view.updateProps({ ...props, event: { ...event } }));
      fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));
      fireEvent.press(
        view.getByTestId(
          MarketStandardCardTestIds.noButton(event.markets[0].id),
        ),
      );

      expect(props.onOrder).toHaveBeenCalledWith(
        event.markets[0],
        event.markets[0].outcomes[1],
      );
      expect(
        messengerCall.mock.calls.filter(
          ([action]) => action === 'PredictPortfolioService:getPositions',
        ),
      ).toHaveLength(2);
      if (hasHoldings) {
        expect(
          within(
            view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
          ).getByText('1'),
        ).toBeOnTheScreen();
      } else {
        expect(
          view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).not.toBeOnTheScreen();
      }
      view.unmount();
      queryClient.clear();
    },
  );

  it.each([false, true])(
    'parks at five total discovery pages and keeps Markets usable (known holdings: %s)',
    async (hasHoldings) => {
      const event = makePredictNextMultiMarketEvent();
      configurePredictNextFeeds({
        positionPages: Array.from({ length: 6 }, (_, index) => ({
          cursor: index === 0 ? undefined : `page-${index + 1}`,
          positions: [
            makePredictNextPosition({
              marketId:
                hasHoldings && index === 4
                  ? event.markets[0].id
                  : `unrelated-${index}`,
            }),
          ],
          nextCursor: `page-${index + 2}`,
        })),
      });
      const queryClient = createComponentViewQueryClient();
      const key = portfolioQueries.getPositions(event.venueId, {
        limit: 20,
      }).queryKey;
      const props = {
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      };
      const view = renderEventMarketList(props, { queryClient });

      await waitFor(() => {
        expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle');
        expect(
          queryClient.getQueryData<{ pages: PredictPositionsPage[] }>(key)
            ?.pages,
        ).toHaveLength(5);
      });
      act(() => view.updateProps({ ...props, event: { ...event } }));
      fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));
      fireEvent.press(
        view.getByTestId(
          MarketStandardCardTestIds.yesButton(event.markets[0].id),
        ),
      );

      expect(
        messengerCall.mock.calls.filter(
          ([action]) => action === 'PredictPortfolioService:getPositions',
        ),
      ).toHaveLength(5);
      expect(props.onOrder).toHaveBeenCalledWith(
        event.markets[0],
        event.markets[0].outcomes[0],
      );
      if (hasHoldings) {
        expect(
          within(
            view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
          ).getByText('1'),
        ).toBeOnTheScreen();
      } else {
        expect(
          view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).not.toBeOnTheScreen();
      }
      view.unmount();
      queryClient.clear();
    },
  );

  it('discovers and counts deduplicated holdings across all canonical Event Markets', async () => {
    const event = makePredictNextCompositeGameEvent();
    const winner = makePredictNextPosition({ marketId: event.markets[0].id });
    const total = makePredictNextPosition({
      marketId: event.markets[2].id,
      context: undefined,
    });
    const spread = makePredictNextPosition({ marketId: event.markets[4].id });
    configurePredictNextFeeds({
      positionPages: [
        {
          positions: [
            winner,
            makePredictNextPosition({ marketId: 'unrelated' }),
            makePredictNextPosition({
              marketId: event.markets[0].id,
              venueId: 'other-venue',
            }),
          ],
          nextCursor: 'page-2',
        },
        { cursor: 'page-2', positions: [winner, total, spread] },
      ],
    });
    const view = renderEventMarketList({
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    });

    await waitFor(() => {
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('3'),
      ).toBeOnTheScreen();
    });

    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      event.venueId,
      { limit: 20 },
      'page-2',
    );
  });

  it('offers every Game Market, including winner Markets, in Game Lines', async () => {
    const event = makePredictNextCompositeGameEvent();
    const onOrder = jest.fn();
    const view = renderEventMarketList({
      event,
      onOrder,
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    });

    fireEvent.press(
      await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
    );
    fireEvent.press(
      view.getByTestId(
        MarketStandardCardTestIds.yesButton(event.markets[0].id),
      ),
    );

    expect(
      within(view.getByTestId(EventMarketListTestIds.MARKETS_TAB)).getAllByText(
        strings('predict_next.event.game_lines'),
      )[0],
    ).toBeOnTheScreen();
    for (const market of event.markets.slice(0, 2)) {
      expect(
        view.getByTestId(MarketStandardCardTestIds.card(market.id)),
      ).toBeOnTheScreen();
    }
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('nfl-total-points')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
    ).toBeOnTheScreen();
    expect(onOrder).toHaveBeenCalledWith(
      event.markets[0],
      event.markets[0].outcomes[0],
    );
  });

  it.each(['standard', 'sports-context', 'sports-category'])(
    'uses Outcome for a %s Event without a Game snapshot',
    async (kind) => {
      const base = makePredictNextMultiMarketEvent();
      const game = makePredictNextCompositeGameEvent();
      const event: PredictEvent = {
        ...base,
        category: kind === 'standard' ? 'Politics' : 'Sports',
        sports:
          kind === 'sports-context' && game.sports
            ? { sport: game.sports.sport, competition: game.sports.competition }
            : undefined,
      };
      const onOrder = jest.fn();
      const view = renderEventMarketList({
        event,
        onOrder,
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      });

      fireEvent.press(
        await view.findByTestId(
          MarketStandardCardTestIds.noButton(event.markets[0].id),
        ),
      );

      expect(
        within(
          view.getByTestId(EventMarketListTestIds.MARKETS_TAB),
        ).getAllByText(strings('predict_next.event.outcome'))[0],
      ).toBeOnTheScreen();
      expect(onOrder).toHaveBeenCalledWith(
        event.markets[0],
        event.markets[0].outcomes[1],
      );
    },
  );

  it('keeps alternate selection on quote updates and emits the displayed Market for actions', async () => {
    const event = makePredictNextTotalsEvent();
    const [alternate] = event.markets;
    const onOrder = jest.fn();
    const onRulesPress = jest.fn();
    const callbacks = { onOrder, onRulesPress, onCashOut: jest.fn() };
    const view = renderEventMarketList({ event, ...callbacks });

    fireEvent.press(
      await view.findByTestId(
        MarketGroupCardTestIds.option('nfl-total-points', alternate.id),
      ),
    );
    const updatedMarket: typeof alternate = {
      ...alternate,
      rules: 'The final score determines the result.',
      outcomes: [
        {
          ...alternate.outcomes[0],
          askPrice: event.markets[1].outcomes[0].askPrice,
        },
        alternate.outcomes[1],
      ],
    };
    act(() => {
      view.updateProps({
        event: { ...event, markets: [updatedMarket, event.markets[1]] },
        ...callbacks,
      });
    });
    fireEvent.press(
      view.getByTestId(MarketGroupCardTestIds.rulesButton('nfl-total-points')),
    );
    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          alternate.id,
          'yes',
        ),
      ),
    );

    expect(onRulesPress).toHaveBeenCalledWith(updatedMarket);
    expect(onOrder).toHaveBeenCalledWith(
      updatedMarket,
      updatedMarket.outcomes[0],
    );
    expect(
      view.queryByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          event.markets[1].id,
          'yes',
        ),
      ),
    ).not.toBeOnTheScreen();

    act(() => {
      view.updateProps({
        event: { ...event, markets: [event.markets[1]] },
        ...callbacks,
      });
    });

    expect(
      view.getByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          event.markets[1].id,
          'yes',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          alternate.id,
          'yes',
        ),
      ),
    ).not.toBeOnTheScreen();
  });
});
