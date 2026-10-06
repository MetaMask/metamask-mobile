import '../../../../../../tests/component-view/mocks';
import React from 'react';
import {
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderGachaView } from '../../../../../../tests/component-view/renderers/gacha';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import {
  GachaCardDisplayTestIds,
  GachaCardTileTestIds,
  GachaCardViewTestIds,
  GachaHomeTestIds,
  GachaInteractiveCardTestIds,
  GachaPacksTestIds,
  GachaPackCardTestIds,
} from '../../../../UI/Gacha/Gacha.testIds';
import GachaScreenStack from '../../../../UI/Gacha/routes';
import type { CollectorCryptCard } from '../../../../UI/Gacha/providers/collector-crypt/types';
import { GachaOnboardingSelectorsIDs as OnboardingIds } from '../../../../UI/Gacha/views/GachaOnboarding';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import {
  MOCK_ACCOUNT,
  createCard,
  createPack,
} from '../../../../UI/Gacha/views/testUtils';
import GachaSection from './GachaSection';
import { GachaSectionTestIds } from './GachaSection.testIds';

const CARD = createCard({
  image: 'https://example.com/card-front.png',
  backImage: 'https://example.com/card-back.png',
});
const PACK = createPack();
const controller = {
  syncCards: jest.fn(),
  recoverOperations: jest.fn(),
  refreshBuyback: jest.fn(),
  getPacks: jest.fn(),
  completeOnboarding: jest.fn(),
};
const HomepageGachaSection = () => (
  <GachaSection sectionIndex={3} totalSectionsLoaded={6} />
);

const renderHomepageJourney = ({
  hasCompletedOnboarding = true,
  cards = [CARD],
  hasSolanaAccount = true,
}: {
  hasCompletedOnboarding?: boolean;
  cards?: CollectorCryptCard[];
  /** False keeps the fixture's EVM-only selected account. */
  hasSolanaAccount?: boolean;
} = {}) => {
  return renderGachaView({
    entry: { Component: HomepageGachaSection, name: Routes.WALLET_VIEW },
    routes: [{ name: Routes.GACHA.ROOT, Component: GachaScreenStack }],
    cards,
    hasSolanaAccount,
    hasCompletedOnboarding,
  });
};

