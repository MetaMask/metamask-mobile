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
import { strings } from '../../../../../../locales/i18n';
import { formatPriceWithSubscriptNotation } from '../../../../UI/Predict/utils/format';

const NEWEST_FIRST_ASSET_IDS = [...mockWatchlistAssetIds].reverse();

const getRowTestId = (assetId: string) =>
  getTrendingTokenRowItemTestId(assetId);

beforeEach(() => {
  setupWatchlistStorageMock();
  setupWatchlistTokenApiMock();
  setupReadOnlyNetworkStoreMock();
});

afterEach(() => {
  clearWatchlistApiMocks();
});

describeForPlatforms('WatchlistSection', () => {
  it('loads and displays name, price, and percent change for each homepage row (newest first, max 3)', async () => {
    const { findByTestId } = renderWatchlistSectionWithRoutes({
      deterministicFiat: true,
    });

    for (const assetId of NEWEST_FIRST_ASSET_IDS) {
      const tokenMeta = mockWatchlistTokensResponse.find(
        (token) => token.assetId === assetId,
      );
      expect(tokenMeta).toBeDefined();

      const row = await findByTestId(getRowTestId(assetId));
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

    const { findByText, getByTestId, findByTestId } =
      renderWatchlistSectionWithRoutes();

    expect(
      await findByText(strings('token_watchlist.home_empty_subtitle')),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')),
    );

    await findByTestId(WatchlistEmptyCTATestIds.CONTAINER);
  });

  it('shows perps-style suggested tokens with add buttons in the empty state', async () => {
    setupWatchlistStorageMock(EMPTY_BLOB);

    const { findByText, findByTestId } = renderWatchlistSectionWithRoutes();

    expect(
      await findByText(strings('token_watchlist.home_empty_subtitle')),
    ).toBeOnTheScreen();

    // The suggested query hydrates the curated defaults; the token API mock
    // only serves ETH from those IDs, so exactly one suggested row renders.
    const suggestedRow = await findByTestId(getRowTestId('eip155:1/slip44:60'));
    expect(suggestedRow).toBeOnTheScreen();
    expect(
      await findByTestId(
        getTrendingTokenRowAddButtonTestId('eip155:1/slip44:60'),
      ),
    ).toBeOnTheScreen();
  });

  it('adds a suggested token to the watchlist from the empty state', async () => {
    setupWatchlistStorageMock(EMPTY_BLOB);
    const putScope = setupWatchlistStoragePutMock();

    const { findByTestId, queryByTestId } = renderWatchlistSectionWithRoutes();

    const addButton = await findByTestId(
      getTrendingTokenRowAddButtonTestId('eip155:1/slip44:60'),
    );

    await act(async () => {
      fireEvent.press(addButton);
    });

    await waitFor(() => expect(putScope.isDone()).toBe(true), {
      timeout: 5000,
    });

    // The add flips the section from the empty state to watchlist mode: the
    // suggested + button disappears and the added token renders as a row.
    await waitFor(
      () =>
        expect(
          queryByTestId(
            getTrendingTokenRowAddButtonTestId('eip155:1/slip44:60'),
          ),
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
