import '../../../../../../../tests/component-view/mocks';
import {
  configurePredictNextFeeds,
  makePredictNextCompositeGameEvent,
  makePredictNextLaidOutGameEvent,
  makePredictNextPlayerPropsEvent,
  makePredictNextMultiMarketEvent,
  makePredictNextPosition,
  makePredictNextTotalsEvent,
  messengerCall,
  mockPredictNextMessenger,
} from '../../../../../../../tests/component-view/fixtures/predictNext';
import { renderEventMarketList } from '../../../../../../../tests/component-view/renderers/predictNext';
import { createComponentViewQueryClient } from '../../../../../../../tests/component-view/render';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import type { InfiniteData } from '@tanstack/react-query';
import { FlatList } from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import Engine from '../../../../../../core/Engine';
import { updateBgState } from '../../../../../../core/redux/slices/engine';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../../locales/i18n';
import { MarketStandardCardTestIds } from '../../../events/markets/MarketStandardCard.testIds';
import { MarketListTestIds } from '../../../events/markets/MarketList.testIds';
import { MarketGroupCardTestIds } from '../../../events/markets/MarketGroupCard.testIds';
import { MoneylineMarketGroupCardTestIds } from '../../../events/markets/MoneylineMarketGroupCard.testIds';
import { portfolioQueries } from '../../../queries/portfolioQueries';
import type {
  PredictDecimal,
  PredictEvent,
  PredictMarket,
  PredictPosition,
  PredictPositionsPage,
} from '../../../types';
import { EventMarketListTestIds } from './EventMarketList.testIds';
import { EventMarketLayoutSectionTestIds } from './EventMarketLayoutSection.testIds';
import { EventMarketPeriodChipsTestIds } from './EventMarketPeriodChips.testIds';
import { EventMarketSectionTestIds } from './EventMarketSection.testIds';
import { formatSharesAmount } from '../../../utils/formatShares';
import { lightTheme } from '@metamask/design-tokens';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const createPositionsCache = (
  event: PredictEvent,
  positions: readonly PredictPosition[],
) => {
  const queryClient = createComponentViewQueryClient();
  const key = portfolioQueries.getPositions(event.venueId, {
    limit: 20,
  }).queryKey;
  queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(key, {
    pages: [{ venueId: event.venueId, positions: [...positions] }],
    pageParams: [undefined],
  });
  return { queryClient, key };
};

/** "Yes · Lakers": a Position card's title. */
const positionTitle = (position: PredictPosition, name?: string) =>
  strings('predict_next.event.position.title', {
    side: strings(`predict_next.portfolio.outcome_side.${position.side}`),
    name,
  });

