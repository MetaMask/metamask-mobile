/**
 * Component view tests for the generic PredictFeedView.
 *
 * Behaviour is driven via Engine spies (listMarkets / listFilterOptions) and
 * real hooks/components — no hook or FlashList mocks.
 *
 * Run with: yarn jest -c jest.config.view.js PredictFeedView.view.test --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import Engine from '../../../../../../app/core/Engine';
import {
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { renderPredictFeedView } from '../../../../../../tests/component-view/renderers/predictFeedView';
import {
  PredictFeedViewSelectorsIDs,
  PredictSearchSelectorsIDs,
  getPredictFeedViewSelector,
} from '../../Predict.testIds';
import { PREDICT_OFFLINE_TEST_IDS } from '../../components/PredictOffline/PredictOffline.testIds';
import { MOCK_PREDICT_MARKET } from '../../../../../../tests/component-view/fixtures/predict';
import type { PredictMarket } from '../../types';

const createMarket = (id: string, title: string): PredictMarket => ({
  ...MOCK_PREDICT_MARKET,
  id,
  slug: id,
  title,
  outcomes: [
    {
      ...MOCK_PREDICT_MARKET.outcomes[0],
      id: `${id}-outcome`,
      marketId: id,
      title,
    },
  ],
});

const SEARCH_PLACEHOLDER = 'Search prediction markets';

describe('PredictFeedView (component view)', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    (Engine.context.PredictController.listMarkets as jest.Mock)
      .mockReset()
      .mockResolvedValue({ markets: [], nextCursor: null });
    (Engine.context.PredictController.listFilterOptions as jest.Mock)
      .mockReset()
      .mockResolvedValue([]);
    (
      Engine.context.PredictController.trackSearchInteracted as jest.Mock
    ).mockClear();
    (Engine.context.PredictController.trackFeedViewed as jest.Mock).mockClear();
    (
      Engine.context.PredictController.trackFeedTabChanged as jest.Mock
    ).mockClear();
    (
      Engine.context.PredictController.trackFeedFilterChanged as jest.Mock
    ).mockClear();
  });

  it('renders the configured feed header, tabs, and filters for a multi-tab feed', async () => {
    const { findByText, getByTestId, getByText, getAllByText } =
      renderPredictFeedView({
        initialParams: { feedId: 'sports' },
      });

    expect(await findByText('Sports')).toBeOnTheScreen();
    expect(getByTestId(PredictFeedViewSelectorsIDs.TABS)).toBeOnTheScreen();
    expect(getAllByText('Basketball').length).toBeGreaterThan(0);
    expect(getByTestId(PredictFeedViewSelectorsIDs.FILTERS)).toBeOnTheScreen();
    expect(getAllByText('All').length).toBeGreaterThan(0);
    expect(getByText('Games')).toBeOnTheScreen();
    expect(getByText('Props')).toBeOnTheScreen();

    expect(Engine.context.PredictController.listMarkets).toHaveBeenCalled();
  });

  it('renders market cards for the active tab/filter', async () => {
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockResolvedValue({
      markets: [
        createMarket('market-1', 'Lakers to win the title'),
        createMarket('market-2', 'Celtics to win the title'),
      ],
      nextCursor: null,
    });

    const { findByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'sports' },
    });

    const firstCard = await findByTestId(
      getPredictFeedViewSelector.marketCard(1),
      {},
      { timeout: 10000 },
    );
    expect(
      within(firstCard).getByText('Lakers to win the title'),
    ).toBeOnTheScreen();
  });

  it('renders the empty state when the feed returns no markets', async () => {
    const { findByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'live' },
    });

    expect(
      await findByTestId(
        PredictFeedViewSelectorsIDs.EMPTY_STATE,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
  });

  it('hides Live tab and filter bars while requesting only live markets', async () => {
    const { findByTestId, queryByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'live' },
    });

    await findByTestId(
      PredictFeedViewSelectorsIDs.EMPTY_STATE,
      {},
      { timeout: 10000 },
    );

    expect(
      queryByTestId(PredictFeedViewSelectorsIDs.TABS),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PredictFeedViewSelectorsIDs.FILTERS),
    ).not.toBeOnTheScreen();
    expect(Engine.context.PredictController.listMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ live: true }),
    );
  });

  it('shows skeleton loaders while markets are loading', async () => {
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockImplementation(() => new Promise(() => undefined));

    const { findByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'sports' },
    });

    expect(
      await findByTestId(getPredictFeedViewSelector.skeleton(1)),
    ).toBeOnTheScreen();
  });

  it('shows the offline state and loads markets after Try again', async () => {
    const listMarketsMock = Engine.context.PredictController
      .listMarkets as jest.Mock;
    listMarketsMock.mockRejectedValue(new Error('Network error'));

    const { findByTestId, findByText, queryByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'sports' },
    });

    expect(
      await findByTestId(
        PredictFeedViewSelectorsIDs.ERROR_STATE,
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(PREDICT_OFFLINE_TEST_IDS.ERROR_STATE),
    ).toBeOnTheScreen();

    const callCountBeforeRetry = listMarketsMock.mock.calls.length;
    listMarketsMock.mockResolvedValue({
      markets: [createMarket('market-1', 'Lakers to win the title')],
      nextCursor: null,
    });

    fireEvent.press(await findByText('Try again'));

    await waitFor(() => {
      expect(listMarketsMock.mock.calls.length).toBeGreaterThan(
        callCountBeforeRetry,
      );
    });
    expect(
      await findByTestId(
        getPredictFeedViewSelector.marketCard(1),
        {},
        { timeout: 10000 },
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PredictFeedViewSelectorsIDs.ERROR_STATE),
    ).not.toBeOnTheScreen();
  });

  it('opens search and tracks search opened from the header', async () => {
    const { getByTestId, findByPlaceholderText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

    expect(await findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeOnTheScreen();
    expect(
      Engine.context.PredictController.trackSearchInteracted,
    ).toHaveBeenCalledWith({
      interactionType: 'opened',
      predictFeedTab: 'all',
      entryPoint: 'home_section',
    });
  });

  it('tracks feed viewed on focus with feed, tab, filter, and entry point', async () => {
    const { findByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    await findByText('Sports');

    await waitFor(() => {
      expect(
        Engine.context.PredictController.trackFeedViewed,
      ).toHaveBeenCalledWith({
        feedId: 'sports',
        tabId: 'all',
        filterId: 'games',
        trackingMode: 'focus',
        entryPoint: 'home_section',
      });
    });
  });

  it('tracks a tab change when the user selects a different tab', async () => {
    const { findByText, getAllByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    await findByText('Sports');
    fireEvent.press(getAllByText('Basketball')[0]);

    await waitFor(() => {
      expect(
        Engine.context.PredictController.trackFeedTabChanged,
      ).toHaveBeenCalledWith({
        feedId: 'sports',
        tabId: 'basketball',
        entryPoint: 'home_section',
      });
    });
  });

  it('refetches markets and tracks filter change when a filter chip is pressed', async () => {
    const gamesMarket = createMarket('games-1', 'Lakers game market');
    const propsMarket = createMarket('props-1', 'Player props market');
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockImplementation(async (params?: { excludedTags?: string[] }) => {
      if (params?.excludedTags?.length) {
        return { markets: [propsMarket], nextCursor: null };
      }
      return { markets: [gamesMarket], nextCursor: null };
    });

    const { findByText, getByText, queryByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    expect(await findByText('Lakers game market')).toBeOnTheScreen();
    expect(queryByText('Player props market')).not.toBeOnTheScreen();

    fireEvent.press(getByText('Props'));

    expect(await findByText('Player props market')).toBeOnTheScreen();
    expect(queryByText('Lakers game market')).not.toBeOnTheScreen();
    expect(
      Engine.context.PredictController.trackFeedFilterChanged,
    ).toHaveBeenCalledWith({
      feedId: 'sports',
      tabId: 'all',
      filterId: 'props',
      isDynamicFilter: false,
      entryPoint: 'home_section',
    });
  });

  it('shows the 15 Min chip on finance and collapses paginated Gold and Silver 15m windows to one card each', async () => {
    const createMetalWindow = (
      id: string,
      assetTag: 'gold' | 'silver',
      seriesId: string,
      seriesSlug: string,
      seriesTitle: string,
      endDate: string,
    ): PredictMarket => ({
      ...createMarket(id, `${seriesTitle} ${id}`),
      endDate,
      series: {
        id: seriesId,
        slug: seriesSlug,
        title: seriesTitle,
        recurrence: '15m',
      },
      tags: [assetTag, 'up-or-down'],
    });

    const gold1 = createMetalWindow(
      'xau-1515',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      'Gold Up or Down 15m',
      '2026-11-23T15:15:00Z',
    );
    const gold2 = createMetalWindow(
      'xau-1530',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      'Gold Up or Down 15m',
      '2026-11-23T15:30:00Z',
    );
    const gold3 = createMetalWindow(
      'xau-1545',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      'Gold Up or Down 15m',
      '2026-11-23T15:45:00Z',
    );
    const silver1 = createMetalWindow(
      'xag-1515',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      'Silver Up or Down 15m',
      '2026-11-23T15:15:00Z',
    );
    const silver2 = createMetalWindow(
      'xag-1530',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      'Silver Up or Down 15m',
      '2026-11-23T15:30:00Z',
    );
    const silver3 = createMetalWindow(
      'xag-1545',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      'Silver Up or Down 15m',
      '2026-11-23T15:45:00Z',
    );
    const unrelated1 = createMarket('fed-rates', 'Fed cuts rates');
    const unrelated2 = createMarket('sp500-close', 'S&P 500 above 6000');

    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockImplementation(
      async (params?: { series?: string[]; afterCursor?: string | null }) => {
        if (!params?.series?.length) {
          return { markets: [], nextCursor: null };
        }
        if (params.afterCursor === 'page-2') {
          return {
            markets: [gold3, unrelated2, silver3],
            nextCursor: null,
          };
        }
        return {
          markets: [gold1, unrelated1, silver1, gold2, silver2],
          nextCursor: 'page-2',
        };
      },
    );

    const { findByText, getByTestId, queryByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'finance' },
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictUpDown: {
                  enabled: true,
                  minimumVersion: '0.0.1',
                },
              },
            },
          },
        },
      },
    });

    const chip = await findByText('15 Min');
    expect(chip).toBeOnTheScreen();

    fireEvent.press(chip);

    expect(await findByText('Fed cuts rates')).toBeOnTheScreen();

    fireEvent(
      getByTestId(PredictFeedViewSelectorsIDs.MARKET_LIST),
      'endReached',
    );

    expect(await findByText('S&P 500 above 6000')).toBeOnTheScreen();

    // Wait for both Gold and Silver skeletons to unmount after usePredictSeries
    // settles before asserting accessible names on the marketCard testIDs.
    await waitFor(() => {
      expect(
        getByTestId(getPredictFeedViewSelector.marketCard(1)),
      ).toHaveAccessibleName('Gold Up or Down 15m');
      expect(
        within(getByTestId(getPredictFeedViewSelector.marketCard(2))).getByText(
          'Fed cuts rates',
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedViewSelector.marketCard(3)),
      ).toHaveAccessibleName('Silver Up or Down 15m');
      expect(
        within(getByTestId(getPredictFeedViewSelector.marketCard(4))).getByText(
          'S&P 500 above 6000',
        ),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(getPredictFeedViewSelector.marketCard(5)),
      ).toBeNull();
    });
  });

  it('orders Gold before Silver on the Finance 15 Min feed even when the API returns Silver first', async () => {
    const createMetalWindow = (
      id: string,
      assetTag: 'gold' | 'silver',
      seriesId: string,
      seriesSlug: string,
      seriesTitle: string,
      endDate: string,
    ): PredictMarket => ({
      ...createMarket(id, `${seriesTitle} ${id}`),
      endDate,
      series: {
        id: seriesId,
        slug: seriesSlug,
        title: seriesTitle,
        recurrence: '15m',
      },
      tags: [assetTag, 'up-or-down'],
    });

    const silver1 = createMetalWindow(
      'xag-1515',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      'Silver Up or Down 15m',
      '2026-11-23T15:15:00Z',
    );
    const silver2 = createMetalWindow(
      'xag-1530',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      'Silver Up or Down 15m',
      '2026-11-23T15:30:00Z',
    );
    const gold1 = createMetalWindow(
      'xau-1515',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      'Gold Up or Down 15m',
      '2026-11-23T15:15:00Z',
    );
    const gold2 = createMetalWindow(
      'xau-1530',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      'Gold Up or Down 15m',
      '2026-11-23T15:30:00Z',
    );
    const unrelated1 = createMarket('fed-rates', 'Fed cuts rates');

    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockImplementation(async (params?: { series?: string[] }) => {
      if (!params?.series?.length) {
        return { markets: [], nextCursor: null };
      }
      return {
        markets: [silver1, unrelated1, gold1, silver2, gold2],
        nextCursor: null,
      };
    });

    const { findByText, getByTestId, queryByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'finance' },
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                predictUpDown: {
                  enabled: true,
                  minimumVersion: '0.0.1',
                },
              },
            },
          },
        },
      },
    });

    fireEvent.press(await findByText('15 Min'));

    // Wait for both Gold and Silver skeletons to unmount after usePredictSeries
    // settles before asserting accessible names on the marketCard testIDs.
    await waitFor(() => {
      expect(
        getByTestId(getPredictFeedViewSelector.marketCard(1)),
      ).toHaveAccessibleName('Gold Up or Down 15m');
      expect(
        within(getByTestId(getPredictFeedViewSelector.marketCard(2))).getByText(
          'Fed cuts rates',
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(getPredictFeedViewSelector.marketCard(3)),
      ).toHaveAccessibleName('Silver Up or Down 15m');
      expect(
        queryByTestId(getPredictFeedViewSelector.marketCard(4)),
      ).toBeNull();
    });
  });

  it('does not render a ready feed shell when the feed id is unknown', async () => {
    const { queryByTestId } = renderPredictFeedView({
      initialParams: { feedId: 'definitely-not-a-feed' },
    });

    await waitFor(() => {
      expect(queryByTestId(PredictFeedViewSelectorsIDs.CONTAINER)).toBeNull();
      expect(
        Engine.context.PredictController.listMarkets,
      ).not.toHaveBeenCalled();
    });
  });
});
