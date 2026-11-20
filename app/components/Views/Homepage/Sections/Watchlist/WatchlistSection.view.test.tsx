import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import {
  renderWatchlistSectionWithRoutes,
  renderWatchlistJourneyWithRoutes,
} from '../../../../../../tests/component-view/renderers/watchlist';
import {
  setupWatchlistTokenApiMock,
  setupWatchlistStorageMock,
  setupWatchlistStoragePutMock,
  setupReadOnlyNetworkStoreMock,
  clearWatchlistApiMocks,
  mockWatchlistAssetIds,
  mockWatchlistTokensResponse,
} from '../../../../../../tests/component-view/api-mocking/watchlist';
import { clearAllNockMocks } from '../../../../../../tests/component-view/api-mocking/nockHelpers';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { getTrendingTokenRowItemTestId } from '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';
import { WatchlistFullScreenViewSelectorsIDs } from '../../../../UI/Assets/watchlist/Views/WatchlistFullScreenView/WatchlistFullScreenView.testIds';
import { WatchlistStarButtonTestIds } from '../../../../UI/Assets/watchlist/components/WatchlistStarButton.testIds';
import { getPerpsMarketRowItemSelector } from '../../../../UI/Perps/Perps.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- mirrors WatchlistSection.tsx (ADR-0020 backlog)
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { EMPTY_BLOB } from '../../../../UI/Assets/watchlist/storage';
import { formatPriceWithSubscriptNotation } from '../../../../../util/number/subscriptNotation';

const NEWEST_FIRST_ASSET_IDS = [...mockWatchlistAssetIds].reverse();

const getRowTestId = (assetId: string) =>
  getTrendingTokenRowItemTestId(assetId);
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

beforeEach(() => {
  netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  setupWatchlistStorageMock();
  setupWatchlistTokenApiMock();
  setupReadOnlyNetworkStoreMock();
});

afterEach(() => {
  clearWatchlistApiMocks();
  netInfoMock.__resetMockNetInfo();
});

describeForPlatforms('WatchlistSection', () => {
  it('loads and displays name, price, and percent change for each homepage row (newest first)', async () => {
    const { findByTestId, getByTestId } = renderWatchlistSectionWithRoutes({
      deterministicFiat: true,
    });

    for (const assetId of NEWEST_FIRST_ASSET_IDS) {
      await findByTestId(getRowTestId(assetId), {}, { timeout: 5000 });
    }

    for (const assetId of NEWEST_FIRST_ASSET_IDS) {
      const tokenMeta = mockWatchlistTokensResponse.find(
        (token) => token.assetId === assetId,
      );
      expect(tokenMeta).toBeDefined();

      const row = getByTestId(getRowTestId(assetId));
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
    }
  });

  it('renders a Perps favorite beside a same-ticker token', async () => {
    const { findByTestId, queryByTestId } = renderWatchlistSectionWithRoutes({
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
          },
        ],
      },
    });

    await findByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[0]));
    await findByTestId(getPerpsMarketRowItemSelector.rowItem('ETH'));
    expect(
      queryByTestId(getPerpsMarketRowItemSelector.badge('ETH')),
    ).not.toBeOnTheScreen();
  });

  it('navigates to the full-screen watchlist when the section header is pressed', async () => {
    const { findByTestId, getByTestId } = renderWatchlistSectionWithRoutes();

    await findByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[0]));

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    );

    await findByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER);
  });

  it('navigates to Token Details when a watchlist row is pressed', async () => {
    const { findByTestId } = renderWatchlistSectionWithRoutes();

    const row = await findByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[0]));
    fireEvent.press(row);

    await findByTestId(WatchlistStarButtonTestIds.BUTTON);
  });

  it('shows suggestions in the empty section and navigates to the full-screen watchlist', async () => {
    setupWatchlistStorageMock(EMPTY_BLOB);

    const { getByTestId, findByTestId, queryByTestId } =
      renderWatchlistSectionWithRoutes();

    expect(await findByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(queryByTestId('watchlist-empty-fallback')).toBeNull();
    expect(queryByTestId('watchlist-suggested-header')).toBeNull();

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    );

    await findByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER);
  });

  it('caps the homepage at 5 saved rows', async () => {
    // Watch 6 tokens: the 3 mock defaults plus BTC, SOL, BNB.
    const extraWatchedIds = [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      'eip155:56/slip44:714',
    ];
    setupWatchlistStorageMock({
      assets: [...mockWatchlistAssetIds, ...extraWatchedIds],
      version: 1,
    });
    // Replace the default beforeEach interceptors (they stack, so clear first).
    clearAllNockMocks();
    setupWatchlistTokenApiMock([
      ...mockWatchlistTokensResponse,
      {
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 18,
        marketData: {
          price: '90000.00',
          pricePercentChange1d: '1.10',
          marketCap: 900_000_000_000,
          totalVolume: 20_000_000_000,
        },
      },
      {
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 18,
        marketData: {
          price: '150.00',
          pricePercentChange1d: '-2.00',
          marketCap: 80_000_000_000,
          totalVolume: 4_000_000_000,
        },
      },
      {
        assetId: 'eip155:56/slip44:714',
        symbol: 'BNB',
        name: 'BNB',
        decimals: 18,
        marketData: {
          price: '600.00',
          pricePercentChange1d: '0.50',
          marketCap: 90_000_000_000,
          totalVolume: 2_000_000_000,
        },
      },
    ]);

    const { findByTestId, getByTestId, queryByTestId } =
      renderWatchlistSectionWithRoutes();

    // Newest-first: the 5 most recently watched render…
    for (const assetId of [...extraWatchedIds].reverse()) {
      expect(await findByTestId(getRowTestId(assetId))).toBeOnTheScreen();
    }
    expect(
      getByTestId(getRowTestId(mockWatchlistAssetIds[1])),
    ).toBeOnTheScreen();
    expect(
      getByTestId(getRowTestId(mockWatchlistAssetIds[2])),
    ).toBeOnTheScreen();
    // the oldest (ETH, watched first) is pushed out of the 5-row window.
    expect(
      queryByTestId(getRowTestId(mockWatchlistAssetIds[0])),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('Watchlist cross-journey', () => {
  it('navigates section → full view → row → TDP and toggles watchlist storage on the star', async () => {
    const removeScope = setupWatchlistStoragePutMock();
    const { findByTestId, getByTestId } = renderWatchlistJourneyWithRoutes({
      deterministicFiat: true,
    });

    await findByTestId(getRowTestId(NEWEST_FIRST_ASSET_IDS[0]));

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    );
    await findByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER);

    const fullViewRow = await findByTestId(
      getRowTestId(NEWEST_FIRST_ASSET_IDS[0]),
    );
    fireEvent.press(fullViewRow);

    const starButton = await findByTestId(WatchlistStarButtonTestIds.BUTTON);

    await act(async () => {
      fireEvent.press(starButton);
    });

    await waitFor(() => expect(removeScope.isDone()).toBe(true));

    const addScope = setupWatchlistStoragePutMock();

    await act(async () => {
      fireEvent.press(starButton);
    });

    await waitFor(() => expect(addScope.isDone()).toBe(true));
  });
});
