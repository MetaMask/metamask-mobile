import '../../../../../../../tests/component-view/mocks';
import {
  renderWatchlistFullScreenViewWithRoutes,
  renderWatchlistSectionWithRoutes,
} from '../../../../../../../tests/component-view/renderers/watchlist';
import {
  setupWatchlistTokenApiMock,
  setupWatchlistStorageMock,
  setupWatchlistStoragePutMock,
  setupWatchlistSearchApiMock,
  setupReadOnlyNetworkStoreMock,
  clearWatchlistApiMocks,
  mockWatchlistAssetIds,
  mockWatchlistTokensResponse,
} from '../../../../../../../tests/component-view/api-mocking/watchlist';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockTrendingTokensData,
} from '../../../../../../../tests/component-view/api-mocking/trending';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import {
  act,
  fireEvent,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { WatchlistSearchContentTestIds } from './WatchlistSearchContent.testIds';
import { WatchlistSearchRowItemTestIds } from '../../components/WatchlistSearchRowItem/WatchlistSearchRowItem.testIds';
import { WatchlistStarButtonTestIds } from '../../components/WatchlistStarButton.testIds';
import { getTrendingTokenRowItemTestId } from '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';
import { TrendingViewSelectorsIDs } from '../../../../../Views/TrendingView/TrendingView.testIds';
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import ToastService from '../../../../../../core/ToastService/ToastService';

const NEWEST_FIRST_ASSET_IDS = [...mockWatchlistAssetIds].reverse();
const SEARCH_TOKEN = mockTrendingTokensData[1];

const getRowTestId = (assetId: string) => getTrendingTokenRowItemTestId(assetId);

beforeEach(() => {
  setupTrendingApiFetchMock(mockTrendingTokensData);
  setupWatchlistStorageMock();
  setupWatchlistTokenApiMock();
  setupReadOnlyNetworkStoreMock();
  jest.spyOn(ToastService, 'showToast').mockImplementation(() => undefined);
});

afterEach(() => {
  clearWatchlistApiMocks();
  clearTrendingApiMocks();
});

describeForPlatforms('WatchlistFullScreenView', () => {
  it('loads and displays all token fields for each editable row (newest first)', async () => {
    const { findAllByTestId } = renderWatchlistFullScreenViewWithRoutes({
      deterministicFiat: true,
    });

    const editableRows = await waitFor(async () => {
      const rows = await findAllByTestId(
        WatchlistFullScreenViewSelectorsIDs.EDITABLE_ROW,
      );
      expect(rows).toHaveLength(NEWEST_FIRST_ASSET_IDS.length);
      return rows;
    });

    editableRows.forEach((row, index) => {
      const assetId = NEWEST_FIRST_ASSET_IDS[index];
      const tokenMeta = mockWatchlistTokensResponse.find(
        (token) => token.assetId === assetId,
      );
      expect(tokenMeta).toBeDefined();

      const scope = within(row);
      expect(scope.getByText(tokenMeta?.name ?? '')).toBeOnTheScreen();

      const price = tokenMeta?.marketData?.price;
      if (price != null) {
        expect(
          scope.getByText(formatPriceWithSubscriptNotation(price, 'USD')),
        ).toBeOnTheScreen();
      }

      const pctChange = Number(tokenMeta?.marketData?.pricePercentChange1d ?? 0);
      const pctPrefix = pctChange > 0 ? '+' : pctChange < 0 ? '-' : '';
      expect(
        scope.getByText(`${pctPrefix}${Math.abs(pctChange).toFixed(2)}%`),
      ).toBeOnTheScreen();
    });
  });

  it('removes a token in edit mode and persists the update to storage', async () => {
    const assetToRemove = NEWEST_FIRST_ASSET_IDS[0];
    const putScope = setupWatchlistStoragePutMock();

    const { findByTestId, getAllByTestId, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({ deterministicFiat: true });

    await findByTestId(getRowTestId(assetToRemove));

    fireEvent.press(
      await findByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );

    const unwatchStars = getAllByTestId(
      WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR,
    );

    await act(async () => {
      fireEvent.press(unwatchStars[0]);
    });

    await waitFor(() => expect(putScope.isDone()).toBe(true));

    await waitFor(() => {
      expect(queryByTestId(getRowTestId(assetToRemove))).not.toBeOnTheScreen();
    });
    expect(queryByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[1]))).toBeOnTheScreen();
  });

  it('adds a token from search results and persists the update to storage', async () => {
    setupWatchlistSearchApiMock([SEARCH_TOKEN]);
    const putScope = setupWatchlistStoragePutMock();

    const { findByTestId, getAllByTestId } =
      renderWatchlistFullScreenViewWithRoutes({ deterministicFiat: true });

    await findByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[0]));

    fireEvent.press(
      await findByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    );

    await findByTestId(WatchlistSearchContentTestIds.CONTAINER);

    const searchInput = await findByTestId(
      TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
    );
    await userEvent.type(searchInput, SEARCH_TOKEN.symbol.toLowerCase());

    await waitFor(
      async () => {
        const rows = getAllByTestId(WatchlistSearchRowItemTestIds.ROW);
        expect(rows.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const searchRow = getAllByTestId(WatchlistSearchRowItemTestIds.ROW)[0];
    const starButton = within(searchRow).getByTestId(
      WatchlistStarButtonTestIds.BUTTON,
    );

    await act(async () => {
      fireEvent.press(starButton);
    });

    await waitFor(() => expect(putScope.isDone()).toBe(true));
  });

  it('navigates back to the homepage watchlist section', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderWatchlistSectionWithRoutes({ deterministicFiat: true });

    await findByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[0]));

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    );
    await findByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER);

    fireEvent.press(
      await findByTestId(WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON),
    );

    await waitFor(() => {
      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    });
    expect(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    ).toBeOnTheScreen();
  });
});
