import '../../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../../__mocks__/@react-native-community/netinfo';
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
  getWatchlistStorageBlob,
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
import { WatchlistEmptyCTATestIds } from '../../components/WatchlistEmptyCTA/WatchlistEmptyCTA.testIds';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistSearchRowItemTestIds } from '../../components/WatchlistSearchRowItem/WatchlistSearchRowItem.testIds';
import { WatchlistStarButtonTestIds } from '../../components/WatchlistStarButton.testIds';
import {
  getTrendingTokenRowAddButtonTestId,
  getTrendingTokenRowItemTestId,
} from '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';
import { TrendingViewSelectorsIDs } from '../../../../../Views/TrendingView/TrendingView.testIds';
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import { formatPriceWithSubscriptNotation } from '../../../../../../util/number/subscriptNotation';
import { getPerpsMarketRowItemSelector } from '../../../../Perps/Perps.testIds';
import {
  getUnavailablePerpRemoveButtonTestId,
  getUnavailablePerpRowTestId,
} from '../../../../Watchlist/WatchlistUnavailablePerpRow';
import { WatchlistErrorRowTestIds } from '../../../../Watchlist/WatchlistErrorRow.testIds';
import { createEthMarketForViews } from '../../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import Engine from '../../../../../../core/Engine';

const NEWEST_FIRST_ASSET_IDS = [...mockWatchlistAssetIds].reverse();
const SEARCH_TOKEN = mockTrendingTokensData[1];

const getRowTestId = (assetId: string): string =>
  getTrendingTokenRowItemTestId(assetId);
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

beforeEach(() => {
  netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  setupTrendingApiFetchMock(mockTrendingTokensData);
  setupWatchlistStorageMock();
  setupWatchlistTokenApiMock();
  setupReadOnlyNetworkStoreMock();
});

afterEach(() => {
  clearWatchlistApiMocks();
  clearTrendingApiMocks();
  netInfoMock.__resetMockNetInfo();
});

