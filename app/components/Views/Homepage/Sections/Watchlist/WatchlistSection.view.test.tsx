import '../../../../../../tests/component-view/mocks';
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
import {
  getTrendingTokenRowItemTestId,
  getTrendingTokenRowAddButtonTestId,
} from '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';
import { WatchlistFullScreenViewSelectorsIDs } from '../../../../UI/Assets/watchlist/Views/WatchlistFullScreenView/WatchlistFullScreenView.testIds';
import { WatchlistEmptyCTATestIds } from '../../../../UI/Assets/watchlist/components/WatchlistEmptyCTA/WatchlistEmptyCTA.testIds';
import { WatchlistStarButtonTestIds } from '../../../../UI/Assets/watchlist/components/WatchlistStarButton.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- mirrors WatchlistSection.tsx (ADR-0020 backlog)
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { EMPTY_BLOB } from '../../../../UI/Assets/watchlist/storage';
import { formatPriceWithSubscriptNotation } from '../../../../UI/Predict/utils/format';

const NEWEST_FIRST_ASSET_IDS = [...mockWatchlistAssetIds].reverse();

const getRowTestId = (assetId: string) =>
  getTrendingTokenRowItemTestId(assetId);

const getAddButtonTestId = (assetId: string) =>
  getTrendingTokenRowAddButtonTestId(assetId);

beforeEach(() => {
  setupWatchlistStorageMock();
  setupWatchlistTokenApiMock();
  setupReadOnlyNetworkStoreMock();
});

afterEach(() => {
  clearWatchlistApiMocks();
});

describeForPlatforms('WatchlistSection', () => {
  it('loads and displays name, price, and percent change for each homepage row (newest first)', async () => {
    const { findByTestId, getByTestId } = renderWatchlistSectionWithRoutes({
      deterministicFiat: true,
    });

    await waitFor(
      () => {
        for (const assetId of NEWEST_FIRST_ASSET_IDS) {
          expect(getByTestId(getRowTestId(assetId))).toBeOnTheScreen();
        }
      },
      { timeout: 5000 },
    );

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

  it('shows the empty section state and navigates to the full-screen empty CTA', async () => {
    setupWatchlistStorageMock(EMPTY_BLOB);

    const { getByTestId, findByTestId } = renderWatchlistSectionWithRoutes();

    // Empty state = suggested rows with add buttons below the header
    expect(
      await findByTestId(getAddButtonTestId('eip155:1/slip44:60')),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    );

    await findByTestId(WatchlistEmptyCTATestIds.CONTAINER);
  });

  it('shows suggested tokens with star buttons and no helper copy in the empty state', async () => {
    setupWatchlistStorageMock(EMPTY_BLOB);

    const { findByTestId, getByTestId, queryByTestId } =
      renderWatchlistSectionWithRoutes();

    // The suggested query hydrates the curated defaults; the token API mock
    // only serves ETH from those IDs, so exactly one suggested row renders.
    const suggestedRow = await findByTestId(getRowTestId('eip155:1/slip44:60'));
    expect(suggestedRow).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(queryByTestId('watchlist-suggested-header')).not.toBeOnTheScreen();
    const addButton = await findByTestId(
      getAddButtonTestId('eip155:1/slip44:60'),
    );
    expect(addButton).toBeOnTheScreen();
    expect(
      getByTestId(getAddButtonTestId('eip155:1/slip44:60')).props
        .accessibilityLabel,
    ).toBe('Add to watchlist');
  });

  it('shows the Suggested sub-header and 5-2=3 suggestions when 2 tokens are watched', async () => {
    // Watch UNI + USDC; serve the curated default pool (ETH, BTC, SOL, BNB)
    // from the token API so 5 - 2 = 3 suggestions remain.
    setupWatchlistStorageMock({
      assets: [...mockWatchlistAssetIds].slice(1),
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

    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderWatchlistSectionWithRoutes();

    // 2 watched tokens render as watchlist rows (no add buttons)
    expect(
      await findByTestId(
        getRowTestId(
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getRowTestId(
          'eip155:1/erc20:0x1f9840a85d8aBE325823995344D8762464388D4',
        ),
      ),
    ).toBeOnTheScreen();
    // 3 suggested tokens (with add buttons)
    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-header')).toBeOnTheScreen();
    expect(getByText('Suggested')).toBeOnTheScreen();
    for (const assetId of [
      'eip155:1/slip44:60',
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    ]) {
      expect(getByTestId(getAddButtonTestId(assetId))).toBeOnTheScreen();
    }

    // More items above cap (5) are not shown.
    expect(
      queryByTestId(getAddButtonTestId('eip155:56/slip44:714')),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        getAddButtonTestId(
          'eip155:1/erc20:0x1f9840a85d8aBE325823995344D8762464388D4',
        ),
      ),
    ).not.toBeOnTheScreen();
  });

  it('caps the homepage at 5 rows and hides suggestions entirely once the watchlist is full', async () => {
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
    // A full watchlist (5+) offers no suggestions — the section hides.
    expect(queryByTestId('watchlist-suggested-section')).not.toBeOnTheScreen();
  });

  it('adds a suggested token to the watchlist from the empty state', async () => {
    setupWatchlistStorageMock(EMPTY_BLOB);
    const putScope = setupWatchlistStoragePutMock();

    const { findByTestId, queryByTestId } = renderWatchlistSectionWithRoutes();

    const addButton = await findByTestId(
      getAddButtonTestId('eip155:1/slip44:60'),
    );

    await act(async () => {
      fireEvent.press(addButton);
    });

    await waitFor(() => expect(putScope.isDone()).toBe(true), {
      timeout: 5000,
    });

    // The add flips the section from the empty state to watchlist mode: the
    // suggested star button disappears and the added token renders as a row.
    await waitFor(
      () =>
        expect(
          queryByTestId(getAddButtonTestId('eip155:1/slip44:60')),
        ).toBeNull(),
      { timeout: 5000 },
    );
    expect(
      await findByTestId(getRowTestId('eip155:1/slip44:60')),
    ).toBeOnTheScreen();
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
