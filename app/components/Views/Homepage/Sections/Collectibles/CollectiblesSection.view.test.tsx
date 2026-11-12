import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { createDeferredPromise } from '@metamask/utils';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderCollectiblesView } from '../../../../../../tests/component-view/renderers/collectibles';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { __setMockNetInfo } from '../../../../../__mocks__/@react-native-community/netinfo';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import {
  CollectiblesCardDisplayTestIds,
  CollectiblesCardTileTestIds,
  CollectiblesCardViewTestIds,
  CollectiblesInteractiveCardTestIds,
  CollectiblesPacksTestIds,
  CollectiblesPackCardTestIds,
  CollectiblesPackDetailTestIds,
  CollectiblesPurchaseSheetTestIds,
  CollectiblesRevealTestIds,
} from '../../../../UI/Collectibles/Collectibles.testIds';
import {
  CollectiblesHomeTestIds,
  CollectiblesScreenStack,
} from '../../../../UI/Collectibles';
import type {
  CollectiblesCard,
  CollectiblesPack,
} from '../../../../UI/Collectibles/types';
import { CollectiblesOnboardingSelectorsIDs as OnboardingIds } from '../../../../UI/Collectibles/views/CollectiblesOnboarding';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import {
  setCollectiblesFixtureClients,
  MOCK_ACCOUNT,
  packPartnerReads,
  createCard,
  createPack,
} from '../../../../UI/Collectibles/views/testUtils';
import { getCollectiblesPackArtwork } from '../../../../UI/Collectibles/constants/packArtwork';
import CollectiblesSection from './CollectiblesSection';
import { CollectiblesSectionTestIds } from './CollectiblesSection.testIds';
import { MockCollectiblesApiClient } from '../../../../UI/Collectibles/services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../../../UI/Collectibles/services/clients/MockCollectiblesSocialApiClient';

const CARD = createCard({
  image: 'https://example.com/card-front.png',
  backImage: 'https://example.com/card-back.png',
});
const PACK = createPack();
const controller = {
  recoverOperations: jest.fn(),
  completeOnboarding: jest.fn(),
  generatePack: jest.fn(),
};
const HomepageCollectiblesSection = () => (
  <CollectiblesSection sectionIndex={3} totalSectionsLoaded={6} />
);

const renderHomepageJourney = ({
  hasCompletedOnboarding = true,
  ownedCards = [CARD],
  hasSolanaAccount = true,
}: {
  hasCompletedOnboarding?: boolean;
  /** Cards PackPartner reports for the Solana account. */
  ownedCards?: CollectiblesCard[];
  /** False keeps the fixture's EVM-only selected account. */
  hasSolanaAccount?: boolean;
} = {}) =>
  renderCollectiblesView({
    entry: { Component: HomepageCollectiblesSection, name: Routes.WALLET_VIEW },
    routes: [
      { name: Routes.COLLECTIBLES.ROOT, Component: CollectiblesScreenStack },
    ],
    ownedCards,
    hasSolanaAccount,
    hasCompletedOnboarding,
  });

