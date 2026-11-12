import '../../../../../../tests/component-view/mocks';
import { FlashList } from '@shopify/flash-list';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import { refreshPackPartnerReads } from '../../../../../../tests/component-view/fixtures/collectibles-data-services';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import {
  CollectiblesAttentionBannerTestIds,
  CollectiblesCardTileTestIds,
  CollectiblesCardsTestIds,
  CollectiblesErrorPanelTestIds,
  CollectiblesHomeTestIds,
  CollectiblesPackCardTestIds,
  CollectiblesPackDetailTestIds,
  CollectiblesPacksTestIds,
  CollectiblesPurchaseSheetTestIds,
} from '../../Collectibles.testIds';
import CollectiblesPack from '../CollectiblesPack/CollectiblesPack';
import CollectiblesSearch from '../CollectiblesSearch/CollectiblesSearch';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import { PACK_PARTNER_ENVIRONMENT } from '../../providers/pack-partner/constants';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import type { CollectiblesCard, CollectiblesPackOperation } from '../../types';
import { packPartnerQueries } from '../../services/data/packPartnerQueries';
import type { CollectiblesHomeParams } from '../../types/navigation';
import {
  MOCK_ACCOUNT,
  packPartnerReads,
  createCard,
  createOperation,
  createPack,
  serveOwnedCards,
} from '../testUtils';

const controller = {
  generatePack: jest.fn(),
  recoverOperations: jest.fn(),
};
const POKEMON_PACK = createPack();
const ONE_PIECE_PACK = createPack({
  code: 'one_piece_25',
  name: 'One Piece Pack',
  category: 'One Piece',
  price: 25,
});
const CARD = createCard({ mint: 'MintA' });
const renderHome = ({
  ownedCards = [],
  operations = [],
  usdcAmount = '100',
  params = { initialTab: 'packs' },
  hasSolanaAccount = true,
  overrides,
}: {
  /** Cards PackPartner reports for the account. */
  ownedCards?: CollectiblesCard[];
  operations?: CollectiblesPackOperation[];
  usdcAmount?: string;
  params?: CollectiblesHomeParams;
  hasSolanaAccount?: boolean;
  overrides?: DeepPartial<RootState>;
} = {}) =>
  renderCollectiblesView({
    ownedCards,
    operations,
    usdcAmount,
    hasSolanaAccount,
    overrides,
    params: params ? { ...params } : undefined,
    routes: [
      { name: Routes.COLLECTIBLES.PACK, Component: CollectiblesPack },
      { name: Routes.COLLECTIBLES.SEARCH, Component: CollectiblesSearch },
      ...[
        Routes.COLLECTIBLES.CARD,
        Routes.COLLECTIBLES.REVEAL,
        Routes.BROWSER.HOME,
      ].map((name) => ({
        name,
        Component: createRouteParamsProbe(name),
      })),
    ],
  });

const OWNED_CARDS_KEY = packPartnerQueries.getOwnedCards(
  PACK_PARTNER_ENVIRONMENT,
  MOCK_ACCOUNT.address,
).queryKey;

