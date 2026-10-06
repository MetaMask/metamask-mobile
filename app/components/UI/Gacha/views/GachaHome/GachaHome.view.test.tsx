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
import { renderGachaView } from '../../../../../../tests/component-view/renderers/gacha';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import {
  GachaAttentionBannerTestIds,
  GachaCardTileTestIds,
  GachaCardsTestIds,
  GachaErrorPanelTestIds,
  GachaHomeTestIds,
  GachaPackCardTestIds,
  GachaPacksTestIds,
  GachaPurchaseSheetTestIds,
} from '../../Gacha.testIds';
import { getGachaPackArtwork } from '../../controllers/GachaPackCatalog';
import { createCollectorCryptError } from '../../providers/collector-crypt/services/errors';
import type {
  CollectorCryptCard,
  PackOperation,
} from '../../providers/collector-crypt/types';
import type { GachaHomeParams } from '../../types/navigation';
import {
  MOCK_ACCOUNT,
  createCard,
  createOperation,
  createPack,
} from '../testUtils';

const controller = {
  getPacks: jest.fn(),
  generatePack: jest.fn(),
  syncCards: jest.fn(),
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
  cards = [],
  operations = [],
  usdcAmount = '100',
  params,
  hasSolanaAccount = true,
}: {
  cards?: CollectorCryptCard[];
  operations?: PackOperation[];
  usdcAmount?: string;
  params?: GachaHomeParams;
  hasSolanaAccount?: boolean;
} = {}) => {
  return renderGachaView({
    cards,
    operations,
    usdcAmount,
    hasSolanaAccount,
    params: params ? { ...params } : undefined,
    routes: [Routes.GACHA.CARD, Routes.GACHA.REVEAL].map((name) => ({
      name,
      Component: createRouteParamsProbe(name),
    })),
  });
};

/** Waits for the first card sync to settle. */
const waitForSync = async () => {
  await waitFor(() => expect(controller.syncCards).toHaveBeenCalled());
  await act(async () => {
    await controller.syncCards.mock.results
      .at(-1)
      ?.value.catch(() => undefined);
  });
};

