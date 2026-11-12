import '../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';
import { createDeferredPromise } from '@metamask/utils';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { refreshPackPartnerReads } from '../../../../../tests/component-view/fixtures/collectibles-data-services';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../tests/component-view/renderers/collectibles';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../tests/component-view/render';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import {
  CollectiblesBuybackOfferTestIds as OfferIds,
  CollectiblesCardDisplayTestIds as DisplayIds,
  CollectiblesCardTileTestIds,
  CollectiblesCardViewTestIds,
} from '../Collectibles.testIds';
import { PACK_PARTNER_ENVIRONMENT } from '../providers/pack-partner/constants';
import { createPackPartnerError } from '../providers/pack-partner/services/errors';
import type {
  CollectiblesBuybackOperation,
  CollectiblesBuyback,
  CollectiblesCard,
  CollectiblesSaleResult,
} from '../types';
import { packPartnerQueries } from '../services/data/packPartnerQueries';
import { BuybackConfirmationTestIds } from '../components/BuybackOffer';
import { PackRevealSelectorsIDs } from '../components/PackReveal/PackReveal.testIds';
import CollectiblesCardView from './CollectiblesCard';
import CollectiblesReveal from './CollectiblesReveal';
import { CollectiblesRevealResultTestIds } from './CollectiblesReveal/CollectiblesReveal.testIds';
import {
  MOCK_ACCOUNT,
  packPartnerReads,
  createCard,
  createOperation,
  createSale,
  publishPackPartnerJournal,
  serveOwnedCards,
} from './testUtils';

const CARD = createCard({ nftStandard: 'pnft' });
const OFFER = { status: 'available', amount: '42000000' } as const;
const OFFERS = { [CARD.mint]: OFFER };
const PENDING_SALE = createSale({ mint: CARD.mint, amount: OFFER.amount });
const SALE_RESULT: CollectiblesSaleResult = {
  mint: CARD.mint,
  amount: OFFER.amount,
  signature: 'sale-signature',
};
const OFFER_KEY = packPartnerQueries.getBuybackOffer(
  PACK_PARTNER_ENVIRONMENT,
  CARD.mint,
).queryKey;
const OWNED_CARDS_KEY = packPartnerQueries.getOwnedCards(
  PACK_PARTNER_ENVIRONMENT,
  MOCK_ACCOUNT.address,
).queryKey;
const initialAppState = AppState.currentState;

const controller = {
  checkSales: jest.fn(),
  completePack: jest.fn(),
  dismissOperation: jest.fn(),
  sellCard: jest.fn(),
};

/**
 * Opens the collection with `card` owned and its opening still to be
 * acknowledged, so both the card detail and the reveal can be reached.
 */
const renderBuyback = (
  card: CollectiblesCard,
  {
    otherCards = [],
    offers = {},
    sales = [],
  }: {
    otherCards?: CollectiblesCard[];
    offers?: Record<string, CollectiblesBuyback>;
    sales?: CollectiblesBuybackOperation[];
  } = {},
) =>
  renderCollectiblesView({
    ownedCards: [card, ...otherCards],
    offers,
    sales,
    operations: [
      createOperation({ status: 'opened', mint: card.mint, result: card }),
    ],
    params: { initialTab: 'cards' },
    routes: [
      { name: Routes.COLLECTIBLES.CARD, Component: CollectiblesCardView },
      { name: Routes.COLLECTIBLES.REVEAL, Component: CollectiblesReveal },
      {
        name: Routes.BROWSER.HOME,
        Component: createRouteParamsProbe(Routes.BROWSER.HOME),
      },
    ],
  });

