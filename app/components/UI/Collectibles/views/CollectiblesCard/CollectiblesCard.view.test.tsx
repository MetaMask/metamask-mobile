import '../../../../../../tests/component-view/mocks';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { AccessibilityInfo, Modal } from 'react-native';
import { createDeferredPromise } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  CollectiblesCardDisplayTestIds,
  CollectiblesShareComposerTestIds,
  CollectiblesCardViewTestIds,
  CollectiblesErrorPanelTestIds,
  CollectiblesBuybackOfferTestIds,
} from '../../Collectibles.testIds';
import { PackRevealSelectorsIDs } from '../../components/PackReveal/PackReveal.testIds';
import { createPackPartnerError } from '../../providers/pack-partner/services/errors';
import type { CollectiblesCard } from '../../types';
import { getPackPartnerErrorMessage } from '../../providers/pack-partner/utils/errorMessages';
import CollectiblesReveal from '../CollectiblesReveal';
import {
  MOCK_ACCOUNT,
  packPartnerReads,
  createCard,
  setCollectiblesFixtureClients,
} from '../testUtils';
import { MockCollectiblesApiClient } from '../../services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../services/clients/MockCollectiblesSocialApiClient';
import CollectiblesCardView from './CollectiblesCard';

const CARD = createCard();
const controller = {
  sellCard: jest.fn(),
  completePack: jest.fn(),
  dismissOperation: jest.fn(),
  generatePack: jest.fn(),
};

const screens = [
  {
    view: 'card detail',
    readsOffer: true,
    entry: { Component: CollectiblesCardView, name: Routes.COLLECTIBLES.CARD },
    params: { mint: CARD.mint },
    findCard: () => screen.findByTestId(CollectiblesCardDisplayTestIds.NAME),
  },
  {
    view: 'card replay',
    readsOffer: false,
    entry: { Component: CollectiblesReveal, name: Routes.COLLECTIBLES.REVEAL },
    params: { previewMint: CARD.mint },
    findCard: () => screen.findByTestId(PackRevealSelectorsIDs.REVEAL_BUTTON),
  },
] as const;

