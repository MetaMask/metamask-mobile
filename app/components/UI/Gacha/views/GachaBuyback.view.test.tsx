import '../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';
import { createDeferredPromise } from '@metamask/utils';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderGachaView } from '../../../../../tests/component-view/renderers/gacha';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import {
  GachaBuybackOfferTestIds as OfferIds,
  GachaCardDisplayTestIds as DisplayIds,
  GachaCardTileTestIds,
  GachaCardViewTestIds,
  GachaHomeTestIds,
  GachaRevealTestIds,
} from '../Gacha.testIds';
import { createCollectorCryptError } from '../providers/collector-crypt/services/errors';
import type {
  CollectorCryptCard,
  CollectorCryptSaleResult,
} from '../providers/collector-crypt/types';
import { PackRevealSelectorsIDs } from '../components/PackReveal/PackReveal.testIds';
import GachaCardView from './GachaCard';
import GachaReveal from './GachaReveal';
import { MOCK_ACCOUNT, createCard, createOperation } from './testUtils';

const CARD = createCard();
const OPERATION = createOperation({ status: 'opened', mint: CARD.mint });
const PENDING_CARD = createCard({
  sale: { status: 'pending', amount: '42000000', updatedAt: 1_000 },
});
const OFFER = { status: 'available', amount: '42000000' } as const;
const initialAppState = AppState.currentState;

const controller = {
  getPacks: jest.fn(),
  syncCards: jest.fn(),
  recoverOperations: jest.fn(),
  completePack: jest.fn(),
  dismissOperation: jest.fn(),
  refreshBuyback: jest.fn(),
  sellCard: jest.fn(),
};

const renderBuyback = (
  card: CollectorCryptCard,
  otherCards: CollectorCryptCard[] = [],
) => {
  const { store } = renderGachaView({
    cards: [card, ...otherCards],
    operations: [OPERATION],
    params: { initialTab: 'cards' },
    routes: [
      { name: Routes.GACHA.CARD, Component: GachaCardView },
      { name: Routes.GACHA.REVEAL, Component: GachaReveal },
    ],
  });

  return (nextCard: CollectorCryptCard) => {
    Object.assign(Engine, {
      state: {
        GachaController: {
          hasCompletedOnboarding: true,
          collectorCrypt: {
            cards: {
              [MOCK_ACCOUNT.address]: Object.fromEntries(
                [nextCard, ...otherCards].map((item) => [item.mint, item]),
              ),
            },
            operations: {
              [MOCK_ACCOUNT.address]: { [OPERATION.memo]: OPERATION },
            },
          },
        },
      },
    });
    store.dispatch(updateBgState({ key: 'GachaController' }));
  };
};

