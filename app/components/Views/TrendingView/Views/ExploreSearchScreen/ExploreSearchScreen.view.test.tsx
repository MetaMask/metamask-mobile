import '../../../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  HeaderNavBarVariant,
  renderExploreSearchScreenWithBackStack,
  renderExploreSearchScreenWithRoutes,
} from '../../../../../../tests/component-view/renderers/trending';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import Routes from '../../../../../constants/navigation/Routes';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockRwaTokensData,
  mockTrendingTokensData,
} from '../../../../../../tests/component-view/api-mocking/trending';
import { strings } from '../../../../../../locales/i18n';
import {
  fireEvent,
  waitFor,
  userEvent,
  act,
} from '@testing-library/react-native';
import { ReactTestInstance } from 'react-test-renderer';
import { ExploreSearchScreenSelectorsIDs } from './ExploreSearchScreen.testIds';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';
import { analytics } from '../../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockAppleSearchResult = {
  assetId: 'eip155:1/erc20:0xa11e000000000000000000000000000000000000',
  name: 'Apple Token',
  symbol: 'APPLE',
  decimals: 18,
  price: '1.00',
};

/**
 * Prefer userEvent.press for better event simulation; fall back to fireEvent.press
 * when userEvent is unavailable on a platform.
 */
const actButtonPress = async (elem: ReactTestInstance) => {
  try {
    await userEvent.press(elem);
  } catch {
    act(() => fireEvent.press(elem));
  }
};

