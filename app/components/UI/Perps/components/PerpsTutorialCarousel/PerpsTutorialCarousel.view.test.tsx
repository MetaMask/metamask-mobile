/**
 * Component view tests for PerpsTutorialCarousel.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import { strings } from '../../../../../../locales/i18n';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsTutorialSelectorsIDs } from '../../Perps.testIds';
import PerpsTutorialCarousel from './PerpsTutorialCarousel';

const TIMEOUT_MS = 5000;
const CONTINUE_DEBOUNCE_MS = 120;

const firstTimeOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: true, testnet: true },
      },
    },
  },
};

const waitForContinueDebounce = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, CONTINUE_DEBOUNCE_MS));
  });
};

const setupFirstTimeTutorial = () => {
  const navigationDispatch = jest.fn();
  NavigationService.navigation = {
    navigate: jest.fn(),
    dispatch: navigationDispatch,
    reset: jest.fn(),
  } as never;

  renderPerpsView(
    PerpsTutorialCarousel as unknown as React.ComponentType,
    Routes.PERPS.TUTORIAL,
    {
      overrides: firstTimeOverrides,
      initialParams: { source: 'component_view' },
      streamOverrides: {
        account: createFundedAccountForViews('0'),
        positions: [],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    },
  );

  return { navigationDispatch };
};

const expectRoutedToPerpsHome = (navigationDispatch: jest.Mock) => {
  expect(navigationDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'REPLACE',
      payload: expect.objectContaining({
        name: Routes.PERPS.ROOT,
        params: expect.objectContaining({
          screen: Routes.PERPS.PERPS_HOME,
        }),
      }),
    }),
  );
};

describe('PerpsTutorialCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    NavigationService.resetForTesting();
  });

  it('lets a first-time no-funds trader skip the tutorial', async () => {
    const markTutorialCompleted = Engine.context.PerpsController
      .markTutorialCompleted as jest.Mock;

    const { navigationDispatch } = setupFirstTimeTutorial();

    expect(
      await screen.findByText(
        strings('perps.tutorial.what_are_perps.title'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PerpsTutorialSelectorsIDs.SKIP_BUTTON));

    expect(markTutorialCompleted).toHaveBeenCalledTimes(1);
    expectRoutedToPerpsHome(navigationDispatch);
  });

  it('routes a first-time no-funds trader to Perps home after completing the tutorial', async () => {
    const markTutorialCompleted = Engine.context.PerpsController
      .markTutorialCompleted as jest.Mock;

    const { navigationDispatch } = setupFirstTimeTutorial();

    expect(
      await screen.findByText(
        strings('perps.tutorial.what_are_perps.title'),
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toBeOnTheScreen();

    const tutorialScreenTitles = [
      strings('perps.tutorial.go_long_or_short.title'),
      strings('perps.tutorial.choose_leverage.title'),
      strings('perps.tutorial.watch_liquidation.title'),
      strings('perps.tutorial.close_anytime.title'),
      strings('perps.tutorial.ready_to_trade.title'),
    ];

    for (const title of tutorialScreenTitles) {
      fireEvent.press(
        screen.getByTestId(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON),
      );
      await waitForContinueDebounce();
      expect(
        await screen.findByText(title, {}, { timeout: TIMEOUT_MS }),
      ).toBeOnTheScreen();
    }

    await waitFor(() => {
      expect(
        screen.getByText(strings('perps.tutorial.lets_go')),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsTutorialSelectorsIDs.SKIP_BUTTON),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(
      screen.getByTestId(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON),
    );

    await waitFor(() => {
      expect(markTutorialCompleted).toHaveBeenCalledTimes(1);
      expectRoutedToPerpsHome(navigationDispatch);
    });
  });
});