describeForPlatforms('PackPartner buyback recovery', () => {
  beforeEach(() => {
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    Object.values(controller).forEach((method) => {
      // The renderer adds non-mock defaults to the controller mock.
      if (jest.isMockFunction(method)) method.mockReset();
    });
    jest.mocked(toast).mockClear();
    controller.checkSales.mockResolvedValue(undefined);
    controller.completePack.mockResolvedValue(CARD);
    Object.assign(Engine.context, {
      CollectiblesController: controller,
      AssetsController: {
        state: { assetsBalance: {} },
        getAssets: jest.fn().mockResolvedValue({}),
      },
    });
  });

  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.restoreAllMocks();
  });

  it('shows inline card information without starting a sale', async () => {
    renderBuyback({ ...CARD, category: 'Pokemon' }, { offers: OFFERS });

    fireEvent.press(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    );
    expect(
      await screen.findByTestId(`${DisplayIds.GRADING_COMPANY}-information`),
    ).toHaveTextContent('PSA');
    expect(
      screen.getByTestId(`${DisplayIds.COLLECTION}-information`),
    ).toHaveTextContent('Pokemon');
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('drops a retained sale receipt and its actions when the selected account changes', async () => {
    controller.sellCard.mockResolvedValue(SALE_RESULT);
    const { store } = renderCollectiblesView({
      entry: {
        Component: CollectiblesCardView,
        name: Routes.COLLECTIBLES.CARD,
      },
      params: { mint: CARD.mint },
      ownedCards: [CARD],
      offers: OFFERS,
    });
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardViewTestIds.SELL_BUTTON),
    );
    expect(
      screen.queryByTestId('collectibles-sale-wallet'),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      await screen.findByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
    );
    await screen.findByTestId('collectibles-card-sold');
    expect(screen.getByTestId('collectibles-sale-wallet')).toBeOnTheScreen();
    const accounts = store.getState().engine.backgroundState.AccountsController;
    const selected = accounts.internalAccounts.accounts[MOCK_ACCOUNT.id];

    act(() => {
      Object.assign(Engine, {
        state: {
          AccountsController: {
            ...accounts,
            internalAccounts: {
              ...accounts.internalAccounts,
              accounts: {
                ...accounts.internalAccounts.accounts,
                [MOCK_ACCOUNT.id]: {
                  ...selected,
                  address: 'another-solana-wallet',
                },
              },
            },
          },
        },
      });
      store.dispatch(updateBgState({ key: 'AccountsController' }));
    });

    expect(
      await screen.findByTestId(CollectiblesCardViewTestIds.NOT_FOUND),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectibles-card-sold'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectibles-sale-wallet'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(packPartnerReads.getOwnedCards).toHaveBeenLastCalledWith(
      'another-solana-wallet',
    );
    expect(controller.sellCard).toHaveBeenCalledTimes(1);
  });

  it('sells at the read offer with the card standard and shows the sold card while its screen stays active', async () => {
    controller.sellCard.mockResolvedValue(SALE_RESULT);
    renderBuyback(CARD, { offers: OFFERS });

    fireEvent.press(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardViewTestIds.SELL_BUTTON),
    );
    expect(controller.sellCard).not.toHaveBeenCalled();
    fireEvent.press(
      await screen.findByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
    );

    expect(
      await screen.findByTestId('collectibles-card-sold'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesCardViewTestIds.SELL_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('collectibles-card-more'),
    ).not.toBeOnTheScreen();
    expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith(CARD.mint);
    expect(controller.sellCard).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      mint: CARD.mint,
      expectedAmount: OFFER.amount,
      nftStandard: 'pnft',
    });
  });

  it('keeps a sold card in the collection until the owned-card read no longer returns it', async () => {
    const otherCard = createCard({ mint: 'MintB', set: 'Base Set 2' });
    const { store } = renderBuyback(CARD, {
      otherCards: [otherCard],
      offers: OFFERS,
    });
    controller.sellCard.mockImplementationOnce(async () => {
      publishPackPartnerJournal(store, {
        sales: [{ ...PENDING_SALE, status: 'completed' }],
      });
      return SALE_RESULT;
    });
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardViewTestIds.SELL_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
    );
    await screen.findByTestId('collectibles-card-sold');

    fireEvent.press(
      screen.getByTestId(CollectiblesCardViewTestIds.BACK_BUTTON),
    );

    expect(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    ).toBeOnTheScreen();

    serveOwnedCards(MOCK_ACCOUNT.address, [otherCard]);
    await act(async () => {
      await refreshPackPartnerReads(OWNED_CARDS_KEY);
    });

    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(CollectiblesCardTileTestIds.TILE(otherCard.mint)),
    ).toBeOnTheScreen();
  });

  it('opens the partner marketplace from More in the in-app browser without selling', async () => {
    renderBuyback(CARD, { offers: OFFERS });

    fireEvent.press(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(await screen.findByTestId('collectibles-card-more'));
    expect(
      await screen.findByTestId('collectibles-card-action-transfer'),
    ).toBeDisabled();
    fireEvent.press(screen.getByTestId('collectibles-card-action-marketplace'));

    const destination = await screen.findByTestId(
      getRouteParamsProbeTestId(Routes.BROWSER.HOME),
    );
    expect(destination).toHaveTextContent(new RegExp(Routes.BROWSER.VIEW, 'u'));
    expect(destination).toHaveTextContent(new RegExp(CARD.mint, 'u'));
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('keeps the newly opened card visible when a sale finishes after leaving its card', async () => {
    const otherCard = createCard({
      mint: 'MintB',
      name: 'Blastoise Holo',
      set: 'Base Set 2',
    });
    const sale = createDeferredPromise<CollectiblesSaleResult>();
    controller.sellCard.mockReturnValueOnce(sale.promise);
    renderBuyback(CARD, { otherCards: [otherCard], offers: OFFERS });

    fireEvent.press(
      await screen.findByTestId(CollectiblesCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardViewTestIds.SELL_BUTTON),
    );
    expect(controller.sellCard).not.toHaveBeenCalled();
    fireEvent.press(
      await screen.findByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
    );
    await waitFor(() =>
      expect(controller.sellCard).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        mint: CARD.mint,
        expectedAmount: OFFER.amount,
        nftStandard: 'pnft',
      }),
    );
    fireEvent.press(
      screen.getByTestId(CollectiblesCardViewTestIds.BACK_BUTTON),
    );
    fireEvent.press(
      await screen.findByTestId(
        CollectiblesCardTileTestIds.TILE(otherCard.mint),
      ),
    );
    expect(await screen.findByTestId(DisplayIds.NAME)).toHaveTextContent(
      otherCard.set ?? '',
    );
    await act(async () => {
      sale.resolve(SALE_RESULT);
      await sale.promise;
    });

    expect(screen.getByTestId(DisplayIds.NAME)).toHaveTextContent(
      otherCard.set ?? '',
    );
    expect(
      screen.getByTestId(CollectiblesCardViewTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  describe.each(['card', 'reveal'] as const)('%s screen', (view) => {
    const sellButton =
      view === 'card'
        ? CollectiblesCardViewTestIds.SELL_BUTTON
        : CollectiblesRevealResultTestIds.SELL_BACK_BUTTON;
    const openScreen = async () => {
      fireEvent.press(
        view === 'card'
          ? await screen.findByTestId(
              CollectiblesCardTileTestIds.TILE(CARD.mint),
            )
          : await screen.findByText(strings('collectibles.pending.view')),
      );
      if (view === 'reveal') {
        await waitFor(() =>
          expect(
            screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
          ).toBeEnabled(),
        );
        fireEvent.press(
          screen.getByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
        );
        await screen.findByTestId(DisplayIds.NAME);
      }
    };

    it('retries a failed offer read and shows the offer with card details', async () => {
      packPartnerReads.getBuybackOffer.mockRejectedValue(new Error('offline'));
      renderBuyback(CARD, { offers: OFFERS });

      await openScreen();
      await screen.findByTestId(OfferIds.ERROR);
      packPartnerReads.getBuybackOffer.mockReset();
      fireEvent.press(screen.getByTestId(OfferIds.RETRY));

      expect(await screen.findByTestId(sellButton)).toBeOnTheScreen();
      if (view === 'card') {
        expect(screen.getByTestId(sellButton)).toHaveTextContent(
          strings('collectibles_discovery.buyback_for', { amount: '42.00' }),
        );
      } else {
        expect(screen.getByTestId(sellButton)).toHaveTextContent(
          strings('collectibles.reveal.accept_buyback', {
            amount: '$42',
          }),
        );
        expect(screen.queryByTestId(OfferIds.AVAILABLE)).not.toBeOnTheScreen();
      }
      expect(screen.getByTestId(DisplayIds.NAME)).toHaveTextContent(
        CARD.set ?? '',
      );
      expect(screen.getByTestId(DisplayIds.GRADE)).toHaveTextContent('PSA 10');
      expect(screen.getByTestId(DisplayIds.RARITY)).toHaveTextContent(
        strings('collectibles.rarity.rare'),
      );
      if (view === 'card') {
        expect(
          screen.getByTestId(`${DisplayIds.GRADING_COMPANY}-information`),
        ).toHaveTextContent('PSA');
      }
      expect(screen.getByTestId(DisplayIds.VALUE)).toHaveTextContent('$120');
      expect(packPartnerReads.getBuybackOffer).toHaveBeenCalledWith(CARD.mint);
      expect(controller.checkSales).not.toHaveBeenCalled();
    });

    it('keeps the card and shows the lower offer the workflow refreshed when it changed before the sale', async () => {
      const lowerOffer = { status: 'available', amount: '30000000' } as const;
      renderBuyback(CARD, { offers: OFFERS });
      controller.sellCard.mockImplementationOnce(async () => {
        packPartnerReads.getBuybackOffer.mockResolvedValue(lowerOffer);
        await refreshPackPartnerReads(OFFER_KEY);
        throw createPackPartnerError({ code: 'OFFER_CHANGED' });
      });

      await openScreen();
      fireEvent.press(await screen.findByTestId(sellButton));
      fireEvent.press(
        await screen.findByTestId(BuybackConfirmationTestIds.CONFIRM_BUTTON),
      );

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          severity: ToastSeverity.Danger,
          title: strings('collectibles.toast.sell_failed'),
          description: strings('collectibles.errors.offer_changed'),
          showCloseButton: false,
        }),
      );
      expect(controller.sellCard).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        mint: CARD.mint,
        expectedAmount: OFFER.amount,
        nftStandard: 'pnft',
      });
      await waitFor(() =>
        expect(screen.getByTestId(sellButton)).toHaveTextContent(
          strings(
            view === 'card'
              ? 'collectibles_discovery.buyback_for'
              : 'collectibles.reveal.accept_buyback',
            { amount: view === 'card' ? '30.00' : '$30' },
          ),
        ),
      );
      expect(screen.getByTestId(DisplayIds.NAME)).toHaveTextContent(
        CARD.set ?? '',
      );
    });

    it('shows a pending sale and checks it by memo until its confirmed outcome', async () => {
      const { store } = renderBuyback(CARD, {
        offers: OFFERS,
        sales: [PENDING_SALE],
      });
      controller.checkSales.mockImplementationOnce(async () => {
        publishPackPartnerJournal(store, {
          sales: [
            {
              ...PENDING_SALE,
              status: 'completed',
              signature: 'sale-signature',
              updatedAt: 2_000,
            },
          ],
        });
      });

      await openScreen();
      expect(await screen.findByTestId(OfferIds.PENDING)).toHaveTextContent(
        strings('collectibles.errors.sale_pending'),
      );
      expect(screen.getByTestId(OfferIds.RETRY)).toHaveTextContent(
        strings('collectibles.card.check_sale_status'),
      );
      expect(screen.queryByTestId(OfferIds.ERROR)).not.toBeOnTheScreen();
      expect(
        screen.queryByText(strings('collectibles.card.sale_status_error')),
      ).not.toBeOnTheScreen();
      expect(screen.queryByTestId(sellButton)).not.toBeOnTheScreen();
      jest.mocked(Engine.context.AssetsController.getAssets).mockClear();
      packPartnerReads.getBuybackOffer.mockClear();
      fireEvent.press(screen.getByTestId(OfferIds.RETRY));

      expect(
        await screen.findByTestId('collectibles-card-sold'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(OfferIds.PENDING)).not.toBeOnTheScreen();
      expect(screen.queryByTestId(sellButton)).not.toBeOnTheScreen();
      expect(controller.checkSales).toHaveBeenCalledTimes(1);
      expect(controller.checkSales).toHaveBeenCalledWith({
        address: MOCK_ACCOUNT.address,
      });
      expect(packPartnerReads.getBuybackOffer).not.toHaveBeenCalled();
      expect(controller.sellCard).not.toHaveBeenCalled();
      expect(Engine.context.AssetsController.getAssets).toHaveBeenCalled();
    });

    it('shows the status check in progress and keeps a sale still processing pending, without selling again', async () => {
      const check = createDeferredPromise<void>();
      controller.checkSales.mockReturnValueOnce(check.promise);
      renderBuyback(CARD, { offers: OFFERS, sales: [PENDING_SALE] });

      await openScreen();
      await screen.findByTestId(OfferIds.PENDING);
      packPartnerReads.getBuybackOffer.mockClear();
      fireEvent.press(screen.getByTestId(OfferIds.RETRY));

      await waitFor(() =>
        expect(screen.getByTestId(OfferIds.RETRY)).toBeDisabled(),
      );
      expect(controller.checkSales).toHaveBeenCalledWith({
        address: MOCK_ACCOUNT.address,
      });
      await act(async () => {
        check.resolve();
        await check.promise;
      });

      await waitFor(() =>
        expect(screen.getByTestId(OfferIds.RETRY)).not.toBeDisabled(),
      );
      expect(screen.getByTestId(OfferIds.PENDING)).toBeOnTheScreen();
      expect(screen.queryByTestId(OfferIds.ERROR)).not.toBeOnTheScreen();
      expect(controller.checkSales).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId(sellButton)).not.toBeOnTheScreen();
      expect(packPartnerReads.getBuybackOffer).not.toHaveBeenCalled();
      expect(controller.sellCard).not.toHaveBeenCalled();
    });
  });
});