describeForPlatforms('ExploreSearchScreen - Component Tests', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
  });

  afterEach(() => {
    clearTrendingApiMocks();
  });

  it('runs search from the deeplink initial query', async () => {
    clearTrendingApiMocks();
    setupTrendingApiFetchMock(
      mockTrendingTokensData,
      undefined,
      mockRwaTokensData,
      [mockAppleSearchResult],
    );
    const { findByTestId, findByText, getByDisplayValue } =
      renderExploreSearchScreenWithRoutes({
        initialParams: {
          initialQuery: 'Apple',
          entryPoint: 'deeplink',
        },
      });

    expect(getByDisplayValue('Apple')).toBeOnTheScreen();

    await findByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST);
    expect(
      await findByText('Apple Token', {}, { timeout: 10000 }),
    ).toBeOnTheScreen();
  });

  it('redacts a clipboard-prefilled query from the searched event', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

    try {
      renderExploreSearchScreenWithRoutes({
        initialParams: {
          entryPoint: 'home',
          initialQuery: 'clipboard-secret',
          initialQuerySource: 'clipboard',
        },
      });

      await waitFor(() => {
        expect(trackEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
            properties: expect.objectContaining({
              interaction_type: 'searched',
              search_query: '',
            }),
          }),
        );
      });

      expect(trackEventSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            search_query: 'clipboard-secret',
          }),
        }),
      );
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('redacts a clipboard-prefilled query from the abandoned event', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

    try {
      const { findByTestId } = renderExploreSearchScreenWithBackStack({
        initialParams: {
          entryPoint: 'home',
          initialQuery: 'clipboard-secret',
          initialQuerySource: 'clipboard',
        },
      });

      await actButtonPress(
        await findByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON),
      );

      await waitFor(() => {
        expect(trackEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
            properties: expect.objectContaining({
              interaction_type: 'abandoned',
              search_query: '',
              query_length: 16,
            }),
          }),
        );
      });
      expect(trackEventSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            search_query: 'clipboard-secret',
          }),
        }),
      );
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('cancels the homepage search handoff and returns to the previous route', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderExploreSearchScreenWithBackStack({
        initialParams: {
          entryPoint: 'home',
          searchOrigin: { x: 48, y: 48, width: 220, height: 48 },
        },
      });

    expect(
      await findByTestId(
        TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON),
    ).toBeOnTheScreen();

    await actButtonPress(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON),
    );

    await waitFor(() => {
      expect(
        queryByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT),
      ).not.toBeOnTheScreen();
    });
  });

  it('attributes a deeplink search open to the deeplink entry point', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

    try {
      renderExploreSearchScreenWithRoutes({
        initialParams: {
          initialQuery: 'Apple',
          entryPoint: 'deeplink',
        },
      });

      await waitFor(() => {
        expect(trackEventSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
            properties: expect.objectContaining({
              interaction_type: 'opened',
              search_query: '',
              entry_point: 'deeplink',
            }),
          }),
        );
      });
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('allows changing a deeplink initial query', async () => {
    const { getByDisplayValue, getByTestId } =
      renderExploreSearchScreenWithRoutes({
        initialParams: {
          initialQuery: 'Apple',
          entryPoint: 'deeplink',
        },
      });
    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );

    await actButtonPress(
      getByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_CLEAR_BUTTON),
    );
    await userEvent.type(searchInput, 'Microsoft');

    expect(getByDisplayValue('Microsoft')).toBeOnTheScreen();
  });

  it('pill row is visible after typing a search query', async () => {
    const { findByTestId, getByTestId } = renderExploreSearchScreenWithRoutes();

    // The search input is auto-focused on mount; find it by placeholder
    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    expect(searchInput).toBeOnTheScreen();

    await userEvent.type(searchInput, 'eth');

    // Pill row and "All" pill must be visible once a query is entered
    const allPill = await findByTestId(
      ExploreSearchScreenSelectorsIDs.PILL_ALL,
    );
    expect(allPill).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        getByTestId(ExploreSearchScreenSelectorsIDs.PILL_CRYPTOS),
      ).toBeOnTheScreen();
    });
  });

  it('tapping a feed pill shows that feed list; tapping All returns to aggregated view', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, 'eth');

    // Wait for pill row
    const cryptosPill = await findByTestId(
      ExploreSearchScreenSelectorsIDs.PILL_CRYPTOS,
    );

    // The aggregated "All" results list should be visible before switching
    await waitFor(() => {
      expect(
        queryByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST),
      ).toBeOnTheScreen();
    });

    // Tap the Crypto pill to switch to the single-feed view
    await actButtonPress(cryptosPill);

    // The aggregated results list disappears (replaced by the single-feed FlashList)
    await waitFor(() => {
      expect(
        queryByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST),
      ).not.toBeOnTheScreen();
    });

    // Tap "All" pill to go back to the aggregated view
    const allPill = getByTestId(ExploreSearchScreenSelectorsIDs.PILL_ALL);
    await actButtonPress(allPill);

    await waitFor(() => {
      expect(
        getByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST),
      ).toBeOnTheScreen();
    });
  });

  it('Crypto section header hides "View all" when results fit within the cap', async () => {
    // The mock returns 3 tokens (= MAX_ITEMS_PER_SECTION), so getViewMoreLabel
    // returns null and the "View all" button should not be rendered.
    const { findByTestId, getByTestId, queryByText } =
      renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, 'eth');

    // Wait for the aggregated results list to appear
    await findByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST);

    // With only 3 results (≤ MAX_ITEMS_PER_SECTION) the "View all" button must
    // not be rendered — there is nothing more to reveal.
    await waitFor(() => {
      const viewAllCryptosLabel = `${strings('trending.view_all')} ${strings('trending.search_tabs.crypto')}`;
      const resultsListEl = getByTestId(
        ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST,
      );
      const pressables = resultsListEl.findAll(
        (node) => node.props.accessibilityLabel === viewAllCryptosLabel,
      );
      expect(pressables.length).toBe(0);
      expect(queryByText(strings('trending.view_all'))).toBeNull();
    });
  });

  it('clearing the search query keeps the active feed pill selected', async () => {
    const { findByTestId, getByTestId } = renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, 'btc');

    // Tap Crypto pill to activate it
    const cryptosPill = await findByTestId(
      ExploreSearchScreenSelectorsIDs.PILL_CRYPTOS,
    );
    await actButtonPress(cryptosPill);

    // Crypto pill should now be selected (active): accessibilityState.selected === true
    await waitFor(() => {
      expect(cryptosPill.props.accessibilityState?.selected).toBe(true);
    });

    // Clear the search query via the clear button
    const clearButton = getByTestId(
      ExploreSearchScreenSelectorsIDs.SEARCH_CLEAR_BUTTON,
    );
    await actButtonPress(clearButton);

    // After clearing, the Crypto pill should remain selected — clearing the
    // query must not auto-navigate back to "All".
    await waitFor(() => {
      expect(cryptosPill.props.accessibilityState?.selected).toBe(true);
    });

    const allPill = getByTestId(ExploreSearchScreenSelectorsIDs.PILL_ALL);
    expect(allPill.props.accessibilityState?.selected).toBe(false);
  });

  it('empty feed state shows "No X results for query" when a pill has no results', async () => {
    const { findByTestId, getByTestId, queryByText } =
      renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );

    // Type a query that will not produce any Predictions results (Predictions
    // feed is always empty in the component-view test environment — no mock for
    // that API). This exercises the empty-feed message path.
    await userEvent.type(searchInput, 'zzz_no_match');

    // Navigate to the Predictions pill
    const predictionsPill = await findByTestId(
      ExploreSearchScreenSelectorsIDs.PILL_PREDICTIONS,
    );
    await actButtonPress(predictionsPill);

    // The aggregated FlashList should remain visible (emptyFeedTitle shows in its header)
    await findByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST);

    // The "No Predictions results for 'zzz_no_match'" message should appear
    const expectedMessage = strings('trending.no_results_for_feed', {
      feedName: strings('trending.search_tabs.predictions'),
      query: 'zzz_no_match',
    });
    await waitFor(
      () => {
        expect(queryByText(expectedMessage)).toBeOnTheScreen();
      },
      { timeout: 5000 },
    );
  });

  it('holds back the keyboard and the results subtree until the screen transition settles', async () => {
    const { getByTestId, queryByTestId, findByTestId } =
      renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );

    expect(searchInput.props.autoFocus).toBe(false);
    expect(queryByTestId(ExploreSearchScreenSelectorsIDs.PILL_ALL)).toBeNull();

    // Once settled, the input takes focus and the results mount.
    await findByTestId(ExploreSearchScreenSelectorsIDs.PILL_ALL);
    expect(
      getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT).props
        .autoFocus,
    ).toBe(true);
  });

  it('renders the inline back button instead of a cancel button on a treatment arm', async () => {
    const { findByTestId, queryByTestId } = renderExploreSearchScreenWithRoutes(
      {
        headerNavBarVariant: HeaderNavBarVariant.SearchFocused,
      },
    );

    expect(
      await findByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_CANCEL_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps the cancel button on the control arm', async () => {
    const { findByTestId, queryByTestId } =
      renderExploreSearchScreenWithRoutes();

    expect(
      await findByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_CANCEL_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides the open-tabs button when no browser tabs are open', async () => {
    const { findByTestId, queryByTestId } =
      renderExploreSearchScreenWithRoutes();

    await findByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT);

    expect(
      queryByTestId(ExploreSearchScreenSelectorsIDs.BROWSER_TABS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('shows the open-tabs count and opens the browser when tabs are open', async () => {
    const { findByTestId, getByText } = renderExploreSearchScreenWithRoutes({
      headerNavBarVariant: HeaderNavBarVariant.SearchFocused,
      overrides: {
        browser: {
          tabs: [
            { id: 1, url: 'https://app.uniswap.org' },
            { id: 2, url: 'https://metamask.io' },
          ],
        },
      },
    });

    const tabsButton = await findByTestId(
      ExploreSearchScreenSelectorsIDs.BROWSER_TABS_BUTTON,
    );
    expect(getByText('2')).toBeOnTheScreen();

    await actButtonPress(tabsButton);

    expect(
      await findByTestId(getRouteProbeTestId(Routes.BROWSER.HOME)),
    ).toBeOnTheScreen();
  });

  it('hides the open-tabs button on the control arm even with tabs open', async () => {
    const { findByTestId, queryByTestId } = renderExploreSearchScreenWithRoutes(
      {
        overrides: {
          browser: {
            tabs: [
              { id: 1, url: 'https://app.uniswap.org' },
              { id: 2, url: 'https://metamask.io' },
            ],
          },
        },
      },
    );

    await findByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT);

    expect(
      queryByTestId(ExploreSearchScreenSelectorsIDs.BROWSER_TABS_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('tracks exactly one footer result_clicked and opens the browser when the search footer is pressed', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

    try {
      const { findByTestId, getByTestId } =
        renderExploreSearchScreenWithRoutes();

      await userEvent.type(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT),
        'eth',
      );
      const footerLink = await findByTestId(
        'trending-search-footer-search-link',
      );
      trackEventSpy.mockClear();

      await actButtonPress(footerLink);

      const resultClickedEvents = trackEventSpy.mock.calls.filter(
        ([event]) => event.properties?.interaction_type === 'result_clicked',
      );
      expect(resultClickedEvents).toHaveLength(1);
      expect(resultClickedEvents[0][0]).toEqual(
        expect.objectContaining({
          name: MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
          properties: expect.objectContaining({
            search_query: 'eth',
            section_name: 'search_footer',
            item_clicked: 'engine_search',
            tab_name: 'all',
          }),
        }),
      );
      expect(
        await findByTestId(getRouteProbeTestId(Routes.BROWSER.HOME)),
      ).toBeOnTheScreen();
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('tracks abandoned once with navigate_away when leaving through the browser tabs button', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

    try {
      const { findByTestId, getByTestId } = renderExploreSearchScreenWithRoutes(
        {
          headerNavBarVariant: HeaderNavBarVariant.SearchFocused,
          initialParams: { entryPoint: 'deeplink' },
          overrides: {
            browser: {
              tabs: [{ id: 1, url: 'https://app.uniswap.org' }],
            },
          },
        },
      );

      await userEvent.type(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT),
        'eth',
      );
      trackEventSpy.mockClear();

      await actButtonPress(
        await findByTestId(ExploreSearchScreenSelectorsIDs.BROWSER_TABS_BUTTON),
      );
      expect(
        await findByTestId(getRouteProbeTestId(Routes.BROWSER.HOME)),
      ).toBeOnTheScreen();

      const abandonedEvents = trackEventSpy.mock.calls.filter(
        ([event]) => event.properties?.interaction_type === 'abandoned',
      );
      expect(abandonedEvents).toHaveLength(1);
      expect(abandonedEvents[0][0]).toEqual(
        expect.objectContaining({
          name: MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
          properties: expect.objectContaining({
            search_query: 'eth',
            query_length: 3,
            abandon_reason: 'navigate_away',
            entry_point: 'deeplink',
          }),
        }),
      );
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('does not track abandoned when the user leaves through a footer result click', async () => {
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');

    try {
      const { findByTestId, getByTestId } = renderExploreSearchScreenWithRoutes(
        { initialParams: { entryPoint: 'deeplink' } },
      );

      await userEvent.type(
        getByTestId(TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT),
        'eth',
      );
      trackEventSpy.mockClear();

      await actButtonPress(
        await findByTestId('trending-search-footer-search-link'),
      );
      expect(
        await findByTestId(getRouteProbeTestId(Routes.BROWSER.HOME)),
      ).toBeOnTheScreen();

      const abandonedEvents = trackEventSpy.mock.calls.filter(
        ([event]) => event.properties?.interaction_type === 'abandoned',
      );
      expect(abandonedEvents).toHaveLength(0);
    } finally {
      trackEventSpy.mockRestore();
    }
  });

  it('"All" pill is selected by default and pill row is present on mount', async () => {
    const { getByTestId } = renderExploreSearchScreenWithRoutes();

    // The pill row is mounted immediately — it does not require
    // a search query. The "All" pill must be selected (active) by default.
    await waitFor(() => {
      const allPill = getByTestId(ExploreSearchScreenSelectorsIDs.PILL_ALL);
      expect(allPill).toBeOnTheScreen();
      expect(allPill.props.accessibilityState?.selected).toBe(true);
    });
  });
});
