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
import { FlatList, Linking } from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import Engine from '../../../../../../core/Engine';
import { updateBgState } from '../../../../../../core/redux/slices/engine';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../../locales/i18n';
import { MarketStandardCardTestIds } from '../../../events/markets/MarketStandardCard.testIds';
import { MarketListTestIds } from '../../../events/markets/MarketList.testIds';
import { MarketGroupCardTestIds } from '../../../events/markets/MarketGroupCard.testIds';
import { ChoiceMarketGroupCardTestIds } from '../../../events/markets/ChoiceMarketGroupCard.testIds';
import { MoneylineMarketGroupCardTestIds } from '../../../events/markets/MoneylineMarketGroupCard.testIds';
import { portfolioQueries } from '../../../queries/portfolioQueries';
import type {
  PredictEvent,
  PredictHttpsUrl,
  PredictMarket,
  PredictPosition,
  PredictPositionsPage,
} from '../../../types';
import { EventAboutTestIds } from './EventAbout.testIds';
import { EventMarketListTestIds } from './EventMarketList.testIds';
import { EventMarketLayoutSectionTestIds } from './EventMarketLayoutSection.testIds';
import { EventMarketPeriodChipsTestIds } from './EventMarketPeriodChips.testIds';
import { EventMarketSectionTestIds } from './EventMarketSection.testIds';
import { formatSharesAmount } from '../../../utils/formatShares';

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
      const outcome = position.context?.outcomeLabel ?? position.side;
      expect(row.getByText(outcome)).toBeOnTheScreen();
      expect(
        row.getByText(
          strings('predict_next.portfolio.outcome_shares', {
            outcome,
            shares: formatSharesAmount(position.shares),
          }),
        ),
      ).toBeOnTheScreen();
      if (position.context?.marketQuestion) {
        expect(
          row.getByText(position.context.marketQuestion),
        ).toBeOnTheScreen();
      }
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

  it('masks and restores shares when the Redux privacy preference changes', async () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    configurePredictNextFeeds({ positions: [position] });
    const view = renderEventMarketList({
      event,
      onOrder: jest.fn(),
      onRulesPress: jest.fn(),
      onCashOut: jest.fn(),
    });
    const sharesText = strings('predict_next.portfolio.outcome_shares', {
      outcome: position.context?.outcomeLabel,
      shares: formatSharesAmount(position.shares),
    });
    await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);
    fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
    expect(view.getByText(sharesText)).toBeOnTheScreen();
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

      expect(
        view.queryByText(sharesText, { includeHiddenElements: true }),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByLabelText(sharesText, { includeHiddenElements: true }),
      ).not.toBeOnTheScreen();
      expect(view.getByText(/^•+$/)).toBeOnTheScreen();
      expect(
        within(
          view.getByTestId(EventMarketListTestIds.POSITIONS_TAB),
        ).getByText('1'),
      ).toBeOnTheScreen();

      act(() => setPrivacy(false));

      expect(view.getByText(sharesText)).toBeOnTheScreen();
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
        row.getByText(
          strings('predict_next.portfolio.outcome_shares', {
            outcome: current.context?.outcomeLabel,
            shares: formatSharesAmount(current.shares),
          }),
        ),
      ).toBeOnTheScreen();
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
        .queryAllByTestId(/^predict-next-choice-.*-title$/)
        .map((title) => title.props.children);

    it('shows the Player props tab with one titled card per Player, rows in threshold order', async () => {
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
      expect(titles(view)).toEqual([
        'Rhamondre Stevenson',
        'Kenneth Walker',
        'Drake Maye',
        'Drake Maye',
      ]);
      const stevenson = rushing('Rhamondre Stevenson');
      expect(
        view
          .getAllByTestId(
            new RegExp(`^${ChoiceMarketGroupCardTestIds.row(stevenson, '')}`),
          )
          .filter((row) => !/-(line|price|title)$/.test(row.props.testID))
          .map((row) => row.props.testID),
      ).toEqual(
        [40, 60, 80].map((threshold) =>
          ChoiceMarketGroupCardTestIds.row(
            stevenson,
            `${event.id}-rushing_yards-Rhamondre Stevenson-${threshold}`,
          ),
        ),
      );
      // A Player with a single threshold still gets a card.
      expect(
        view.getByTestId(
          ChoiceMarketGroupCardTestIds.card(rushing('Drake Maye')),
        ),
      ).toBeOnTheScreen();
    });

    it('shows the first three Players and expands the rest with View all, until the section closes', async () => {
      const { view } = await renderPlayerProps();
      const viewAll = EventMarketLayoutSectionTestIds.viewAll('rushing_yards');
      const charbonnet = ChoiceMarketGroupCardTestIds.card(
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

    it('orders from a Player row by its yes side', async () => {
      const { props, view } = await renderPlayerProps();
      const marketId = `${event.id}-rushing_yards-Kenneth Walker-70`;
      const market = event.markets.find(({ id }) => id === marketId);

      fireEvent.press(
        view.getByTestId(
          ChoiceMarketGroupCardTestIds.price(
            rushing('Kenneth Walker'),
            marketId,
          ),
        ),
      );

      expect(props.onOrder).toHaveBeenCalledWith(market, market?.outcomes[0]);
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

  describe('with an About tab', () => {
    const TAB_IDS = /^predict-next-event-market-list-.*-tab$/;
    const SOURCE = {
      name: ' MLB ',
      url: 'https://www.mlb.com/' as PredictHttpsUrl,
    };
    const renderAbout = (event: PredictEvent) =>
      renderEventMarketList({
        event,
        onOrder: jest.fn(),
        onRulesPress: jest.fn(),
        onCashOut: jest.fn(),
      });
    const tabIds = (view: ReturnType<typeof renderEventMarketList>) =>
      within(view.getByTestId(EventMarketListTestIds.TABS))
        .getAllByTestId(TAB_IDS)
        .map((tab) => tab.props.testID);

    it('shows About after Outcomes with the Event sources and rules', async () => {
      const openURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      const view = renderAbout({
        ...makePredictNextMultiMarketEvent(),
        rules: '  Resolves to the World Series winner.  ',
        settlementSources: [SOURCE],
      });
      await view.findByTestId(EventMarketListTestIds.ABOUT_TAB);

      expect(tabIds(view)).toEqual([
        EventMarketListTestIds.MARKETS_TAB,
        EventMarketListTestIds.ABOUT_TAB,
      ]);
      expect(view.queryByTestId(EventAboutTestIds.ROOT)).not.toBeOnTheScreen();

      fireEvent.press(view.getByTestId(EventMarketListTestIds.ABOUT_TAB));

      expect(
        view.getByText(strings('predict.market_details.resolution_details')),
      ).toBeOnTheScreen();
      expect(
        within(view.getByTestId(EventAboutTestIds.sourceLink(0))).getByText(
          'MLB',
        ),
      ).toBeOnTheScreen();
      expect(view.getByTestId(EventAboutTestIds.RULES)).toHaveTextContent(
        'Resolves to the World Series winner.',
      );
      expect(
        view.queryByTestId(
          MarketStandardCardTestIds.card(
            makePredictNextMultiMarketEvent().markets[0].id,
          ),
        ),
      ).not.toBeOnTheScreen();

      fireEvent.press(view.getByTestId(EventAboutTestIds.sourceLink(0)));

      expect(openURL).toHaveBeenCalledWith(SOURCE.url);
      openURL.mockRestore();
    });

    it('shows About with settlement sources and no rules', async () => {
      const view = renderAbout({
        ...makePredictNextMultiMarketEvent(),
        rules: ' ',
        settlementSources: [SOURCE],
      });

      fireEvent.press(
        await view.findByTestId(EventMarketListTestIds.ABOUT_TAB),
      );

      expect(view.getByTestId(EventAboutTestIds.SOURCES)).toBeOnTheScreen();
      expect(view.queryByTestId(EventAboutTestIds.RULES)).not.toBeOnTheScreen();
    });

    it('shows About with rules and no settlement sources', async () => {
      const view = renderAbout({
        ...makePredictNextMultiMarketEvent(),
        rules: 'Event rule.',
        settlementSources: [],
      });

      fireEvent.press(
        await view.findByTestId(EventMarketListTestIds.ABOUT_TAB),
      );

      expect(view.getByTestId(EventAboutTestIds.RULES)).toHaveTextContent(
        'Event rule.',
      );
      expect(
        view.queryByTestId(EventAboutTestIds.SOURCES),
      ).not.toBeOnTheScreen();
    });

    it('hides About when the Event has neither rules nor settlement sources', async () => {
      const view = renderAbout({
        ...makePredictNextMultiMarketEvent(),
        rules: '   ',
        settlementSources: [],
      });
      await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);

      expect(tabIds(view)).toEqual([EventMarketListTestIds.MARKETS_TAB]);
      expect(
        view.queryByTestId(EventMarketListTestIds.ABOUT_TAB),
      ).not.toBeOnTheScreen();
    });

    it('hides About for a Game Event with rules and settlement sources', async () => {
      const view = renderAbout({
        ...makePredictNextLaidOutGameEvent(),
        rules: 'Game rule.',
        settlementSources: [SOURCE],
      });
      await view.findByTestId(EventMarketListTestIds.layoutTab('game_lines'));

      expect(
        view.queryByTestId(EventMarketListTestIds.ABOUT_TAB),
      ).not.toBeOnTheScreen();
    });
  });
});