describeForPlatforms('Owned card screens before the card can be shown', () => {
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    Object.values(controller).forEach((method) => {
      if (jest.isMockFunction(method)) method.mockReset();
    });
    Object.assign(Engine.context, {
      CollectiblesController: controller,
      AssetsController: {
        state: { assetsBalance: {} },
        getAssets: jest.fn().mockResolvedValue({}),
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a confirmed card post open during submission, including native back requests', async () => {
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const request = {
      draftId: expect.any(String),
      cards: [
        {
          provider: 'pack-partner' as const,
          mint: CARD.mint,
          name: 'Base Set',
          imageUrl: null,
          insuredValueUsd: '120',
          rarity: CARD.rarity,
          grade: 'PSA GEM-MT 10',
        },
      ],
      caption: 'My pull',
    };
    const response = await clients.socialApi.shareCards({
      ...request,
      draftId: 'post-response',
    });
    const pending = createDeferredPromise<typeof response>();
    const publish = jest
      .spyOn(clients.socialApi, 'shareCards')
      .mockReturnValue(pending.promise);
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesCardView,
        name: Routes.COLLECTIBLES.CARD,
      },
      params: { mint: CARD.mint },
      ownedCards: [CARD],
    });
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardViewTestIds.SHARE_BUTTON),
    );
    expect(publish).not.toHaveBeenCalled();
    fireEvent.changeText(
      screen.getByTestId(CollectiblesShareComposerTestIds.CAPTION),
      request.caption,
    );

    fireEvent.press(
      screen.getByTestId(CollectiblesShareComposerTestIds.PUBLISH),
    );
    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    fireEvent.press(
      screen.getByTestId(CollectiblesShareComposerTestIds.PUBLISH),
    );
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

    expect(
      screen.getByTestId(CollectiblesShareComposerTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesShareComposerTestIds.CAPTION),
    ).toBeDisabled();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(request);
    await act(async () => pending.resolve(response));
    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesShareComposerTestIds.CONTAINER),
      ).not.toBeOnTheScreen(),
    );
    expect(controller.sellCard).not.toHaveBeenCalled();
  });

  it('keeps the caption and draft identity when a card post fails and is retried', async () => {
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const publish = jest
      .spyOn(clients.socialApi, 'shareCards')
      .mockRejectedValueOnce(new Error('service unavailable'));
    setCollectiblesFixtureClients(clients);
    renderCollectiblesView({
      entry: {
        Component: CollectiblesCardView,
        name: Routes.COLLECTIBLES.CARD,
      },
      params: { mint: CARD.mint },
      ownedCards: [CARD],
    });
    fireEvent.press(
      await screen.findByTestId(CollectiblesCardViewTestIds.SHARE_BUTTON),
    );
    fireEvent.changeText(
      screen.getByTestId(CollectiblesShareComposerTestIds.CAPTION),
      'My pull',
    );

    fireEvent.press(
      screen.getByTestId(CollectiblesShareComposerTestIds.PUBLISH),
    );

    expect(
      await screen.findByText(strings('collectibles.card.share_error')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesShareComposerTestIds.CAPTION),
    ).toHaveProp('value', 'My pull');
    expect(
      screen.getByTestId(CollectiblesShareComposerTestIds.CAPTION),
    ).toBeEnabled();
    fireEvent.press(
      screen.getByTestId(CollectiblesShareComposerTestIds.PUBLISH),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesShareComposerTestIds.CONTAINER),
      ).not.toBeOnTheScreen(),
    );
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[1][0]).toEqual(publish.mock.calls[0][0]);
    expect(publish.mock.calls[0][0].draftId).toEqual(expect.any(String));
  });

  describe.each(screens)('$view', ({ entry, params, findCard, readsOffer }) => {
    const renderScreen = (ownedCards: CollectiblesCard[] = [CARD]) =>
      renderCollectiblesView({ entry, params, ownedCards });

    it('reads only the offer needed by the current screen', async () => {
      const otherCard = createCard({ mint: 'UnrelatedOwnedMint' });
      packPartnerReads.getBuybackOffer.mockResolvedValue({
        status: 'available',
        amount: '42500000',
      });
      renderScreen([CARD, otherCard]);

      expect(await findCard()).toBeOnTheScreen();

      if (readsOffer) {
        expect(
          await screen.findByTestId(CollectiblesBuybackOfferTestIds.AVAILABLE),
        ).toHaveTextContent('42.50');
        expect(packPartnerReads.getBuybackOffer.mock.calls).toStrictEqual([
          [CARD.mint],
        ]);
      } else {
        expect(packPartnerReads.getBuybackOffer).not.toHaveBeenCalled();
      }
      expect(controller.sellCard).not.toHaveBeenCalled();
    });

    it('shows a loading state while the owned cards are being read', async () => {
      packPartnerReads.getOwnedCards.mockReturnValue(
        new Promise(() => undefined),
      );

      renderScreen();

      expect(
        await screen.findByTestId(CollectiblesCardViewTestIds.LOADING),
      ).toBeOnTheScreen();
      expect(packPartnerReads.getOwnedCards).toHaveBeenCalledWith(
        MOCK_ACCOUNT.address,
      );
      expect(
        screen.queryByTestId(CollectiblesCardViewTestIds.NOT_FOUND),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesCardViewTestIds.READ_ERROR),
      ).not.toBeOnTheScreen();
    });

    it('shows the read error and shows the card after a successful retry', async () => {
      packPartnerReads.getOwnedCards.mockRejectedValueOnce(
        createPackPartnerError({ code: 'NETWORK_ERROR', retryable: true }),
      );

      renderScreen();

      const error = await screen.findByTestId(
        CollectiblesCardViewTestIds.READ_ERROR,
      );
      expect(
        within(error).getByText(strings('collectibles.cards.sync_error')),
      ).toBeOnTheScreen();
      expect(
        within(error).getByText(getPackPartnerErrorMessage('NETWORK_ERROR')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesCardViewTestIds.NOT_FOUND),
      ).not.toBeOnTheScreen();

      fireEvent.press(
        within(error).getByTestId(CollectiblesErrorPanelTestIds.RETRY),
      );

      expect(await findCard()).toBeOnTheScreen();
      await waitFor(() =>
        expect(
          screen.queryByTestId(CollectiblesCardViewTestIds.READ_ERROR),
        ).not.toBeOnTheScreen(),
      );
      expect(packPartnerReads.getOwnedCards).toHaveBeenCalledTimes(2);
      expect(controller.sellCard).not.toHaveBeenCalled();
    });

    it('shows not found once the owned-card read does not return the card', async () => {
      renderScreen([createCard({ mint: 'OtherMint' })]);

      expect(
        await screen.findByTestId(CollectiblesCardViewTestIds.NOT_FOUND),
      ).toHaveTextContent(strings('collectibles.card.not_found'));
      expect(
        screen.queryByTestId(CollectiblesCardViewTestIds.LOADING),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesCardViewTestIds.READ_ERROR),
      ).not.toBeOnTheScreen();
      expect(controller.completePack).not.toHaveBeenCalled();
    });
  });
});
