import '../../../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderExploreSearchScreenWithRoutes } from '../../../../../../tests/component-view/renderers/trending';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
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

describeForPlatforms('ExploreSearchScreen V2 - Component Tests', () => {
  beforeEach(() => {
    setupTrendingApiFetchMock(mockTrendingTokensData);
  });

  afterEach(() => {
    clearTrendingApiMocks();
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

    // Tap the Cryptos pill to switch to the single-feed view
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

  it('Cryptos section header shows "View all" label (remote search — no exact count)', async () => {
    const { findByTestId, getByTestId, getAllByText } =
      renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, 'eth');

    // Wait for the aggregated results list to appear
    await findByTestId(ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST);

    // The Cryptos section header button label should be "View all" because
    // tokens use remote pagination and we never have a precise count of
    // remaining items.
    await waitFor(() => {
      const viewAllLabels = getAllByText(strings('trending.view_all'));
      expect(viewAllLabels.length).toBeGreaterThanOrEqual(1);
    });

    // The Pressable wrapping that label has accessibilityLabel = "{label} {title}".
    // Verify the Cryptos section specifically by checking the accessibility label.
    const viewAllCryptosLabel = `${strings('trending.view_all')} ${strings('trending.search_tabs.crypto')}`;
    await waitFor(() => {
      const resultsListEl = getByTestId(
        ExploreSearchScreenSelectorsIDs.SEARCH_RESULTS_LIST,
      );
      const pressables = resultsListEl.findAll(
        (node) => node.props.accessibilityLabel === viewAllCryptosLabel,
      );
      expect(pressables.length).toBeGreaterThan(0);
    });
  });

  it('clearing the search query keeps the active feed pill selected', async () => {
    const { findByTestId, getByTestId } = renderExploreSearchScreenWithRoutes();

    const searchInput = getByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, 'btc');

    // Tap Cryptos pill to activate it
    const cryptosPill = await findByTestId(
      ExploreSearchScreenSelectorsIDs.PILL_CRYPTOS,
    );
    await actButtonPress(cryptosPill);

    // Cryptos pill should now be selected (active): accessibilityState.selected === true
    await waitFor(() => {
      expect(cryptosPill.props.accessibilityState?.selected).toBe(true);
    });

    // Clear the search query via the clear button
    const clearButton = getByTestId('explore-search-clear-button');
    await actButtonPress(clearButton);

    // After clearing, the Cryptos pill should remain selected — clearing the
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

  it('"All" pill is selected by default and pill row is present on mount', async () => {
    const { getByTestId } = renderExploreSearchScreenWithRoutes();

    // The pill row is mounted immediately when V2 is enabled — it does not require
    // a search query. The "All" pill must be selected (active) by default.
    await waitFor(() => {
      const allPill = getByTestId(ExploreSearchScreenSelectorsIDs.PILL_ALL);
      expect(allPill).toBeOnTheScreen();
      expect(allPill.props.accessibilityState?.selected).toBe(true);
    });
  });
});
