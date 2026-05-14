/**
 * Component view tests for PerpsTutorialCarousel.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../../core/NavigationService';
import { strings } from '../../../../../../locales/i18n';
import {
  createFundedAccountForViews,
  defaultEthMarketForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import { PerpsTutorialSelectorsIDs } from '../../Perps.testIds';
import PerpsTutorialCarousel from './PerpsTutorialCarousel';

const TIMEOUT_MS = 5000;

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

describe('PerpsTutorialCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    NavigationService.resetForTesting();
  });

  it('lets a first-time no-funds trader enter the tutorial and complete it', async () => {
    const navigationDispatch = jest.fn();
    NavigationService.navigation = {
      navigate: jest.fn(),
      dispatch: navigationDispatch,
      reset: jest.fn(),
    } as never;
    const markTutorialCompleted = Engine.context.PerpsController
      .markTutorialCompleted as jest.Mock;

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
          marketData: [defaultEthMarketForViews],
        },
      },
    );

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
    expect(navigationDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REPLACE' }),
    );
  });
});