// GachaSection.view.test.tsx owns homepage/card/collection/back navigation,
// including the updated initialTab parameter when returning from a card.
describeForPlatforms('GachaHome', () => {
  beforeEach(() => {
    jest.mocked(toast).mockClear();
    Object.values(controller).forEach((method) => method.mockReset());
    controller.getPacks.mockResolvedValue([POKEMON_PACK, ONE_PIECE_PACK]);
    controller.syncCards.mockResolvedValue([]);
    controller.recoverOperations.mockResolvedValue(undefined);
    Object.assign(Engine.context, { GachaController: controller });
  });

  it('loads pack data, collection filters and the selected account balance', async () => {
    renderHome({ usdcAmount: '100.999999' });

    expect(
      await screen.findByTestId(GachaPacksTestIds.FILTERS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('Pokemon')),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(GachaHomeTestIds.BALANCE)).toHaveTextContent(
      /^100$/u,
    );
    for (const pack of [POKEMON_PACK, ONE_PIECE_PACK]) {
      const row = within(
        screen.getByTestId(GachaPackCardTestIds.CARD(pack.code)),
      );
      expect(
        row.getByText(
          getGachaPackArtwork('collector-crypt', pack.code).name ?? pack.name,
        ),
      ).toBeOnTheScreen();
      expect(row.getByText(String(pack.price))).toBeOnTheScreen();
      expect(
        row.getByTestId(GachaPackCardTestIds.OPEN_BUTTON(pack.code)),
      ).toBeEnabled();
    }
  });

  it('filters packs to one collection at a time', async () => {
    renderHome();

    await screen.findByTestId(GachaPacksTestIds.FILTERS);
    fireEvent.press(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')),
    );

    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(ONE_PIECE_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')).props
        .accessibilityState?.selected,
    ).toBe(false);

    fireEvent.press(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')),
    );

    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(ONE_PIECE_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('')).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId(GachaPacksTestIds.COLLECTION_FILTER('One Piece')).props
        .accessibilityState?.selected,
    ).toBe(false);
  });

  it('recovers interrupted operations of the account on mount', async () => {
    renderHome();

    await waitForSync();

    expect(controller.recoverOperations).toHaveBeenCalledTimes(1);
    expect(controller.recoverOperations).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
    });
  });

  it('stays on Packs when My cards is pressed without any card', async () => {
    renderHome();
    await screen.findByTestId(GachaPacksTestIds.LIST);
    await waitForSync();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));

    expect(screen.getByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
  });

  it('opens My cards when the account has cards and opens a card', async () => {
    renderHome({ cards: [CARD] });
    await screen.findByTestId(GachaPacksTestIds.LIST);

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));
    fireEvent.press(
      await screen.findByTestId(GachaCardTileTestIds.TILE('MintA')),
    );

    expect(screen.queryByTestId(GachaPacksTestIds.LIST)).not.toBeOnTheScreen();
    expect(
      await screen.findByTestId(getRouteParamsProbeTestId(Routes.GACHA.CARD)),
    ).toHaveTextContent(JSON.stringify({ mint: 'MintA' }));
  });

  it('opens My cards from the initialTab param', async () => {
    renderHome({ cards: [CARD], params: { initialTab: 'cards' } });

    expect(
      await screen.findByTestId(GachaCardTileTestIds.TILE('MintA')),
    ).toBeOnTheScreen();
  });

  it('falls back to Packs when initialTab is cards and the sync finds no card', async () => {
    renderHome({ params: { initialTab: 'cards' } });

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
  });

  it('opens My cards with the sync error and its retry when the first sync fails', async () => {
    controller.syncCards.mockRejectedValueOnce(
      createCollectorCryptError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome({ params: { initialTab: 'cards' } });

    expect(
      await screen.findByText(strings('gacha.errors.network_error')),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaPacksTestIds.LIST)).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(GachaErrorPanelTestIds.RETRY));

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
    expect(controller.syncCards).toHaveBeenCalledTimes(2);
  });

  it('keeps My cards reachable after a failed sync without cached cards', async () => {
    controller.syncCards.mockRejectedValue(
      createCollectorCryptError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome();
    await screen.findByTestId(GachaPacksTestIds.LIST);
    await waitForSync();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));

    expect(
      await screen.findByText(strings('gacha.errors.network_error')),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaPacksTestIds.LIST)).not.toBeOnTheScreen();
  });

  it('shows Packs once the last card leaves My cards', async () => {
    const { store } = renderHome({
      cards: [CARD],
      params: { initialTab: 'cards' },
    });
    await screen.findByTestId(GachaCardTileTestIds.TILE('MintA'));
    await waitForSync();

    act(() => {
      Object.assign(Engine, {
        state: {
          GachaController: {
            hasCompletedOnboarding: true,
            collectorCrypt: {
              cards: { [MOCK_ACCOUNT.address]: {} },
              operations: { [MOCK_ACCOUNT.address]: {} },
            },
          },
        },
      });
      store.dispatch(updateBgState({ key: 'GachaController' }));
    });

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaCardsTestIds.EMPTY)).not.toBeOnTheScreen();
  });

  it('shows the newest operation needing attention and opens its reveal', async () => {
    renderHome({
      operations: [
        createOperation({ memo: 'memo-old', status: 'expired', createdAt: 1 }),
        createOperation({ memo: 'memo-new', status: 'opened', createdAt: 2 }),
      ],
    });

    await screen.findByText(strings('gacha.pending.view'));

    expect(
      screen.getByTestId(GachaAttentionBannerTestIds.BANNER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('gacha.pending.unrevealed_title')),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText(strings('gacha.pending.view')));
    expect(
      await screen.findByTestId(getRouteParamsProbeTestId(Routes.GACHA.REVEAL)),
    ).toHaveTextContent(JSON.stringify({ memo: 'memo-new' }));
  });

  it('confirms a purchase in the sheet and opens the reveal', async () => {
    controller.generatePack.mockResolvedValue('memo-bought');
    renderHome();

    fireEvent.press(
      await screen.findByTestId(
        GachaPackCardTestIds.OPEN_BUTTON(POKEMON_PACK.code),
      ),
    );
    fireEvent.press(
      await screen.findByTestId(GachaPurchaseSheetTestIds.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByTestId(getRouteParamsProbeTestId(Routes.GACHA.REVEAL)),
    ).toHaveTextContent(JSON.stringify({ memo: 'memo-bought' }));
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: {
        code: POKEMON_PACK.code,
        name: POKEMON_PACK.name,
        price: POKEMON_PACK.price,
      },
    });
  });

  it('shows the packs error with a retry', async () => {
    controller.getPacks.mockRejectedValueOnce(
      createCollectorCryptError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    renderHome();

    const errorPanel = await screen.findByTestId(GachaPacksTestIds.ERROR);
    expect(
      within(errorPanel).getByText(strings('gacha.errors.network_error')),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText(strings('gacha.cards.retry')));

    expect(await screen.findByTestId(GachaPacksTestIds.LIST)).toBeOnTheScreen();
    expect(controller.getPacks).toHaveBeenCalledTimes(2);
  });

  it('keeps cached packs and reports a failed pull-to-refresh', async () => {
    renderHome();
    await screen.findByTestId(GachaPacksTestIds.LIST);
    controller.getPacks.mockRejectedValueOnce(
      createCollectorCryptError({ code: 'NETWORK_ERROR', retryable: true }),
    );

    fireEvent(screen.UNSAFE_getByType(FlashList), 'refresh');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Danger,
          title: strings('gacha.packs.refresh_error'),
        }),
      ),
    );
    expect(
      screen.getByTestId(GachaPackCardTestIds.CARD(POKEMON_PACK.code)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaPacksTestIds.ERROR)).not.toBeOnTheScreen();
    expect(controller.getPacks).toHaveBeenCalledTimes(2);
  });

  it('shows the empty packs message', async () => {
    controller.getPacks.mockResolvedValue([]);
    renderHome();

    expect(
      await screen.findByTestId(GachaPacksTestIds.EMPTY),
    ).toBeOnTheScreen();
  });

  it('asks for a Solana account when the account group has none', () => {
    renderHome({ hasSolanaAccount: false });

    expect(screen.getByTestId(GachaHomeTestIds.NO_ACCOUNT)).toBeOnTheScreen();
    expect(screen.queryByTestId(GachaHomeTestIds.TABS)).not.toBeOnTheScreen();
    expect(controller.syncCards).not.toHaveBeenCalled();
  });
});