describeForPlatforms('Collectibles homepage navigation', () => {
  beforeEach(() => {
    Object.values(controller).forEach((method) => {
      if (jest.isMockFunction(method)) method.mockReset();
    });
    controller.recoverOperations.mockResolvedValue(undefined);
    packPartnerReads.getPacks.mockResolvedValue([PACK]);
    Object.assign(Engine.context, { CollectiblesController: controller });
  });

  it('shows the empty section when the selected account group has no Solana account', () => {
    renderHomepageJourney({ hasSolanaAccount: false, ownedCards: [] });

    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.EMPTY_CTA),
    ).toBeOnTheScreen();
    expect(packPartnerReads.getOwnedCards).not.toHaveBeenCalled();
    expect(controller.recoverOperations).not.toHaveBeenCalled();
  });

  it('replaces pack-shaped loading placeholders with the fetched pack tile', async () => {
    const pending = createDeferredPromise<CollectiblesPack[]>();
    packPartnerReads.getPacks.mockReturnValue(pending.promise);

    renderHomepageJourney();

    expect(
      await screen.findByTestId(CollectiblesSectionTestIds.PACKS_LOADING),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackCardTestIds.CARD(PACK.code)),
    ).not.toBeOnTheScreen();
    await act(async () => pending.resolve([PACK]));

    expect(
      await screen.findByTestId(CollectiblesPackCardTestIds.CARD(PACK.code)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.PACKS_LOADING),
    ).not.toBeOnTheScreen();
  });

  it('shows the shared empty pack state after the catalogue returns no available packs', async () => {
    packPartnerReads.getPacks.mockResolvedValue([]);

    renderHomepageJourney();

    const empty = await screen.findByTestId(
      CollectiblesSectionTestIds.PACKS_EMPTY,
    );
    expect(empty).toHaveTextContent(strings('collectibles.packs.empty'));
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.PACKS_LOADING),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackCardTestIds.CARD(PACK.code)),
    ).not.toBeOnTheScreen();
  });

  it('hides pack rows offline while preserving the owned collection preview', async () => {
    const { store } = renderHomepageJourney();
    await screen.findByTestId(CollectiblesPackCardTestIds.CARD(PACK.code));
    await screen.findByTestId(CollectiblesSectionTestIds.CARD_TILE(CARD.mint));

    act(() => {
      __setMockNetInfo({ type: 'none', isInternetReachable: false });
      const backgroundState = store.getState().engine.backgroundState;
      Object.assign(Engine, {
        state: {
          ...backgroundState,
          CollectiblesController: {
            ...backgroundState.CollectiblesController,
            hasCompletedOnboarding: false,
          },
        },
      });
      store.dispatch(updateBgState({ key: 'CollectiblesController' }));
    });

    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesSectionTestIds.PACKS),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(CollectiblesSectionTestIds.CARD_TILE(CARD.mint)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesSectionTestIds.PACKS_EMPTY),
    ).not.toBeOnTheScreen();
  });

  it('batches optional wallet pack metadata and ranks previews by seven-day openings', async () => {
    const corePack = createPack({ code: 'pokemon_25', price: 25 });
    const clients = {
      collectiblesApi: new MockCollectiblesApiClient(),
      socialApi: new MockCollectiblesSocialApiClient(),
    };
    const insights = jest
      .spyOn(clients.collectiblesApi, 'getPackInsights')
      .mockResolvedValue({
        [`pack_partner:${PACK.code}`]: {
          openedLast7d: 100,
          pulledSinceLastEpic: 5,
          rarityCounts24h: { common: 0, uncommon: 0, rare: 0, epic: 0 },
        },
      });
    packPartnerReads.getPacks.mockResolvedValue([corePack, PACK]);
    setCollectiblesFixtureClients(clients);
    Object.assign(Engine.context, {
      CollectiblesController: {
        ...controller,
      },
    });

    renderHomepageJourney();

    expect(
      await screen.findByLabelText('100 opened in the last 7 days'),
    ).toBeOnTheScreen();
    const tiles = screen.getAllByTestId(/^collectibles-pack-pokemon_\d+$/u);
    expect(tiles.map((tile) => tile.props.testID)).toEqual([
      CollectiblesPackCardTestIds.CARD(PACK.code),
      CollectiblesPackCardTestIds.CARD(corePack.code),
    ]);
    expect(insights).toHaveBeenCalledWith({
      packTypes: ['pack_partner:pokemon_25', 'pack_partner:pokemon_50'],
    });
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it.each([
    {
      entry: 'title',
      ownedCards: [CARD],
      testID: homepageSectionTitleTestId('collectibles'),
    },
    {
      entry: 'card',
      ownedCards: [CARD],
      testID: CollectiblesSectionTestIds.CARD_TILE(CARD.mint),
    },
    {
      entry: 'empty-state action',
      ownedCards: [],
      testID: CollectiblesSectionTestIds.EMPTY_CTA,
    },
  ])(
    'opens onboarding from the $entry and closes without completing it',
    async ({ ownedCards, testID }) => {
      const { store } = renderHomepageJourney({
        hasCompletedOnboarding: false,
        ownedCards,
      });

      fireEvent.press(await screen.findByTestId(testID));

      expect(await screen.findByTestId(OnboardingIds.NEXT)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesCardViewTestIds.CONTAINER),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(OnboardingIds.CLOSE));

      expect(await screen.findByTestId(testID)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(OnboardingIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(controller.completeOnboarding).not.toHaveBeenCalled();
      expect(
        store.getState().engine.backgroundState.CollectiblesController
          .hasCompletedOnboarding,
      ).toBe(false);

      fireEvent.press(screen.getByTestId(testID));

      expect(await screen.findByTestId(OnboardingIds.NEXT)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(OnboardingIds.COMPLETE),
      ).not.toBeOnTheScreen();
    },
  );

  it('completes onboarding into the overview and opens an owned card directly on the next visit', async () => {
    const { store } = renderHomepageJourney({ hasCompletedOnboarding: false });
    controller.completeOnboarding.mockImplementationOnce(() => {
      const backgroundState = store.getState().engine.backgroundState;
      Object.assign(Engine, {
        state: {
          ...backgroundState,
          CollectiblesController: {
            ...backgroundState.CollectiblesController,
            hasCompletedOnboarding: true,
          },
        },
      });
      store.dispatch(updateBgState({ key: 'CollectiblesController' }));
    });

    fireEvent.press(
      await screen.findByTestId(homepageSectionTitleTestId('collectibles')),
    );
    fireEvent.press(await screen.findByTestId(OnboardingIds.NEXT));

    expect(await screen.findByTestId(OnboardingIds.COMPLETE)).toBeOnTheScreen();
    expect(controller.completeOnboarding).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(OnboardingIds.COMPLETE));

    expect(
      await screen.findByTestId(CollectiblesHomeTestIds.OVERVIEW),
    ).toBeOnTheScreen();
    expect(controller.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(
      store.getState().engine.backgroundState.CollectiblesController
        .hasCompletedOnboarding,
    ).toBe(true);
    expect(screen.queryByTestId(OnboardingIds.CONTAINER)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(CollectiblesHomeTestIds.BACK_BUTTON));
    fireEvent.press(
      await screen.findByTestId(
        CollectiblesSectionTestIds.CARD_TILE(CARD.mint),
      ),
    );

    expect(
      await screen.findByTestId(CollectiblesCardDisplayTestIds.NAME),
    ).toHaveTextContent(CARD.set ?? '');
    expect(screen.queryByTestId(OnboardingIds.CONTAINER)).not.toBeOnTheScreen();
    expect(controller.completeOnboarding).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      entry: 'owned card',
      source: CollectiblesSectionTestIds.CARD_TILE(CARD.mint),
      destination: CollectiblesCardViewTestIds.CONTAINER,
    },
    {
      entry: 'pack preview',
      source: CollectiblesPackCardTestIds.CARD(PACK.code),
      destination: CollectiblesPackDetailTestIds.CONTAINER,
    },
    {
      entry: 'Open action',
      source: CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code),
      destination: CollectiblesPurchaseSheetTestIds.SHEET,
    },
  ])(
    'resumes the $entry destination after onboarding without buying',
    async ({ source, destination }) => {
      const { store } = renderHomepageJourney({
        hasCompletedOnboarding: false,
      });
      controller.completeOnboarding.mockImplementationOnce(() => {
        const backgroundState = store.getState().engine.backgroundState;
        Object.assign(Engine, {
          state: {
            ...backgroundState,
            CollectiblesController: {
              ...backgroundState.CollectiblesController,
              hasCompletedOnboarding: true,
            },
          },
        });
        store.dispatch(updateBgState({ key: 'CollectiblesController' }));
      });
      fireEvent.press(await screen.findByTestId(source));
      fireEvent.press(await screen.findByTestId(OnboardingIds.NEXT));
      fireEvent.press(await screen.findByTestId(OnboardingIds.COMPLETE));
      expect(await screen.findByTestId(destination)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(OnboardingIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(controller.generatePack).not.toHaveBeenCalled();
      if (destination === CollectiblesCardViewTestIds.CONTAINER) {
        fireEvent.press(
          screen.getByTestId(CollectiblesCardViewTestIds.BACK_BUTTON),
        );
      } else if (destination === CollectiblesPackDetailTestIds.CONTAINER) {
        fireEvent.press(screen.getByLabelText(strings('navigation.back')));
      } else {
        return;
      }
      expect(
        await screen.findByTestId(CollectiblesSectionTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  it('opens the Collectibles overview from the section title', async () => {
    renderHomepageJourney();

    fireEvent.press(
      await screen.findByTestId(homepageSectionTitleTestId('collectibles')),
    );

    expect(
      await screen.findByTestId(CollectiblesHomeTestIds.OVERVIEW),
    ).toBeOnTheScreen();
  });

  it('opens the pack catalogue from View all', async () => {
    renderHomepageJourney();

    fireEvent.press(
      await screen.findByTestId(CollectiblesSectionTestIds.VIEW_PACKS),
    );

    expect(
      await screen.findByTestId(CollectiblesPacksTestIds.LIST),
    ).toBeOnTheScreen();
  });

  it('opens pack detail from the preview without opening purchase confirmation', async () => {
    renderHomepageJourney();
    fireEvent.press(
      await screen.findByTestId(CollectiblesPackCardTestIds.CARD(PACK.code)),
    );
    expect(
      await screen.findByTestId(CollectiblesPackDetailTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText(strings('navigation.back')));
    expect(
      await screen.findByTestId(CollectiblesSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('opens and dismisses purchase confirmation directly over Home without buying', async () => {
    renderHomepageJourney();
    const tile = await screen.findByTestId(
      CollectiblesPackCardTestIds.CARD(PACK.code),
    );
    expect(
      within(tile).getByText(
        getCollectiblesPackArtwork(`pack_partner:${PACK.code}`).name ??
          PACK.name,
      ),
    ).toBeOnTheScreen();
    expect(
      within(tile).getByText(
        strings('collectibles_discovery.open_for', { amount: '$50' }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(tile).getByTestId(CollectiblesPackCardTestIds.IMAGE(PACK.code)),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code)),
    );

    expect(
      await screen.findByTestId(
        CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPackDetailTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByTestId(CollectiblesPurchaseSheetTestIds.CLOSE_BUTTON),
    );

    await waitFor(() =>
      expect(
        screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(CollectiblesSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('starts the reveal only after confirming a purchase from Home', async () => {
    controller.generatePack.mockResolvedValue('home-purchase');
    renderHomepageJourney();

    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code),
      ),
    );
    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPurchaseSheetTestIds.CONFIRM_BUTTON,
      ),
    );

    await waitFor(() =>
      expect(controller.generatePack).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
        pack: {
          code: PACK.code,
          name: PACK.name,
          price: PACK.price,
          priceAmount: PACK.priceAmount,
        },
        options: { quantity: 1, turbo: false },
      }),
    );
    expect(
      await screen.findByTestId(CollectiblesRevealTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).toHaveBeenCalledTimes(1);
  });

  it('gates a Home pack purchase behind onboarding', async () => {
    renderHomepageJourney({ hasCompletedOnboarding: false });

    fireEvent.press(
      await screen.findByTestId(
        CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code),
      ),
    );

    expect(await screen.findByTestId(OnboardingIds.NEXT)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesPurchaseSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('shows the cards PackPartner reports and returns directly from a homepage card to the homepage', async () => {
    renderHomepageJourney();

    const homeTile = await screen.findByTestId(
      CollectiblesSectionTestIds.CARD_TILE(CARD.mint),
    );
    expect(
      within(homeTile).getByTestId(CollectiblesCardTileTestIds.NAME(CARD.mint)),
    ).toHaveTextContent(CARD.set ?? '');
    expect(
      within(homeTile).getByTestId(
        CollectiblesCardTileTestIds.VALUE(CARD.mint),
      ),
    ).toHaveTextContent('$120');
    expect(packPartnerReads.getOwnedCards).toHaveBeenCalledWith(
      MOCK_ACCOUNT.address,
    );

    expect(packPartnerReads.getBuybackOffer).not.toHaveBeenCalled();

    fireEvent.press(homeTile);

    expect(
      await screen.findByTestId(CollectiblesCardDisplayTestIds.NAME),
    ).toHaveTextContent(CARD.set ?? '');
    const card = screen.getByTestId(
      CollectiblesInteractiveCardTestIds.CONTAINER,
    );
    expect(card).toBeOnTheScreen();
    expect(
      screen.getByTestId('collectibles-interactive-card-web'),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(CollectiblesCardViewTestIds.BACK_BUTTON),
    );

    const homepage = await screen.findByTestId(
      CollectiblesSectionTestIds.CONTAINER,
    );
    expect(within(homepage).getByText('Collectibles')).toBeOnTheScreen();
    expect(
      within(homepage).getByTestId(
        CollectiblesSectionTestIds.CARD_TILE(CARD.mint),
      ),
    ).toBeOnTheScreen();
    expect(within(homepage).getByText(CARD.set ?? '')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CollectiblesHomeTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