// CollectiblesSection.view.test.tsx owns homepage/card/collection/back navigation,
// including the updated initialTab parameter when returning from a card.
describeForPlatforms('CollectiblesHome', () => {
  beforeEach(() => {
    jest.mocked(toast).mockClear();
    Object.values(controller).forEach((method) => {
      if (jest.isMockFunction(method)) method.mockReset();
    });
    packPartnerReads.getPacks.mockResolvedValue([POKEMON_PACK, ONE_PIECE_PACK]);
    controller.recoverOperations.mockResolvedValue(undefined);
    Object.assign(Engine.context, { CollectiblesController: controller });
  });

  it.each([
    {
      shortcut: CollectiblesHomeTestIds.PACKS_TAB,
      destination: CollectiblesPacksTestIds.LIST,
    },
    {
      shortcut: CollectiblesHomeTestIds.CARDS_TAB,
      destination: CollectiblesCardsTestIds.LIST,
    },
    {
      shortcut: CollectiblesHomeTestIds.MARKET_TAB,
      destination: CollectiblesHomeTestIds.MARKET,
    },
  ])(
    'opens $destination from the hub and Back returns to the hub',
    async ({ shortcut, destination }) => {
      renderHome({ ownedCards: [CARD], params: { initialTab: 'home' } });
      fireEvent.press(await screen.findByTestId(shortcut));
      expect(await screen.findByTestId(destination)).toBeOnTheScreen();
      expect(
        screen.queryByTestId('collectibles-home-shortcuts'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesHomeTestIds.TABS),
      ).not.toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.BACK_BUTTON));
      expect(
        await screen.findByTestId('collectibles-home-shortcuts'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(destination)).not.toBeOnTheScreen();
      expect(controller.generatePack).not.toHaveBeenCalled();
    },
  );

  it('opens the Market partner inside the MetaMask browser without buying', async () => {
    renderHome({ params: { initialTab: 'market' } });
    await screen.findByTestId(CollectiblesHomeTestIds.MARKET);

    fireEvent.press(
      screen.getByTestId(CollectiblesHomeTestIds.MARKET_OPEN_PARTNER),
    );

    expect(
      await screen.findByTestId(getRouteParamsProbeTestId(Routes.BROWSER.HOME)),
    ).toHaveTextContent(/BrowserView/u);
    expect(
      screen.getByTestId(getRouteParamsProbeTestId(Routes.BROWSER.HOME)),
    ).toHaveTextContent(/\/marketplace\/cards/u);
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('loads pack data and collection filters without the legacy balance header', async () => {
    renderHome({ usdcAmount: '100.999999' });

    expect(
      await screen.findByTestId(CollectiblesPacksTestIds.FILTERS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPacksTestIds.COLLECTION_FILTER('')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        CollectiblesPacksTestIds.COLLECTION_FILTER('One Piece'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPacksTestIds.COLLECTION_FILTER('Pokémon')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.BALANCE),
    ).not.toBeOnTheScreen();
    for (const pack of [POKEMON_PACK, ONE_PIECE_PACK]) {
      const row = within(
        screen.getByTestId(CollectiblesPackCardTestIds.CARD(pack.code)),
      );
      expect(
        row.getByText(
          getCollectiblesPackArtwork(`pack_partner:${pack.code}`).name ??
            pack.name,
        ),
      ).toBeOnTheScreen();
      expect(
        row.getByText(
          strings('collectibles_discovery.open_for', {
            amount: `$${pack.price}`,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        row.getByTestId(CollectiblesPackCardTestIds.CARD(pack.code)),
      ).toBeEnabled();
    }
  });

  it('sums insured values without using marketplace listing prices', async () => {
    renderHome({
      params: { initialTab: 'cards' },
      ownedCards: [
        createCard({ mint: 'insured', insuredValue: 13, listedPriceUsd: 999 }),
        createCard({
          mint: 'unknown',
          insuredValue: undefined,
          listedPriceUsd: 500,
        }),
      ],
    });
    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.TOTAL_VALUE),
    ).toHaveProp('accessibilityLabel', '$13.00');
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('insured')),
    ).toHaveTextContent('$13.00');
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('unknown')),
    ).toHaveTextContent('—');
  });

  it('converts collection totals and insured card values into the selected fiat currency', async () => {
    const { store } = renderHome({
      params: { initialTab: 'cards' },
      ownedCards: [
        createCard({ mint: 'first', insuredValue: 100, listedPriceUsd: 999 }),
        createCard({ mint: 'second', insuredValue: 25 }),
      ],
      overrides: {
        engine: {
          backgroundState: {
            AssetsController: {
              selectedCurrency: 'eur',
              assetsInfo: {
                'eip155:1/slip44:60': {
                  type: 'native',
                  symbol: 'ETH',
                  name: 'Ether',
                  decimals: 18,
                },
              },
              assetsPrice: {
                'eip155:1/slip44:60': {
                  assetPriceType: 'fungible',
                  price: 1600,
                  usdPrice: 2000,
                  lastUpdated: 1,
                },
              },
            },
          },
        },
      },
    });

    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.TOTAL_VALUE),
    ).toHaveProp('accessibilityLabel', '€100.00');
    for (const [mint, value] of [
      ['first', '€80.00'],
      ['second', '€20.00'],
    ]) {
      expect(
        await screen.findByTestId(CollectiblesCardTileTestIds.VALUE(mint)),
      ).toHaveTextContent(value);
    }

    act(() => {
      Object.assign(Engine, {
        state: {
          AssetsController: {
            ...store.getState().engine.backgroundState.AssetsController,
            selectedCurrency: 'usd',
          },
        },
      });
      store.dispatch(updateBgState({ key: 'AssetsController' }));
    });

    expect(screen.getByTestId(CollectiblesCardsTestIds.TOTAL_VALUE)).toHaveProp(
      'accessibilityLabel',
      '$125.00',
    );
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('first')),
    ).toHaveTextContent('$100.00');
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.VALUE('second')),
    ).toHaveTextContent('$25.00');
  });

  it('does not label USD valuations as the selected currency while its conversion rate is unavailable', async () => {
    renderHome({
      params: { initialTab: 'cards' },
      ownedCards: [CARD],
      overrides: {
        engine: {
          backgroundState: { AssetsController: { selectedCurrency: 'eur' } },
        },
      },
    });

    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.TOTAL_VALUE),
    ).toHaveProp('accessibilityLabel', '—');
    expect(
      await screen.findByTestId(CollectiblesCardTileTestIds.VALUE(CARD.mint)),
    ).toHaveTextContent('—');
  });

  it('opens unified local search and preserves the owned-card destination', async () => {
    renderHome({ ownedCards: [CARD] });
    await screen.findByTestId(CollectiblesPacksTestIds.FILTERS);

    fireEvent.press(screen.getByTestId('collectibles-packs-search-entry'));
    await screen.findByTestId('collectibles-search');
    expect(
      await screen.findByTestId(`collectibles-discovery-card-${CARD.mint}`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('collectibles-search-scope-cards'));
    fireEvent.changeText(
      screen.getByPlaceholderText(
        strings('collectibles_discovery.search_packs_cards'),
      ),
      CARD.set,
    );
    fireEvent.press(
      await screen.findByTestId(`collectibles-discovery-card-${CARD.mint}`),
    );

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.CARD),
      ),
    ).toHaveTextContent(JSON.stringify({ mint: CARD.mint }));
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('filters the owned collection through the category sheet and restores all cards', async () => {
    const sports = createCard({
      mint: 'SportsCard',
      category: 'Sports',
      set: 'Sports Set',
    });
    renderHome({ ownedCards: [CARD, sports], params: { initialTab: 'cards' } });
    await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint));
    fireEvent.press(screen.getByTestId('collectibles-card-category-filter'));
    fireEvent.press(await screen.findByTestId('collectibles-option-Sports'));
    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE(sports.mint)),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('collectibles-card-category-filter'));
    fireEvent.press(await screen.findByTestId('collectibles-option-'));
    expect(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE(sports.mint)),
    ).toBeOnTheScreen();
  });

  it('keeps Collection search at touch-target height and opens owned-card search', async () => {
    renderHome({ ownedCards: [CARD], params: { initialTab: 'cards' } });
    await screen.findByTestId(CollectiblesCardsTestIds.TOTAL_VALUE);
    const searchEntry = screen.getByTestId(
      CollectiblesCardsTestIds.SEARCH_ENTRY,
    );

    expect(searchEntry).toHaveStyle({ minHeight: 48 });
    expect(
      screen.getByTestId(CollectiblesCardsTestIds.SEARCH_INPUT, {
        includeHiddenElements: true,
      }),
    ).toHaveProp('editable', false);
    fireEvent.press(searchEntry);

    expect(
      await screen.findByTestId(`collectibles-discovery-card-${CARD.mint}`),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(`collectibles-discovery-card-${CARD.mint}`),
    );
    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.CARD),
      ),
    ).toHaveTextContent(JSON.stringify({ mint: CARD.mint }));
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows selectable sort labels and closes the sheet after selection', async () => {
    renderHome();
    await screen.findByTestId(CollectiblesPacksTestIds.FILTERS);
    fireEvent.press(screen.getByTestId('collectibles-pack-sort'));
    const descending = await screen.findByTestId(
      'collectibles-option-priceDesc',
    );
    expect(descending).toHaveTextContent(
      strings('collectibles_discovery.sort_priceDesc'),
    );
    fireEvent.press(descending);
    await waitFor(() =>
      expect(
        screen.queryByTestId('collectibles-option-priceDesc'),
      ).not.toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId('collectibles-pack-sort'));
    expect(
      (await screen.findByTestId('collectibles-option-priceDesc')).props
        .accessibilityState?.selected,
    ).toBe(true);
  });

  it('filters packs to one collection at a time', async () => {
    renderHome();

    await screen.findByTestId(CollectiblesPacksTestIds.FILTERS);
    fireEvent.press(
      screen.getByTestId(
        CollectiblesPacksTestIds.COLLECTION_FILTER('One Piece'),
      ),
    );

    expect(
      screen.getByTestId(CollectiblesPackCardTestIds.CARD(ONE_PIECE_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(
        CollectiblesPacksTestIds.COLLECTION_FILTER('One Piece'),
      ).props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(CollectiblesPacksTestIds.COLLECTION_FILTER('')).props
        .accessibilityState?.selected,
    ).toBe(false);

    fireEvent.press(
      screen.getByTestId(CollectiblesPacksTestIds.COLLECTION_FILTER('')),
    );

    expect(
      screen.getByTestId(CollectiblesPackCardTestIds.CARD(ONE_PIECE_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPacksTestIds.COLLECTION_FILTER('')).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(
        CollectiblesPacksTestIds.COLLECTION_FILTER('One Piece'),
      ).props.accessibilityState?.selected,
    ).toBe(false);
  });

  it('reads the cards of the selected account from PackPartner on mount, leaving recovery to the controller', async () => {
    renderHome({ ownedCards: [CARD], params: { initialTab: 'cards' } });

    expect(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledTimes(1);
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledWith(
      MOCK_ACCOUNT.address,
    );
    expect(controller.recoverOperations).not.toHaveBeenCalled();
  });

  it('waits until Collection is visible before reading holdings and buyback offers', async () => {
    renderHome({ ownedCards: [CARD], params: { initialTab: 'home' } });
    await screen.findByTestId('collectibles-home-shortcuts');

    expect(packPartnerReads.getOwnedCards).not.toHaveBeenCalled();
    expect(packPartnerReads.getBuybackOffer).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.CARDS_TAB));

    expect(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith(CARD.mint),
    );
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledTimes(1);
  });

  it('shows the empty collection with a path back to packs', async () => {
    renderHome({ params: { initialTab: 'home' } });
    fireEvent.press(
      await screen.findByTestId(CollectiblesHomeTestIds.CARDS_TAB),
    );

    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.EMPTY),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(CollectiblesCardsTestIds.EMPTY_CTA));
    expect(
      await screen.findByTestId(CollectiblesPacksTestIds.LIST),
    ).toBeOnTheScreen();
  });

  it('opens My cards when the account has cards and opens a card', async () => {
    renderHome({ ownedCards: [CARD], params: { initialTab: 'home' } });
    await screen.findByTestId('collectibles-home-shortcuts');

    fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.CARDS_TAB));
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    );

    expect(
      screen.queryByTestId(CollectiblesPacksTestIds.LIST),
    ).not.toBeOnTheScreen();
    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.CARD),
      ),
    ).toHaveTextContent(JSON.stringify({ mint: 'MintA' }));
  });

  it('opens My cards from the initialTab param', async () => {
    renderHome({ ownedCards: [CARD], params: { initialTab: 'cards' } });

    expect(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
  });

  it('keeps the requested collection tab when the sync finds no cards', async () => {
    renderHome({ params: { initialTab: 'cards' } });

    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.EMPTY),
    ).toBeOnTheScreen();
  });

  it('opens My cards with the read error and its retry when the first owned-card read fails', async () => {
    packPartnerReads.getOwnedCards.mockRejectedValueOnce(
      createPackPartnerError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome({ params: { initialTab: 'cards' } });

    expect(
      await screen.findByText(strings('collectibles.errors.network_error')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPacksTestIds.LIST),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(CollectiblesErrorPanelTestIds.RETRY));

    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.EMPTY),
    ).toBeOnTheScreen();
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledTimes(2);
  });

  it('keeps My cards reachable after a failed owned-card read without cached cards', async () => {
    packPartnerReads.getOwnedCards.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome({ params: { initialTab: 'home' } });
    fireEvent.press(
      await screen.findByTestId(CollectiblesHomeTestIds.CARDS_TAB),
    );

    expect(
      await screen.findByText(strings('collectibles.errors.network_error')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPacksTestIds.LIST),
    ).not.toBeOnTheScreen();
  });

  it('shows the empty collection once the owned-card read no longer returns its last card', async () => {
    renderHome({
      ownedCards: [CARD],
      params: { initialTab: 'cards' },
    });
    await screen.findByTestId(CollectiblesCardTileTestIds.TILE('MintA'));

    serveOwnedCards(MOCK_ACCOUNT.address, []);
    await act(async () => {
      await refreshPackPartnerReads(OWNED_CARDS_KEY);
    });

    expect(
      await screen.findByTestId(CollectiblesCardsTestIds.EMPTY),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardTileTestIds.TILE('MintA')),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPacksTestIds.LIST),
    ).not.toBeOnTheScreen();
  });

  it('shows the newest operation needing attention and opens its reveal', async () => {
    renderHome({
      operations: [
        createOperation({ memo: 'memo-old', status: 'expired', createdAt: 1 }),
        createOperation({ memo: 'memo-new', status: 'opened', createdAt: 2 }),
      ],
    });

    await screen.findByText(strings('collectibles.pending.view'));

    expect(
      screen.getByTestId(CollectiblesAttentionBannerTestIds.BANNER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.pending.unrevealed_title')),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText(strings('collectibles.pending.view')));
    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.REVEAL),
      ),
    ).toHaveTextContent(JSON.stringify({ memo: 'memo-new' }));
  });

  it.each([
    CollectiblesPackCardTestIds.CARD,
    CollectiblesPackCardTestIds.IMAGE,
  ])('opens pack details from the tile or artwork (%p)', async (getTestId) => {
    renderHome();

    fireEvent.press(await screen.findByTestId(getTestId(POKEMON_PACK.code)));

    expect(
      await screen.findByTestId(CollectiblesPackDetailTestIds.CONTAINER),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(packPartnerReads.getPackInventory).toHaveBeenCalledWith(
        POKEMON_PACK.code,
        null,
      ),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('confirms a purchase in the sheet and opens the reveal', async () => {
    controller.generatePack.mockResolvedValue('memo-bought');
    renderHome();

    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPackCardTestIds.CARD(POKEMON_PACK.code),
      ),
    );
    expect(
      await screen.findByTestId(CollectiblesPackDetailTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      await screen.findByTestId(CollectiblesPackDetailTestIds.BUY),
    );
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
      ),
    );

    expect(
      await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.COLLECTIBLES.REVEAL),
      ),
    ).toHaveTextContent(
      JSON.stringify({ memo: 'memo-bought', skipReveal: false }),
    );
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      options: { quantity: 1, turbo: false },
      pack: {
        code: POKEMON_PACK.code,
        name: POKEMON_PACK.name,
        price: POKEMON_PACK.price,
        priceAmount: POKEMON_PACK.priceAmount,
      },
    });
  });

  it('shows the packs error with a retry', async () => {
    packPartnerReads.getPacks.mockRejectedValueOnce(
      createPackPartnerError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome();

    const errorPanel = await screen.findByTestId(
      CollectiblesPacksTestIds.ERROR,
    );
    expect(
      within(errorPanel).getByText(
        strings('collectibles.errors.network_error'),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText(strings('collectibles.cards.retry')));

    expect(
      await screen.findByTestId(CollectiblesPacksTestIds.LIST),
    ).toBeOnTheScreen();
    expect(packPartnerReads.getPacks).toHaveBeenCalledTimes(2);
  });

  it('hides the old catalogue and reports a failed pull-to-refresh', async () => {
    renderHome();
    await screen.findByTestId(CollectiblesPacksTestIds.LIST);
    packPartnerReads.getPacks.mockRejectedValueOnce(
      createPackPartnerError({ code: 'NETWORK_ERROR', retryable: true }),
    );

    fireEvent(screen.UNSAFE_getByType(FlashList), 'refresh');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Danger,
          title: strings('collectibles.packs.refresh_error'),
        }),
      ),
    );
    expect(
      screen.queryByTestId(CollectiblesPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPacksTestIds.ERROR),
    ).toBeOnTheScreen();
    expect(packPartnerReads.getPacks).toHaveBeenCalledTimes(2);
  });

  it('shows the empty packs message', async () => {
    packPartnerReads.getPacks.mockResolvedValue([]);
    renderHome();

    expect(
      await screen.findByTestId(CollectiblesPacksTestIds.EMPTY),
    ).toBeOnTheScreen();
  });

  it('allows browsing without a Solana account while disabling purchase', async () => {
    renderHome({ hasSolanaAccount: false });

    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.TABS),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPackCardTestIds.CARD(POKEMON_PACK.code),
      ),
    );

    expect(
      await screen.findByText(strings('collectibles.no_solana_account')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPackDetailTestIds.BUY),
    ).toBeDisabled();
    expect(packPartnerReads.getOwnedCards).not.toHaveBeenCalled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });
});
