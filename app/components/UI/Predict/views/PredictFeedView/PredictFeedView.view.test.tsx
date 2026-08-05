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
    (
      Engine.context.PredictController.listMarkets as jest.Mock
    ).mockResolvedValue({ markets: [], nextCursor: null });
    (
      Engine.context.PredictController.listFilterOptions as jest.Mock
    ).mockResolvedValue([]);
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

  it('shows the offline state and loads markets after Retry', async () => {
    const listMarketsSpy = jest.spyOn(
      Engine.context.PredictController,
      'listMarkets',
    );
    listMarketsSpy.mockRejectedValue(new Error('Network error'));

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

    const callCountBeforeRetry = listMarketsSpy.mock.calls.length;
    listMarketsSpy.mockResolvedValue({
      markets: [createMarket('market-1', 'Lakers to win the title')],
      nextCursor: null,
    });

    fireEvent.press(await findByText('Retry'));

    await waitFor(() => {
      expect(listMarketsSpy.mock.calls.length).toBeGreaterThan(
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

    listMarketsSpy.mockRestore();
  });

  it('opens search and tracks search opened from the header', async () => {
    const trackSearchSpy = jest.spyOn(
      Engine.context.PredictController,
      'trackSearchInteracted',
    );

    const { getByTestId, findByPlaceholderText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    fireEvent.press(getByTestId(PredictSearchSelectorsIDs.SEARCH_BUTTON));

    expect(await findByPlaceholderText(SEARCH_PLACEHOLDER)).toBeOnTheScreen();
    expect(trackSearchSpy).toHaveBeenCalledWith({
      interactionType: 'opened',
      predictFeedTab: 'all',
      entryPoint: 'home_section',
    });

    trackSearchSpy.mockRestore();
  });

  it('tracks feed viewed on focus with feed, tab, filter, and entry point', async () => {
    const trackFeedViewedSpy = jest.spyOn(
      Engine.context.PredictController,
      'trackFeedViewed',
    );

    const { findByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    await findByText('Sports');

    await waitFor(() => {
      expect(trackFeedViewedSpy).toHaveBeenCalledWith({
        feedId: 'sports',
        tabId: 'all',
        filterId: 'games',
        trackingMode: 'focus',
        entryPoint: 'home_section',
      });
    });

    trackFeedViewedSpy.mockRestore();
  });

  it('tracks a tab change when the user selects a different tab', async () => {
    const trackTabSpy = jest.spyOn(
      Engine.context.PredictController,
      'trackFeedTabChanged',
    );

    const { findByText, getAllByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    await findByText('Sports');
    fireEvent.press(getAllByText('Basketball')[0]);

    await waitFor(() => {
      expect(trackTabSpy).toHaveBeenCalledWith({
        feedId: 'sports',
        tabId: 'basketball',
        entryPoint: 'home_section',
      });
    });

    trackTabSpy.mockRestore();
  });

  it('refetches markets and tracks filter change when a filter chip is pressed', async () => {
    const listMarketsSpy = jest.spyOn(
      Engine.context.PredictController,
      'listMarkets',
    );
    const trackFilterSpy = jest.spyOn(
      Engine.context.PredictController,
      'trackFeedFilterChanged',
    );
    const gamesMarket = createMarket('games-1', 'Lakers game market');
    const propsMarket = createMarket('props-1', 'Player props market');
    listMarketsSpy.mockImplementation(
      async (params?: { excludedTags?: string[] }) => {
        if (params?.excludedTags?.length) {
          return { markets: [propsMarket], nextCursor: null };
        }
        return { markets: [gamesMarket], nextCursor: null };
      },
    );

    const { findByText, getByText, queryByText } = renderPredictFeedView({
      initialParams: { feedId: 'sports', entryPoint: 'home_section' },
    });

    expect(await findByText('Lakers game market')).toBeOnTheScreen();
    expect(queryByText('Player props market')).not.toBeOnTheScreen();

    fireEvent.press(getByText('Props'));

    expect(await findByText('Player props market')).toBeOnTheScreen();
    expect(queryByText('Lakers game market')).not.toBeOnTheScreen();
    expect(trackFilterSpy).toHaveBeenCalledWith({
      feedId: 'sports',
      tabId: 'all',
      filterId: 'props',
      isDynamicFilter: false,
      entryPoint: 'home_section',
    });

    listMarketsSpy.mockRestore();
    trackFilterSpy.mockRestore();
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