describeForPlatforms('WatchlistFullScreenView', () => {
  it('loads and displays all token fields for each editable row (newest first)', async () => {
    const { getAllByTestId } = renderWatchlistFullScreenViewWithRoutes({
      deterministicFiat: true,
    });

    const editableRows = await waitFor(() => {
      const rows = getAllByTestId(
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

      const pctChange = Number(
        tokenMeta?.marketData?.pricePercentChange1d ?? 0,
      );
      const pctPrefix = pctChange > 0 ? '+' : pctChange < 0 ? '-' : '';
      expect(
        scope.getByText(`${pctPrefix}${Math.abs(pctChange).toFixed(2)}%`),
      ).toBeOnTheScreen();
    });
  });

  it('renders unified mixed rows with star buttons and no edit mode', async () => {
    const { findByTestId, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({
        unifiedWatchlist: true,
        perpsWatchlistSymbols: ['ETH'],
        streamOverrides: {
          marketData: [
            createEthMarketForViews({
              name: 'Ethereum Perpetual',
              marketType: 'index',
            }),
          ],
        },
      });

    expect(
      await findByTestId(getRowTestId(mockWatchlistAssetIds[0])),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(getPerpsMarketRowItemSelector.rowItem('ETH')),
    ).toBeOnTheScreen();
    expect(
      within(
        await findByTestId(getRowTestId(mockWatchlistAssetIds[0])),
      ).getByText('Token'),
    ).toBeOnTheScreen();
    expect(
      within(
        await findByTestId(getPerpsMarketRowItemSelector.rowItem('ETH')),
      ).getByText('Perp'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getPerpsMarketRowItemSelector.badge('ETH')),
    ).not.toBeOnTheScreen();
    expect(
      await findByTestId(
        getTrendingTokenRowAddButtonTestId(mockWatchlistAssetIds[0]),
      ),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(getPerpsMarketRowItemSelector.addButton('ETH')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('keeps watched Perps loading until the first market snapshot resolves', async () => {
    const { findByTestId, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({
        unifiedWatchlist: true,
        perpsWatchlistSymbols: ['ETH'],
        streamOverrides: { marketData: null },
      });

    expect(
      await findByTestId(getRowTestId(mockWatchlistAssetIds[0])),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getUnavailablePerpRowTestId('ETH')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('does not treat a cold offline token watchlist as empty', async () => {
    netInfoMock.__setMockNetInfo({
      type: 'none',
      isInternetReachable: false,
    });

    const { findByTestId } = renderWatchlistFullScreenViewWithRoutes({
      unifiedWatchlist: true,
      perpsWatchlistSymbols: [],
    });

    expect(await findByTestId(WatchlistErrorRowTestIds.ROW)).toBeOnTheScreen();
  });

  it('removes an unavailable watched Perps market via its star button', async () => {
    const toggleWatchlistMarket = Engine.context.PerpsController
      .toggleWatchlistMarket as jest.Mock;
    const getWatchlistMarkets = Engine.context.PerpsController
      .getWatchlistMarkets as jest.Mock;
    toggleWatchlistMarket.mockClear();
    getWatchlistMarkets.mockReturnValueOnce(['DOGE']);
    const { findByTestId, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({
        unifiedWatchlist: true,
        perpsWatchlistSymbols: ['DOGE'],
        streamOverrides: { marketData: [] },
      });

    expect(
      await findByTestId(getUnavailablePerpRowTestId('DOGE')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(getUnavailablePerpRemoveButtonTestId('DOGE')),
    );

    await waitFor(() => {
      expect(toggleWatchlistMarket).toHaveBeenCalledWith('DOGE');
    });
  });

  it('restores an unavailable Perps row when removal fails', async () => {
    const toggleWatchlistMarket = Engine.context.PerpsController
      .toggleWatchlistMarket as jest.Mock;
    const getWatchlistMarkets = Engine.context.PerpsController
      .getWatchlistMarkets as jest.Mock;
    getWatchlistMarkets.mockReturnValueOnce(['DOGE']);
    toggleWatchlistMarket.mockRejectedValueOnce(
      new Error('Persistence failed'),
    );
    const { findByTestId } = renderWatchlistFullScreenViewWithRoutes({
      unifiedWatchlist: true,
      perpsWatchlistSymbols: ['DOGE'],
      streamOverrides: { marketData: [] },
    });

    await findByTestId(getUnavailablePerpRowTestId('DOGE'));
    fireEvent.press(
      await findByTestId(getUnavailablePerpRemoveButtonTestId('DOGE')),
    );

    await waitFor(() => {
      expect(toggleWatchlistMarket).toHaveBeenCalledWith('DOGE');
    });
    expect(
      await findByTestId(getUnavailablePerpRowTestId('DOGE')),
    ).toBeOnTheScreen();
  });

  it('removes a token directly via its star button and persists the update to storage', async () => {
    const assetToRemove = mockWatchlistAssetIds[2];
    const putScope = setupWatchlistStoragePutMock();

    const { findByTestId, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({
        deterministicFiat: true,
        unifiedWatchlist: true,
      });

    await findByTestId(getRowTestId(assetToRemove));
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).not.toBeOnTheScreen();
    expect(queryByTestId('watchlist-suggested-section')).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(
        await findByTestId(getTrendingTokenRowAddButtonTestId(assetToRemove)),
      );
    });

    await waitFor(() => expect(putScope.isDone()).toBe(true));
    expect(
      getWatchlistStorageBlob().assets.map((id) => id.toLowerCase()),
    ).toEqual(mockWatchlistAssetIds.slice(0, 2).map((id) => id.toLowerCase()));
    expect(
      queryByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[1])),
    ).toBeOnTheScreen();
    expect(await findByTestId('watchlist-suggested-section')).toBeOnTheScreen();
  });

  it('filters unified watchlist items between All, Tokens, and Perps', async () => {
    const { findByTestId, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({
        deterministicFiat: true,
        unifiedWatchlist: true,
        perpsWatchlistSymbols: ['ETH'],
        streamOverrides: {
          marketData: [
            {
              symbol: 'ETH',
              name: 'Ethereum Perpetual',
              maxLeverage: '50x',
              price: '$2,000.00',
              change24h: '+$50.00',
              change24hPercent: '+2.50%',
              volume: '$1.5B',
              openInterest: '$500M',
              marketType: 'index',
            },
          ],
        },
      });

    await findByTestId(getRowTestId(mockWatchlistAssetIds[0]));
    await findByTestId(getPerpsMarketRowItemSelector.rowItem('ETH'));

    fireEvent.press(
      await findByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_PERPS),
    );
    await waitFor(() => {
      expect(
        queryByTestId(getRowTestId(mockWatchlistAssetIds[0])),
      ).not.toBeOnTheScreen();
    });
    expect(
      queryByTestId(getPerpsMarketRowItemSelector.rowItem('ETH')),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS),
    );
    await waitFor(() => {
      expect(
        queryByTestId(getPerpsMarketRowItemSelector.rowItem('ETH')),
      ).not.toBeOnTheScreen();
    });
    expect(
      queryByTestId(getRowTestId(mockWatchlistAssetIds[0])),
    ).toBeOnTheScreen();
  });

  it('shows the filtered empty state on the Tokens tab when only Perps are watched', async () => {
    setupWatchlistStorageMock({ version: 1, assets: [] });
    setupWatchlistTokenApiMock([]);

    const perpsMarkets = [
      createEthMarketForViews(),
      {
        ...createEthMarketForViews(),
        symbol: 'BTC',
        name: 'Bitcoin Perpetual',
      },
      {
        ...createEthMarketForViews(),
        symbol: 'SOL',
        name: 'Solana Perpetual',
      },
    ];

    const { findByTestId, findByText, queryByTestId } =
      renderWatchlistFullScreenViewWithRoutes({
        deterministicFiat: true,
        unifiedWatchlist: true,
        perpsWatchlistSymbols: ['ETH', 'BTC', 'SOL'],
        streamOverrides: {
          marketData: perpsMarkets,
        },
      });

    await findByTestId(getPerpsMarketRowItemSelector.rowItem('ETH'));

    fireEvent.press(
      await findByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS),
    );

    expect(
      await findByText(strings('token_watchlist.no_tokens_found')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WatchlistEmptyCTATestIds.CONTAINER),
    ).not.toBeOnTheScreen();
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

    await waitFor(async () => {
      const rows = getAllByTestId(WatchlistSearchRowItemTestIds.ROW);
      expect(rows.length).toBeGreaterThan(0);
    });

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