describeForPlatforms('Gacha homepage navigation', () => {
  beforeEach(() => {
    Object.values(controller).forEach((method) => method.mockReset());
    controller.syncCards.mockResolvedValue([CARD]);
    controller.recoverOperations.mockResolvedValue(undefined);
    controller.refreshBuyback.mockResolvedValue({ status: 'unavailable' });
    controller.getPacks.mockResolvedValue([PACK]);
    Object.assign(Engine.context, { GachaController: controller });
  });

  it('shows the empty section when the selected account group has no Solana account', () => {
    renderHomepageJourney({ hasSolanaAccount: false, cards: [] });

    expect(
      screen.queryByTestId(GachaSectionTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaSectionTestIds.EMPTY_CTA),
    ).toBeOnTheScreen();
    expect(controller.syncCards).not.toHaveBeenCalled();
    expect(controller.recoverOperations).not.toHaveBeenCalled();
  });

  it.each([
    {
      entry: 'title',
      cards: [CARD],
      testID: homepageSectionTitleTestId('gacha'),
    },
    {
      entry: 'card',
      cards: [CARD],
      testID: GachaSectionTestIds.CARD_TILE(CARD.mint),
    },
    {
      entry: 'empty-state action',
      cards: [],
      testID: GachaSectionTestIds.EMPTY_CTA,
    },
  ])(
    'opens onboarding from the $entry and closes without completing it',
    async ({ cards, testID }) => {
      const { store } = renderHomepageJourney({
        hasCompletedOnboarding: false,
        cards,
      });

      fireEvent.press(await screen.findByTestId(testID));

      expect(await screen.findByTestId(OnboardingIds.NEXT)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(GachaHomeTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(GachaCardViewTestIds.CONTAINER),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId(OnboardingIds.CLOSE));

      expect(await screen.findByTestId(testID)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(OnboardingIds.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(controller.completeOnboarding).not.toHaveBeenCalled();
      expect(
        store.getState().engine.backgroundState.GachaController
          .hasCompletedOnboarding,
      ).toBe(false);

      fireEvent.press(screen.getByTestId(testID));

      expect(await screen.findByTestId(OnboardingIds.NEXT)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(OnboardingIds.COMPLETE),
      ).not.toBeOnTheScreen();
    },
  );

  it('completes onboarding into packs and opens an owned card directly on the next visit', async () => {
    const { store } = renderHomepageJourney({ hasCompletedOnboarding: false });
    controller.completeOnboarding.mockImplementationOnce(() => {
      const backgroundState = store.getState().engine.backgroundState;
      Object.assign(Engine, {
        state: {
          ...backgroundState,
          GachaController: {
            ...backgroundState.GachaController,
            hasCompletedOnboarding: true,
          },
        },
      });
      store.dispatch(updateBgState({ key: 'GachaController' }));
    });

    fireEvent.press(
      await screen.findByTestId(homepageSectionTitleTestId('gacha')),
    );
    fireEvent.press(await screen.findByTestId(OnboardingIds.NEXT));
    fireEvent.press(await screen.findByTestId(OnboardingIds.NEXT));

    expect(await screen.findByTestId(OnboardingIds.COMPLETE)).toBeOnTheScreen();
    expect(controller.completeOnboarding).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(OnboardingIds.COMPLETE));

    expect(
      await screen.findByTestId(GachaPackCardTestIds.CARD(PACK.code)),
    ).toBeOnTheScreen();
    expect(controller.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(
      store.getState().engine.backgroundState.GachaController
        .hasCompletedOnboarding,
    ).toBe(true);
    expect(screen.queryByTestId(OnboardingIds.CONTAINER)).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardTileTestIds.TILE(CARD.mint)),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.BACK_BUTTON));
    fireEvent.press(
      await screen.findByTestId(GachaSectionTestIds.CARD_TILE(CARD.mint)),
    );

    expect(
      await screen.findByTestId(GachaCardDisplayTestIds.NAME),
    ).toHaveTextContent(CARD.name);
    expect(screen.queryByTestId(OnboardingIds.CONTAINER)).not.toBeOnTheScreen();
    expect(controller.completeOnboarding).toHaveBeenCalledTimes(1);
  });

  it('returns from a homepage card to My Collection, then to the homepage', async () => {
    renderHomepageJourney();

    const homeTile = await screen.findByTestId(
      GachaSectionTestIds.CARD_TILE(CARD.mint),
    );
    expect(
      within(homeTile).getByTestId(GachaCardTileTestIds.NAME(CARD.mint)),
    ).toHaveTextContent(CARD.name);
    expect(
      within(homeTile).getByTestId(GachaCardTileTestIds.VALUE(CARD.mint)),
    ).toHaveTextContent('$120');

    fireEvent.press(homeTile);

    expect(
      await screen.findByTestId(GachaCardDisplayTestIds.NAME),
    ).toHaveTextContent(CARD.name);
    const card = screen.getByTestId(GachaInteractiveCardTestIds.CONTAINER);
    await waitFor(() => expect(card).toHaveProp('accessibilityRole', 'button'));

    fireEvent.press(card);

    expect(card).toHaveProp(
      'accessibilityLabel',
      strings('gacha.card.back_label', { name: CARD.name }),
    );
    fireEvent.press(screen.getByTestId(GachaCardViewTestIds.BACK_BUTTON));

    const collection = await screen.findByTestId(GachaHomeTestIds.CONTAINER);
    expect(
      within(collection).getByTestId(GachaCardTileTestIds.TILE(CARD.mint)),
    ).toBeOnTheScreen();
    expect(within(collection).getByText(CARD.name)).toBeOnTheScreen();
    expect(
      within(collection).getByTestId(GachaCardTileTestIds.VALUE(CARD.mint)),
    ).toHaveTextContent('$120');
    expect(screen.queryByTestId(GachaPacksTestIds.LIST)).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardViewTestIds.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.BACK_BUTTON));

    const homepage = await screen.findByTestId(GachaSectionTestIds.CONTAINER);
    expect(
      within(homepage).getByText(strings('gacha.title')),
    ).toBeOnTheScreen();
    expect(
      within(homepage).getByTestId(GachaSectionTestIds.CARD_TILE(CARD.mint)),
    ).toBeOnTheScreen();
    expect(within(homepage).getByText(CARD.name)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaHomeTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});