describeForPlatforms('CollectorCrypt buyback recovery', () => {
  beforeEach(() => {
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    Object.values(controller).forEach((method) => method.mockReset());
    jest.mocked(toast).mockClear();
    controller.getPacks.mockResolvedValue([]);
    controller.syncCards.mockResolvedValue([CARD]);
    controller.recoverOperations.mockResolvedValue(undefined);
    controller.completePack.mockResolvedValue(CARD);
    Object.assign(Engine.context, {
      GachaController: controller,
      AssetsController: { getAssets: jest.fn().mockResolvedValue({}) },
    });
  });

  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.restoreAllMocks();
  });

  it('returns to the collection after selling the card while its screen stays active', async () => {
    controller.refreshBuyback.mockResolvedValue(OFFER);
    controller.sellCard.mockResolvedValue({
      mint: CARD.mint,
      amount: OFFER.amount,
      signature: 'sale-signature',
    });
    renderBuyback({ ...CARD, buyback: OFFER });

    fireEvent.press(
      await screen.findByTestId(GachaCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(
      await screen.findByTestId(GachaCardViewTestIds.SELL_BUTTON),
    );

    expect(
      await screen.findByTestId(GachaHomeTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardViewTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(controller.sellCard).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      mint: CARD.mint,
      expectedAmount: OFFER.amount,
    });
  });

  it('keeps the newly opened card visible when a sale finishes after leaving its card', async () => {
    const otherCard = createCard({ mint: 'MintB', name: 'Blastoise Holo' });
    const sale = createDeferredPromise<CollectorCryptSaleResult>();
    controller.sellCard.mockReturnValueOnce(sale.promise);
    controller.refreshBuyback.mockResolvedValue(OFFER);
    renderBuyback({ ...CARD, buyback: OFFER }, [otherCard]);

    fireEvent.press(
      await screen.findByTestId(GachaCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(
      await screen.findByTestId(GachaCardViewTestIds.SELL_BUTTON),
    );
    await waitFor(() =>
      expect(controller.sellCard).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        mint: CARD.mint,
        expectedAmount: OFFER.amount,
      }),
    );
    fireEvent.press(screen.getByTestId(GachaCardViewTestIds.BACK_BUTTON));
    fireEvent.press(
      await screen.findByTestId(GachaCardTileTestIds.TILE(otherCard.mint)),
    );
    expect(await screen.findByTestId(DisplayIds.NAME)).toHaveTextContent(
      otherCard.name,
    );
    await act(async () => {
      sale.resolve({
        mint: CARD.mint,
        amount: OFFER.amount,
        signature: 'sale-signature',
      });
      await sale.promise;
    });

    expect(screen.getByTestId(DisplayIds.NAME)).toHaveTextContent(
      otherCard.name,
    );
    expect(
      screen.getByTestId(GachaCardViewTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  describe.each(['card', 'reveal'] as const)('%s screen', (view) => {
    const sellButton =
      view === 'card'
        ? GachaCardViewTestIds.SELL_BUTTON
        : GachaRevealTestIds.SELL_AND_OPEN_BUTTON;
    const openScreen = async () => {
      fireEvent.press(
        view === 'card'
          ? await screen.findByTestId(GachaCardTileTestIds.TILE(CARD.mint))
          : await screen.findByText(strings('gacha.pending.view')),
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

    it('retries a failed offer lookup and shows the offer with card details', async () => {
      controller.refreshBuyback.mockRejectedValueOnce(new Error('offline'));
      const updateCard = renderBuyback(CARD);
      controller.refreshBuyback.mockImplementationOnce(async () => {
        updateCard({ ...CARD, buyback: OFFER });
        return OFFER;
      });

      await openScreen();
      await screen.findByTestId(OfferIds.ERROR);
      fireEvent.press(screen.getByTestId(OfferIds.RETRY));

      expect(await screen.findByTestId(sellButton)).toBeOnTheScreen();
      if (view === 'card') {
        expect(screen.getByTestId(OfferIds.AVAILABLE)).toHaveTextContent(
          strings('gacha.usdc_amount', { amount: '42.00' }),
        );
      } else {
        expect(screen.getByTestId(sellButton)).toHaveTextContent(
          strings('gacha.reveal.sell_and_open_amount', { amount: '42.00' }),
        );
        expect(screen.queryByTestId(OfferIds.AVAILABLE)).not.toBeOnTheScreen();
      }
      expect(screen.getByTestId(DisplayIds.NAME)).toHaveTextContent(CARD.name);
      expect(screen.getByTestId(DisplayIds.GRADE)).toHaveTextContent(
        view === 'card' ? 'GEM-MT 10' : 'PSA GEM-MT 10',
      );
      expect(screen.getByTestId(DisplayIds.RARITY)).toHaveTextContent(
        strings('gacha.rarity.rare'),
      );
      if (view === 'card') {
        expect(
          screen.getByTestId(DisplayIds.GRADING_COMPANY),
        ).toHaveTextContent('PSA');
      }
      expect(screen.getByTestId(DisplayIds.VALUE)).toHaveTextContent('$120');
      expect(controller.refreshBuyback).toHaveBeenCalledTimes(2);
      expect(controller.refreshBuyback).toHaveBeenLastCalledWith({
        account: MOCK_ACCOUNT,
        mint: CARD.mint,
      });
    });

    it('keeps the card and shows the lower offer when it changed before the sale', async () => {
      const lowerOffer = { status: 'available', amount: '30000000' } as const;
      controller.refreshBuyback.mockResolvedValue(OFFER);
      const updateCard = renderBuyback({ ...CARD, buyback: OFFER });
      controller.sellCard.mockImplementationOnce(async () => {
        updateCard({ ...CARD, buyback: lowerOffer });
        throw createCollectorCryptError({ code: 'OFFER_CHANGED' });
      });

      await openScreen();
      fireEvent.press(await screen.findByTestId(sellButton));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          severity: ToastSeverity.Danger,
          title: strings('gacha.toast.sell_failed'),
          description: strings('gacha.errors.offer_changed'),
          showCloseButton: false,
        }),
      );
      expect(controller.sellCard).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        mint: CARD.mint,
        expectedAmount: OFFER.amount,
      });
      expect(await screen.findByTestId(sellButton)).toHaveTextContent(
        strings(
          view === 'card'
            ? 'gacha.card.sell_for'
            : 'gacha.reveal.sell_and_open_amount',
          { amount: '30.00' },
        ),
      );
      expect(screen.getByTestId(DisplayIds.NAME)).toHaveTextContent(CARD.name);
    });

    it('checks a pending sale and returns home when it completes', async () => {
      controller.refreshBuyback.mockRejectedValueOnce(
        createCollectorCryptError({ code: 'SALE_PENDING' }),
      );
      const updateCard = renderBuyback(PENDING_CARD);
      controller.refreshBuyback.mockImplementationOnce(async () => {
        updateCard({
          ...PENDING_CARD,
          sale: { status: 'completed', amount: '42000000', updatedAt: 2_000 },
        });
        return PENDING_CARD.buyback;
      });

      await openScreen();
      await screen.findByTestId(OfferIds.PENDING);
      await waitFor(() =>
        expect(screen.getByTestId(OfferIds.RETRY)).not.toBeDisabled(),
      );
      jest.mocked(Engine.context.AssetsController.getAssets).mockClear();
      fireEvent.press(screen.getByTestId(OfferIds.RETRY));

      expect(
        await screen.findByTestId(GachaHomeTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(OfferIds.PENDING)).not.toBeOnTheScreen();
      expect(screen.queryByTestId(sellButton)).not.toBeOnTheScreen();
      expect(controller.refreshBuyback).toHaveBeenCalledTimes(2);
      expect(controller.sellCard).not.toHaveBeenCalled();
      expect(Engine.context.AssetsController.getAssets).toHaveBeenCalled();
    });

    it('distinguishes a failed status check from a sale still processing', async () => {
      controller.refreshBuyback.mockRejectedValueOnce(
        createCollectorCryptError({
          code: 'SALE_PENDING',
          cause: new Error('offline'),
        }),
      );
      controller.refreshBuyback.mockRejectedValueOnce(
        createCollectorCryptError({ code: 'SALE_PENDING' }),
      );
      renderBuyback(PENDING_CARD);

      await openScreen();
      await screen.findByTestId(OfferIds.ERROR);
      fireEvent.press(screen.getByTestId(OfferIds.RETRY));

      await waitFor(() =>
        expect(screen.queryByTestId(OfferIds.ERROR)).not.toBeOnTheScreen(),
      );
      expect(screen.getByTestId(OfferIds.PENDING)).toBeOnTheScreen();
      expect(screen.getByTestId(OfferIds.RETRY)).not.toBeDisabled();
      expect(screen.queryByTestId(sellButton)).not.toBeOnTheScreen();
      expect(controller.sellCard).not.toHaveBeenCalled();
    });
  });
});