describe('EventMarketList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messengerCall.mockReset();
    configurePredictNextFeeds();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    jest.mocked(getTotalMemorySync).mockReturnValue(6 * 1024 ** 3);
  });

  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
    jest.mocked(getTotalMemorySync).mockReturnValue(6 * 1024 ** 3);
  });

  it('applies device rendering policy to both panels without changing their membership', async () => {
    jest.mocked(getTotalMemorySync).mockReturnValue(2 * 1024 ** 3);
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const { queryClient, key } = createPositionsCache(event, [position]);
    configurePredictNextFeeds({ positions: [position] });
    const props = {
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    const view = renderEventMarketList(props, { queryClient });

    await view.findByTestId(
      EventMarketListTestIds.positionRow(position.marketId, position.side),
    );
    await waitFor(() =>
      expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle'),
    );

    expect(view.UNSAFE_getByType(FlatList).props).toEqual(
      expect.objectContaining({
        initialNumToRender: 6,
        maxToRenderPerBatch: 6,
        windowSize: 5,
      }),
    );

    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    for (const market of event.markets) {
      expect(
        view.getByTestId(MarketStandardCardTestIds.card(market.id)),
      ).toBeOnTheScreen();
    }
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();
    expect(view.UNSAFE_getByType(FlatList).props.initialNumToRender).toBe(6);

    act(() => {
      netInfoMock.__setMockNetInfo({
        type: 'unknown',
        isInternetReachable: null,
      });
      view.updateProps({ ...props });
    });

    expect(view.UNSAFE_getByType(FlatList).props).toEqual(
      expect.objectContaining({
        initialNumToRender: 10,
        maxToRenderPerBatch: 10,
        windowSize: 21,
      }),
    );

    act(() => {
      netInfoMock.__setMockNetInfo({
        type: 'none',
        isInternetReachable: false,
      });
      view.updateProps({ ...props });
    });
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));

    expect(
      view.getByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
    view.unmount();
    queryClient.clear();
  });

  it('selects cached Positions first and mounts only the panel selected by the user', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const { queryClient } = createPositionsCache(event, [position]);
    configurePredictNextFeeds({ positions: [position] });
    const callbacks = {
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    const view = renderEventMarketList(
      { event, ...callbacks },
      { queryClient },
    );

    expect(
      await view.findByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();
    const positionsTab = within(
      view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
    );
    expect(positionsTab.getByText('1')).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
    fireEvent.press(
      view.getByTestId(
        EventMarketListTestIds.positionCashOut(
          position.marketId,
          position.side,
        ),
      ),
    );

    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();
    expect(callbacks.onCashOut).toHaveBeenCalledTimes(1);
    expect(callbacks.onCashOut.mock.calls[0][0]).toBe(position);
    expect(callbacks.onOrder).not.toHaveBeenCalled();
    expect(callbacks.onRulesPress).not.toHaveBeenCalled();
    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(1));
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      event.venueId,
      { limit: 20 },
    );
    view.unmount();
    queryClient.clear();
  });

  it('keeps Markets selected when deferred holdings insert Positions before it', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    let resolvePositions: (page: PredictPositionsPage) => void = () =>
      undefined;
    const pending = new Promise<PredictPositionsPage>((resolve) => {
      resolvePositions = resolve;
    });
    mockPredictNextMessenger(() => pending);
    const view = renderEventMarketList({
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    });

    fireEvent.press(
      await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
    );
    expect(
      view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
    ).not.toBeOnTheScreen();
    await act(async () =>
      resolvePositions({ venueId: event.venueId, positions: [position] }),
    );
    await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);

    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));

    expect(
      view.getByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
  });

  it('falls back immediately when selected holdings are removed and does not reselect them on return', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const { queryClient, key } = createPositionsCache(event, [position]);
    configurePredictNextFeeds({ positions: [position] });
    const view = renderEventMarketList(
      {
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      },
      { queryClient },
    );
    await view.findByTestId(
      EventMarketListTestIds.positionRow(position.marketId, position.side),
    );
    await waitFor(() =>
      expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle'),
    );

    act(() => {
      queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(key, {
        pages: [{ venueId: event.venueId, positions: [] }],
        pageParams: [undefined],
      });
    });
    await waitFor(() => {
      expect(
        view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
      expect(
        view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
      ).toBeOnTheScreen();
    });
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();

    act(() => {
      queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(key, {
        pages: [{ venueId: event.venueId, positions: [position] }],
        pageParams: [undefined],
      });
    });
    await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);

    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
    view.unmount();
    queryClient.clear();
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
        ).getByText('1', { includeHiddenElements: true }),
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
          ).getByText('1', { includeHiddenElements: true }),
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
        { includeHiddenElements: true },
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
        { includeHiddenElements: true },
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
        ).getByText('2', { includeHiddenElements: true }),
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
        ).getByText('1', { includeHiddenElements: true }),
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
          ).getByText('1', { includeHiddenElements: true }),
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
          ).getByText('1', { includeHiddenElements: true }),
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
    const winner = makePredictNextPosition({
      marketId: event.markets[0].id,
      context: {
        ...makePredictNextPosition().context,
        outcomeLabel: 'New England',
        marketQuestion: 'New England to win the game?',
      },
      shares: '75',
    });
    const total = makePredictNextPosition({
      marketId: event.markets[2].id,
      context: undefined,
    });
    const spread = makePredictNextPosition({
      marketId: event.markets[4].id,
      context: {
        ...makePredictNextPosition().context,
        outcomeLabel: 'Seattle',
        marketQuestion: 'Seattle spread +1.5',
      },
      shares: '12.5',
      side: 'no',
    });
    const excluded = [
      makePredictNextPosition({ marketId: 'unrelated' }),
      makePredictNextPosition({
        marketId: event.markets[0].id,
        venueId: 'other-venue',
        side: 'no',
      }),
    ];
    configurePredictNextFeeds({
      positionPages: [
        {
          positions: [winner, ...excluded],
          nextCursor: 'page-2',
        },
        { cursor: 'page-2', positions: [winner, total, spread] },
      ],
    });
    const onCashOut = jest.fn();
    const view = renderEventMarketList({
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut,
    });

    await waitFor(() => {
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('3', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    expect(
      view.getByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));

    for (const position of [winner, total, spread]) {
      const row = within(
        view.getByTestId(
          EventMarketListTestIds.positionRow(position.marketId, position.side),
        ),
      );
      if (position.context?.outcomeLabel) {
        expect(
          row.getByText(positionTitle(position, position.context.outcomeLabel)),
        ).toBeOnTheScreen();
      }
      expect(
        row.getByTestId(
          EventMarketListTestIds.positionValue(
            position.marketId,
            position.side,
          ),
        ),
      ).toHaveTextContent('$45.00');
      fireEvent.press(
        row.getByTestId(
          EventMarketListTestIds.positionCashOut(
            position.marketId,
            position.side,
          ),
        ),
      );
    }
    expect(onCashOut.mock.calls).toEqual([[winner], [total], [spread]]);
    expect(
      view.getAllByTestId(EventMarketListTestIds.POSITION_ROWS),
    ).toHaveLength(3);
    for (const position of excluded) {
      expect(
        view.queryByTestId(
          EventMarketListTestIds.positionRow(position.marketId, position.side),
        ),
      ).not.toBeOnTheScreen();
    }
    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictPortfolioService:getPositions',
      event.venueId,
      { limit: 20 },
      'page-2',
    );
  });

  it('masks and restores Position amounts when the Redux privacy preference changes', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    configurePredictNextFeeds({ positions: [position] });
    const view = renderEventMarketList({
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    });
    // The value and PnL, and the holding read out to screen readers.
    const amounts = ['$45.00', '+$3.75 (+9.09%)'];
    const holding = new RegExp(
      `${formatSharesAmount(position.shares)} shares at`,
    );
    await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
    for (const amount of amounts) {
      expect(view.getByText(amount)).toBeOnTheScreen();
    }
    expect(view.getByLabelText(holding)).toBeOnTheScreen();
    const engine = Engine as unknown as { state: Record<string, unknown> };
    const originalState = engine.state;
    const setPrivacy = (privacyMode: boolean) => {
      engine.state = {
        ...originalState,
        PreferencesController: {
          ...view.store.getState().engine.backgroundState.PreferencesController,
          privacyMode,
        },
      };
      view.store.dispatch(updateBgState({ key: 'PreferencesController' }));
    };

    try {
      act(() => setPrivacy(true));

      for (const amount of amounts) {
        expect(
          view.queryByText(amount, { includeHiddenElements: true }),
        ).not.toBeOnTheScreen();
      }
      expect(
        view.queryByLabelText(holding, { includeHiddenElements: true }),
      ).not.toBeOnTheScreen();
      expect(view.getAllByText(/^•+$/)).toHaveLength(amounts.length);
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('1'),
      ).toBeOnTheScreen();

      act(() => setPrivacy(false));

      for (const amount of amounts) {
        expect(view.getByText(amount)).toBeOnTheScreen();
      }
      expect(view.queryByText(/^•+$/)).not.toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledTimes(1);
    } finally {
      engine.state = originalState;
    }
  });

  it('refreshes rows and count without switching panels or emitting stale Cash Out data', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const { queryClient, key } = createPositionsCache(event, [position]);
    configurePredictNextFeeds({ positions: [position] });
    const onCashOut = jest.fn();
    const view = renderEventMarketList(
      { event, onCashOut, onOrder: jest.fn(), onRulesPress: jest.fn() },
      { queryClient },
    );
    await view.findByTestId(
      EventMarketListTestIds.positionRow(position.marketId, position.side),
    );
    await waitFor(() =>
      expect(queryClient.getQueryState(key)?.fetchStatus).toBe('idle'),
    );
    const refreshed = makePredictNextPosition({
      marketId: position.marketId,
      shares: '18.5',
      currentValue: '11.10',
    });
    const added = makePredictNextPosition({
      marketId: event.markets[1].id,
      context: { ...position.context, outcomeLabel: 'Yankees' },
    });

    act(() => {
      queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(key, {
        pages: [{ venueId: event.venueId, positions: [refreshed, added] }],
        pageParams: [undefined],
      });
    });
    await waitFor(() =>
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('2'),
      ).toBeOnTheScreen(),
    );

    for (const current of [refreshed, added]) {
      const row = within(
        view.getByTestId(
          EventMarketListTestIds.positionRow(current.marketId, current.side),
        ),
      );
      expect(
        row.getByText(positionTitle(current, current.context?.outcomeLabel)),
      ).toBeOnTheScreen();
      expect(
        row.getByTestId(
          EventMarketListTestIds.positionValue(current.marketId, current.side),
        ),
      ).toHaveTextContent(`$${current.currentValue}`);
      fireEvent.press(
        row.getByTestId(
          EventMarketListTestIds.positionCashOut(
            current.marketId,
            current.side,
          ),
        ),
      );
    }
    expect(onCashOut.mock.calls).toEqual([[refreshed], [added]]);
    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
    view.unmount();
    queryClient.clear();
  });

  it('preserves independent total and spread alternates across panel and quote changes', async () => {
    const base = makePredictNextCompositeGameEvent();
    const event = {
      ...base,
      markets: base.markets.map((market) => ({
        ...market,
        rules: 'Final result determines settlement.',
      })),
    };
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const { queryClient } = createPositionsCache(event, [position]);
    configurePredictNextFeeds({ positions: [position] });
    const callbacks = {
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    const view = renderEventMarketList(
      { event, ...callbacks },
      { queryClient },
    );
    await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));
    const total = event.markets[2];
    const spread = event.markets[5];
    for (const market of [total, spread]) {
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.option(market.group?.key ?? '', market.id),
        ),
      );
    }
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
    expect(
      view.queryByTestId(MarketGroupCardTestIds.card('nfl-total-points')),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
    ).not.toBeOnTheScreen();
    const updated: PredictMarket = {
      ...total,
      outcomes: [
        {
          ...total.outcomes[0],
          askPrice: event.markets[3].outcomes[0].askPrice,
        },
        total.outcomes[1],
      ],
    };

    act(() =>
      view.updateProps({
        event: {
          ...event,
          markets: event.markets.map((market) =>
            market.id === total.id ? updated : market,
          ),
        },
        ...callbacks,
      }),
    );
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    for (const market of [updated, spread]) {
      const key = market.group?.key ?? '';
      fireEvent.press(
        view.getByTestId(MarketGroupCardTestIds.rulesButton(key)),
      );
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.outcomeButton(key, market.id, 'yes'),
        ),
      );
    }
    expect(callbacks.onRulesPress.mock.calls).toEqual([[updated], [spread]]);
    expect(callbacks.onOrder.mock.calls).toEqual([
      [updated, updated.outcomes[0]],
      [spread, spread.outcomes[0]],
    ]);
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();
    expect(callbacks.onCashOut).not.toHaveBeenCalled();
    expect(messengerCall).toHaveBeenCalledTimes(1);
    view.unmount();
    queryClient.clear();
  });

  it.each(['event', 'venue'])(
    'resets content and alternate selection when %s identity changes',
    async (identity) => {
      const event = makePredictNextTotalsEvent();
      const position = makePredictNextPosition({
        marketId: event.markets[0].id,
      });
      const { queryClient } = createPositionsCache(event, [position]);
      configurePredictNextFeeds({ positions: [position] });
      const callbacks = {
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      };
      const view = renderEventMarketList(
        { event, ...callbacks },
        { queryClient },
      );
      await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);
      fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.option(
            'nfl-total-points',
            event.markets[0].id,
          ),
        ),
      );
      const nextEvent = {
        ...event,
        ...(identity === 'event'
          ? { id: 'another-event' as PredictEvent['id'] }
          : { venueId: 'other-venue' as PredictEvent['venueId'] }),
      };
      const nextPosition = { ...position, venueId: nextEvent.venueId };
      queryClient.setQueryData<InfiniteData<PredictPositionsPage>>(
        portfolioQueries.getPositions(nextEvent.venueId, { limit: 20 })
          .queryKey,
        {
          pages: [{ venueId: nextEvent.venueId, positions: [nextPosition] }],
          pageParams: [undefined],
        },
      );
      configurePredictNextFeeds({ positions: [nextPosition] });

      act(() => view.updateProps({ event: nextEvent, ...callbacks }));

      expect(
        view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(
          EventMarketListTestIds.positionRow(
            nextPosition.marketId,
            nextPosition.side,
          ),
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(MarketGroupCardTestIds.card('nfl-total-points')),
      ).not.toBeOnTheScreen();
      fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.outcomeButton(
            'nfl-total-points',
            event.markets[1].id,
            'yes',
          ),
        ),
      );

      expect(callbacks.onOrder).toHaveBeenCalledWith(
        event.markets[1],
        event.markets[1].outcomes[0],
      );
      expect(
        view.queryByTestId(
          MarketGroupCardTestIds.outcomeButton(
            'nfl-total-points',
            event.markets[0].id,
            'yes',
          ),
        ),
      ).not.toBeOnTheScreen();
      view.unmount();
      queryClient.clear();
    },
  );

  it('removes all tabs for a defensive empty Event and restores the first available panel', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    configurePredictNextFeeds({ positions: [position] });
    const callbacks = {
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    };
    const view = renderEventMarketList({ event, ...callbacks });
    await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);
    fireEvent.press(view.getByTestId(EventMarketListTestIds.MARKETS_TAB));

    act(() =>
      view.updateProps({ event: { ...event, markets: [] }, ...callbacks }),
    );

    expect(
      view.queryByTestId(EventMarketListTestIds.TABS),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(EventMarketListTestIds.MARKETS_TAB),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketStandardCardTestIds.card(event.markets[0].id)),
    ).not.toBeOnTheScreen();

    act(() => view.updateProps({ event, ...callbacks }));

    expect(
      view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(
        EventMarketListTestIds.positionRow(position.marketId, position.side),
      ),
    ).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
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
        ).getAllByText(strings('predict_next.event.outcomes'))[0],
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
  describe('with a laid-out Game', () => {
    const FULL_GAME_MONEYLINE = 'nfl-composite:moneyline';
    const FIRST_HALF_MONEYLINE = 'nfl-composite-1h:moneyline';
    const SECTION_IDS = new RegExp(
      `^${EventMarketLayoutSectionTestIds.section('')}`,
    );

    const renderLaidOut = (
      event: PredictEvent = makePredictNextLaidOutGameEvent(),
      options?: Parameters<typeof renderEventMarketList>[1],
    ) => {
      const props = {
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      };
      return { props, view: renderEventMarketList(props, options) };
    };
    const sectionOf = (
      view: ReturnType<typeof renderEventMarketList>,
      key: string,
    ) => within(view.getByTestId(EventMarketLayoutSectionTestIds.section(key)));
    const withSection = (
      market: PredictMarket,
      section: { key: string; order: number },
    ): PredictMarket => ({
      ...market,
      id: `${market.id}-${section.key}` as PredictMarket['id'],
      group: market.group && {
        ...market.group,
        key: `${market.group.key}-${section.key}`,
      },
      layout: market.layout && { ...market.layout, section },
    });

    it('shows the Game lines sections in order, open, with chips only where a section has periods', async () => {
      const { view } = renderLaidOut();

      const tab = await view.findByTestId(
        EventMarketListTestIds.layoutTab('game_lines'),
      );

      expect(
        within(tab).getAllByText(strings('predict_next.event.game_lines'))[0],
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(EventMarketListTestIds.MARKETS_TAB),
      ).not.toBeOnTheScreen();
      expect(
        view.getAllByTestId(SECTION_IDS).map((section) => section.props.testID),
      ).toEqual([
        EventMarketLayoutSectionTestIds.section('moneyline'),
        EventMarketLayoutSectionTestIds.section('spread'),
        EventMarketLayoutSectionTestIds.section('total_points'),
      ]);
      expect(
        sectionOf(view, 'moneyline').getByText(
          strings('predict_next.event.market_layout.moneyline'),
        ),
      ).toBeOnTheScreen();
      expect(
        sectionOf(view, 'moneyline').getByTestId(
          EventMarketPeriodChipsTestIds.LIST,
        ),
      ).toBeOnTheScreen();
      expect(
        sectionOf(view, 'spread').queryByTestId(
          EventMarketPeriodChipsTestIds.LIST,
        ),
      ).not.toBeOnTheScreen();
      expect(
        view.getByTestId(
          MoneylineMarketGroupCardTestIds.card(FULL_GAME_MONEYLINE),
        ),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(MarketGroupCardTestIds.card('nfl-total-points')),
      ).toBeOnTheScreen();
    });

    it('swaps the cards when a period chip is selected', async () => {
      const { view } = renderLaidOut();

      fireEvent.press(
        await view.findByTestId(
          EventMarketPeriodChipsTestIds.CHIP('first_half'),
        ),
      );

      expect(
        view.getByTestId(
          MoneylineMarketGroupCardTestIds.card(FIRST_HALF_MONEYLINE),
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(
          MoneylineMarketGroupCardTestIds.card(FULL_GAME_MONEYLINE),
        ),
      ).not.toBeOnTheScreen();
    });

    it('collapses and expands a section, and keeps its state across remounts', async () => {
      const event = makePredictNextLaidOutGameEvent();
      const position = makePredictNextPosition({
        marketId: event.markets[0].id,
      });
      const { queryClient } = createPositionsCache(event, [position]);
      configurePredictNextFeeds({ positions: [position] });
      const { view } = renderLaidOut(event, { queryClient });

      fireEvent.press(
        await view.findByTestId(EventMarketListTestIds.layoutTab('game_lines')),
      );
      fireEvent.press(
        sectionOf(view, 'spread').getByTestId(EventMarketSectionTestIds.HEADER),
      );
      expect(
        view.queryByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
      ).not.toBeOnTheScreen();
      fireEvent.press(
        view.getByTestId(EventMarketPeriodChipsTestIds.CHIP('first_half')),
      );

      // The Positions panel unmounts every section row.
      fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
      expect(view.queryAllByTestId(SECTION_IDS)).toHaveLength(0);
      fireEvent.press(
        view.getByTestId(EventMarketListTestIds.layoutTab('game_lines')),
      );

      expect(
        view.queryByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
      ).not.toBeOnTheScreen();
      expect(
        view.getByTestId(
          MoneylineMarketGroupCardTestIds.card(FIRST_HALF_MONEYLINE),
        ),
      ).toBeOnTheScreen();

      fireEvent.press(
        sectionOf(view, 'spread').getByTestId(EventMarketSectionTestIds.HEADER),
      );
      expect(
        view.getByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
      ).toBeOnTheScreen();
    });

    it('orders from the moneyline, spread and total cards', async () => {
      const event = makePredictNextLaidOutGameEvent();
      const { props, view } = renderLaidOut(event);
      const find = (id: string) =>
        event.markets.find((market) => market.id === id) as PredictMarket;
      const awayWinner = find('nfl-composite-away-market');
      const spread = find('nfl-spread-new-england-2-5');
      const total = find('nfl-total-220-5');

      fireEvent.press(
        await view.findByTestId(
          MoneylineMarketGroupCardTestIds.price(
            FULL_GAME_MONEYLINE,
            awayWinner.id,
          ),
        ),
      );
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.outcomeButton('nfl-spreads', spread.id, 'yes'),
        ),
      );
      // A section's line picker keeps the chosen line for its order button.
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', total.id),
        ),
      );
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.outcomeButton(
            'nfl-total-points',
            total.id,
            'no',
          ),
        ),
      );

      expect(props.onOrder.mock.calls).toEqual([
        [awayWinner, awayWinner.outcomes[0]],
        [spread, spread.outcomes[0]],
        [total, total.outcomes[1]],
      ]);
    });

    it('opens only the first three sections and titles unknown sections from their key', async () => {
      const event = makePredictNextLaidOutGameEvent();
      const spreads = event.markets.filter(
        (market) => market.group?.key === 'nfl-spreads',
      );
      const totals = event.markets.filter(
        (market) => market.group?.key === 'nfl-total-points',
      );
      const { view } = renderLaidOut({
        ...event,
        markets: [
          ...event.markets,
          ...totals.map(
            (market): PredictMarket => ({
              ...withSection(market, { key: 'team_total', order: 3 }),
              group: market.group && {
                ...market.group,
                key: 'team-total-ne',
                marketType: 'team_total',
              },
              outcomes: [
                { ...market.outcomes[0], gameSelection: 'away' },
                market.outcomes[1],
              ],
            }),
          ),
          ...spreads.map((market) =>
            withSection(market, { key: 'alt_spread', order: 4 }),
          ),
        ],
      });

      await view.findByTestId(
        EventMarketLayoutSectionTestIds.section('alt_spread'),
      );

      expect(
        sectionOf(view, 'team_total').getByText(
          strings('predict_next.event.market_layout.team_total'),
        ),
      ).toBeOnTheScreen();
      expect(
        sectionOf(view, 'alt_spread').getByText('Alt spread'),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(MarketGroupCardTestIds.card('team-total-ne')),
      ).not.toBeOnTheScreen();

      fireEvent.press(
        sectionOf(view, 'team_total').getByTestId(
          EventMarketSectionTestIds.HEADER,
        ),
      );

      expect(
        view.getByTestId(MarketGroupCardTestIds.title('team-total-ne')),
      ).toHaveTextContent('New England');
      expect(
        view.queryByTestId(MarketGroupCardTestIds.title('nfl-total-points')),
      ).not.toBeOnTheScreen();
    });

    it('shows the summed section volume in dollars and hides a missing one', async () => {
      const event = makePredictNextLaidOutGameEvent();
      const { view } = renderLaidOut({
        ...event,
        markets: event.markets.map((market) =>
          market.group?.key === 'nfl-spreads'
            ? { ...market, volume: '16100' }
            : market,
        ),
      });

      await view.findByTestId(
        EventMarketLayoutSectionTestIds.section('spread'),
      );

      expect(
        sectionOf(view, 'spread').getByTestId(EventMarketSectionTestIds.VOLUME),
      ).toHaveTextContent('$64.4k');
      expect(
        sectionOf(view, 'moneyline').queryByTestId(
          EventMarketSectionTestIds.VOLUME,
        ),
      ).not.toBeOnTheScreen();
    });

    it('lists each section as a header row and a row per card, flush, then Markets without layout after a gap', async () => {
      const event = makePredictNextLaidOutGameEvent();
      const [flat] = makePredictNextMultiMarketEvent().markets;
      const { view } = renderLaidOut({
        ...event,
        markets: [flat, ...event.markets],
      });

      await view.findByTestId(MarketStandardCardTestIds.card(flat.id));
      const list = view.UNSAFE_getByType(FlatList);
      const keys = list.props.data.map(list.props.keyExtractor);

      const section = (key: string) =>
        `markets:section:${JSON.stringify(['game_lines', key])}`;
      const card = (sectionKey: string, cardKey: string) =>
        `markets:card:${JSON.stringify(['game_lines', sectionKey])}:${cardKey}`;

      expect(keys).toEqual([
        section('moneyline'),
        card('moneyline', FULL_GAME_MONEYLINE),
        section('spread'),
        card('spread', 'nfl-spreads'),
        section('total_points'),
        card('total_points', 'nfl-total-points'),
        `markets:market:${flat.id}`,
      ]);
      // The first card sits under the header, or 12px under period chips.
      expect(
        view.getByTestId(
          EventMarketLayoutSectionTestIds.card(
            'moneyline',
            FULL_GAME_MONEYLINE,
          ),
        ),
      ).toHaveStyle({ paddingTop: 12 });
      expect(
        view.getByTestId(
          EventMarketLayoutSectionTestIds.card('spread', 'nfl-spreads'),
        ),
      ).not.toHaveStyle({ paddingTop: 12 });
      expect(view.getAllByTestId(MarketListTestIds.SEPARATOR)).toHaveLength(1);
    });

    it('spaces the standard cards of a card with no group card 12px apart', async () => {
      const event = makePredictNextLaidOutGameEvent();
      const { view } = renderLaidOut({
        ...event,
        markets: event.markets.map(
          (market): PredictMarket =>
            market.group?.key === 'nfl-spreads'
              ? {
                  ...market,
                  group: { ...market.group, marketType: 'unknown_line' },
                }
              : market,
        ),
      });

      const cardRow = await view.findByTestId(
        EventMarketLayoutSectionTestIds.card('spread', 'nfl-spreads'),
      );

      expect(
        within(cardRow).getAllByTestId(MarketStandardCardTestIds.TITLE_PATTERN)
          .length,
      ).toBeGreaterThan(1);
      expect(cardRow).toHaveStyle({ gap: 12 });
    });
  });

  describe('with player props', () => {
    const event = makePredictNextPlayerPropsEvent();
    const playerKey = (stat: string, player: string) =>
      `${event.id}:${stat}:${player}`;
    const rushing = (player: string) => playerKey('rushing_yards', player);

    const renderPlayerProps = async () => {
      const props = {
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      };
      const view = renderEventMarketList(props);
      fireEvent.press(
        await view.findByTestId(
          EventMarketListTestIds.layoutTab('player_props'),
        ),
      );
      return { props, view };
    };
    const titles = (view: ReturnType<typeof renderEventMarketList>) =>
      view
        .queryAllByTestId(/^predict-next-market-group-.*_yards:.*-title$/)
        .map((title) => title.props.children);
    const lineId = (stat: string, player: string, threshold: number) =>
      `${event.id}-${stat}-${player}-${threshold}`;

    it('shows the Player props tab with one line picker per Player, lines ascending', async () => {
      const { view } = await renderPlayerProps();

      expect(
        within(
          view.getByTestId(EventMarketListTestIds.layoutTab('player_props')),
        ).getAllByText(
          strings('predict_next.event.market_layout.player_props'),
        )[0],
      ).toBeOnTheScreen();
      expect(
        view
          .getAllByTestId(
            new RegExp(`^${EventMarketLayoutSectionTestIds.section('')}`),
          )
          .map((section) => section.props.testID),
      ).toEqual([
        EventMarketLayoutSectionTestIds.section('rushing_yards'),
        EventMarketLayoutSectionTestIds.section('passing_yards'),
      ]);
      // Each card starts on its lowest line.
      expect(titles(view)).toEqual([
        'Rhamondre Stevenson: 40+',
        'Kenneth Walker: 50+',
        'Drake Maye: 20+',
        'Drake Maye: 200+',
      ]);
      const stevenson = rushing('Rhamondre Stevenson');
      [40, 60, 80].forEach((threshold) =>
        expect(
          view.getByTestId(
            MarketGroupCardTestIds.option(
              stevenson,
              lineId('rushing_yards', 'Rhamondre Stevenson', threshold),
            ),
          ),
        ).toHaveTextContent(`${threshold}+`),
      );
      // A Player with a single line still gets a card, without a picker.
      const maye = rushing('Drake Maye');
      expect(
        view.getByTestId(MarketGroupCardTestIds.card(maye)),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(MarketGroupCardTestIds.selector(maye)),
      ).not.toBeOnTheScreen();
    });

    it('shows the first three Players and expands the rest with View all, until the section closes', async () => {
      const { view } = await renderPlayerProps();
      const viewAll = EventMarketLayoutSectionTestIds.viewAll('rushing_yards');
      const charbonnet = MarketGroupCardTestIds.card(
        rushing('Zach Charbonnet'),
      );

      expect(view.queryByTestId(charbonnet)).not.toBeOnTheScreen();
      expect(view.getByTestId(viewAll)).toHaveTextContent(
        strings('predict_next.event.view_all_markets', { count: 7 }),
      );
      expect(
        view.queryByTestId(
          EventMarketLayoutSectionTestIds.viewAll('passing_yards'),
        ),
      ).not.toBeOnTheScreen();

      fireEvent.press(view.getByTestId(viewAll));

      expect(view.getByTestId(charbonnet)).toBeOnTheScreen();
      expect(view.queryByTestId(viewAll)).not.toBeOnTheScreen();

      const header = () =>
        within(
          view.getByTestId(
            EventMarketLayoutSectionTestIds.section('rushing_yards'),
          ),
        ).getByTestId(EventMarketSectionTestIds.HEADER);
      fireEvent.press(header());
      fireEvent.press(header());

      expect(view.queryByTestId(charbonnet)).not.toBeOnTheScreen();
      expect(view.getByTestId(viewAll)).toBeOnTheScreen();
    });

    it('switches a Player to another line and orders its Yes and No', async () => {
      const { props, view } = await renderPlayerProps();
      const walker = rushing('Kenneth Walker');
      const marketId = lineId('rushing_yards', 'Kenneth Walker', 70);
      const market = event.markets.find(({ id }) => id === marketId);

      fireEvent.press(
        view.getByTestId(MarketGroupCardTestIds.option(walker, marketId)),
      );

      expect(
        view.getByTestId(MarketGroupCardTestIds.title(walker)),
      ).toHaveTextContent('Kenneth Walker: 70+');
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.outcomeButton(walker, marketId, 'yes'),
        ),
      );
      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.outcomeButton(walker, marketId, 'no'),
        ),
      );

      expect(props.onOrder).toHaveBeenNthCalledWith(
        1,
        market,
        market?.outcomes[0],
      );
      expect(props.onOrder).toHaveBeenNthCalledWith(
        2,
        market,
        market?.outcomes[1],
      );
    });

    it('keeps the Game lines moneyline on its own card', async () => {
      const { view } = await renderPlayerProps();

      fireEvent.press(
        view.getByTestId(EventMarketListTestIds.layoutTab('game_lines')),
      );

      expect(
        view.getByTestId(
          MoneylineMarketGroupCardTestIds.card(`${event.id}:moneyline`),
        ),
      ).toBeOnTheScreen();
      expect(titles(view)).toEqual([]);
    });
  });

  describe('Position card', () => {
    const renderPositions = async (
      event: PredictEvent,
      positions: readonly PredictPosition[],
    ) => {
      configurePredictNextFeeds({ positions: [...positions] });
      const callbacks = {
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      };
      const view = renderEventMarketList({ event, ...callbacks });
      await waitFor(() =>
        expect(
          within(
            view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
          ).getByText(String(positions.length), {
            includeHiddenElements: true,
          }),
        ).toBeOnTheScreen(),
      );
      fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
      for (const { marketId, side } of positions) {
        await view.findByTestId(
          EventMarketListTestIds.positionRow(marketId, side),
        );
      }
      return { view, callbacks };
    };
    const cardOf = (
      view: ReturnType<typeof renderEventMarketList>,
      { marketId, side }: PredictPosition,
    ) =>
      within(
        view.getByTestId(EventMarketListTestIds.positionRow(marketId, side)),
      );

    it('shows a winning Position with its Team, chance, value and PnL, and buys more of the held side', async () => {
      const event = makePredictNextCompositeGameEvent();
      const [market] = event.markets;
      const position = makePredictNextPosition({
        marketId: market.id,
        context: {
          ...makePredictNextPosition().context,
          outcomeLabel: 'New England',
        },
      });
      const { view, callbacks } = await renderPositions(event, [position]);
      const card = cardOf(view, position);
      const ids = (id: (marketId: string, side: string) => string) =>
        id(position.marketId, position.side);

      expect(
        card.getByText(positionTitle(position, 'New England')),
      ).toBeOnTheScreen();
      // The Team's logo, here its abbreviation fallback.
      expect(
        card.getByText('NEW', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(
        card.getByTestId(ids(EventMarketListTestIds.positionChance)),
      ).toHaveTextContent('42% to win');
      // Screen readers hear the chance as part of the title's label.
      expect(
        card.getByLabelText(
          new RegExp(
            `^${positionTitle(position, 'New England')}, 42% to win, `,
          ),
        ),
      ).toBeOnTheScreen();
      expect(
        card.getByTestId(ids(EventMarketListTestIds.positionValue)),
      ).toHaveTextContent('$45.00');
      const pnl = card.getByTestId(ids(EventMarketListTestIds.positionPnl));
      expect(pnl).toHaveTextContent('+$3.75 (+9.09%)');
      expect(pnl).toHaveStyle({ color: lightTheme.colors.success.default });

      fireEvent.press(
        card.getByTestId(ids(EventMarketListTestIds.positionBuy)),
      );

      expect(
        card.getByTestId(ids(EventMarketListTestIds.positionBuy)),
      ).toHaveTextContent('Buy 42¢');
      expect(callbacks.onOrder).toHaveBeenCalledWith(
        market,
        market.outcomes[0],
      );
      expect(callbacks.onCashOut).not.toHaveBeenCalled();
    });

    it('rounds a sub-cent ask to the same whole number in the chance and Buy', async () => {
      const event = makePredictNextCompositeGameEvent();
      const [market] = event.markets;
      const subCent: PredictEvent = {
        ...event,
        markets: [
          {
            ...market,
            outcomes: [
              { ...market.outcomes[0], askPrice: '0.425' as PredictDecimal },
              market.outcomes[1],
            ],
          },
          ...event.markets.slice(1),
        ],
      };
      const position = makePredictNextPosition({ marketId: market.id });
      const { view } = await renderPositions(subCent, [position]);
      const card = cardOf(view, position);

      expect(
        card.getByTestId(
          EventMarketListTestIds.positionChance(position.marketId, 'yes'),
        ),
      ).toHaveTextContent('43% to win');
      expect(
        card.getByTestId(
          EventMarketListTestIds.positionBuy(position.marketId, 'yes'),
        ),
      ).toHaveTextContent('Buy 43¢');
    });

    it('shows a losing No Position in red and buys its No side', async () => {
      const event = makePredictNextCompositeGameEvent();
      const [market] = event.markets;
      const position = makePredictNextPosition({
        marketId: market.id,
        side: 'no',
        context: {
          ...makePredictNextPosition().context,
          outcomeLabel: 'New England',
        },
        currentValue: '36.25',
        unrealizedPnl: '-5.00',
        unrealizedPnlPercent: '-5.9',
      });
      const { view, callbacks } = await renderPositions(event, [position]);
      const card = cardOf(view, position);
      const pnl = card.getByTestId(
        EventMarketListTestIds.positionPnl(position.marketId, 'no'),
      );

      expect(
        card.getByText(positionTitle(position, 'New England')),
      ).toBeOnTheScreen();
      expect(pnl).toHaveTextContent('-$5.00 (-5.90%)');
      expect(pnl).toHaveStyle({ color: lightTheme.colors.error.default });

      fireEvent.press(
        card.getByTestId(
          EventMarketListTestIds.positionBuy(position.marketId, 'no'),
        ),
      );

      expect(callbacks.onOrder).toHaveBeenCalledWith(
        market,
        market.outcomes[1],
      );
    });

    it('titles a player prop with its Player and threshold', async () => {
      const event = makePredictNextPlayerPropsEvent();
      const market = event.markets.find((candidate) => candidate.group?.label);
      const position = makePredictNextPosition({
        marketId: market?.id,
        context: undefined,
      });
      const { view } = await renderPositions(event, [position]);

      expect(
        cardOf(view, position).getByText(
          positionTitle(position, `${market?.group?.label} 60+ yards`),
        ),
      ).toBeOnTheScreen();
    });

    it('titles an unlabelled player prop with its threshold alone', async () => {
      const event = makePredictNextPlayerPropsEvent();
      const markets = event.markets.map((candidate) =>
        candidate.group?.label
          ? {
              ...candidate,
              group: { ...candidate.group, label: undefined },
            }
          : candidate,
      );
      const market = markets.find((candidate) =>
        candidate.outcomes[0].label.endsWith('yards'),
      );
      const position = makePredictNextPosition({
        marketId: market?.id,
        context: undefined,
      });
      const { view } = await renderPositions({ ...event, markets }, [position]);

      expect(
        cardOf(view, position).getByText(
          positionTitle(position, market?.outcomes[0].label),
        ),
      ).toBeOnTheScreen();
    });

    it('leaves a label off a Market that is not a choice card', async () => {
      const event = makePredictNextCompositeGameEvent();
      const markets = event.markets.map((candidate) =>
        candidate.group?.groupType === 'marketSelector'
          ? {
              ...candidate,
              group: { ...candidate.group, label: 'Total points' },
            }
          : candidate,
      );
      const market = markets.find((candidate) => candidate.group?.label);
      const position = makePredictNextPosition({
        marketId: market?.id,
        context: undefined,
      });
      const { view } = await renderPositions({ ...event, markets }, [position]);

      expect(
        cardOf(view, position).getByText(
          positionTitle(position, market?.outcomes[0].label),
        ),
      ).toBeOnTheScreen();
    });

    it('falls back without a current value, PnL, average price or ask, and disables Buy', async () => {
      const event = makePredictNextCompositeGameEvent();
      const [market] = event.markets;
      const unpriced: PredictEvent = {
        ...event,
        markets: [
          {
            ...market,
            outcomes: [
              { ...market.outcomes[0], askPrice: undefined },
              { ...market.outcomes[1], askPrice: undefined },
            ],
          },
          ...event.markets.slice(1),
        ],
      };
      const position = makePredictNextPosition({
        marketId: market.id,
        averagePrice: undefined,
        currentValue: undefined,
        unrealizedPnl: undefined,
        unrealizedPnlPercent: undefined,
      });
      const { view, callbacks } = await renderPositions(unpriced, [position]);
      const card = cardOf(view, position);
      const ids = (id: (marketId: string, side: string) => string) =>
        id(position.marketId, position.side);

      expect(
        card.getByTestId(ids(EventMarketListTestIds.positionValue)),
      ).toHaveTextContent('–');
      expect(
        card.queryByTestId(ids(EventMarketListTestIds.positionPnl)),
      ).not.toBeOnTheScreen();
      expect(
        card.queryByTestId(ids(EventMarketListTestIds.positionChance)),
      ).not.toBeOnTheScreen();
      // Without an average price, screen readers still hear the shares.
      expect(
        card.getByLabelText(
          new RegExp(`, ${formatSharesAmount(position.shares)} shares$`),
        ),
      ).toBeOnTheScreen();
      const buy = card.getByTestId(ids(EventMarketListTestIds.positionBuy));
      expect(buy).toHaveTextContent('Buy –');
      expect(buy).toHaveProp('accessibilityLabel', 'Buy, price unavailable');
      expect(buy).toBeDisabled();

      fireEvent.press(buy);
      fireEvent.press(
        card.getByTestId(ids(EventMarketListTestIds.positionCashOut)),
      );

      expect(callbacks.onOrder).not.toHaveBeenCalled();
      expect(callbacks.onCashOut).toHaveBeenCalledWith(position);
    });
  });
});
