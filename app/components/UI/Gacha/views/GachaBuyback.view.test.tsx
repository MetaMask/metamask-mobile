import '../../../../../tests/component-view/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderScreenWithRoutes } from '../../../../../tests/component-view/render';
import { createStateFixture } from '../../../../../tests/component-view/stateFixture';
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
import type { CollectorCryptCard } from '../providers/collector-crypt/types';
import GachaCardView from './GachaCard';
import GachaHome from './GachaHome';
import GachaReveal from './GachaReveal';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createOperation,
  createTestState,
} from './testUtils';

const CARD = createCard();
const OPERATION = createOperation({ status: 'opened', mint: CARD.mint });
const PENDING_CARD = createCard({
  sale: { status: 'pending', amount: '42000000', updatedAt: 1_000 },
});
const OFFER = { status: 'available', amount: '42000000' } as const;

const controller = {
  getPacks: jest.fn(),
  syncCards: jest.fn(),
  recoverOperations: jest.fn(),
  completePack: jest.fn(),
  dismissOperation: jest.fn(),
  refreshBuyback: jest.fn(),
  sellCard: jest.fn(),
};

const renderBuyback = (card: CollectorCryptCard) => {
  const state = createStateFixture()
    .withOverrides(createTestState({ cards: [card], operations: [OPERATION] }))
    .withOverrides({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: { [MOCK_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT },
              selectedAccount: MOCK_ACCOUNT.id,
            },
          },
        },
      },
    })
    .withAccountTreeForSelectedAccount()
    .build();
  const { store } = renderScreenWithRoutes(
    GachaHome,
    { name: Routes.GACHA.HOME },
    [
      { name: Routes.GACHA.CARD, Component: GachaCardView },
      { name: Routes.GACHA.REVEAL, Component: GachaReveal },
    ],
    { state },
    { initialTab: 'cards' },
  );

  return (nextCard: CollectorCryptCard) => {
    Object.assign(Engine, {
      state: {
        GachaController: {
          collectorCrypt: {
            cards: { [MOCK_ACCOUNT.address]: { [nextCard.mint]: nextCard } },
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
    Object.values(controller).forEach((method) => method.mockReset());
    controller.getPacks.mockResolvedValue([]);
    controller.syncCards.mockResolvedValue([CARD]);
    controller.recoverOperations.mockResolvedValue(undefined);
    controller.completePack.mockResolvedValue(CARD);
    Object.assign(Engine.context, {
      GachaController: controller,
      AssetsController: { getAssets: jest.fn().mockResolvedValue({}) },
    });
  });

  describe.each(['card', 'reveal'] as const)('%s screen', (view) => {
    const sellButton =
      view === 'card'
        ? GachaCardViewTestIds.SELL_BUTTON
        : GachaRevealTestIds.SELL_BUTTON;
    const openScreen = async () => {
      fireEvent.press(
        view === 'card'
          ? await screen.findByTestId(GachaCardTileTestIds.TILE(CARD.mint))
          : await screen.findByText(strings('gacha.pending.view')),
      );
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
      expect(screen.getByTestId(OfferIds.AVAILABLE)).toHaveTextContent(
        strings('gacha.usdc_amount', { amount: '42.00' }),
      );
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
      expect(screen.getByTestId(DisplayIds.VALUE)).toHaveTextContent('120');
      expect(controller.refreshBuyback).toHaveBeenCalledTimes(2);
      expect(controller.refreshBuyback).toHaveBeenLastCalledWith({
        account: MOCK_ACCOUNT,
        mint: CARD.mint,
      });
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
