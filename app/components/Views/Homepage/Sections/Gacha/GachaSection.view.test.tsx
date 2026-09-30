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
import { renderScreenWithRoutes } from '../../../../../../tests/component-view/render';
import { createStateFixture } from '../../../../../../tests/component-view/stateFixture';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  GachaCardDisplayTestIds,
  GachaCardTileTestIds,
  GachaCardViewTestIds,
  GachaHomeTestIds,
  GachaInteractiveCardTestIds,
  GachaPacksTestIds,
} from '../../../../UI/Gacha/Gacha.testIds';
import GachaScreenStack from '../../../../UI/Gacha/routes';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createTestState,
} from '../../../../UI/Gacha/views/testUtils';
import GachaSection from './GachaSection';
import { GachaSectionTestIds } from './GachaSection.testIds';

const CARD = createCard({
  image: 'https://example.com/card-front.png',
  backImage: 'https://example.com/card-back.png',
});
const HomepageGachaSection = () => (
  <GachaSection sectionIndex={3} totalSectionsLoaded={6} />
);

const renderHomepageJourney = () => {
  const state = createStateFixture()
    .withOverrides(createTestState({ cards: [CARD] }))
    .withRemoteFeatureFlags({
      gachaEnabled: { enabled: true, minimumVersion: '0.0.0' },
    })
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

  return renderScreenWithRoutes(
    HomepageGachaSection,
    { name: Routes.WALLET_VIEW },
    [{ name: Routes.GACHA.ROOT, Component: GachaScreenStack }],
    { state },
  );
};

describeForPlatforms('Gacha homepage navigation', () => {
  beforeEach(() => {
    Object.assign(Engine.context, {
      GachaController: {
        syncCards: jest.fn().mockResolvedValue([CARD]),
        recoverOperations: jest.fn().mockResolvedValue(undefined),
        refreshBuyback: jest.fn().mockResolvedValue({ status: 'unavailable' }),
        getPacks: jest.fn().mockResolvedValue([]),
      },
    });
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
    ).toHaveTextContent('120 USDC');

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
    ).toHaveTextContent('120 USDC');
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
